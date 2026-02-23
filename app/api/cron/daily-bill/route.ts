import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchRecentBills, fetchBillText } from '@/lib/agents/congress';
import { fetchStateBills, fetchBillTextFromLegiScan } from '@/lib/agents/legiscan';
import { fetchSponsorFunds } from '@/lib/agents/openfec';
import { fetchNewsContext } from '@/lib/agents/newsdata';
import { fetchPolicyResearch } from '@/lib/agents/exa';
import { synthesizeLegislation } from '@/lib/agents/openai';
import { scoreBillForGoal } from '@/lib/agents/relevance';
import { revalidatePath } from 'next/cache';
import { generateSlug } from '@/lib/utils/slugs';
import { parseStatusFromAction } from '@/lib/utils/bill-status';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — processing many bills takes time

/* ------------------------------------------------------------------ */
/*  Ledge daily-bill cron                                              */
/*  1. Fetch federal bills (Congress.gov)                              */
/*  2. Fetch state bills for every distinct state_focus in subscribers */
/*  3. Synthesize articles via Groq                                    */
/*  4. Score every new bill against every subscriber goal              */
/*  5. Store matches in bill_matches table                             */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    console.log('CRON: Ledge Daily Bill Agent Started');

    // 1. Security
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const processedBills: string[] = [];
    const skippedBills: string[] = [];
    const matchesCreated: number[] = [];

    try {
        const supabase = getSupabaseAdmin();

        // ========================
        //  FEDERAL BILLS
        // ========================
        console.log('Stage 1: Fetching federal bills...');
        let federalBills = await fetchRecentBills(50, 0);

        const { data: allIds } = await (supabase as any)
            .from('legislation')
            .select('bill_id');
        const existingSet = new Set((allIds || []).map((b: any) => b.bill_id));

        const newFederalBills = federalBills.filter(b => !existingSet.has(b.bill_id));

        if (newFederalBills.length === 0) {
            console.log('No new federal bills in Priority Sweep, trying Archive...');
            const { count: currentCount } = await (supabase as any)
                .from('legislation')
                .select('*', { count: 'exact', head: true });
            federalBills = await fetchRecentBills(20, currentCount || 0);
        } else {
            federalBills = newFederalBills;
        }

        // ========================
        //  STATE BILLS
        // ========================
        console.log('Stage 2: Fetching state bills for subscriber states...');
        const { data: stateFocusRows } = await (supabase as any)
            .from('subscribers')
            .select('state_focus')
            .not('state_focus', 'is', null);

        const uniqueStates: string[] = [...new Set<string>((stateFocusRows || []).map((r: any) => r.state_focus as string))];
        console.log(`Subscriber states: ${uniqueStates.join(', ') || 'none'}`);

        interface SimpleBill {
            bill_id: string;
            title: string;
            congress: number;
            originChamber: string;
            type: string;
            updateDate: string;
            url: string;
            congressGovUrl: string;
            introducedDate?: string;
            latestAction?: { actionDate: string; text: string };
            sponsors?: any[];
            cosponsors?: any[];
            source: 'federal' | 'state';
            state_code: string | null;
            doc_id?: number | null;
        }

        const allBillsToProcess: SimpleBill[] = [];

        // Add ALL new federal bills (no artificial limit)
        for (const fb of federalBills) {
            if (!existingSet.has(fb.bill_id)) {
                allBillsToProcess.push({ ...fb, source: 'federal', state_code: null });
            }
        }

        // Add state bills
        for (const stateCode of uniqueStates) {
            const stateBills = await fetchStateBills(stateCode, 5);
            for (const sb of stateBills) {
                const syntheticId = `STATE-${sb.state}-${sb.bill_number.replace(/\s/g, '')}`;
                if (!existingSet.has(syntheticId)) {
                    allBillsToProcess.push({
                        bill_id: syntheticId,
                        title: sb.title,
                        congress: 0,
                        originChamber: sb.state,
                        type: 'STATE',
                        updateDate: sb.last_action_date,
                        url: sb.url,
                        congressGovUrl: sb.url,
                        introducedDate: sb.status_date,
                        latestAction: { actionDate: sb.last_action_date, text: sb.last_action },
                        sponsors: [],
                        cosponsors: [],
                        source: 'state',
                        state_code: sb.state,
                        doc_id: sb.doc_id,
                    });
                }
            }
        }

        if (allBillsToProcess.length === 0) {
            return NextResponse.json({ message: 'No new bills to process.' }, { status: 200 });
        }

        console.log(`Processing ${allBillsToProcess.length} bills total...`);

        // ========================
        //  PROCESS BILLS
        // ========================
        const processBill = async (bill: SimpleBill) => {
            console.log(`\n--- Processing: ${bill.bill_id} (${bill.source}) ---`);

            // Dup check
            const { data: existing } = await (supabase as any)
                .from('legislation')
                .select('id')
                .eq('bill_id', bill.bill_id)
                .single();

            if (existing) {
                skippedBills.push(bill.bill_id);
                return null;
            }

            // Fetch full bill text — skip federal if not available, try LegiScan for state
            let billFullText: string | null = null;
            if (bill.source === 'federal') {
                billFullText = await fetchBillText(bill.bill_id);
                if (!billFullText) {
                    console.log(`SKIPPED ${bill.bill_id}: Bill text not yet available`);
                    skippedBills.push(bill.bill_id + ' (no text)');
                    return null;
                }
                console.log(`Got ${billFullText.length} chars of text for ${bill.bill_id}`);
            } else if (bill.source === 'state') {
                // Try to fetch state bill text from LegiScan using doc_id
                const docId = bill.doc_id;
                if (docId) {
                    billFullText = await fetchBillTextFromLegiScan(docId);
                    if (billFullText) {
                        console.log(`Got ${billFullText.length} chars of LegiScan text for ${bill.bill_id}`);
                    }
                }
            }

            // Research phase
            const safeFetch = async (name: string, p: Promise<any>) => {
                try { return await p; } catch (e: any) { console.error(`[Research] FAILED ${name}:`, e.message); return null; }
            };

            const searchQuery = `${bill.bill_id} ${bill.title.split(' ').slice(0, 10).join(' ')}`;

            const [sponsorFunds, newsContext, policyResearch] = await Promise.all([
                safeFetch('SponsorFunds', bill.sponsors?.length ? fetchSponsorFunds(bill.sponsors[0].name) : Promise.resolve(null)),
                safeFetch('News', fetchNewsContext(searchQuery)),
                safeFetch('Policy', fetchPolicyResearch(searchQuery)),
            ]);

            // Synthesis — pass ACTUAL bill text (not just title)
            const textForSynthesis = billFullText || bill.title;
            const synthesisResult = await synthesizeLegislation(
                bill.title,
                bill.bill_id,
                textForSynthesis,
                sponsorFunds,
                newsContext,
                policyResearch,
                bill.congressGovUrl,
            );

            if (!synthesisResult) {
                console.error(`Failed synthesis for ${bill.bill_id}`);
                return null;
            }

            // DB insertion
            const standardSlug = generateSlug(bill.bill_id);
            const insertData: any = {
                bill_id: bill.bill_id,
                title: bill.title.slice(0, 255),
                congress: bill.congress,
                type: bill.type,
                update_date: bill.updateDate,
                origin_chamber: bill.originChamber,
                introduced_date: bill.introducedDate,
                latest_action: JSON.parse(JSON.stringify(bill.latestAction || {})),
                sponsors: JSON.parse(JSON.stringify(bill.sponsors || [])),
                cosponsors: JSON.parse(JSON.stringify(bill.cosponsors || [])),
                seo_title: synthesisResult.seo_title.slice(0, 255),
                url_slug: standardSlug,
                meta_description: synthesisResult.meta_description.slice(0, 255),
                tldr: synthesisResult.tldr.slice(0, 1000),
                keywords: JSON.parse(JSON.stringify(synthesisResult.keywords || [])),
                schema_type: synthesisResult.schema_type || 'Legislation',
                markdown_body: synthesisResult.markdown_body.slice(0, 50000),
                sponsor_data: JSON.parse(JSON.stringify(sponsorFunds || {})),
                news_context: JSON.parse(JSON.stringify(newsContext || [])),
                policy_research: JSON.parse(JSON.stringify(policyResearch || [])),
                congress_gov_url: bill.congressGovUrl,
                is_published: true,
                source: bill.source,
                state_code: bill.state_code,
                status: parseStatusFromAction(bill.latestAction?.text),
                status_date: bill.latestAction?.actionDate || null,
                status_changed_at: new Date().toISOString(),
            };

            const { data: inserted, error: insertError } = await (supabase as any)
                .from('legislation')
                .insert(insertData)
                .select('id')
                .single();

            if (insertError) {
                console.error(`DB INSERT ERROR ${bill.bill_id}:`, insertError);
                return null;
            }

            processedBills.push(bill.bill_id);

            // ========================
            //  RELEVANCE MATCHING
            // ========================
            const legislationId = inserted.id;

            // Find subscribers whose state matches (for state bills) or all (for federal)
            let subscriberQuery = (supabase as any)
                .from('subscribers')
                .select('id, org_goal, state_focus')
                .not('org_goal', 'is', null);

            if (bill.source === 'state' && bill.state_code) {
                subscriberQuery = subscriberQuery.eq('state_focus', bill.state_code);
            }

            const { data: subscribers } = await subscriberQuery;

            let matchCount = 0;
            for (const sub of (subscribers || [])) {
                if (!sub.org_goal) continue;

                const billText = synthesisResult.tldr || bill.title;
                const result = await scoreBillForGoal(bill.title, billText, sub.org_goal);

                if (result.match_score > 0) {
                    const { error: matchErr } = await (supabase as any)
                        .from('bill_matches')
                        .upsert({
                            subscriber_id: sub.id,
                            legislation_id: legislationId,
                            match_score: result.match_score,
                            summary: result.summary || null,
                            why_it_matters: result.why_it_matters || null,
                            implications: result.implications || null,
                            notified: false,
                        }, { onConflict: 'subscriber_id,legislation_id' });

                    if (matchErr) {
                        console.error(`MATCH INSERT ERR for sub ${sub.id}:`, matchErr);
                    } else {
                        matchCount++;
                    }
                }
            }

            matchesCreated.push(matchCount);
            console.log(`SUCCESS: ${bill.bill_id} — ${matchCount} matches created`);
            return bill.bill_id;
        };

        // Process ALL new bills in batches of 3 (parallel within batch, sequential between)
        const BATCH_SIZE = 3;
        for (let i = 0; i < allBillsToProcess.length; i += BATCH_SIZE) {
            const batch = allBillsToProcess.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} bills)...`);
            const results = await Promise.allSettled(batch.map(b => processBill(b)));
            results.forEach((r, idx) => {
                if (r.status === 'rejected') console.error(`Bill ${batch[idx].bill_id} failed:`, r.reason);
            });
            // Small delay between batches to respect rate limits
            if (i + BATCH_SIZE < allBillsToProcess.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Revalidate
        if (processedBills.length > 0) {
            try {
                revalidatePath('/');
                revalidatePath('/dashboard');
                revalidatePath('/bills');
                revalidatePath('/legislation-summary');
                processedBills.forEach(id => {
                    revalidatePath(`/legislation-summary/${generateSlug(id)}`);
                    revalidatePath(`/bill/${generateSlug(id)}`);
                });
            } catch (e: any) {
                console.error('Revalidation error:', e.message);
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        return NextResponse.json({
            success: true,
            processed: processedBills,
            skipped: skippedBills,
            matchesCreated: matchesCreated.reduce((a, b) => a + b, 0),
            duration: `${duration}s`,
        });

    } catch (error: any) {
        console.error('CRON FATAL ERROR:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchRecentBills } from '@/lib/agents/congress';
import { fetchSponsorFunds } from '@/lib/agents/openfec';
import { fetchNewsContext } from '@/lib/agents/newsdata';
import { fetchPolicyResearch } from '@/lib/agents/exa';
import { synthesizeLegislation } from '@/lib/agents/openai';
import { revalidatePath } from 'next/cache';
import { generateSlug } from '@/lib/utils/slugs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    console.log("CRON: Daily Bill Agent Started");

    // 1. Security Check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const processedBills: string[] = [];
    const skippedBills: string[] = [];

    try {
        // 2. SMART SELECTION LOGIC
        // Step A: Priority Sweep (Check the 30 most recent bills for today's news)
        // Reduced from 100 to 30 to speed up API response on Vercel
        console.log("Stage 2: Priority Sweep (Checking 30 most recent)...");
        let bills = await fetchRecentBills(30, 0);

        // Step B: Contingency Check
        // We look for bills we haven't done yet in the top 100.
        // If we don't find any (very rare), then we switch to Deep Backfill (Archive Discovery).
        const supabase = supabaseAdmin();
        const { data: allIds } = await (supabase as any)
            .from('legislation')
            .select('bill_id');

        const existingSet = new Set((allIds || []).map((b: any) => b.bill_id));
        const newBillsInPool = bills.filter(b => !existingSet.has(b.bill_id));

        if (newBillsInPool.length === 0) {
            console.log("Priority Sweep found no new bills. Switching to Archive Discovery...");
            const { count: currentCount } = await (supabase as any)
                .from('legislation')
                .select('*', { count: 'exact', head: true });

            const skipAhead = currentCount || 0;
            bills = await fetchRecentBills(20, skipAhead);
        } else {
            // We found new bills! Use the Priority pool.
            bills = newBillsInPool;
        }

        if (!bills || bills.length === 0) {
            console.log("No unique bills found in either Priority or Archive pools.");
            return NextResponse.json({ message: "No new bills to process." }, { status: 200 });
        }

        // Process up to 3 bills in parallel
        const billsToProcess = bills.slice(0, 3);
        console.log(`\n--- Processing ${billsToProcess.length} bills in parallel ---`);

        const processBill = async (bill: any) => {
            console.log(`\n--- Processing Bill: ${bill.bill_id} ---`);

            // 3. Duplicate Check
            const { data: existing } = await (supabase as any)
                .from('legislation')
                .select('id')
                .eq('bill_id', bill.bill_id)
                .single();

            if (existing) {
                console.log(`Bill ${bill.bill_id} already exists. Skipping.`);
                skippedBills.push(bill.bill_id);
                return null;
            }

            // 4. Research Phase
            const safeFetch = async (name: string, p: Promise<any>) => {
                try {
                    return await p;
                } catch (e: any) {
                    console.error(`[Research] FAILED for ${name}:`, e.message);
                    return null;
                }
            };

            const searchQuery = `${bill.bill_id} ${bill.title.split(' ').slice(0, 10).join(' ')}`;
            console.log(`[Research] Search query: ${searchQuery}`);

            // Fetch cosponsors funds if there are cosponsors
            const cosponsorsFunds = bill.cosponsors && bill.cosponsors.length > 0
                ? await Promise.all(
                    bill.cosponsors.map((cosponsor: any) =>
                        safeFetch(`CosponsorFunds-${cosponsor.name}`, fetchSponsorFunds(cosponsor.name))
                    )
                )
                : [];

            const [sponsorFunds, newsContext, policyResearch] = await Promise.all([
                safeFetch("SponsorFunds", bill.sponsors && bill.sponsors.length > 0
                    ? fetchSponsorFunds(bill.sponsors[0].name)
                    : Promise.resolve(null)),
                safeFetch("News", fetchNewsContext(searchQuery)),
                safeFetch("Policy", fetchPolicyResearch(searchQuery))
            ]);

            // 5. Synthesis Phase
            console.log(`SYNTHESIS: Starting race for ${bill.bill_id}`);
            const synthesisStart = Date.now();

            const synthesisResult = await synthesizeLegislation(
                bill.title,
                bill.title,
                sponsorFunds,
                newsContext,
                policyResearch,
                bill.congressGovUrl
            );

            const synthesisTime = Date.now() - synthesisStart;
            console.log(`SYNTHESIS: Completed for ${bill.bill_id} in ${synthesisTime}ms`);

            if (!synthesisResult) {
                console.error(`Failed synthesis for ${bill.bill_id} (likely timeout or API error)`);
                return null;
            }

            // 6. Database Insertion
            const standardSlug = generateSlug(bill.bill_id);
            const insertData = {
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
                cosponsors_funds: JSON.parse(JSON.stringify(cosponsorsFunds || [])),
                seo_title: synthesisResult.seo_title.slice(0, 255),
                url_slug: standardSlug, // Use standardized slug
                meta_description: synthesisResult.meta_description.slice(0, 255),
                tldr: synthesisResult.tldr.slice(0, 1000),
                keywords: JSON.parse(JSON.stringify(synthesisResult.keywords || [])),
                schema_type: synthesisResult.schema_type || 'Legislation',
                markdown_body: synthesisResult.markdown_body.slice(0, 50000),
                sponsor_data: JSON.parse(JSON.stringify(sponsorFunds || {})),
                news_context: JSON.parse(JSON.stringify(newsContext || [])).slice(0, 5),
                policy_research: JSON.parse(JSON.stringify(policyResearch || [])).slice(0, 3),
                congress_gov_url: bill.congressGovUrl,
                is_published: true
            };

            const { error: insertError } = await (supabase as any)
                .from('legislation')
                .insert(insertData);

            if (insertError) {
                console.error(`DATABASE ERROR: Failed to insert ${bill.bill_id}:`, insertError);
                return null;
            }

            console.log(`SUCCESS: Published ${bill.bill_id}.`);
            processedBills.push(bill.bill_id);
            return bill.bill_id;
        };

        // Process bills in parallel (up to 3 at once)
        const results = await Promise.allSettled(
            billsToProcess.map(bill => processBill(bill))
        );

        // Log results
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Bill ${billsToProcess[index].bill_id} failed:`, result.reason);
            }
        });

        // If we processed 3 bills successfully and there are more, continue with next batch
        if (processedBills.length === 3 && bills.length > 3) {
            console.log(`\n--- Processing next batch of up to 3 bills ---`);
            const remainingBills = bills.slice(3);
            const remainingResults = await Promise.allSettled(
                remainingBills.slice(0, 3).map(bill => processBill(bill))
            );
            
            remainingResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    console.log(`SUCCESS: Published ${result.value}.`);
                } else if (result.status === 'rejected') {
                    console.error(`Bill ${remainingBills[index].bill_id} failed:`, result.reason);
                }
            });
        }

        const duration = (Date.now() - startTime) / 1000;
        
        // Revalidate cache after 2 minutes to allow jobs to finish
        if (processedBills.length > 0) {
            setTimeout(() => {
                try {
                    // Revalidate homepage and legislation pages (sitemap will pick up changes)
                    revalidatePath('/');
                    revalidatePath('/legislation-summary');
                    // Also revalidate all individual article pages using standardized slugs
                    processedBills.forEach(billId => {
                        const slug = generateSlug(billId);
                        revalidatePath(`/legislation-summary/${slug}`);
                    });
                    console.log("Cache revalidated for homepage and legislation pages");
                } catch (e) {
                    console.error("Failed to revalidate cache:", e);
                }
            }, 120000); // 2 minutes
        }
        
        return NextResponse.json({
            success: true,
            processed: processedBills,
            skipped: skippedBills,
            duration: `${duration}s`
        });

    } catch (error: any) {
        console.error("CRON FATAL ERROR:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

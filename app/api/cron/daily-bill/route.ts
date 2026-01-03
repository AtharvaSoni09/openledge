import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchRecentBills } from '@/lib/agents/congress';
import { fetchSponsorFunds } from '@/lib/agents/openfec';
import { fetchNewsContext } from '@/lib/agents/newsdata';
import { fetchPolicyResearch } from '@/lib/agents/exa';
import { synthesizeLegislation } from '@/lib/agents/openai';
import { revalidatePath } from 'next/cache';

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
        const { data: allIds } = await (supabaseAdmin as any)
            .from('legislation')
            .select('bill_id');

        const existingSet = new Set((allIds || []).map((b: any) => b.bill_id));
        const newBillsInPool = bills.filter(b => !existingSet.has(b.bill_id));

        if (newBillsInPool.length === 0) {
            console.log("Priority Sweep found no new bills. Switching to Archive Discovery...");
            const { count: currentCount } = await (supabaseAdmin as any)
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

        for (const bill of bills) {
            console.log(`\n--- Processing Bill: ${bill.bill_id} ---`);

            // 3. Duplicate Check
            const { data: existing } = await (supabaseAdmin as any)
                .from('legislation')
                .select('id')
                .eq('bill_id', bill.bill_id)
                .single();

            if (existing) {
                console.log(`Bill ${bill.bill_id} already exists. Skipping.`);
                skippedBills.push(bill.bill_id);
                continue;
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
                    bill.cosponsors.map(cosponsor => 
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
            // Wrap in a timeout helper that resolves to null
            // This prevents a single slow bill from crashing the whole cron job
            const timeout = (ms: number) => new Promise((resolve) => {
                setTimeout(() => {
                    console.log(`SYNTHESIS TIMEOUT: ${bill.bill_id} timed out after ${ms}ms`);
                    resolve(null);
                }, ms);
            });

            console.log(`SYNTHESIS: Starting race for ${bill.bill_id}`);
            const article = await Promise.race([
                synthesizeLegislation(
                    bill.title,
                    bill.title,
                    sponsorFunds,
                    newsContext,
                    policyResearch,
                    bill.congressGovUrl
                ),
                timeout(80000) // 80s limit per bill to keep 3-bill batch under 300s
            ]) as any;

            if (!article) {
                console.error(`Failed synthesis for ${bill.bill_id} (likely timeout or API error)`);
                continue;
            }

            // 6. DB Storage - Using 'as any' to bypass Vercel strict build errors on table types
            const { error: insertError } = await (supabaseAdmin as any)
                .from('legislation')
                .insert({
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
                    seo_title: article.seo_title.slice(0, 255),
                    url_slug: article.url_slug.slice(0, 255),
                    meta_description: article.meta_description.slice(0, 255),
                    tldr: article.tldr.slice(0, 1000),
                    keywords: JSON.parse(JSON.stringify(article.keywords || [])),
                    schema_type: article.schema_type || 'Legislation',
                    markdown_body: article.markdown_body.slice(0, 50000),
                    sponsor_data: JSON.parse(JSON.stringify(sponsorFunds || {})),
                    news_context: JSON.parse(JSON.stringify(newsContext || [])).slice(0, 5),
                    policy_research: JSON.parse(JSON.stringify(policyResearch || [])).slice(0, 3),
                    congress_gov_url: bill.congressGovUrl,
                    is_published: true
                });

            if (insertError) {
                console.error(`DB Insert Error for ${bill.bill_id}:`, insertError.message);
            } else {
                processedBills.push(bill.bill_id);

                // --- NORMAL OPERATION: Process up to 3 per run ---
                console.log(`SUCCESS: Published ${bill.bill_id}.`);
                if (processedBills.length >= 3) {
                    console.log("Batch limit reached (3). Stopping session.");
                    break;
                }
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        
        // Revalidate cache after 2 minutes to allow jobs to finish
        if (processedBills.length > 0) {
            setTimeout(() => {
                try {
                    // Revalidate homepage and legislation pages (sitemap will pick up changes)
                    revalidatePath('/');
                    revalidatePath('/legislation-summary');
                    // Also revalidate all individual article pages
                    processedBills.forEach(billId => {
                        const slug = billId.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
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

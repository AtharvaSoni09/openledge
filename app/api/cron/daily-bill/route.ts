import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchRecentBills } from '@/lib/agents/congress';
import { fetchSponsorFunds } from '@/lib/agents/openfec';
import { fetchNewsContext } from '@/lib/agents/newsdata';
import { fetchPolicyResearch } from '@/lib/agents/exa';
import { synthesizeLegislation } from '@/lib/agents/openai';

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
        // 2. Fetch Recent Bills
        console.log("Stage 2: Fetching Recent Bills (Limit 10)...");
        const bills = await fetchRecentBills(10);

        if (!bills || bills.length === 0) {
            console.log("Stage 2: No bills found.");
            return NextResponse.json({ message: "No bills found." }, { status: 200 });
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

            const [sponsorFunds, newsContext, policyResearch] = await Promise.all([
                safeFetch("SponsorFunds", bill.sponsors && bill.sponsors.length > 0
                    ? fetchSponsorFunds(bill.sponsors[0].name)
                    : Promise.resolve(null)),
                safeFetch("News", fetchNewsContext(searchQuery)),
                safeFetch("Policy", fetchPolicyResearch(searchQuery))
            ]);

            // 5. Synthesis Phase
            const article = await synthesizeLegislation(
                bill.title,
                bill.title,
                sponsorFunds,
                newsContext,
                policyResearch,
                bill.congressGovUrl
            );

            if (!article) {
                console.error(`Failed synthesis for ${bill.bill_id}`);
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
                    seo_title: article.seo_title.slice(0, 255),
                    url_slug: article.url_slug.slice(0, 255),
                    meta_description: article.meta_description.slice(0, 255),
                    tldr: article.tldr.slice(0, 1000),
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
            }
        }

        const duration = (Date.now() - startTime) / 1000;
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

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { scoreBillForGoal } from '@/lib/agents/relevance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min

/* ------------------------------------------------------------------
   Nightly Scoring Cron (3 AM)
   Scores only NEW bills (created in the last 48h) against every
   subscriber's goal. Runs after the daily-bill cron has finished
   adding new legislation, so all fresh bills are already in the DB.
   New matches appear with a blue "New match" badge in the dashboard.
   ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    console.log('CRON: Nightly Scoring started');

    // Security
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = getSupabaseAdmin();

        // 1. Get bills from last 48 hours
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data: recentBills } = await (supabase as any)
            .from('legislation')
            .select('id, bill_id, title, tldr, source, state_code')
            .eq('is_published', true)
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false });

        if (!recentBills || recentBills.length === 0) {
            return NextResponse.json({ message: 'No recent bills to score', duration: `${(Date.now() - startTime) / 1000}s` });
        }

        console.log(`Found ${recentBills.length} recent bills to score`);

        // 2. Get all subscribers with goals
        const { data: subscribers } = await (supabase as any)
            .from('subscribers')
            .select('id, org_goal, state_focus, search_interests')
            .not('org_goal', 'is', null);

        if (!subscribers || subscribers.length === 0) {
            return NextResponse.json({ message: 'No subscribers to score against' });
        }

        console.log(`Scoring against ${subscribers.length} subscribers`);

        // 3. Get all existing matches for these bills to avoid re-scoring
        const recentBillIds = recentBills.map((b: any) => b.id);
        const { data: existingMatches } = await (supabase as any)
            .from('bill_matches')
            .select('subscriber_id, legislation_id')
            .in('legislation_id', recentBillIds);

        const matchSet = new Set(
            (existingMatches || []).map((m: any) => `${m.subscriber_id}:${m.legislation_id}`)
        );

        // 4. Score bills against subscribers — SEQUENTIAL to avoid rate limits
        let newMatches = 0;
        let scored = 0;

        for (const sub of subscribers) {
            // Timeout safeguard
            if (Date.now() - startTime > 250000) {
                console.log('Nightly scoring: timeout safeguard, stopping early');
                break;
            }

            // Build combined goal from org_goal + search_interests
            const allInterests: string[] = [sub.org_goal];
            const searchInterests: string[] = sub.search_interests || [];
            for (const interest of searchInterests) {
                if (interest && interest.toLowerCase() !== sub.org_goal.toLowerCase()) {
                    allInterests.push(interest);
                }
            }
            const combinedGoal = allInterests.join('; ');

            // Filter bills not yet matched for this subscriber
            const billsToScore = recentBills.filter((b: any) => {
                if (matchSet.has(`${sub.id}:${b.id}`)) return false;
                if (b.source === 'state' && b.state_code && sub.state_focus !== 'US' && sub.state_focus !== b.state_code) {
                    return false;
                }
                return true;
            });

            if (billsToScore.length === 0) continue;

            console.log(`Scoring ${billsToScore.length} bills for subscriber ${sub.id}`);

            // Score ONE bill at a time with delay
            for (const bill of billsToScore) {
                if (Date.now() - startTime > 250000) break;

                try {
                    const billText = bill.tldr || bill.title;
                    const result = await scoreBillForGoal(bill.title, billText, combinedGoal);
                    scored++;

                    if (result.match_score > 0) {
                        await (supabase as any)
                            .from('bill_matches')
                            .upsert({
                                subscriber_id: sub.id,
                                legislation_id: bill.id,
                                match_score: result.match_score,
                                summary: result.summary || null,
                                why_it_matters: result.why_it_matters || null,
                                implications: result.implications || null,
                                notified: false,
                            }, { onConflict: 'subscriber_id,legislation_id' });
                        newMatches++;
                    }
                } catch (err: any) {
                    console.error(`Score error for bill ${bill.bill_id}:`, err.message);
                    // If rate limited, wait longer and continue
                    if (err.message?.includes('rate') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 10000));
                    }
                }

                // 2s delay between each scoring call
                await new Promise(r => setTimeout(r, 2000));
            }

            // 3s pause between subscribers
            await new Promise(r => setTimeout(r, 3000));
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`Nightly scoring complete: ${scored} scored, ${newMatches} new matches in ${duration}s`);

        return NextResponse.json({
            success: true,
            scored,
            newMatches,
            subscribers: subscribers.length,
            bills: recentBills.length,
            duration: `${duration}s`,
        });

    } catch (error: any) {
        console.error('Nightly scoring error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

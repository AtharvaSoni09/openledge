import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fullRelevanceCheck } from '@/lib/agents/relevance';

export const maxDuration = 60;

/**
 * POST /api/match-explain
 *
 * Generates the "Why it matters" and "Implications" analysis for a bill
 * that was previously quick-scored (e.g. via Explore) but lacks the full explanation.
 *
 * Body: { bill_id: string, email: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { bill_id, email } = await req.json();

        if (!bill_id || !email) {
            return NextResponse.json({ error: 'Bill ID and email required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Get subscriber and their goal(s)
        const { data: subscriber } = await (supabase as any)
            .from('subscribers')
            .select('id, org_goal, search_interests')
            .eq('email', email.toLowerCase().trim())
            .single();

        if (!subscriber) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        // Combine all interests into a single matching string
        const allInterests: string[] = [subscriber.org_goal];
        const searchInterests: string[] = subscriber.search_interests || [];
        for (const interest of searchInterests) {
            if (interest && interest.toLowerCase() !== subscriber.org_goal.toLowerCase()) {
                allInterests.push(interest);
            }
        }
        const combinedGoal = allInterests.join('; ');

        // Get the bill details
        const { data: bill } = await (supabase as any)
            .from('legislation')
            .select('title, tldr')
            .eq('id', bill_id)
            .single();

        if (!bill) {
            return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
        }

        // Run full relevance check
        const billText = bill.tldr || bill.title;
        const result = await fullRelevanceCheck(bill.title, billText, combinedGoal);

        if (!result) {
            return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
        }

        // Update the existing match with the new details
        // (upsert ensures we don't fail if the match row was somehow deleted)
        await (supabase as any)
            .from('bill_matches')
            .upsert(
                {
                    subscriber_id: subscriber.id,
                    legislation_id: bill_id,
                    match_score: result.match_score, // Update score too, just in case
                    summary: result.summary,
                    why_it_matters: result.why_it_matters,
                    implications: result.implications,
                },
                { onConflict: 'subscriber_id,legislation_id' },
            );

        return NextResponse.json({
            match_score: result.match_score,
            summary: result.summary,
            why_it_matters: result.why_it_matters,
            implications: result.implications,
        });
    } catch (error: any) {
        console.error('Match-explain error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

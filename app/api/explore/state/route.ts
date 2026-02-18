import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchStateBills } from '@/lib/agents/legiscan';
import { scoreBillForGoal } from '@/lib/agents/relevance';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { email, state } = await req.json();

        if (!email || !state) {
            return NextResponse.json({ error: 'Email and state required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Get Subscriber
        const { data: subscriber } = await (supabase as any)
            .from('subscribers')
            .select('id, org_goal, search_interests')
            .eq('email', email.toLowerCase())
            .single();

        if (!subscriber) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        // 2. Fetch State Bills from LegiScan
        const stateBills = await fetchStateBills(state, 25); // Fetch top 25 recent bills

        if (stateBills.length === 0) {
            return NextResponse.json({ message: 'No bills found for this state', added: 0 });
        }

        // 3. Score against Goal
        const goal = subscriber.org_goal;
        let addedCount = 0;

        const results = await Promise.allSettled(
            stateBills.map(async (b) => {
                // Check if already in DB
                const { data: existing } = await (supabase as any)
                    .from('legislation')
                    .select('id')
                    .eq('bill_id', b.bill_id) // LegiScan ID is unique
                    .single();

                let legId = existing?.id;

                // If not in DB, insert it
                if (!legId) {
                    const { data: newBill, error: insertError } = await (supabase as any)
                        .from('legislation')
                        .insert({
                            bill_id: b.bill_id,
                            title: b.title,
                            description: b.description,
                            state_code: b.state,
                            status: b.status,
                            status_date: b.status_date,
                            url: b.url,
                            source: 'legiscan',
                            is_published: true,
                            latest_action: { text: b.last_action, date: b.last_action_date },
                        })
                        .select('id')
                        .single();

                    if (!insertError && newBill) {
                        legId = newBill.id;
                    }
                }

                if (!legId) return null;

                // Score it
                const scoreResult = await scoreBillForGoal(b.title, b.description || b.title, goal);

                if (scoreResult.match_score >= 40) { // Threshold for "relating"
                    // Determine state name for match source
                    const interestName = `State: ${state.toUpperCase()}`;
                    const summaryText = `Matched via interest: "${interestName}". ${scoreResult.summary}`;

                    await (supabase as any)
                        .from('bill_matches')
                        .upsert({
                            subscriber_id: subscriber.id,
                            legislation_id: legId,
                            match_score: scoreResult.match_score,
                            summary: summaryText,
                            why_it_matters: scoreResult.why_it_matters,
                            implications: scoreResult.implications,
                            notified: false
                        }, { onConflict: 'subscriber_id,legislation_id' });

                    return true;
                }
                return false;
            })
        );

        addedCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;

        // 4. Add State to Interests (if matches founds)
        if (addedCount > 0) {
            const interestName = `State: ${state.toUpperCase()}`;
            const currentInterests = subscriber.search_interests || [];
            if (!currentInterests.includes(interestName)) {
                await (supabase as any)
                    .from('subscribers')
                    .update({ search_interests: [...currentInterests, interestName] })
                    .eq('id', subscriber.id);
            }
        }

        return NextResponse.json({ success: true, added: addedCount, state: state.toUpperCase() });

    } catch (error: any) {
        console.error('Explore state error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

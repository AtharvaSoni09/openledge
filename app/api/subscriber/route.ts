import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeStateCode } from '@/lib/utils/states';

export async function PATCH(req: NextRequest) {
    try {
        const { email, org_goal, state_focus } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Fetch current subscriber
        const { data: subscriber } = await (supabase as any)
            .from('subscribers')
            .select('id, org_goal, state_focus')
            .eq('email', email.toLowerCase())
            .single();

        if (!subscriber) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        const updates: any = {};
        let goalChanged = false;

        // Check Goal Change
        if (org_goal && org_goal !== subscriber.org_goal) {
            updates.org_goal = org_goal.trim();
            goalChanged = true;
        }

        // Check State Change
        if (state_focus) {
            const code = normalizeStateCode(state_focus);
            if (code && code !== subscriber.state_focus) {
                updates.state_focus = code;
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ message: 'No changes detected' });
        }

        // 2. Update Subscriber
        const { error: updateError } = await (supabase as any)
            .from('subscribers')
            .update(updates)
            .eq('id', subscriber.id);

        if (updateError) {
            return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        }

        // 3. If Goal Changed -> Wipe matches matches to trigger re-analysis
        if (goalChanged) {
            // Delete existing automatic matches (keep manual interests? maybe, but usually tied to goal)
            // We'll delete ALL matches to be safe and start fresh for the main feed.
            await (supabase as any)
                .from('bill_matches')
                .delete()
                .eq('subscriber_id', subscriber.id);

            // Trigger match-existing asynchronously (fire and forget for this request)
            // or client can trigger it upon refresh.
            // We'll let the client refresh trigger the auto-matching logic in DashboardClient.
        }

        return NextResponse.json({ success: true, goalChanged });
    } catch (error: any) {
        console.error('Subscriber update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

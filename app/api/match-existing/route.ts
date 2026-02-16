import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { scoreBillForGoal } from '@/lib/agents/relevance';

export const maxDuration = 300; // allow up to 5 minutes for slower throttled processing

/**
 * POST /api/match-existing
 *
 * Matches ALL existing legislation in the database against a subscriber's
 * organizational goal. Called after onboarding or when a user has no matches.
 *
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get subscriber (include search_interests if available)
    const { data: subscriber } = await (supabase as any)
      .from('subscribers')
      .select('id, org_goal, search_interests')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!subscriber?.org_goal) {
      return NextResponse.json({ error: 'Subscriber not found or no goal set' }, { status: 404 });
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

    // Get all published legislation
    const { data: bills } = await (supabase as any)
      .from('legislation')
      .select('id, bill_id, title, tldr')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!bills || bills.length === 0) {
      return NextResponse.json({ matched: 0, total: 0, message: 'No bills in database' });
    }

    // Get existing matches so we don't re-score
    const { data: existingMatches } = await (supabase as any)
      .from('bill_matches')
      .select('legislation_id')
      .eq('subscriber_id', subscriber.id);

    const alreadyMatched = new Set((existingMatches || []).map((m: any) => m.legislation_id));
    const billsToScore = bills.filter((b: any) => !alreadyMatched.has(b.id));

    if (billsToScore.length === 0) {
      return NextResponse.json({
        matched: (existingMatches || []).length,
        total: bills.length,
        scored: 0,
        message: 'All bills already scored',
      });
    }

    // Score bills in parallel batches
    const BATCH_SIZE = 5;
    let newMatches = 0;
    let scored = 0;
    const startTime = Date.now();

    for (let i = 0; i < billsToScore.length; i += BATCH_SIZE) {
      // Timeout safeguard: if running for > 50s, stop to avoid Vercel timeout (60s limit)
      if (Date.now() - startTime > 50000) {
        console.log('Match-existing: Timeout safeguard triggered. Stopping early.');
        break;
      }

      const batch = billsToScore.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (bill: any) => {
          const billText = bill.tldr || bill.title;
          const result = await scoreBillForGoal(bill.title, billText, combinedGoal);
          return { bill, result };
        }),
      );

      for (const res of results) {
        scored++;
        if (res.status !== 'fulfilled') continue;

        const { bill, result } = res.value;
        if (result.match_score > 0) {
          await (supabase as any)
            .from('bill_matches')
            .upsert(
              {
                subscriber_id: subscriber.id,
                legislation_id: bill.id,
                match_score: result.match_score,
                summary: result.summary || null,
                why_it_matters: result.why_it_matters || null,
                implications: result.implications || null,
                notified: false,
              },
              { onConflict: 'subscriber_id,legislation_id' },
            );
          newMatches++;
        }
      }

      // 2s delay between batches to stay under rate limits while processing faster
      if (i + BATCH_SIZE < billsToScore.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return NextResponse.json({
      matched: newMatches,
      scored,
      total: bills.length,
      message: `Scored ${scored} bills, found ${newMatches} matches`,
    });
  } catch (error: any) {
    console.error('Match-existing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { scoreBillForGoal } from '@/lib/agents/relevance';

export const maxDuration = 120; // allow up to 2 minutes on Vercel

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

    // Get subscriber
    const { data: subscriber } = await (supabase as any)
      .from('subscribers')
      .select('id, org_goal')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!subscriber?.org_goal) {
      return NextResponse.json({ error: 'Subscriber not found or no goal set' }, { status: 404 });
    }

    // Get all published legislation
    const { data: bills } = await (supabase as any)
      .from('legislation')
      .select('id, bill_id, title, tldr')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(100);

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

    // Score bills in parallel batches of 5 (to respect Groq rate limits)
    const BATCH_SIZE = 5;
    let newMatches = 0;
    let scored = 0;

    for (let i = 0; i < billsToScore.length; i += BATCH_SIZE) {
      const batch = billsToScore.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (bill: any) => {
          const billText = bill.tldr || bill.title;
          const result = await scoreBillForGoal(bill.title, billText, subscriber.org_goal);
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

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < billsToScore.length) {
        await new Promise((r) => setTimeout(r, 500));
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

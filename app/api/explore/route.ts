import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { quickRelevanceScore } from '@/lib/agents/relevance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { email, query } = await req.json();

    if (!email || !query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
    }

    const trimmedQuery = query.trim();
    const supabase = getSupabaseAdmin();

    // Get subscriber
    const { data: subscriber } = await (supabase as any)
      .from('subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    // Fetch all published bills (limit 45 to avoid timeouts with 30 RPM limit)
    // 45 bills / 2 batch = ~23 batches * 4s delay = ~92s processing time. Fit in 300s.
    const { data: bills } = await (supabase as any)
      .from('legislation')
      .select('id, bill_id, title, seo_title, url_slug, tldr, status, status_date, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(45);

    if (!bills || bills.length === 0) {
      return NextResponse.json({ results: [], query: trimmedQuery });
    }

    // AI-score all bills against the query in batches
    const scored: { bill: any; score: number }[] = [];
    const BATCH_SIZE = 5; // Optimized for speed (5 concurrent requests)

    for (let i = 0; i < bills.length; i += BATCH_SIZE) {
      const batch = bills.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (bill: any) => {
          const text = bill.tldr || bill.title;
          const score = await quickRelevanceScore(bill.title, text, trimmedQuery);
          return { bill, score };
        }),
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.score > 0) {
          scored.push(r.value);
        }
      }

      // 2s delay between batches to stay under rate limits (approx 60 RPM burst)
      if (i + BATCH_SIZE < bills.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Sort by score descending, take top 20 with score >= 25
    scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    const topResults = scored
      .filter((s: { score: number }) => s.score >= 25)
      .slice(0, 20)
      .map((s: { bill: any; score: number }) => ({
        ...s.bill,
        explore_score: s.score,
      }));

    return NextResponse.json({
      results: topResults,
      query: trimmedQuery,
      total_scored: bills.length,
    });
  } catch (error: any) {
    console.error('Explore error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

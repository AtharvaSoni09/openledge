import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, action } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: subscriber } = await (supabase as any)
      .from('subscribers')
      .select('id, org_goal')
      .eq('email', email.toLowerCase())
      .single();

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    // ── ADD: add a topic to interests + save matching bills ──
    if (action === 'add') {
      const { topic, bill_ids, scores } = body;
      if (!topic || typeof topic !== 'string') {
        return NextResponse.json({ error: 'Topic required' }, { status: 400 });
      }

      // Append to search_interests (if column exists)
      try {
        const { data: subData } = await (supabase as any)
          .from('subscribers')
          .select('search_interests')
          .eq('id', subscriber.id)
          .single();
        const existing: string[] = subData?.search_interests || [];
        if (!existing.some((e: string) => e.toLowerCase() === topic.toLowerCase())) {
          await (supabase as any)
            .from('subscribers')
            .update({ search_interests: [...existing, topic] })
            .eq('id', subscriber.id);
        }
      } catch {
        // column doesn't exist yet
      }

      // Save matching bills to bill_matches
      if (Array.isArray(bill_ids) && bill_ids.length > 0) {
        const scoreMap: Record<string, number> = scores || {};
        for (const legId of bill_ids) {
          await (supabase as any)
            .from('bill_matches')
            .upsert(
              {
                subscriber_id: subscriber.id,
                legislation_id: legId,
                match_score: scoreMap[legId] || 50,
                summary: `Matched via interest: "${topic}"`,
                why_it_matters: null,
                implications: null,
                notified: false,
              },
              { onConflict: 'subscriber_id,legislation_id' },
            );
        }
      }

      return NextResponse.json({ success: true });
    }

    // ── REMOVE: remove a topic from interests + clean up bill_matches ──
    if (action === 'remove') {
      const { topic } = body;
      if (!topic || typeof topic !== 'string') {
        return NextResponse.json({ error: 'Topic required' }, { status: 400 });
      }

      // Remove from search_interests
      try {
        const { data: subData } = await (supabase as any)
          .from('subscribers')
          .select('search_interests')
          .eq('id', subscriber.id)
          .single();
        const existing: string[] = subData?.search_interests || [];
        const updated = existing.filter((i: string) => i !== topic);
        await (supabase as any)
          .from('subscribers')
          .update({ search_interests: updated })
          .eq('id', subscriber.id);
      } catch {
        // column doesn't exist yet
      }

      // Delete bill_matches that were created from this explore topic
      await (supabase as any)
        .from('bill_matches')
        .delete()
        .eq('subscriber_id', subscriber.id)
        .like('summary', `%"${topic}"%`);

      return NextResponse.json({ success: true });
    }

    // ── UPDATE (bulk replace) — used as fallback ──
    if (action === 'update' && Array.isArray(body.interests)) {
      await (supabase as any)
        .from('subscribers')
        .update({ search_interests: body.interests })
        .eq('id', subscriber.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Interests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

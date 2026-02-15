import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, legislation_id, action } = await req.json();

    if (!email || !legislation_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get subscriber
    const { data: sub } = await (supabase as any)
      .from('subscribers')
      .select('id')
      .eq('email', email)
      .single();

    if (!sub) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (action === 'unstar') {
      await (supabase as any)
        .from('starred_bills')
        .delete()
        .eq('subscriber_id', sub.id)
        .eq('legislation_id', legislation_id);

      return NextResponse.json({ starred: false });
    }

    if (action === 'dismiss_update') {
      await (supabase as any)
        .from('starred_bills')
        .update({ has_update: false })
        .eq('subscriber_id', sub.id)
        .eq('legislation_id', legislation_id);

      return NextResponse.json({ dismissed: true });
    }

    // Star (upsert — ignore conflict)
    const { error } = await (supabase as any)
      .from('starred_bills')
      .upsert(
        { subscriber_id: sub.id, legislation_id },
        { onConflict: 'subscriber_id,legislation_id' },
      );

    if (error) {
      console.error('Star error:', error);
      return NextResponse.json({ error: 'Failed to star' }, { status: 500 });
    }

    return NextResponse.json({ starred: true });
  } catch (err: any) {
    console.error('Star API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

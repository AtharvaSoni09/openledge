import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@') || email.length < 5) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: subscriber } = await (supabase as any)
      .from('subscribers')
      .select('id, email, org_goal, state_focus')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!subscriber) {
      return NextResponse.json(
        { error: 'No account found with that email. Try signing up instead.' },
        { status: 404 },
      );
    }

    if (!subscriber.org_goal) {
      return NextResponse.json(
        { error: 'Account found but onboarding is incomplete. Please sign up again.' },
        { status: 400 },
      );
    }

    // Set auth cookies
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const response = NextResponse.json({
      success: true,
      message: 'Signed in',
    });

    response.cookies.set('is_authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/',
    });

    response.cookies.set('subscriber_email', subscriber.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/',
    });

    // Update last_seen
    await (supabase as any)
      .from('subscribers')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', subscriber.id);

    return response;
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

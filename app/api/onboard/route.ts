import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeStateCode } from '@/lib/utils/states';

export async function POST(req: NextRequest) {
  try {
    const { email, org_goal, state_focus, accepted_terms_at } = await req.json();

    // Validate
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length < 5) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (!org_goal || typeof org_goal !== 'string' || org_goal.trim().length < 3) {
      return NextResponse.json({ error: 'Please describe your organizational goal' }, { status: 400 });
    }
    const stateCode = normalizeStateCode(state_focus || '');
    if (!stateCode) {
      return NextResponse.json({ error: 'Invalid state selection' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if this email already exists
    const { data: existing } = await (supabase as any)
      .from('subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      // Update their profile with the new goal + state
      const updatePayload: any = {
        org_goal: org_goal.trim(),
        state_focus: stateCode,
        last_seen: new Date().toISOString(),
      };
      if (accepted_terms_at) updatePayload.accepted_terms_at = accepted_terms_at;

      const { error: updateError } = await (supabase as any)
        .from('subscribers')
        .update(updatePayload)
        .eq('id', existing.id);

      if (updateError) {
        console.error('Onboard update error:', updateError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
    } else {
      // Create new subscriber with goal + state
      const { error: insertError } = await (supabase as any)
        .from('subscribers')
        .insert({
          email: email.toLowerCase(),
          org_goal: org_goal.trim(),
          state_focus: stateCode,
          subscription_source: 'onboarding',
          preferences: { frequency: 'realtime' },
          accepted_terms_at: accepted_terms_at || new Date().toISOString(),
          search_interests: [org_goal.trim()],
        });

      if (insertError) {
        console.error('Onboard insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }
    }

    // Set auth cookies so the rest of the app recognizes them
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const response = NextResponse.json({
      success: true,
      message: existing ? 'Profile updated' : 'Profile created',
    });

    response.cookies.set('is_authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/',
    });

    response.cookies.set('subscriber_email', email.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Onboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

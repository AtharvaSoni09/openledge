import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Database } from '@/types';
import { createClient } from '@supabase/supabase-js';

type Subscriber = Database['public']['Tables']['subscribers']['Row'];

export async function POST(req: NextRequest) {
  try {
    const { email, preferences = {}, source = 'newsletter_page' } = await req.json();

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length < 5) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Check if already subscribed
    const supabase = getSupabaseAdmin();
    let existing;
    let error;

    if (supabase) {
      const result = await supabase
        .from('subscribers')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      existing = result.data;
      error = result.error;
    } else {
      // Fallback for development
      existing = null;
      error = new Error('Supabase admin not available');
    }

    if (existing) {
      // User is already subscribed, set authentication cookies
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);

      const response = NextResponse.json({
        success: true, // Always success for auth purposes
        message: 'Email already subscribed',
        alreadySubscribed: true
      }, { status: 200 });

      // Set authentication cookies
      response.cookies.set('is_authenticated', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires,
        path: '/'
      });

      response.cookies.set('subscriber_email', email.toLowerCase(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires,
        path: '/'
      });

      return response;
    }

    // Create new subscriber
    const { data: subscriber, error: insertError } = await (supabase as any)
      .from('subscribers')
      .insert({
        email: email.toLowerCase(),
        preferences,
        subscription_source: source
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    // Set authentication cookies for 30 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const response = NextResponse.json({
      success: true,
      message: 'Successfully subscribed',
      user: {
        email: email.toLowerCase(),
        isAuthenticated: true,
        isSubscribed: true
      }
    });

    // Set authentication cookies
    response.cookies.set('is_authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/'
    });

    response.cookies.set('subscriber_email', email.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

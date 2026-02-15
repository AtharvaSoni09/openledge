import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    // Validate input
    if (!email || !password || email.length < 3 || password.length < 3) {
      return NextResponse.json({ 
        error: 'Invalid email or password' 
      }, { status: 400 });
    }

    // Check credentials against Supabase
    const supabaseAdmin = getSupabaseAdmin();
    const { data: user, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return NextResponse.json({ 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const response = NextResponse.json({
      data: {
        user: {
          id: user.user.id,
          email: user.user.email,
          user_metadata: user.user.user_metadata
        },
        session: user.session
      },
      success: true
    });

    // Align with cookie-based auth used across the app.
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

  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

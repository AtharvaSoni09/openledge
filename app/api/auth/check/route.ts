import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Check for authentication cookie
    const isAuthenticated = req.cookies.get('is_authenticated')?.value === 'true';
    
    // Check for subscriber email
    const subscriberEmail = req.cookies.get('subscriber_email')?.value;
    
    // Determine user status
    let userStatus = 'anonymous';
    let requiresAction = false;
    
    if (isAuthenticated && subscriberEmail) {
      userStatus = 'subscribed';
    } else if (isAuthenticated && !subscriberEmail) {
      userStatus = 'authenticated';
    } else if (subscriberEmail && !isAuthenticated) {
      userStatus = 'subscribed_needs_auth';
      requiresAction = true;
    }
    
    return NextResponse.json({ 
      authenticated: isAuthenticated,
      user_status: userStatus,
      subscriber_email: subscriberEmail || null,
      requires_action: requiresAction,
      user: isAuthenticated && subscriberEmail ? {
        email: subscriberEmail,
        isAuthenticated: true,
        isSubscribed: userStatus === 'subscribed'
      } : null
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      authenticated: false,
      user_status: 'error',
      user: null
    }, { status: 500 });
  }
}

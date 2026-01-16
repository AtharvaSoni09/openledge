import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Lazy initialization for public client
let _supabasePublic: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabasePublic = (): ReturnType<typeof createClient<Database>> => {
    if (!_supabasePublic) {
        console.log('Environment check:', {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
            NODE_ENV: process.env.NODE_ENV
        });
        
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            console.error('NEXT_PUBLIC_SUPABASE_URL is required for public operations');
            throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
        }
        if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for public operations');
            throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
        }
        _supabasePublic = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }
    return _supabasePublic as any;
};

// Backward compatibility export
export const supabasePublic = getSupabasePublic;

// Lazy initialization for admin client (only used in API routes)
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseAdmin = (): ReturnType<typeof createClient<Database>> => {
    if (!_supabaseAdmin) {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
            // Return a dummy client for development
            _supabaseAdmin = createClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ) as any;
        } else {
            _supabaseAdmin = createClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
            );
        }
    }
    return _supabaseAdmin as any;
};

// Also export the function as supabaseAdmin for backward compatibility
export const supabaseAdmin = getSupabaseAdmin;

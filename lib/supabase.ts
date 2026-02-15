import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'

// Lazy initialization for public client
let _supabasePublic: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabasePublic = (): ReturnType<typeof createClient<Database>> => {
    if (!_supabasePublic) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Missing Supabase environment variables:', {
                NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'SET' : 'NOT SET',
                NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'NOT SET',
                NODE_ENV: process.env.NODE_ENV
            });
            throw new Error('Supabase environment variables are not properly configured');
        }

        _supabasePublic = createClient<Database>(supabaseUrl, supabaseAnonKey);
    }
    return _supabasePublic;
};

// Backward compatibility export
export const supabasePublic = getSupabasePublic;

// Lazy initialization for admin client (only used in API routes)
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseAdmin = (): ReturnType<typeof createClient<Database>> => {
    if (!_supabaseAdmin) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing required Supabase admin environment variables');
        }

        _supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey);
    }
    return _supabaseAdmin;
};

// Also export the function as supabaseAdmin for backward compatibility
export const supabaseAdmin = getSupabaseAdmin;

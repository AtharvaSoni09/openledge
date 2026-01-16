import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Client for the frontend (public/anon)
export const supabasePublic = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Note: Using Service Role for the backend agent.

console.log("Initializing Supabase Admin with:", supabaseUrl ? "URL Present" : "URL Missing");

// Client for the backend agent (has admin rights)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey)

// Client for the frontend (public/anon) - we can export this separately if needed
// but for now most operations are agentic.
export const supabasePublic = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

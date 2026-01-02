
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase keys in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking legislation table schema...");

    // 1. Try to select one row to see columns
    const { data, error } = await supabase.from('legislation').select('*').limit(1);

    if (error) {
        console.error("Error fetching columns:", error.message);
        console.log("Maybe the table doesn't exist yet?");
    } else {
        if (data.length > 0) {
            console.log("Table exists. Columns found in first row:", Object.keys(data[0]));
        } else {
            console.log("Table exists but is empty. Trying to find column names via RPC or error message...");
            // Try an intentional error to see allowed columns
            const { error: insertError } = await supabase.from('legislation').insert({ non_existent_column: true });
            console.log("Intentional error message (might contain column info):", insertError?.message);
        }
    }
}

checkSchema();

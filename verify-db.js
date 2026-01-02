
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
    console.log("Checking connection to:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Check Table
    const { data, error } = await supabase.from('legislation').select('count', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Database Error:");
        console.error(error);

        if (error.code === '42P01') { // undefined_table
            console.log("\n⚠️  TABLE MISSING: The 'legislation' table does not exist.");
            console.log("👉 Pleas go to the Supabase SQL Editor and run the creation script.");
        }
    } else {
        console.log("✅ Database Connected. 'legislation' table exists.");
    }
}

verify();

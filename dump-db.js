
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpBills() {
    const { data, error } = await supabase.from('legislation').select('bill_id, url_slug, title').limit(5);
    if (error) {
        console.error(error);
    } else {
        console.log("Bills in DB:", JSON.stringify(data, null, 2));
    }
}

dumpBills();

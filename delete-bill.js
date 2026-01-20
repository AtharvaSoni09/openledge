// Script to delete a specific bill by its URL slug or ID
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteBill(slugOrId) {
    console.log(`Attempting to delete bill: ${slugOrId}`);

    // Try to find by slug
    let { data: bill, error } = await supabase
        .from('legislation')
        .select('id, title, bill_id')
        .eq('url_slug', slugOrId)
        .single();

    if (error || !bill) {
        // Try to find by bill_id
        ({ data: bill, error } = await supabase
            .from('legislation')
            .select('id, title, bill_id')
            .eq('bill_id', slugOrId)
            .single());
    }

    if (error || !bill) {
        console.error(`Could not find bill: ${slugOrId}`);
        return;
    }

    console.log(`Found bill: ${bill.title} (${bill.bill_id})`);

    const { error: deleteError } = await supabase
        .from('legislation')
        .delete()
        .eq('id', bill.id);

    if (deleteError) {
        console.error('Error deleting bill:', deleteError);
    } else {
        console.log(`Successfully deleted bill: ${bill.bill_id}`);
    }
}

// Get the slug from command line arguments
const target = process.argv[2];
if (!target) {
    console.error('Please provide a slug or bill ID to delete');
    process.exit(1);
}

deleteBill(target);

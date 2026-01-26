
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteBill(identifier) {
    console.log(`Attempting to delete bill: ${identifier}`);

    // Try by slug first
    let { data, error } = await supabase
        .from('legislation')
        .delete()
        .eq('url_slug', identifier)
        .select();

    if (error) {
        console.error('Error deleting by slug:', error);
    } else if (data && data.length > 0) {
        console.log('Successfully deleted by slug:', data[0].bill_id);
        return;
    }

    // Try by bill_id
    ({ data, error } = await supabase
        .from('legislation')
        .delete()
        .eq('bill_id', identifier)
        .select());

    if (error) {
        console.error('Error deleting by bill_id:', error);
    } else if (data && data.length > 0) {
        console.log('Successfully deleted by bill_id:', data[0].bill_id);
    } else {
        console.log('No bill found with that identifier.');
    }
}

const id = process.argv[2];
if (!id) {
    console.log('Usage: node delete-bill.js <url_slug_or_bill_id>');
} else {
    deleteBill(id);
}

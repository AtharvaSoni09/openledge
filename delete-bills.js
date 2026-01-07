const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Bills to delete
const BILLS_TO_DELETE = [
  'HR3496-119',
  'HR6021-119', 
  'HR2869-119',
  'HR4930-119'
];

// Delete a single bill
async function deleteBill(billId) {
  try {
    console.log(`🗑️ Deleting bill: ${billId}`);
    
    const { error } = await supabaseAdmin
      .from('legislation')
      .delete()
      .eq('bill_id', billId);

    if (error) {
      throw new Error(`Failed to delete ${billId}: ${error.message}`);
    }

    console.log(`✅ Successfully deleted ${billId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting ${billId}:`, error);
    return false;
  }
}

// Main function to delete specified bills
async function deleteBills() {
  console.log('🚀 Starting deletion of specified bills...');
  console.log(`Target bills:`, BILLS_TO_DELETE);

  let successCount = 0;
  let failureCount = 0;

  // Delete each bill
  for (let i = 0; i < BILLS_TO_DELETE.length; i++) {
    const billId = BILLS_TO_DELETE[i];
    console.log(`\n📝 Deleting bill ${i + 1}/${BILLS_TO_DELETE.length}: ${billId}`);
    
    const success = await deleteBill(billId);
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(`\n✨ Deletion complete!`);
  console.log(`✅ Successfully deleted: ${successCount} bills`);
  console.log(`❌ Failed to delete: ${failureCount} bills`);
}

// Run the deletion
deleteBills().catch(console.error);

// Simple script to delete bills using existing API

// Bills to delete
const BILLS_TO_DELETE = [
  'HR3496-119',
  'HR6021-119', 
  'HR2869-119',
  'HR4930-119'
];

// Delete a single bill via API
async function deleteBill(billId) {
  try {
    console.log(`🗑️ Deleting bill: ${billId}`);
    
    const response = await fetch('http://localhost:3000/api/delete-bill', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bill_id: billId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete ${billId}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Successfully deleted ${billId}:`, result.message);
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

  // Delete each bill with a small delay between requests
  for (let i = 0; i < BILLS_TO_DELETE.length; i++) {
    const billId = BILLS_TO_DELETE[i];
    console.log(`\n📝 Deleting bill ${i + 1}/${BILLS_TO_DELETE.length}: ${billId}`);
    
    const success = await deleteBill(billId);
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Small delay between deletions
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✨ Deletion complete!`);
  console.log(`✅ Successfully deleted: ${successCount} bills`);
  console.log(`❌ Failed to delete: ${failureCount} bills`);
}

// Run the deletion
deleteBills().catch(console.error);

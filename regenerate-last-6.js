// Delete HR6535-119 bill
const BILL_TO_DELETE = 'HR6535-119';

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

// Main function to delete the bill
async function deleteBillMain() {
  console.log('🚀 Starting bill deletion...');
  console.log(`Target bill:`, BILL_TO_DELETE);

  const success = await deleteBill(BILL_TO_DELETE);

  console.log(`\n✨ Deletion complete!`);
  console.log(`✅ Successfully deleted: ${success ? 'Yes' : 'No'}`);
}

// Run the deletion
deleteBillMain().catch(console.error);

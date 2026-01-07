// Simple script to regenerate last 6 articles using the existing API

// List of recent bill IDs to regenerate (you can update these based on your database)
const RECENT_BILL_IDS = [
  'HR6658-119',
  'HR6678-119', 
  'HR6680-119',
  'HR6681-119',
  'HR6682-119',
  'HR6683-119'
];

// Regenerate a single article
async function regenerateArticle(billId) {
  try {
    console.log(`📝 Starting regeneration for ${billId}...`);
    
    const response = await fetch('http://localhost:3000/api/regenerate-article', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bill_id: billId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to regenerate ${billId}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Successfully regenerated ${billId}:`, result.message);
    return result;
  } catch (error) {
    console.error(`❌ Error regenerating ${billId}:`, error);
    return null;
  }
}

// Main function to regenerate last 6 articles
async function regenerateLast6Articles() {
  console.log('🚀 Starting regeneration of last 6 articles...');
  console.log(`Target bills:`, RECENT_BILL_IDS);

  // Regenerate each bill with a small delay between requests
  for (let i = 0; i < RECENT_BILL_IDS.length; i++) {
    const billId = RECENT_BILL_IDS[i];
    console.log(`\n📝 Regenerating article ${i + 1}/${RECENT_BILL_IDS.length}: ${billId}`);
    
    const result = await regenerateArticle(billId);
    
    if (result) {
      console.log(`⏱️ Waiting 2 seconds before next article...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    } else {
      console.log(`⚠️ Failed to regenerate ${billId}, continuing with next...`);
    }
  }

  console.log('\n✨ Regeneration complete! Last 6 articles have been processed.');
}

// Run the regeneration
regenerateLast6Articles().catch(console.error);

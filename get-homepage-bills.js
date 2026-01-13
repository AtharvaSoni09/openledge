// Get actual recent bills by checking homepage
async function getActualRecentBills() {
  try {
    console.log('🔍 Getting actual recent bills from homepage...');
    
    const response = await fetch('http://localhost:3000/legislation-summary');
    const html = await response.text();
    
    // Extract bill IDs from HTML (simple approach)
    const billIdRegex = /\/legislation-summary\/([^"']+)/g;
    const matches = html.match(billIdRegex);
    
    if (matches) {
      const billIds = [...new Set(matches.map(match => match.split('/').pop()))];
      console.log('✅ Found bill IDs on homepage:');
      billIds.slice(0, 4).forEach((id, index) => {
        console.log(`${index + 1}. ${id}`);
      });
      return billIds.slice(0, 4);
    }
    
    console.log('⚠️ No bill IDs found on homepage');
    return [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Run the function
getActualRecentBills().catch(console.error);

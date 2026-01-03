// Test script to verify sitemap updates locally
import { revalidatePath } from 'next/cache';

async function testSitemapUpdate() {
  console.log('🧪 Testing sitemap update process...\n');
  
  try {
    // Simulate what happens after cron job completes
    const processedBills = ['HR6937-119', 'HR6643-119', 'HR6642-119'];
    
    console.log('📝 Simulating cron job completion with bills:', processedBills);
    
    // Simulate the 2-minute delay (but we'll do it immediately for testing)
    console.log('⏰ Simulating 2-minute delay (doing immediately for test)...');
    
    // Revalidate cache (same as cron job does)
    console.log('🔄 Revalidating cache paths...');
    
    revalidatePath('/');
    console.log('✅ Homepage revalidated');
    
    revalidatePath('/legislation-summary');
    console.log('✅ Legislation summary page revalidated');
    
    // Revalidate individual article pages
    processedBills.forEach(billId => {
      const slug = billId.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      revalidatePath(`/legislation-summary/${slug}`);
      console.log(`✅ Article page revalidated: /legislation-summary/${slug}`);
    });
    
    console.log('\n🎯 Test Results:');
    console.log('✅ All cache revalidation calls completed successfully');
    console.log('✅ No errors thrown during revalidatePath calls');
    console.log('\n📋 Next Steps:');
    console.log('1. Check if sitemap.xml updates within 5 minutes');
    console.log('2. Visit http://localhost:3000/sitemap.xml to verify');
    console.log('3. Look for new bill slugs in the sitemap');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Possible issues:');
    console.log('- Next.js dev server not running');
    console.log('- ISR not configured properly');
    console.log('- Cache headers not working');
  }
}

// Check if we're in a Next.js environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  testSitemapUpdate();
} else {
  console.log('❌ This test must be run in a Next.js development environment');
  console.log('💡 Run: npm run dev first, then: node test-sitemap-update.js');
}

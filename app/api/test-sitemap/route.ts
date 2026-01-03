// Test API endpoint to trigger sitemap revalidation
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(req: NextRequest) {
  console.log('🧪 Testing sitemap update process...\n');
  
  try {
    // Simulate what happens after cron job completes
    const processedBills = ['HR6937-119', 'HR6643-119', 'HR6642-119'];
    
    console.log('📝 Simulating cron job completion with bills:', processedBills);
    
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
    
    return NextResponse.json({
      success: true,
      message: 'Sitemap update test completed successfully',
      revalidatedPaths: [
        '/',
        '/legislation-summary',
        ...processedBills.map(billId => `/legislation-summary/${billId.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`)
      ],
      nextSteps: [
        'Check http://localhost:3000/sitemap.xml within 5 minutes',
        'Look for new bill slugs in the sitemap',
        'Verify individual article pages are accessible'
      ]
    });
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      possibleIssues: [
        'Next.js dev server not running',
        'ISR not configured properly',
        'Cache headers not working'
      ]
    }, { status: 500 });
  }
}

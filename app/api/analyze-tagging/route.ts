import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { categorizeBill, categories } from '@/lib/utils/categories';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Analyzing bill tagging system...');
    
    const supabase = getSupabaseAdmin();
    const { data: bills, error } = await supabase
      .from('legislation')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching bills:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const allBills = (bills as any[]) || [];
    console.log(`Found ${allBills.length} bills to analyze`);

    const techBills = [];
    const misTaggedBills = [];
    const categoryAnalysis: Record<string, any> = {};

    // Initialize category analysis
    categories.forEach(cat => {
      categoryAnalysis[cat.id] = {
        name: cat.name,
        bills: [],
        count: 0
      };
    });

    for (const bill of allBills) {
      const billCategories = categorizeBill(bill);
      const isTech = billCategories.some(cat => cat.id === 'technology-law');
      
      // Add to category analysis
      billCategories.forEach(cat => {
        categoryAnalysis[cat.id].bills.push({
          bill_id: bill.bill_id,
          title: bill.title
        });
        categoryAnalysis[cat.id].count++;
      });
      
      if (isTech) {
        techBills.push({
          bill_id: bill.bill_id,
          title: bill.title,
          categories: billCategories.map(c => c.name)
        });
      }

      // Check for potential mis-tagging
      const searchText = `${bill.title} ${bill.tldr} ${bill.meta_description}`.toLowerCase();
      const techKeywords = ['technology', 'tech', 'internet', 'digital', 'artificial intelligence', 'ai', 'cyber', 'data', 'privacy', 'online', 'social media', 'algorithm', 'software', 'computing', 'big tech'];
      const hasTechKeywords = techKeywords.some(keyword => searchText.includes(keyword));
      
      if (hasTechKeywords && !isTech) {
        misTaggedBills.push({
          bill_id: bill.bill_id,
          title: bill.title,
          currentCategories: billCategories.map(c => c.name),
          techKeywordsFound: techKeywords.filter(keyword => searchText.includes(keyword))
        });
      }
    }

    console.log('📊 TECHNOLOGY LAW BILLS:');
    console.log('========================');
    techBills.forEach((bill, index) => {
      console.log(`${index + 1}. ${bill.bill_id}: ${bill.title}`);
      console.log(`   Categories: ${bill.categories.join(', ')}`);
    });

    console.log('\n❌ POTENTIAL MIS-TAGGED BILLS:');
    console.log('==============================');
    if (misTaggedBills.length === 0) {
      console.log('No mis-tagged bills found! ✅');
    } else {
      misTaggedBills.forEach((bill, index) => {
        console.log(`${index + 1}. ${bill.bill_id}: ${bill.title}`);
        console.log(`   Current categories: ${bill.currentCategories.join(', ')}`);
        console.log(`   Tech keywords found: ${bill.techKeywordsFound.join(', ')}`);
      });
    }

    console.log(`\n📈 SUMMARY:`);
    console.log(`Total bills analyzed: ${allBills.length}`);
    console.log(`Technology Law bills: ${techBills.length}`);
    console.log(`Potential mis-tagged: ${misTaggedBills.length}`);

    return NextResponse.json({ 
      message: 'Tagging analysis completed',
      totalBills: allBills.length,
      techBillCount: techBills.length,
      misTaggedBillCount: misTaggedBills.length,
      categoryAnalysis: categoryAnalysis,
      techBillsList: techBills,
      misTaggedBillsList: misTaggedBills
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

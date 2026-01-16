import { supabasePublic } from './lib/supabase.ts';
import { categorizeBill, categories } from './lib/utils/categories.ts';

async function analyzeTagging() {
  console.log('🔍 Analyzing bill tagging system...\n');
  
  try {
    const { data: bills, error } = await supabasePublic()
      .from('legislation')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching bills:', error);
      return;
    }

    const allBills = bills || [];
    console.log(`Found ${allBills.length} bills to analyze\n`);

    const techBills = [];
    const misTaggedBills = [];

    for (const bill of allBills) {
      const billCategories = categorizeBill(bill);
      const isTech = billCategories.some(cat => cat.id === 'technology-law');
      
      if (isTech) {
        techBills.push({
          bill_id: bill.bill_id,
          title: bill.title,
          categories: billCategories.map(c => c.name)
        });
      }

      const searchText = `${bill.title} ${bill.tldr} ${bill.meta_description}`.toLowerCase();
      const hasTechKeywords = ['technology', 'tech', 'internet', 'digital', 'artificial intelligence', 'ai', 'cyber', 'data', 'privacy', 'online', 'social media', 'algorithm', 'software', 'computing', 'big tech'].some(keyword => searchText.includes(keyword));
      
      if (hasTechKeywords && !isTech) {
        misTaggedBills.push({
          bill_id: bill.bill_id,
          title: bill.title,
          currentCategories: billCategories.map(c => c.name)
        });
      }
    }

    console.log('📊 CURRENT TECHNOLOGY LAW BILLS:');
    console.log('==================================');
    techBills.forEach((bill, index) => {
      console.log(`${index + 1}. ${bill.bill_id}: ${bill.title}`);
      console.log(`   Categories: ${bill.categories.join(', ')}\n`);
    });

    console.log('❌ POTENTIAL MIS-TAGGED BILLS:');
    console.log('==============================');
    if (misTaggedBills.length === 0) {
      console.log('No mis-tagged bills found! ✅');
    } else {
      misTaggedBills.forEach((bill, index) => {
        console.log(`${index + 1}. ${bill.bill_id}: ${bill.title}`);
        console.log(`   Current categories: ${bill.currentCategories.join(', ')}\n`);
      });
    }

    console.log(`\n📈 SUMMARY:`);
    console.log(`Total bills analyzed: ${allBills.length}`);
    console.log(`Technology Law bills: ${techBills.length}`);
    console.log(`Potential mis-tagged: ${misTaggedBills.length}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeTagging();

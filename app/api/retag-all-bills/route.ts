import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { categorizeBill } from '@/lib/utils/categories';

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Retagging all bills with updated categorization system...');
    
    // Get all bills from database
    const supabase = supabaseAdmin();
    const { data: bills, error: fetchError } = await supabase
      .from('legislation')
      .select('bill_id, title, tldr, meta_description, keywords');

    if (fetchError) {
      console.error('Error fetching bills:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`Found ${bills?.length || 0} bills to retag`);

    let updateCount = 0;
    const results = [];
    const categoryStats: Record<string, number> = {};

    for (const bill of (bills as any[]) || []) {
      // Get new categories using updated system
      const newCategories = categorizeBill(bill);
      const categoryIds = newCategories.map(cat => cat.id);
      
      // Update category stats
      categoryIds.forEach(catId => {
        categoryStats[catId] = (categoryStats[catId] || 0) + 1;
      });

      console.log(`📝 ${bill.bill_id}: ${newCategories.map(c => c.name).join(', ')}`);

      // Update bill with new categories
      const { error: updateError } = await (supabase
        .from('legislation') as any)
        .update({
          categories: categoryIds
        })
        .eq('bill_id', bill.bill_id);

      if (updateError) {
        console.error(`❌ Failed to update ${bill.bill_id}:`, updateError);
        results.push({ bill_id: bill.bill_id, status: 'failed', error: updateError.message });
      } else {
        console.log(`✅ Successfully updated ${bill.bill_id}`);
        results.push({ 
          bill_id: bill.bill_id, 
          status: 'success', 
          newCategories: newCategories.map(c => c.name),
          categoryIds: categoryIds
        });
        updateCount++;
      }
    }

    console.log(`\n📊 CATEGORY BREAKDOWN:`);
    Object.entries(categoryStats).forEach(([catId, count]) => {
      console.log(`${catId}: ${count} bills`);
    });

    console.log(`\n✅ Completed. Updated ${updateCount} bills with new categorization`);

    return NextResponse.json({ 
      message: 'All bills retagged successfully',
      totalBills: bills?.length || 0,
      updatedBills: updateCount,
      categoryStats: categoryStats,
      results: results
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

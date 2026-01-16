import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Regenerating all bill titles with correct format...');
    
    // Get all existing bills from database
    const supabase = supabaseAdmin();
    const { data: bills, error: fetchError } = await supabase
      .from('legislation')
      .select('bill_id, title, seo_title');

    if (fetchError) {
      console.error('Error fetching bills:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`Found ${bills?.length || 0} bills to update`);

    let updateCount = 0;
    const results = [];

    for (const bill of (bills as any[]) || []) {
      // Generate new title format: [Bill Name] (H.R. [Number]) explained: Who It Helps, Who Pays, and Why It Matters
      const billNumber = bill.bill_id.replace('HR', '').replace('H.R.', '');
      const newTitle = `${bill.title} (H.R. ${billNumber}) explained: Who It Helps, Who Pays, and Why It Matters`;
      
      console.log(`📝 Updating ${bill.bill_id}:`);
      console.log(`   New: ${newTitle}`);

      const { error: updateError } = await (supabase
        .from('legislation') as any)
        .update({
          seo_title: newTitle // Update seo_title with the new format
        })
        .eq('bill_id', bill.bill_id);

      if (updateError) {
        console.error(`❌ Failed to update ${bill.bill_id}:`, updateError);
        results.push({ bill_id: bill.bill_id, status: 'failed', error: updateError.message });
      } else {
        console.log(`✅ Successfully updated ${bill.bill_id}`);
        results.push({ bill_id: bill.bill_id, status: 'success', newTitle: newTitle });
        updateCount++;
      }
    }

    console.log(`\n✅ Completed. Updated ${updateCount} bill titles`);

    return NextResponse.json({ 
      message: 'Bill titles regenerated successfully',
      totalBills: bills?.length || 0,
      updatedBills: updateCount,
      results: results
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

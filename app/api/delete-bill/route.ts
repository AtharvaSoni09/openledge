import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: NextRequest) {
  try {
    const { bill_id } = await req.json();
    
    if (!bill_id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    console.log(`🗑️ Deleting bill: ${bill_id}`);

    // Delete the bill
    const { error } = await supabaseAdmin
      .from('legislation')
      .delete()
      .eq('bill_id', bill_id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 });
    }

    console.log(`✅ Successfully deleted ${bill_id}`);

    return NextResponse.json({ 
      message: 'Bill deleted successfully',
      bill_id: bill_id
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

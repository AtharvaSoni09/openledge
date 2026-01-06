import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Database } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { bill_id } = await req.json();
    
    if (!bill_id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    // Get the bill data
    const { data: bill, error } = await supabaseAdmin
      .from('legislation')
      .select('*')
      .eq('bill_id', bill_id)
      .single();

    if (error || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Type cast the bill to access its properties
    const billData = bill as any;

    // Regenerate the article content
    const { data: updateResult, error: updateError } = await (supabaseAdmin as any)
      .from('legislation')
      .update({
        seo_title: billData.seo_title || billData.title,
        meta_description: billData.meta_description,
        tldr: billData.tldr
      })
      .eq('bill_id', bill_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to regenerate article' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Article regenerated successfully',
      bill_id: bill_id,
      title: billData.seo_title || billData.title
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

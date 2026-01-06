import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Adding categories column to legislation table...');
    
    // Add categories column to the legislation table
    const { error: addColumnError } = await (supabaseAdmin
      .rpc('exec', {
        sql: 'ALTER TABLE legislation ADD COLUMN IF NOT EXISTS categories TEXT[];'
      } as any));

    if (addColumnError) {
      console.error('Error adding categories column:', addColumnError);
      return NextResponse.json({ error: 'Failed to add categories column' }, { status: 500 });
    }

    console.log('✅ Categories column added successfully');

    return NextResponse.json({ 
      message: 'Categories column added successfully',
      success: true
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

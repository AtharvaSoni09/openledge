import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { categorizeBill, categories } from '@/lib/utils/categories';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Final categorization analysis...');
    
    const { data: bills, error } = await supabaseAdmin
      .from('legislation')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching bills:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const allBills = (bills as any[]) || [];
    console.log(`Analyzing ${allBills.length} bills for final categorization check...\n`);

    const remainingIssues = [];

    for (const bill of allBills) {
      const billCategories = categorizeBill(bill);
      const searchText = [
        bill.title,
        bill.tldr,
        bill.meta_description,
        ...(bill.keywords || [])
      ].join(' ').toLowerCase();

      // Check for specific remaining issues
      const issues = [];

      // Check for veterans content not in appropriate categories
      if (searchText.includes('veteran') || searchText.includes('vets')) {
        if (!billCategories.some(cat => cat.id === 'national-security') && 
            !billCategories.some(cat => cat.id === 'economy')) {
          issues.push('Veterans content should be in National Security and/or Economy');
        }
      }

      // Check for infrastructure content not in Infrastructure
      if (searchText.includes('infrastructure') || searchText.includes('grid') || searchText.includes('water') || searchText.includes('conduit')) {
        if (!billCategories.some(cat => cat.id === 'infrastructure')) {
          issues.push('Infrastructure content not in Infrastructure');
        }
      }

      // Check for energy content not in Energy
      if (searchText.includes('energy') || searchText.includes('power') || searchText.includes('electric')) {
        if (!billCategories.some(cat => cat.id === 'energy')) {
          issues.push('Energy content not in Energy');
        }
      }

      if (issues.length > 0) {
        remainingIssues.push({
          bill_id: bill.bill_id,
          title: bill.title,
          currentCategories: billCategories.map(c => c.name),
          issues: issues,
          searchText: searchText.substring(0, 200) + '...'
        });
      }
    }

    console.log('\n🚨 REMAINING CATEGORIZATION ISSUES:');
    console.log('====================================');
    remainingIssues.forEach((bill, index) => {
      console.log(`${index + 1}. ${bill.bill_id}: ${bill.title}`);
      console.log(`   Current: ${bill.currentCategories.join(', ')}`);
      console.log(`   Issues: ${bill.issues.join(', ')}`);
      console.log(`   Search: ${bill.searchText}\n`);
    });

    console.log(`\n📈 SUMMARY:`);
    console.log(`Total bills analyzed: ${allBills.length}`);
    console.log(`Remaining issues: ${remainingIssues.length}`);
    console.log(`Categorization accuracy: ${((allBills.length - remainingIssues.length) / allBills.length * 100).toFixed(1)}%`);

    return NextResponse.json({ 
      message: 'Final categorization analysis completed',
      totalBills: allBills.length,
      issuesCount: remainingIssues.length,
      accuracy: ((allBills.length - remainingIssues.length) / allBills.length * 100).toFixed(1),
      remainingIssues: remainingIssues
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

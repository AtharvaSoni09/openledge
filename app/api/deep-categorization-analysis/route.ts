import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { categorizeBill, categories } from '@/lib/utils/categories';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Deep categorization analysis...');
    
    const supabase = supabaseAdmin();
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
    console.log(`Analyzing ${allBills.length} bills for categorization errors...\n`);

    const problematicBills = [];
    const categoryConflicts = [];

    for (const bill of allBills) {
      const billCategories = categorizeBill(bill);
      const searchText = [
        bill.title,
        bill.tldr,
        bill.meta_description,
        ...(bill.keywords || [])
      ].join(' ').toLowerCase();

      // Check for specific problematic patterns
      const issues = [];

      // Check for AI-related content not in Technology Law
      if ((searchText.includes('ai') || searchText.includes('artificial intelligence')) && 
          !billCategories.some(cat => cat.id === 'technology-law')) {
        issues.push('AI content not in Technology Law');
      }

      // Check for energy content not in Energy
      if ((searchText.includes('energy') || searchText.includes('renewable') || searchText.includes('solar') || searchText.includes('wind')) && 
          !billCategories.some(cat => cat.id === 'energy')) {
        issues.push('Energy content not in Energy');
      }

      // Check for healthcare content not in Healthcare
      if ((searchText.includes('health') || searchText.includes('medical') || searchText.includes('hospital') || searchText.includes('fda')) && 
          !billCategories.some(cat => cat.id === 'healthcare')) {
        issues.push('Healthcare content not in Healthcare');
      }

      // Check for infrastructure content not in Infrastructure
      if ((searchText.includes('infrastructure') || searchText.includes('broadband') || searchText.includes('transportation') || searchText.includes('road')) && 
          !billCategories.some(cat => cat.id === 'infrastructure')) {
        issues.push('Infrastructure content not in Infrastructure');
      }

      // Check for education content not in Education
      if ((searchText.includes('education') || searchText.includes('student') || searchText.includes('school') || searchText.includes('college')) && 
          !billCategories.some(cat => cat.id === 'education')) {
        issues.push('Education content not in Education');
      }

      // Check for economy content not in Economy
      if ((searchText.includes('tax') || searchText.includes('economy') || searchText.includes('financial') || searchText.includes('budget')) && 
          !billCategories.some(cat => cat.id === 'economy')) {
        issues.push('Economy content not in Economy');
      }

      // Check for immigration content not in Immigration
      if ((searchText.includes('immigration') || searchText.includes('border') || searchText.includes('visa') || searchText.includes('citizenship')) && 
          !billCategories.some(cat => cat.id === 'immigration')) {
        issues.push('Immigration content not in Immigration');
      }

      // Check for national security content not in National Security
      if ((searchText.includes('defense') || searchText.includes('military') || searchText.includes('security') || searchText.includes('terrorism')) && 
          !billCategories.some(cat => cat.id === 'national-security')) {
        issues.push('National Security content not in National Security');
      }

      if (issues.length > 0) {
        problematicBills.push({
          bill_id: bill.bill_id,
          title: bill.title,
          currentCategories: billCategories.map(c => c.name),
          issues: issues,
          searchText: searchText.substring(0, 200) + '...'
        });
      }

      // Check for category conflicts (bills that should be in multiple categories)
      const categoryMatches: Record<string, number> = {};
      categories.forEach(cat => {
        if (cat.id !== 'miscellaneous') {
          let matches = 0;
          cat.keywords.forEach(keyword => {
            if (searchText.includes(keyword)) {
              matches += keyword.split(' ').length > 1 ? 2 : 1;
            }
          });
          if (matches >= 1) {
            categoryMatches[cat.id] = matches;
          }
        }
      });

      const topCategories = Object.entries(categoryMatches)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([id, count]) => ({ id, count: count as number }));

      if (topCategories.length > 2 && topCategories[2].count >= 2) {
        categoryConflicts.push({
          bill_id: bill.bill_id,
          title: bill.title,
          currentCategories: billCategories.map(c => c.name),
          shouldAlsoBeIn: topCategories.slice(2).map(c => {
            const cat = categories.find(cat => cat.id === c.id);
            return cat ? cat.name : c.id;
          }),
          categoryMatches: topCategories
        });
      }
    }

    console.log('\n🚨 PROBLEMATIC BILLS (Content Mismatch):');
    console.log('===========================================');
    problematicBills.forEach((bill, index) => {
      console.log(`${index + 1}. ${bill.bill_id}: ${bill.title}`);
      console.log(`   Current: ${bill.currentCategories.join(', ')}`);
      console.log(`   Issues: ${bill.issues.join(', ')}`);
      console.log(`   Search: ${bill.searchText}\n`);
    });

    console.log('\n⚠️ CATEGORY CONFLICTS (Should be in more categories):');
    console.log('================================================');
    categoryConflicts.forEach((bill, index) => {
      console.log(`${index + 1}. ${bill.bill_id}: ${bill.title}`);
      console.log(`   Current: ${bill.currentCategories.join(', ')}`);
      console.log(`   Should also be in: ${bill.shouldAlsoBeIn.join(', ')}`);
      console.log(`   Category matches: ${bill.categoryMatches.map(c => `${c.id}(${c.count})`).join(', ')}\n`);
    });

    return NextResponse.json({ 
      message: 'Deep categorization analysis completed',
      totalBills: allBills.length,
      problematicCount: problematicBills.length,
      conflictCount: categoryConflicts.length,
      problematicBills: problematicBills,
      categoryConflicts: categoryConflicts
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

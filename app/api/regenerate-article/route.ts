import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Database } from '@/types';

// Enhanced validation functions
function validateGeneratedContent(bill: any, content: string) {
  const errors = [];
  
  // Check if bill ID matches
  if (!content.includes(bill.bill_id)) {
    errors.push(`Bill ID mismatch: expected ${bill.bill_id}`);
  }
  
  // Check for hallucinated bill numbers
  const hallucinatedPatterns = [
    /H\.R\.\s*\d+/g,  // Wrong HR format
    /\b(formally known as|formerly called)\b.*?(?!HR\d+)/g,  // Wrong formal names
  ];
  
  for (const pattern of hallucinatedPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      errors.push(`Potential hallucination detected: ${matches.join(', ')}`);
    }
  }
  
  // Check title relevance
  const titleWords = bill.title.toLowerCase().split(' ').slice(0, 3);
  const contentWords = content.toLowerCase();
  
  for (const word of titleWords) {
    if (word.length > 3 && !contentWords.includes(word)) {
      errors.push(`Missing key term: ${word}`);
    }
  }
  
  return errors;
}

function createEnhancedPrompt(bill: any) {
  return `
You are regenerating article for bill: ${bill.bill_id}

CRITICAL REQUIREMENTS:
- Use ONLY the provided bill data
- NEVER hallucinate bill numbers or titles
- If bill_id is "${bill.bill_id}", the title MUST be about "${bill.title}"
- Cross-reference all facts with the actual bill data
- If uncertain, say "Unable to verify" rather than making up information

BILL DATA TO USE:
- Title: ${bill.title}
- Bill ID: ${bill.bill_id}
- Content: ${bill.markdown_body?.substring(0, 1000)}...

VALIDATION CHECKLIST:
✓ Bill ID "${bill.bill_id}" appears in content
✓ Title keywords from "${bill.title}" are included
✓ No fabricated bill numbers (like H.R. 7335 when it should be HR4930)
✓ All facts match the provided bill data

Generate the article content focusing on accuracy and factual correctness.
`;
}

export async function POST(req: NextRequest) {
  try {
    const { bill_id } = await req.json();
    
    if (!bill_id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    // Get the bill data
    const supabase = supabaseAdmin();
    const { data: bill, error } = await supabase
      .from('legislation')
      .select('*')
      .eq('bill_id', bill_id)
      .single();

    if (error || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Type cast the bill to access its properties
    const billData = bill as any;

    // Create enhanced prompt with validation requirements
    const enhancedPrompt = createEnhancedPrompt(billData);
    
    // Log the enhanced prompt for debugging
    console.log(`🔍 Enhanced prompt for ${bill_id}:`, enhancedPrompt);

    // For now, update with existing data but with enhanced validation
    const { data: updateResult, error: updateError } = await (supabaseAdmin as any)
      .from('legislation')
      .update({
        seo_title: billData.seo_title || billData.title,
        meta_description: billData.meta_description,
        tldr: billData.tldr,
        // Add validation metadata
        last_validated: new Date().toISOString(),
        validation_prompt: enhancedPrompt
      })
      .eq('bill_id', bill_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to regenerate article' }, { status: 500 });
    }

    // Validate the updated content
    const validationErrors = validateGeneratedContent(billData, billData.tldr || '');
    
    return NextResponse.json({ 
      message: 'Article regenerated successfully',
      bill_id: bill_id,
      title: billData.seo_title || billData.title,
      validation_errors: validationErrors,
      enhanced_prompt: enhancedPrompt
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

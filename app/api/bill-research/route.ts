import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchPolicyResearch } from '@/lib/agents/exa';
import { fetchNewsContext } from '@/lib/agents/newsdata';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for full research

let groqClient: OpenAI | null = null;
function getGroq(): OpenAI {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing GROQ_API_KEY');
    groqClient = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
  }
  return groqClient;
}

export async function GET(req: NextRequest) {
  try {
    const billId = req.nextUrl.searchParams.get('id');
    const orgGoal = req.nextUrl.searchParams.get('goal') || '';

    if (!billId) {
      return NextResponse.json({ error: 'Missing bill id' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch bill from DB
    const { data: bill } = await (supabase as any)
      .from('legislation')
      .select('*')
      .eq('id', billId)
      .single();

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Run research pipeline in parallel
    const [newsResults, policyResults] = await Promise.all([
      fetchNewsContext(bill.title).catch(() => []),
      fetchPolicyResearch(bill.title).catch(() => []),
    ]);

    // Build comprehensive AI analysis using Groq
    const systemPrompt = `You are a senior legislative analyst for "Ledge", an AI-powered legislative monitoring platform. 
Given a bill and research context, produce a comprehensive, well-structured analysis in Markdown.

STRUCTURE (use ## headers):
## Overview
A 3-4 paragraph executive summary of the bill, its purpose, and current status.

## Key Provisions
Bullet-point the 5-8 most important provisions or sections of the bill.

## Stakeholder Impact
Who benefits? Who is affected negatively? Be specific about industries, demographics, or groups.

## Political Context
Sponsors, party dynamics, likelihood of passage, and any notable political dynamics.

## News & Analysis
Summarize any relevant news coverage or policy analysis.

${orgGoal ? `## Relevance to Your Goal
Explain specifically how this bill relates to the organizational goal: "${orgGoal}". Include potential opportunities and risks.` : ''}

## Timeline & Next Steps
What happens next? Committee hearings, votes, implementation timeline.

TONE: Scholarly yet accessible. Like The Economist meets Politico. Be balanced and fact-based.
Use the provided context but make the analysis coherent and thorough.`;

    const userPrompt = `Bill: "${bill.title}" (${bill.bill_id})
    
Bill Summary: ${bill.tldr || 'No summary available'}

Full Article Text (excerpt):
${(bill.markdown_body || '').slice(0, 6000)}

Sponsor Info: ${JSON.stringify(bill.sponsors || bill.sponsor_data || {}).slice(0, 2000)}

Congress.gov URL: ${bill.congress_gov_url || 'N/A'}

Latest Action: ${JSON.stringify(bill.latest_action || {}).slice(0, 500)}

News Context:
${newsResults.map((n: any) => `- ${n.title} (${n.source_id || n.link})`).join('\n') || 'No recent news found'}

Policy Research:
${policyResults.map((p: any) => `- ${p.title}: ${(p.text || '').slice(0, 300)}`).join('\n') || 'No policy research found'}

Generate a comprehensive analysis.`;

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.5,
    });

    const analysis = completion.choices[0]?.message?.content || 'Analysis unavailable.';

    return NextResponse.json({
      bill: {
        id: bill.id,
        bill_id: bill.bill_id,
        title: bill.title,
        seo_title: bill.seo_title,
        tldr: bill.tldr,
        url_slug: bill.url_slug,
        source: bill.source,
        state_code: bill.state_code,
        congress_gov_url: bill.congress_gov_url,
        introduced_date: bill.introduced_date,
        latest_action: bill.latest_action,
        sponsors: bill.sponsors,
        created_at: bill.created_at,
      },
      analysis,
      news: newsResults,
      policy: policyResults,
    });
  } catch (error: any) {
    console.error('Bill research error:', error);
    return NextResponse.json(
      { error: 'Research service unavailable', details: error.message },
      { status: 500 },
    );
  }
}

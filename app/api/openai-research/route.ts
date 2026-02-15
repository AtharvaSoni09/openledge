import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

type ParsedBillId = {
  billType: string;
  billNumber: string;
  congress: string;
  chamber: 'house' | 'senate';
};

type BillResearchResult = {
  exactTitle?: string;
  chamber?: string;
  billNumber?: string;
  congress?: string;
  shortTitle?: string;
  discrepancy?: string;
  confidence?: string;
  error?: string;
};

function parseBillId(billId: string): ParsedBillId | null {
  const match = billId.match(/([A-Z]+)(\d+)-(\d+)/i);
  if (!match) return null;

  const [, rawBillType, billNumber, congress] = match;
  const billType = rawBillType.toLowerCase();
  const chamber = billType.startsWith('h') ? 'house' : 'senate';

  return {
    billType,
    billNumber,
    congress,
    chamber,
  };
}

async function fetchCongressBillInfo(billId: string) {
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  const parsed = parseBillId(billId);
  if (!apiKey || !parsed) return null;

  const url = `https://api.congress.gov/v3/bill/${parsed.congress}/${parsed.billType}/${parsed.billNumber}?format=json&api_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const bill = data?.bill;
  if (!bill) return null;

  return {
    title: bill.title || null,
    shortTitle: bill.shortTitle || null,
    chamber: parsed.chamber,
    billType: parsed.billType.toUpperCase(),
    billNumber: parsed.billNumber,
    congress: parsed.congress,
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      billId,
      currentTitle,
    }: { prompt?: string; billId?: string; currentTitle?: string } = await req.json();

    if (!prompt && !billId) {
      return NextResponse.json({ error: 'Either prompt or billId is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const congressData = billId ? await fetchCongressBillInfo(billId) : null;

    const effectivePrompt = prompt || `I need the exact official name of this US legislation bill.

Bill ID: ${billId}
Current title: "${currentTitle || 'Unknown'}"
Congress API data:
- Chamber: ${congressData?.chamber || 'Unknown'}
- Bill Type: ${congressData?.billType || 'Unknown'}
- Bill Number: ${congressData?.billNumber || 'Unknown'}
- Congress: ${congressData?.congress || 'Unknown'}
- Official title: "${congressData?.title || 'Not available'}"
- Short title: "${congressData?.shortTitle || 'Not available'}"

Return JSON only:
{
  "exactTitle": "Official bill name",
  "chamber": "house or senate",
  "billNumber": "HR123 or S456",
  "congress": "119",
  "shortTitle": "Common short title",
  "discrepancy": "Difference between current and official title (if any)",
  "confidence": "high|medium|low"
}`;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a legislative research assistant. Return strict JSON and prioritize official Congress.gov data if provided." },
        { role: "user", content: effectivePrompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    console.log('OpenAI research result:', content);
    
    let result: BillResearchResult;
    try {
      result = JSON.parse(content || '{}') as BillResearchResult;
    } catch (parseError: unknown) {
      console.error('Failed to parse OpenAI response:', parseError);
      result = { error: 'Failed to process research response' };
    }
    
    return NextResponse.json({
      success: true,
      result: result || null,
      congressData
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('OpenAI research error:', error);
    return NextResponse.json({
      error: 'Research service unavailable',
      details: message
    }, { status: 500 });
  }
}

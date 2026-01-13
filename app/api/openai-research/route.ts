import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('=== OPENAI RESEARCH API CALLED ===');
    
    const { email, preferences = {}, source = 'newsletter_page' } = await req.json();
    
    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length < 5) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    
    console.log('Research request for:', { email, preferences, source });
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const prompt = `I need to research this US legislation bill:
    
    Email: "${email}"
    Preferences: ${JSON.stringify(preferences)}
    Source: ${source}
    
    Please provide:
    1. The EXACT official bill name from Congress
    2. Any common short title or nickname
    3. Bill number and Congress session
    4. Current status or recent activity
    
    Respond in JSON format:
    {
      "exactTitle": "Official bill name",
      "shortTitle": "Common short title",
      "billNumber": "HR123 or S456",
      "congress": "118th",
      "status": "Current bill status"
    }`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a legislative research assistant. Provide accurate, factual information about US legislation." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    console.log('OpenAI research result:', content);
    
    let result: any;
    try {
      result = JSON.parse(content || '{}');
    } catch (parseError: any) {
      console.error('Failed to parse OpenAI response:', parseError);
      result = { error: 'Failed to process research response' };
    }
    
    return NextResponse.json({ 
      success: true,
      result: result || null
    });
    
  } catch (error: any) {
    console.error('OpenAI research error:', error);
    return NextResponse.json({ 
      error: 'Research service unavailable',
      details: error.message 
    }, { status: 500 });
  }
}

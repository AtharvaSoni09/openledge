import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

let groqClient: OpenAI | null = null;

function getGroq(): OpenAI {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing GROQ_API_KEY');
    groqClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return groqClient;
}

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return NextResponse.json({ error: 'Please provide a description of at least 5 characters' }, { status: 400 });
    }

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a legislative interest parser. Given a description of what an organization does, extract 3-8 concise keyword topics that would be useful for monitoring US legislation.

Rules:
- Each topic should be 1-3 words (e.g. "cybersecurity", "student loans", "renewable energy")
- Topics should be specific enough to find relevant bills but broad enough to not miss any
- Focus on policy areas, not general business terms
- Output ONLY a JSON array of strings, nothing else
- Example: ["renewable energy", "carbon emissions", "electric vehicles", "grid infrastructure"]`,
        },
        {
          role: 'user',
          content: description.trim(),
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '[]';

    // Parse the JSON array from the response
    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        keywords = parsed
          .filter((k: any) => typeof k === 'string' && k.trim().length > 0)
          .map((k: string) => k.trim())
          .slice(0, 8);
      }
    } catch {
      // Try to extract from malformed response
      const matches = raw.match(/"([^"]+)"/g);
      if (matches) {
        keywords = matches.map((m) => m.replace(/"/g, '').trim()).slice(0, 8);
      }
    }

    if (keywords.length === 0) {
      return NextResponse.json({ error: 'Could not parse interests from description' }, { status: 422 });
    }

    return NextResponse.json({ keywords });
  } catch (error: any) {
    console.error('Parse interests error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to analyze description' }, { status: 500 });
  }
}

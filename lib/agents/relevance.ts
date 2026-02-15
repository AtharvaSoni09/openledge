/**
 * AI Relevance Engine — "Match-Maker"
 *
 * Given a bill (title + summary) and a user's organizational goal,
 * uses Groq (Llama 3.3 70B) to score relevance 0–100 and generate
 * a personalised explanation when the score is high enough.
 */

import OpenAI from 'openai';

export interface RelevanceResult {
  match_score: number;       // 0-100
  summary: string;           // 2-sentence bill summary
  why_it_matters: string;    // org-specific explanation
  implications: string;      // downstream effects
}

let groqClient: OpenAI | null = null;

function getGroq(): OpenAI {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('RELEVANCE: Missing GROQ_API_KEY');
    groqClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return groqClient;
}

/**
 * Quick score-only check. Returns 0–100 integer.
 * Use this first; if score >= threshold, call `fullRelevanceCheck`.
 */
export async function quickRelevanceScore(
  billTitle: string,
  billSummary: string,
  orgGoal: string,
): Promise<number> {
  try {
    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a legislative relevance scorer. Given a bill and a user's organizational goal or area of interest, respond with ONLY a single integer from 0 to 100.

Scoring guide:
- 90-100: The bill directly addresses the core topic of the goal
- 70-89: The bill is strongly related and would materially affect the goal
- 50-69: The bill has meaningful indirect connections to the goal
- 30-49: The bill has loose or tangential relevance
- 1-29: Very minor or distant connection
- 0: Completely unrelated

IMPORTANT: The user's goal may be brief (e.g. "education", "healthcare", "climate"). Interpret broadly — if the goal is "education", ANY bill related to schools, students, teachers, funding for education, student loans, curriculum, etc. should score highly. If the goal is "healthcare", bills about hospitals, insurance, drugs, Medicare, public health, etc. are relevant.

Respond with ONLY the integer, nothing else.`,
        },
        {
          role: 'user',
          content: `Bill: "${billTitle}"\nSummary: "${billSummary}"\n\nUser's Goal/Interest: "${orgGoal}"\n\nRelevance score (0-100):`,
        },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '0';
    const score = parseInt(raw.replace(/\D/g, ''), 10);
    return isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('RELEVANCE: quickScore error:', error);
    return 0;
  }
}

/**
 * Full relevance check — score + summary + why-it-matters + implications.
 * Call this for bills that passed the quick-score threshold (>= 40).
 */
export async function fullRelevanceCheck(
  billTitle: string,
  billSummary: string,
  orgGoal: string,
): Promise<RelevanceResult | null> {
  try {
    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a legislative analyst for an AI monitoring platform called "Ledge". A user's goal or area of interest is provided — it may be a short phrase like "education" or a detailed mission statement. Interpret it broadly.

For the given bill, return a JSON object with exactly these fields:
- "match_score": integer 0-100 (how much this bill impacts the goal; use the same scoring rubric: 90-100 = directly addresses, 70-89 = strongly related, 50-69 = meaningful indirect connection)
- "summary": exactly 2 sentences summarizing the bill
- "why_it_matters": 2-3 sentences explaining why this bill matters specifically to someone focused on the user's goal
- "implications": 2-3 sentences on potential downstream effects

Return ONLY valid JSON, no markdown fences, no extra text.`,
        },
        {
          role: 'user',
          content: `Bill Title: "${billTitle}"\nBill Summary: "${billSummary}"\n\nUser's Goal/Interest: "${orgGoal}"`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as RelevanceResult;

    // Clamp score
    parsed.match_score = Math.min(100, Math.max(0, Math.round(parsed.match_score)));

    return parsed;
  } catch (error) {
    console.error('RELEVANCE: fullCheck error:', error);
    return null;
  }
}

/**
 * High-level helper: quick-score first, then full check if above threshold.
 */
export async function scoreBillForGoal(
  billTitle: string,
  billSummary: string,
  orgGoal: string,
  threshold: number = 25,
): Promise<RelevanceResult> {
  const quick = await quickRelevanceScore(billTitle, billSummary, orgGoal);

  if (quick < threshold) {
    return {
      match_score: quick,
      summary: '',
      why_it_matters: '',
      implications: '',
    };
  }

  const full = await fullRelevanceCheck(billTitle, billSummary, orgGoal);
  if (!full) {
    return {
      match_score: quick,
      summary: '',
      why_it_matters: '',
      implications: '',
    };
  }

  return full;
}

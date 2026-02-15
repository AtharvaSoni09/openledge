/**
 * AI Relevance Engine — "Match-Maker"
 *
 * Given a bill (title + summary) and a user's organizational goal,
 * uses Groq (Llama 3.3 70B) to score relevance 0–100 and generate
 * a personalised explanation when the score is high enough.
 *
 * Includes built-in retry logic for 429 rate-limit errors.
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
 * Helper: call Groq with automatic retry on 429 rate-limit errors.
 * Waits for the retry-after duration (or exponential backoff) then retries.
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.code === 'rate_limit_exceeded';
      const is400 = error?.status === 400; // JSON validation error or similar

      if ((!is429 && !is400) || attempt === maxRetries) throw error;

      // If 400 (Bad Request), it might be a transient JSON generation issue. Retry immediately-ish.
      if (is400) {
        console.log(`RELEVANCE: 400 error (likely JSON), retrying ${attempt + 1}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // Use retry-after header if available, otherwise exponential backoff
      const retryAfter = error?.headers?.get?.('retry-after');
      // Cap wait at 60s (Vercel functions can run up to 300s, but let's be reasonable)
      const waitMs = retryAfter
        ? Math.min(parseInt(retryAfter, 10) * 1000, 60000)
        : Math.min(2000 * Math.pow(2, attempt), 30000);

      console.log(`RELEVANCE: Rate limited, waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error('RELEVANCE: Max retries exceeded');
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
    const completion = await callWithRetry(() =>
      getGroq().chat.completions.create({
        // Use 8B-Instant for quick scoring to save tokens/money/time
        // It has much higher rate limits (TPM/RPD) than 70B
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a legislative relevance scorer. Given a bill and a user's organizational goal, respond with ONLY a single integer from 0 to 100.
            
Scoring:
- 90-100: Directly addresses the goal
- 70-89: Strongly related
- 50-69: Meaningful indirect connection
- 0-49: Loose or no connection

Goal: "${orgGoal}"

Respond with ONLY the integer.`,
          },
          {
            role: 'user',
            content: `Bill: "${billTitle}"\nSummary: "${billSummary}"\n\nScore (0-100):`,
          },
        ],
        max_tokens: 5,
        temperature: 0.1,
      }),
    );

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
    const completion = await callWithRetry(() =>
      getGroq().chat.completions.create({
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
      }),
    );

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

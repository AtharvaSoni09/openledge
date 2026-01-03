import OpenAI from "openai";
import fs from "fs";

// Define the output structure we want from the LLM
export interface ResearchOutput {
    seo_title: string;
    url_slug: string; // should be kebab-case
    meta_description: string;
    markdown_body: string;
    tldr: string; // Plain English summary for Section 1
    keywords: string[]; // SEO keywords
    schema_type: string; // "Legislation" or "NewsArticle"
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to repair malformed JSON from GPT
function repairJson(content: string): string {
    try {
        // Try parsing as-is first
        JSON.parse(content);
        return content;
    } catch (e) {
        console.log("SYNTHESIS: Attempting to repair malformed JSON");
        
        let repaired = content;
        
        // Fix 1: Handle truncated responses (missing closing brace/quote)
        if (!repaired.trim().endsWith('}')) {
            console.log("SYNTHESIS: Fixing truncated JSON");
            // Count opening vs closing braces
            const openBraces = (repaired.match(/\{/g) || []).length;
            const closeBraces = (repaired.match(/\}/g) || []).length;
            const missingBraces = openBraces - closeBraces;
            
            // Add missing closing braces
            for (let i = 0; i < missingBraces; i++) {
                repaired += '}';
            }
            
            // Check if last field is incomplete (missing closing quote)
            const lastQuoteIndex = repaired.lastIndexOf('"');
            const secondLastQuoteIndex = repaired.lastIndexOf('"', lastQuoteIndex - 1);
            
            if (lastQuoteIndex > secondLastQuoteIndex && !repaired.substring(lastQuoteIndex).includes('"')) {
                repaired += '"';
            }
        }
        
        // Fix 2: Handle case where markdown_body gets split into multiple keys
        if (repaired.includes('"markdown_body"')) {
            const bodyStart = repaired.indexOf('"markdown_body"');
            const afterBodyStart = repaired.indexOf(':', bodyStart) + 1;
            const bodyValueStart = repaired.indexOf('"', afterBodyStart) + 1;
            let bodyValueEnd = repaired.lastIndexOf('"');
            
            // If the last quote is before the closing brace, find the actual end
            const lastBraceIndex = repaired.lastIndexOf('}');
            if (bodyValueEnd > lastBraceIndex) {
                bodyValueEnd = repaired.substring(0, lastBraceIndex).lastIndexOf('"');
            }
            
            if (bodyValueStart > 0 && bodyValueEnd > bodyValueStart) {
                const bodyContent = repaired.substring(bodyValueStart, bodyValueEnd);
                // Remove any malformed key-value pairs within the body content
                const cleanBody = bodyContent
                    .replace(/",\s*"[^"]+":\s*"/g, ' ')  // Remove malformed key-value pairs
                    .replace(/",\s*"[^"]+":\s*""/g, ' ')  // Remove empty key-value pairs
                    .replace(/\n\s*"[^"]+":\s*"[^"]*"/g, '') // Remove line-broken key-value pairs
                    .trim();
                
                // Rebuild the JSON with clean markdown_body
                const beforeBody = repaired.substring(0, bodyStart);
                const afterBody = repaired.substring(bodyValueEnd + 1);
                
                repaired = beforeBody + '"markdown_body": "' + cleanBody + '"' + afterBody;
            }
        }
        
        // Fix 3: Handle incomplete JSON structure
        try {
            JSON.parse(repaired);
            return repaired;
        } catch (e2) {
            console.log("SYNTHESIS: JSON still malformed, attempting more aggressive repair");
            
            // Try to extract what we can and rebuild minimal valid JSON
            const fields = ['seo_title', 'url_slug', 'meta_description', 'tldr', 'markdown_body', 'keywords', 'schema_type'];
            const extracted: any = {};
            
            for (const field of fields) {
                const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\.[^"]*)*)"`, 'i');
                const match = repaired.match(regex);
                if (match) {
                    extracted[field] = match[1].replace(/\\"/g, '"');
                }
            }
            
            // If we have the essential fields, rebuild JSON
            if (extracted.seo_title && extracted.url_slug && extracted.markdown_body) {
                console.log("SYNTHESIS: Rebuilding JSON from extracted fields");
                return JSON.stringify(extracted);
            }
        }
        
        return repaired;
    }
}

// Helper function for retry logic with exponential backoff
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`SYNTHESIS: Retry ${attempt}/${maxRetries} after ${delay}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries exceeded');
}

export async function synthesizeLegislation(
    billTitle: string,
    fullText: string,
    sponsorInfo: any,
    newsContext: any,
    policyResearch: any,
    congressGovUrl: string
): Promise<ResearchOutput | null> {

    console.log("SYNTHESIS: Starting for bill:", billTitle);

    function safeStringify(obj: any): string {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            console.error("JSON Stringify Error in Synthesis:", e);
            return String(obj);
        }
    }

    const systemPrompt = `
    You are a senior legislative analyst for "The Daily Law".
    Your objective is to produce a cohesive, scholarly, and objective policy brief on the provided legislation.
    
    TONE & STYLE:
    - COHESIVE NARRATIVE: Avoid fragmented formatting. Write in well-developed, scholarly paragraphs.
    - VISUAL SPACING: MANDATORY - Use double newlines (\n\n) between every paragraph to ensure clear visual separation.
    - BOLDED HEADERS: MANDATORY - Start every major section with a bolded header on its own line (e.g., **The Legislative Context**).
    - SCHOLARLY: Use formal, precise language. Avoid conversational styles.
    - PROFESSIONAL: Sound like a non-partisan policy analyst for a high-end publication (like The Economist).
    
    CRITICAL REQUIREMENTS:
    - FIRST PARAGRAPH: MUST start with a paragraph summary that INCLUDES THE EXACT BILL NAME from the input title.
    - USE ACTUAL BILL NAME: Use the bill name as provided in the input, not a modified version.
    - If bill has a common name or short title, use that in your summary.
    - TLDR: MUST include a 2-3 sentence "Impact Statement" answering "Who benefits?" and "Why it matters?"
    - SEO FOCUS: Include bill numbers naturally in headers and content for search ranking.
    
    IMPORTANT:
    - Use ONLY the provided context parts (Sponsor, News, Research).
    - If info is missing, state it clearly.
    - MANDATORY: Include a section at the very end titled "**Official Source**" with a link to the bill on Congress.gov: ${congressGovUrl}
    
    FORMAT:
    Return a detailed JSON object with the fields:
    - seo_title: Use format "[bill name] (bill number) explained: Who It Helps, Who Pays, and Why It Matters" - 80 chars max
    - url_slug: SEO friendly slug with bill number
    - meta_description: 150 chars max summary including bill number and key impact
    - tldr: A 2-3 sentence "Impact Statement" answering "Who benefits?" and "Why it matters?" (scholarly tone).
    - keywords: 5-7 relevant keywords for SEO (bill number, sponsor name, policy area, key terms)
    - schema_type: "Legislation" or "NewsArticle" based on content
    - markdown_body: The full article as a cohesive narrative with bolded headers and double-spaced paragraphs. 
  `;

    const userPrompt = `
    Analyze this Bill: "${billTitle}"
    
    Context provided:
    - Summary snippet: ${fullText.slice(0, 2000)}
    - Sponsor: ${safeStringify(sponsorInfo).slice(0, 5000)}
    - News: ${safeStringify(newsContext).slice(0, 10000)}
    - Research: ${safeStringify(policyResearch).slice(0, 10000)}
    
    Return a detailed JSON article.
  `;

    try {
        console.log("SYNTHESIS: Sending request to OpenAI (gpt-4o-mini)...");
        console.log("SYNTHESIS: User Prompt Length:", userPrompt.length);

        const completion = await retryWithBackoff(async () => {
            return await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            });
        }, 3, 1000); // 3 retries, 1s base delay

        const content = completion.choices[0].message.content;
        console.log("SYNTHESIS: Received content. Length:", content?.length || 0);

        if (!content) {
            console.error("SYNTHESIS ERROR: No content in completion.");
            return null;
        }

        try {
            const repairedContent = repairJson(content);
            const parsed = JSON.parse(repairedContent) as ResearchOutput;
            
            // DEBUG: Log the parsed markdown_body length and preview
            console.log("SYNTHESIS DEBUG: markdown_body length:", parsed.markdown_body?.length || 0);
            console.log("SYNTHESIS DEBUG: markdown_body preview:", parsed.markdown_body?.slice(0, 100) || "NONE");

            // VALIDATION: Ensure all fields are present and substantial
            const requiredFields = ['seo_title', 'url_slug', 'meta_description', 'tldr', 'markdown_body', 'keywords', 'schema_type'];
            const missingFields = requiredFields.filter(f => !parsed[f as keyof ResearchOutput]);

            if (missingFields.length > 0) {
                console.error(`SYNTHESIS VALIDATION FAILED: Missing fields [${missingFields.join(', ')}]`);
                return null;
            }

            // Ensure the main article isn't too short (indicates a fail or cut-off)
            if (parsed.markdown_body.length < 200) {
                console.error(`SYNTHESIS VALIDATION FAILED: markdown_body too short (${parsed.markdown_body.length} chars)`);
                console.error("SYNTHESIS DEBUG: Full parsed object:", JSON.stringify(parsed, null, 2));
                return null;
            }

            console.log("SYNTHESIS SUCCESS: Content parsed and validated.");
            return parsed;
        } catch (parseError: any) {
            console.error("SYNTHESIS ERROR: JSON Parse failed:", parseError.message);
            console.error("Raw Content:", content);
            return null;
        }

    } catch (e: any) {
        const errorLog = `
=== OpenAI Error Log ===
Time: ${new Date().toISOString()}
Message: ${e.message || e}
Stack: ${e.stack}
User Prompt Length: ${userPrompt.length}
Response Data: ${e.response ? JSON.stringify(e.response.data) : "N/A"}
========================
`;
        fs.appendFileSync("openai-debug.txt", errorLog);
        console.error("SYNTHESIS ERROR (OpenAI Call):", e.message || e);
        return null;
    }
}

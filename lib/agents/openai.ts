import OpenAI from "openai";


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


let openaiInstance: OpenAI | null = null;

function getOpenAIClient() {
    if (!openaiInstance) {
        const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn("SYNTHESIS: No API key found in environment variables.");
        }

        openaiInstance = new OpenAI({
            apiKey: apiKey || 'missing-key',
            baseURL: "https://api.groq.com/openai/v1"
        });
    }
    return openaiInstance;
}


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
            const openBraces = (repaired.match(/\{/g) || []).length;
            const closeBraces = (repaired.match(/\}/g) || []).length;
            const missingBraces = openBraces - closeBraces;

            for (let i = 0; i < missingBraces; i++) {
                repaired += '}';
            }

            const lastQuoteIndex = repaired.lastIndexOf('"');
            const secondLastQuoteIndex = repaired.lastIndexOf('"', lastQuoteIndex - 1);

            if (lastQuoteIndex > secondLastQuoteIndex && !repaired.substring(lastQuoteIndex).includes('"')) {
                repaired += '"';
            }
        }

        // Fix 2: Completely rebuild JSON by extracting all content properly
        try {
            JSON.parse(repaired);
            return repaired;
        } catch (e2) {
            console.log("SYNTHESIS: JSON still malformed, rebuilding from scratch");

            // Extract all content using regex patterns that handle both strings and numbers
            const fields = ['seo_title', 'url_slug', 'meta_description', 'tldr', 'markdown_body', 'keywords', 'schema_type'];
            const extracted: any = {};

            for (const field of fields) {
                // Pattern that handles both "field": "value" and "field": value formats
                const regex = new RegExp(`"${field}"\\s*:\\s*("([^"]*(?:\\.[^"]*)*)"|([^,}\\n]+))`, 'i');
                const match = repaired.match(regex);

                if (match) {
                    // Use the string value if available, otherwise use the raw value
                    let value = match[2] || match[3] || '';

                    // Clean up the value
                    if (value) {
                        value = value.replace(/\\"/g, '"').replace(/\\u[0-9a-fA-F]{4}/g, '').trim();

                        // For keywords field, parse as array if it looks like one
                        if (field === 'keywords' && value.startsWith('[')) {
                            try {
                                extracted[field] = JSON.parse(value);
                            } catch {
                                // If parsing fails, create array from comma-separated values
                                extracted[field] = value.replace(/[\[\]]/g, '').split(',').map(v => v.trim().replace(/"/g, '')).filter(v => v);
                            }
                        } else {
                            extracted[field] = value;
                        }
                    }
                }
            }

            // Special handling for markdown_body - merge all content that should be part of it
            if (extracted.markdown_body && extracted.markdown_body.length < 200) {
                console.log("SYNTHESIS: markdown_body too short, attempting to merge split content");

                // Find all content that looks like it should be part of the article body
                const bodyPatterns = [
                    /"([^"]{20,})":\s*([^,}\\n]+)/g,  // "long text": value
                    /:\s*"([^"]{20,})"/g,             // : "long text"
                ];

                let additionalContent = '';

                bodyPatterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(repaired)) !== null) {
                        const content = match[1] || match[2];
                        if (content && content.length > 20 && !content.includes('"markdown_body"')) {
                            additionalContent += ' ' + content;
                        }
                    }
                });

                if (additionalContent.length > 100) {
                    extracted.markdown_body += additionalContent;
                    console.log("SYNTHESIS: Merged additional content into markdown_body");
                }
            }

            // If we have the essential fields, rebuild JSON properly
            if (extracted.seo_title && extracted.url_slug && extracted.markdown_body) {
                console.log("SYNTHESIS: Rebuilding JSON with extracted fields");

                // Ensure markdown_body is substantial
                if (extracted.markdown_body.length < 200) {
                    console.log("SYNTHESIS: markdown_body still too short after repair");
                    return content; // Return original to fail validation
                }

                return JSON.stringify(extracted, null, 2);
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
            // Don't retry on auth errors or bad requests
            if (error.status === 401 || error.status === 403 || error.status === 400) {
                console.error(`SYNTHESIS: Non-retriable error ${error.status}:`, error.message);
                throw error;
            }

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
    billId: string, // Added billId parameter
    fullText: string,
    sponsorInfo: any,
    newsContext: any,
    policyResearch: any,
    congressGovUrl: string
): Promise<ResearchOutput | null> {

    console.log("SYNTHESIS: Starting for bill:", billTitle, "ID:", billId);

    function safeStringify(obj: any): string {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            console.error("JSON Stringify Error in Synthesis:", e);
            return String(obj);
        }
    }

    const systemPrompt = `
    You are a senior legislative analyst for "The Daily Law" specializing in SEO-optimized legislative analysis.
    Your objective is to produce comprehensive, search-optimized articles that rank for long-tail legal queries.
    
    SEO STRATEGY:
    - PRIMARY KEYWORD: Target "[Bill Name] explained" queries
    - LONG-TAIL QUERIES: Answer "What does [bill] do?", "Who benefits from [bill]?", "Why [bill] matters"
    - FEATURED SNIPPETS: Structure content to win Google snippets with direct answers
    - INTERNAL LINKING: Reference 2-3 related bills for topical authority
    
    TONE & STYLE:
    - COHESIVE NARRATIVE: Avoid fragmented formatting. Write in well-developed, scholarly paragraphs.
    - VISUAL SPACING: MANDATORY - Use double newlines (\\n\\n) between every paragraph AND between headers and content.
    - HEADERS: Use Markdown H2 (##) for all section headers. Put a blank line before and after every header.
    - SCHOLARLY: Use formal, precise language like The Economist or Politico.
    
    CRITICAL REQUIREMENTS:
    - FIRST PARAGRAPH: MUST start with a paragraph summary that INCLUDES THE EXACT BILL NAME from the input title.
    - USE ACTUAL BILL NAME: Use the bill name as provided in the input, not a modified version.
    - If bill has a common name or short title, use that in your summary.
    - TLDR: MUST include a 2-3 sentence "Impact Statement" answering "Who benefits?" and "Why it matters?"
    - SEO FOCUS: Include bill numbers naturally in headers and content for search ranking.
    
    SEO STRUCTURE (Add these sections):
    - ## What is the [Bill Name]? - Clear definition and current status
    - ## What does the bill do? - Key provisions and mechanisms  
    - ## Why was this bill introduced? - Background and motivation
    - ## What happens next? - Timeline and next steps
    - ## Why this matters - Impact analysis and stakeholders
    
    IMPORTANT:
    - Use ONLY the provided context parts (Sponsor, News, Research)
    - If info is missing, state it clearly
    - Include bill numbers and sponsor names for SEO
    - Target 55-65 character titles for optimal CTR
    
    FORMAT:
    Return a detailed JSON object with the fields:
    - seo_title: STRICT FORMAT: "[Bill Name] (${billId}) explained: What It Does, Why It Matters". Use the provided bill name but ALWAYS append " (${billId})" exactly. Do not use "(Bill Number)" or "(HR Not Available)".
    - url_slug: SEO friendly slug with bill number (e.g., "hr7521-explained")
    - meta_description: 150 chars max including bill number ${billId} and key impact
    - tldr: 2-3 sentence impact statement answering "Who benefits?" and "Why it matters?"
    - keywords: 5-7 SEO keywords (bill number ${billId}, sponsor, policy area, "explained", "summary")
    - schema_type: "Legislation"
    - markdown_body: Full article following the mandatory structure above with Markdown H2 headers (##)
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
        console.log("SYNTHESIS: Sending request to Groq (llama-3.3-70b-versatile)...");
        console.log("SYNTHESIS: User Prompt Length:", userPrompt.length);

        const completion = await retryWithBackoff(async () => {
            return await getOpenAIClient().chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                max_tokens: 4000, // Ensure enough tokens for complete response
                temperature: 0.7
            });
        }, 3, 1000); // 3 retries, 1s base delay

        const content = completion.choices[0].message.content;
        console.log("SYNTHESIS: Received content. Length:", content?.length || 0);
        console.log("SYNTHESIS DEBUG: Raw content preview:", content?.slice(0, 200) || "NONE");

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
        console.error("SYNTHESIS ERROR (OpenAI Call):", e.message || e);
        console.error("OpenAI Error Stack:", e.stack);
        if (e.response) {
            console.error("OpenAI Response Data:", JSON.stringify(e.response.data));
        }
        return null;
    }
}

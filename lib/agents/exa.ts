
export interface PolicyLink {
    title: string;
    url: string;
    text: string; // snippet or highlights
}

const BASE_URL = 'https://api.exa.ai/search';

export async function fetchPolicyResearch(billTitle: string): Promise<PolicyLink[]> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return [];

    const prompt = `Non-partisan analysis, white papers, and pros/cons of US Legislation: "${billTitle}"`;

    try {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                query: prompt,
                useAutoprompt: true, // Exa feature to optimize query
                numResults: 3,
                contents: {
                    text: true
                }
            })
        });

        const data = await res.json();
        const boilerplate = [
            /\[Skip to main content\]/gi,
            /#main-content/gi,
            /Skip to content/gi,
            /\[House Report 11\d-\d+\]/gi // Remove redundant report headers if they clutter
        ];

        return data.results.map((r: any) => {
            let cleanTitle = r.title || 'Untitled Research';
            // Detect local file paths which occur during PDF crawls
            if (cleanTitle.includes('\\') || cleanTitle.includes('AppData') || cleanTitle.includes('Temp')) {
                const urlParts = r.url.split('/');
                cleanTitle = urlParts[urlParts.length - 1]
                    .replace(/[-_]/g, ' ')
                    .replace(/\.pdf$/i, '')
                    .replace(/\.[a-z]{3,4}$/i, '');

                // Capitalize first letter of each word
                cleanTitle = cleanTitle.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }

            let cleanSnippet = r.text || '';
            boilerplate.forEach(regex => {
                cleanSnippet = cleanSnippet.replace(regex, '');
            });

            return {
                title: cleanTitle.trim().slice(0, 150),
                url: r.url,
                text: cleanSnippet.trim().slice(0, 300)
            };
        });

    } catch (e) {
        console.error("Exa Error", e);
        return [];
    }
}

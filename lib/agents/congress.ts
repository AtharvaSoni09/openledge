export interface Bill {
    bill_id: string; // e.g., "hr123"
    title: string;
    congress: number;
    originChamber: "House" | "Senate";
    type: string;
    updateDate: string;
    url: string;
    congressGovUrl: string;
    introducedDate?: string;
    latestAction?: {
        actionDate: string;
        text: string;
    };
    sponsors?: {
        name: string;
        bioguideId: string;
        state: string;
        party: string;
    }[];
    cosponsors?: {
        name: string;
        bioguideId: string;
        state: string;
        party: string;
        sponsorshipDate?: string;
    }[];
}

const BASE_URL = 'https://api.congress.gov/v3';

function generateCongressGovUrl(congress: number, type: string, number: string): string {
    const typeMap: Record<string, string> = {
        'HR': 'house-bill',
        'S': 'senate-bill',
        'HRES': 'house-resolution',
        'SRES': 'senate-resolution',
        'HJRES': 'house-joint-resolution',
        'SJRES': 'senate-joint-resolution',
        'HCONRES': 'house-concurrent-resolution',
        'SCONRES': 'senate-concurrent-resolution'
    };
    const chamberType = typeMap[type.toUpperCase()] || 'house-bill';
    return `https://www.congress.gov/bill/${congress}th-congress/${chamberType}/${number}`;
}

export async function fetchRecentBills(limit: number = 5, offset: number = 0): Promise<Bill[]> {
    const apiKey = process.env.CONGRESS_GOV_API_KEY;
    if (!apiKey) throw new Error("CONGRESS_GOV_API_KEY is missing");

    // Fetch from the 119th Congress specifically for recent data
    const url = `${BASE_URL}/bill/119?sort=updateDate+desc&format=json&limit=${limit}&offset=${offset}&api_key=${apiKey}`;
    console.log(`Fetching ${limit} recent bills from the 119th Congress: ${url}`);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Congress API Error: ${res.status}`);
        const data = await res.json();
        const rawBills = data.bills || [];

        const detailedBills: Bill[] = [];

        for (const rawBill of rawBills) {
            try {
                const detailUrl = `${BASE_URL}/bill/${rawBill.congress}/${rawBill.type}/${rawBill.number}?format=json&api_key=${apiKey}`;
                const detailRes = await fetch(detailUrl);
                const detailData = await detailRes.json();
                const fullBill = detailData.bill;

                detailedBills.push({
                    bill_id: `${rawBill.type}${rawBill.number}-${rawBill.congress}`,
                    title: fullBill.title,
                    congress: rawBill.congress,
                    originChamber: rawBill.originChamber,
                    type: rawBill.type,
                    updateDate: rawBill.updateDate,
                    url: rawBill.url,
                    congressGovUrl: generateCongressGovUrl(rawBill.congress, rawBill.type, rawBill.number),
                    introducedDate: fullBill.introducedDate || rawBill.introducedDate,
                    latestAction: fullBill.latestAction,
                    sponsors: fullBill.sponsors?.map((s: any) => ({
                        name: s.fullName,
                        bioguideId: s.bioguideId,
                        state: s.state,
                        party: s.party
                    })) || [],
                    cosponsors: Array.isArray(fullBill.cosponsors) 
                        ? fullBill.cosponsors.map((s: any) => ({
                            name: s.fullName,
                            bioguideId: s.bioguideId,
                            state: s.state,
                            party: s.party,
                            sponsorshipDate: s.sponsorshipDate
                        }))
                        : []
                });
            } catch (e) {
                console.error(`Error fetching detail for bill ${rawBill.number}:`, e);
            }
        }

        return detailedBills;
    } catch (error) {
        console.error("Error fetching recent bills:", error);
        return [];
    }
}

export async function fetchLatestBill(): Promise<Bill | null> {
    const bills = await fetchRecentBills(1);
    return bills.length > 0 ? bills[0] : null;
}

/**
 * Fetch the full text of a bill from Congress.gov.
 * Returns the plain text content, or null if text is not yet available.
 *
 * The API returns text versions (HTML, XML, PDF). We prefer the HTML
 * version and strip tags to get clean text for LLM consumption.
 */
export async function fetchBillText(billId: string): Promise<string | null> {
    const apiKey = process.env.CONGRESS_GOV_API_KEY;
    if (!apiKey) return null;

    const match = billId.match(/^([A-Z]+)(\d+)-(\d+)$/i);
    if (!match) return null;

    const [, rawType, number, congress] = match;
    const type = rawType.toLowerCase();

    try {
        // 1. Get available text versions
        const url = `${BASE_URL}/bill/${congress}/${type}/${number}/text?format=json&api_key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();

        const textVersions = data?.textVersions || [];
        if (textVersions.length === 0) {
            console.log(`fetchBillText(${billId}): No text versions available`);
            return null;
        }

        // 2. Find the best format — prefer HTML, then XML
        //    Each version has .formats = [{ url, type }]
        //    type can be "Formatted Text" (HTML), "PDF", "XML"
        const latestVersion = textVersions[0]; // Most recent version
        const formats = latestVersion?.formats || [];

        // Try to find HTML ("Formatted Text") first
        let textUrl = formats.find((f: any) =>
            f.type === 'Formatted Text' || f.type === 'Formatted Text (Monica)' ||
            (f.url && f.url.includes('/htm'))
        )?.url;

        // Fallback to XML
        if (!textUrl) {
            textUrl = formats.find((f: any) =>
                f.type === 'XML' || (f.url && f.url.includes('/xml'))
            )?.url;
        }

        // Fallback to any non-PDF format
        if (!textUrl) {
            textUrl = formats.find((f: any) => f.type !== 'PDF')?.url;
        }

        if (!textUrl) {
            console.log(`fetchBillText(${billId}): No usable text format found. Formats: ${JSON.stringify(formats.map((f: any) => f.type))}`);
            return null;
        }

        // 3. Fetch the actual text content
        //    Congress.gov text URLs need the API key appended
        const fullUrl = textUrl.includes('api_key') ? textUrl : `${textUrl}${textUrl.includes('?') ? '&' : '?'}api_key=${apiKey}`;
        const textRes = await fetch(fullUrl);
        if (!textRes.ok) {
            console.log(`fetchBillText(${billId}): Failed to fetch text from ${fullUrl}: ${textRes.status}`);
            return null;
        }

        let rawText = await textRes.text();

        // 4. Strip HTML/XML tags to get plain text
        rawText = rawText
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();

        if (rawText.length < 50) {
            console.log(`fetchBillText(${billId}): Text too short (${rawText.length} chars), likely empty`);
            return null;
        }

        console.log(`fetchBillText(${billId}): Got ${rawText.length} chars of text`);
        return rawText;
    } catch (e: any) {
        console.error(`fetchBillText(${billId}):`, e.message);
        return null;
    }
}

/**
 * Fetch the latest action for a single bill by its bill_id (e.g. "HR7584-119").
 * Returns { actionDate, text } or null.
 */
export async function fetchBillAction(billId: string): Promise<{ actionDate: string; text: string } | null> {
    const apiKey = process.env.CONGRESS_GOV_API_KEY;
    if (!apiKey) return null;

    // Parse "HR7584-119" → type=HR, number=7584, congress=119
    const match = billId.match(/^([A-Z]+)(\d+)-(\d+)$/i);
    if (!match) return null;

    const [, rawType, number, congress] = match;
    const type = rawType.toLowerCase();

    try {
        const url = `${BASE_URL}/bill/${congress}/${type}/${number}?format=json&api_key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const bill = data?.bill;
        if (!bill?.latestAction) return null;

        return {
            actionDate: bill.latestAction.actionDate || '',
            text: bill.latestAction.text || '',
        };
    } catch (e) {
        console.error(`fetchBillAction(${billId}):`, e);
        return null;
    }
}

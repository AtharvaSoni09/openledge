export interface Bill {
    bill_id: string; // e.g., "hr123"
    title: string;
    congress: number;
    originChamber: "House" | "Senate";
    type: string;
    updateDate: string;
    url: string;
    congressGovUrl: string;
    sponsors?: {
        name: string;
        bioguideId: string;
        state: string;
        party: string;
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

export async function fetchRecentBills(limit: number = 5): Promise<Bill[]> {
    const apiKey = process.env.CONGRESS_GOV_API_KEY;
    if (!apiKey) throw new Error("CONGRESS_GOV_API_KEY is missing");

    // Fetch from the 119th Congress specifically for recent data
    const url = `${BASE_URL}/bill/119?sort=updateDate+desc&format=json&limit=${limit}&api_key=${apiKey}`;
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
                    sponsors: fullBill.sponsors?.map((s: any) => ({
                        name: s.fullName,
                        bioguideId: s.bioguideId,
                        state: s.state,
                        party: s.party
                    })) || []
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

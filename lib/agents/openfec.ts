
export interface SponsorFunding {
    total_raised: number;
    top_industries: {
        name: string;
        amount: number;
    }[];
}

const BASE_URL = 'https://api.open.fec.gov/v1';

export async function fetchSponsorFunds(sponsorName: string): Promise<SponsorFunding | null> {
    const apiKey = process.env.OPENFEC_API_KEY;
    if (!apiKey) return null;

    // Congress API names often look like "Smith, John [R-NY-2]" or "Hon. Smith, John"
    // We want "John Smith" or "Smith John" or just "Smith"
    let cleanName = sponsorName
        .replace(/^(rep\.|sen\.|congressman|congresswoman|hon\.)\s+/i, '')
        .replace(/\[.*\]$/, '') // Remove [R-NY-2]
        .split(',')[0] // Take first part of "Last, First"
        .trim();

    // If it's "Last, First", we can also try to reconstruct "First Last"
    const parts = sponsorName.split(',').map(p => p.trim());
    if (parts.length > 1) {
        const firstName = parts[1].split(' ')[0]; // Take first word of "John [R-NY-2]"
        cleanName = `${firstName} ${parts[0]}`;
    }

    try {
        const searchUrl = `${BASE_URL}/candidates/search/?q=${encodeURIComponent(cleanName)}&api_key=${apiKey}&sort_null_only=false`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        const candidate = searchData.results?.[0]; // Best guess
        if (!candidate) return null;

        const candidateId = candidate.candidate_id;

        // 2. Fetch totals (Committee totals)
        const committeeUrl = `${BASE_URL}/candidate/${candidateId}/committees/?api_key=${apiKey}`;
        const commRes = await fetch(committeeUrl);
        const commData = await commRes.json();

        const pcc = commData.results?.find((c: any) => c.designation === 'P');

        let total = 0;
        if (pcc) {
            const totalsUrl = `${BASE_URL}/committee/${pcc.committee_id}/totals/?api_key=${apiKey}&sort=-cycle&per_page=1`;
            const totalsRes = await fetch(totalsUrl);
            const totalsData = await totalsRes.json();
            total = totalsData.results?.[0]?.receipts || 0;
        }

        return {
            total_raised: total,
            top_industries: []
        };

    } catch (e) {
        console.error("OpenFEC Error", e);
        return null;
    }
}

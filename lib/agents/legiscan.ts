/**
 * LegiScan API Agent — fetches state-level legislation.
 *
 * Requires env var LEGISCAN_API_KEY.
 * Docs: https://legiscan.com/legiscan
 *
 * If no key is configured the functions return empty arrays and log a warning
 * so the rest of the pipeline still works (federal-only mode).
 */

export interface StateBill {
  bill_id: string;        // legiscan numeric id, stored as string
  bill_number: string;    // e.g. "SB 123"
  title: string;
  description: string;
  state: string;          // 2-letter code
  status: string;
  status_date: string;
  url: string;            // legiscan web url
  text_url: string | null;
  last_action: string;
  last_action_date: string;
  session_id: number;
  doc_id: number | null;  // newest text doc_id for getBillText
}

const BASE = 'https://api.legiscan.com';

function getKey(): string | null {
  const key = process.env.LEGISCAN_API_KEY;
  if (!key) {
    console.warn('LEGISCAN: No API key configured — state bill fetch disabled.');
    return null;
  }
  return key;
}

/**
 * Fetch the full text of a bill using its doc_id.
 * Returns decoded plain text, or null if unavailable.
 */
export async function fetchBillTextFromLegiScan(docId: number): Promise<string | null> {
  const key = getKey();
  if (!key) return null;

  try {
    const url = `${BASE}/?key=${key}&op=getBillText&id=${docId}`;
    console.log(`LEGISCAN: Fetching bill text for doc_id ${docId}`);
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK' || !data.text?.doc) return null;

    // doc is base64-encoded text
    const decoded = Buffer.from(data.text.doc, 'base64').toString('utf-8');

    // Strip HTML tags if mime is text/html
    const mime = data.text.mime || '';
    if (mime.includes('html')) {
      return decoded
        .replace(/<[^>]+>/g, ' ')   // strip tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    return decoded.trim();
  } catch (error) {
    console.error(`LEGISCAN: Failed to fetch text for doc_id ${docId}:`, error);
    return null;
  }
}

/**
 * Fetch the most recently-updated bills for a given state.
 * Uses the `getMasterList` endpoint + detail lookups.
 */
export async function fetchStateBills(
  stateCode: string,
  limit: number = 10,
): Promise<StateBill[]> {
  const key = getKey();
  if (!key) return [];

  try {
    // Step 1 — get session master list for state
    const listUrl = `${BASE}/?key=${key}&op=getMasterList&state=${stateCode}`;
    console.log(`LEGISCAN: Fetching master list for ${stateCode}`);
    const listRes = await fetch(listUrl);
    if (!listRes.ok) throw new Error(`LegiScan list error: ${listRes.status}`);
    const listData = await listRes.json();

    if (listData.status !== 'OK') {
      console.error('LEGISCAN: API error', listData);
      return [];
    }

    const masterList = listData.masterlist;
    const session = masterList?.session;
    const sessionId = session?.session_id ?? 0;

    // masterList keys are bill_id numbers (skip "session" key)
    const entries = Object.entries(masterList)
      .filter(([k]) => k !== 'session')
      .map(([, v]: [string, any]) => v)
      .sort(
        (a: any, b: any) =>
          new Date(b.last_action_date).getTime() - new Date(a.last_action_date).getTime(),
      )
      .slice(0, limit);

    // Step 2 — fetch detail for each bill
    const bills: StateBill[] = [];

    for (const entry of entries) {
      try {
        const detailUrl = `${BASE}/?key=${key}&op=getBill&id=${entry.bill_id}`;
        const detailRes = await fetch(detailUrl);
        const detailData = await detailRes.json();

        if (detailData.status !== 'OK') continue;

        const b = detailData.bill;

        bills.push({
          bill_id: String(b.bill_id),
          bill_number: b.bill_number,
          title: b.title,
          description: b.description || b.title,
          state: stateCode.toUpperCase(),
          status: entry.status ?? String(b.status),
          status_date: b.status_date || entry.last_action_date,
          url: b.url,
          text_url: b.texts?.[0]?.state_link ?? null,
          last_action: entry.last_action || '',
          last_action_date: entry.last_action_date || '',
          session_id: sessionId,
          doc_id: b.texts?.length ? b.texts[b.texts.length - 1].doc_id : null,
        });
      } catch (e) {
        console.error(`LEGISCAN: Failed to fetch detail for bill ${entry.bill_id}:`, e);
      }
    }

    console.log(`LEGISCAN: Returned ${bills.length} bills for ${stateCode}`);
    return bills;
  } catch (error) {
    console.error('LEGISCAN: Unexpected error:', error);
    return [];
  }
}

/**
 * Search for bills by keyword within a state.
 * Useful for on-demand relevance queries.
 */
export async function searchStateBills(
  stateCode: string,
  query: string,
  limit: number = 10,
): Promise<StateBill[]> {
  const key = getKey();
  if (!key) return [];

  try {
    const searchUrl = `${BASE}/?key=${key}&op=getSearch&state=${stateCode}&query=${encodeURIComponent(query)}`;
    console.log(`LEGISCAN: Searching "${query}" in ${stateCode}`);
    const res = await fetch(searchUrl);
    if (!res.ok) throw new Error(`LegiScan search error: ${res.status}`);
    const data = await res.json();

    if (data.status !== 'OK') {
      console.error('LEGISCAN: search API error', data);
      return [];
    }

    const results = data.searchresult;
    const entries = Object.entries(results)
      .filter(([k]) => k !== 'summary')
      .map(([, v]: [string, any]) => v)
      .slice(0, limit);

    return entries.map((e: any) => ({
      bill_id: String(e.bill_id),
      bill_number: e.bill_number,
      title: e.title,
      description: e.title,
      state: stateCode.toUpperCase(),
      status: String(e.status ?? ''),
      status_date: e.last_action_date || '',
      url: e.url || '',
      text_url: e.text_url || null,
      last_action: e.last_action || '',
      last_action_date: e.last_action_date || '',
      session_id: 0,
      doc_id: null, // search results don't include doc_id
    }));
  } catch (error) {
    console.error('LEGISCAN: Search error:', error);
    return [];
  }
}

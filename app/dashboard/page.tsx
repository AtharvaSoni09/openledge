import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { stateNameFromCode } from '@/lib/utils/states';
import { parseStatusFromAction } from '@/lib/utils/bill-status';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard | Ledge',
};

const BILL_FIELDS = 'id, bill_id, title, seo_title, url_slug, tldr, source, state_code, created_at, latest_action, status, status_date, status_changed_at';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('subscriber_email')?.value;

  if (!email) redirect('/');

  const supabase = getSupabaseAdmin();

  // 1. Fetch subscriber
  const { data: subscriber } = await (supabase as any)
    .from('subscribers')
    .select('id, email, org_goal, state_focus, created_at, search_interests')
    .eq('email', email)
    .single();

  if (!subscriber?.org_goal) redirect('/');

  // 2. Run all independent queries in parallel
  const [matchesResult, recentResult, starredResult] = await Promise.all([
    // Bill matches (relevant bills)
    (supabase as any)
      .from('bill_matches')
      .select('id, match_score, summary, why_it_matters, implications, legislation_id, created_at')
      .eq('subscriber_id', subscriber.id)
      .order('match_score', { ascending: false })
      .limit(50),
    // Recent published bills
    (supabase as any)
      .from('legislation')
      .select(BILL_FIELDS)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(30),
    // Starred bills
    (supabase as any)
      .from('starred_bills')
      .select('legislation_id, has_update, last_status')
      .eq('subscriber_id', subscriber.id),
  ]);

  const matches: any[] = matchesResult.data || [];
  const recentBills: any[] = recentResult.data || [];
  const starredRows: any[] = starredResult.data || [];

  // 3. Collect all legislation IDs we need, then fetch them in ONE batched query
  const matchedLegIds = matches.map((m: any) => m.legislation_id);
  const starredLegIds = starredRows.map((r: any) => r.legislation_id);
  const allNeededIds = [...new Set([...matchedLegIds, ...starredLegIds])];

  let billMap: Record<string, any> = {};
  if (allNeededIds.length > 0) {
    const { data: bills } = await (supabase as any)
      .from('legislation')
      .select(BILL_FIELDS)
      .in('id', allNeededIds);

    for (const bill of bills || []) {
      billMap[bill.id] = {
        ...bill,
        status: bill.status || parseStatusFromAction((bill.latest_action as any)?.text),
      };
    }
  }

  // 4. Build matched bills list (from matches + bill lookup)
  // Extract which interest a bill was matched from
  function extractSource(summary: string | null, orgGoal: string): string {
    if (!summary) return orgGoal;
    const interestMatch = summary.match(/interest:\s*"([^"]+)"/i);
    if (interestMatch) return interestMatch[1];
    const topicMatch = summary.match(/topic:\s*"([^"]+)"/i);
    if (topicMatch) return topicMatch[1];
    return orgGoal;
  }

  const matchedBills: any[] = [];
  for (const match of matches) {
    const bill = billMap[match.legislation_id];
    if (bill) {
      matchedBills.push({
        ...bill,
        match_score: match.match_score,
        match_summary: match.summary,
        match_why: match.why_it_matters,
        match_implications: match.implications,
        match_source: extractSource(match.summary, subscriber.org_goal),
      });
    }
  }

  // 5. Build unmatched recent bills
  const matchedIds = new Set(matchedBills.map((b: any) => b.id));
  const unmatched = recentBills
    .filter((b: any) => !matchedIds.has(b.id))
    .map((b: any) => ({
      ...b,
      status: b.status || parseStatusFromAction((b.latest_action as any)?.text),
    }));

  // 6. Build starred bills list
  const starredUpdateMap: Record<string, { has_update: boolean; last_status: string | null }> = {};
  for (const row of starredRows) {
    starredUpdateMap[row.legislation_id] = {
      has_update: row.has_update ?? false,
      last_status: row.last_status ?? null,
    };
  }

  const starredBills: any[] = [];
  for (const legId of starredLegIds) {
    const bill = billMap[legId];
    if (bill) {
      const matched = matchedBills.find((m: any) => m.id === bill.id);
      starredBills.push({
        ...bill,
        match_score: matched?.match_score,
        match_summary: matched?.match_summary,
        has_update: starredUpdateMap[bill.id]?.has_update ?? false,
      });
    }
  }

  // Build interests list for filter
  const searchInterests: string[] = subscriber.search_interests || [];
  const allInterests = [
    subscriber.org_goal,
    ...searchInterests.filter((i: string) => i.toLowerCase() !== subscriber.org_goal.toLowerCase()),
  ];

  return (
    <DashboardClient
      subscriber={{
        email: subscriber.email,
        orgGoal: subscriber.org_goal,
        stateFocus: subscriber.state_focus || 'US',
        stateName: stateNameFromCode(subscriber.state_focus || 'US'),
      }}
      matchedBills={matchedBills}
      recentBills={unmatched}
      starredBills={starredBills}
      starredIds={starredLegIds}
      totalBills={recentBills.length}
      interests={allInterests}
    />
  );
}

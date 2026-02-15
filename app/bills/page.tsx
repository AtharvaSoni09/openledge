import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseStatusFromAction } from '@/lib/utils/bill-status';
import Header from '@/components/layout/header';
import BillsClient from './BillsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'All Bills | Ledge',
};

export default async function BillsPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('subscriber_email')?.value || null;

  const supabase = getSupabaseAdmin();

  // Fetch bills + starred IDs in parallel
  const [billsResult, subscriberResult] = await Promise.all([
    (supabase as any)
      .from('legislation')
      .select('id, bill_id, title, seo_title, url_slug, tldr, source, state_code, created_at, latest_action, is_published, status, status_date')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(100),
    email
      ? (supabase as any).from('subscribers').select('id').eq('email', email).single()
      : Promise.resolve({ data: null }),
  ]);

  let starredIds: string[] = [];
  if (subscriberResult.data?.id) {
    const { data: starredRows } = await (supabase as any)
      .from('starred_bills')
      .select('legislation_id')
      .eq('subscriber_id', subscriberResult.data.id);
    starredIds = (starredRows || []).map((r: any) => r.legislation_id);
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header email={email} />
      <BillsClient
        bills={(billsResult.data || []).map((b: any) => ({
          ...b,
          status: b.status || parseStatusFromAction((b.latest_action as any)?.text),
        }))}
        email={email}
        starredIds={starredIds}
      />
    </div>
  );
}

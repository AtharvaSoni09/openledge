import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import Header from '@/components/layout/header';
import BillArticle from './BillArticle';

export const dynamic = 'force-dynamic';

// Use a lightweight metadata query — the main page fetch handles the full bill
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = getSupabaseAdmin();
    const { data: bill } = await (supabase as any)
      .from('legislation')
      .select('title, seo_title, meta_description')
      .eq('id', id)
      .single();

    if (!bill) return { title: 'Bill Not Found | Ledge' };

    return {
      title: `${bill.seo_title || bill.title} | Ledge`,
      description: bill.meta_description || bill.title,
    };
  } catch {
    return { title: 'Bill Analysis | Ledge' };
  }
}

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const email = cookieStore.get('subscriber_email')?.value || null;

  const supabase = getSupabaseAdmin();

  // Fetch bill and subscriber in parallel
  const [billResult, subResult] = await Promise.all([
    (supabase as any)
      .from('legislation')
      .select('*')
      .eq('id', id)
      .single(),
    email
      ? (supabase as any)
        .from('subscribers')
        .select('id, org_goal')
        .eq('email', email)
        .single()
      : Promise.resolve({ data: null }),
  ]);

  const bill = billResult.data;
  if (!bill) notFound();

  // If we have a subscriber, fetch their match data for this bill
  let matchData: any = null;
  const sub = subResult.data;
  if (sub) {
    const { data: match } = await (supabase as any)
      .from('bill_matches')
      .select('match_score, summary, why_it_matters, implications')
      .eq('subscriber_id', sub.id)
      .eq('legislation_id', id)
      .single();

    if (match) {
      matchData = match;
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header email={email} />
      <BillArticle bill={bill} matchData={matchData} email={email} />
    </div>
  );
}

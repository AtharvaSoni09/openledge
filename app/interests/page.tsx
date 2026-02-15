import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import Header from '@/components/layout/header';
import InterestsClient from './InterestsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Interests | Ledge',
};

export default async function InterestsPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('subscriber_email')?.value;

  if (!email) redirect('/');

  const supabase = getSupabaseAdmin();
  const { data: subscriber } = await (supabase as any)
    .from('subscribers')
    .select('id, email, org_goal, state_focus')
    .eq('email', email)
    .single();

  if (!subscriber?.org_goal) redirect('/');

  // Try to get search_interests (column may not exist yet)
  let searchInterests: string[] = [];
  try {
    const { data } = await (supabase as any)
      .from('subscribers')
      .select('search_interests')
      .eq('id', subscriber.id)
      .single();
    searchInterests = data?.search_interests || [];
  } catch {
    // column doesn't exist yet
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header email={email} />
      <InterestsClient
        email={subscriber.email}
        orgGoal={subscriber.org_goal}
        searchInterests={searchInterests}
      />
    </div>
  );
}

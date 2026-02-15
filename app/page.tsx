import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('subscriber_email')?.value;

  if (email) {
    const supabase = getSupabaseAdmin();
    const { data: sub } = await (supabase as any)
      .from('subscribers')
      .select('org_goal')
      .eq('email', email)
      .single();

    if (sub?.org_goal) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-black">L</span>
          </div>
          <span className="font-sans font-black text-lg tracking-tight text-zinc-900">Ledge</span>
        </div>
        <span className="text-[11px] text-zinc-400 font-sans tracking-wider uppercase hidden sm:block">
          AI Legislative Monitor
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <OnboardingFlow />
        </div>
      </main>
    </div>
  );
}

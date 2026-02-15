import { cookies } from 'next/headers';
import Header from '@/components/layout/header';

export const metadata = {
  title: 'Help | Ledge',
};

export default async function HelpPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('subscriber_email')?.value || null;

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header email={email} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
          <div>
            <h1 className="text-3xl font-serif font-black text-zinc-900 mb-2">How Ledge works</h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Ledge is an AI-powered legislative monitoring platform that tracks federal legislation
              and alerts you when new bills relate to your organizational goal.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">1. Set your goal</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              When you first sign up, you describe your organization&apos;s mission or focus area
              (e.g., &ldquo;Advancing K-12 STEM Education&rdquo; or &ldquo;Reducing Carbon Emissions&rdquo;).
              Our AI uses this as the lens through which it evaluates every new bill.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">2. We monitor Congress</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Every day, Ledge fetches newly introduced and updated bills from Congress.gov.
              Each bill is analyzed by our AI to determine how relevant it is to your specific goal,
              producing a match score from 0 to 100.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">3. Your dashboard</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              High-scoring bills appear in the &ldquo;Important Bills&rdquo; sidebar on the left of your
              dashboard, ranked by relevance. You can star bills to track them in the &ldquo;Bill Tracker&rdquo;
              on the right. Click any bill to open a full AI-generated analysis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">4. Alerts</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              When a bill scores above our impact threshold, you&apos;ll receive a personalized
              email alert explaining what the bill does, why it matters to your goal, and what
              the potential implications are.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">5. Deep research</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Clicking any bill opens an in-depth AI analysis page. Our research pipeline combines
              data from Congress.gov, news coverage, and policy research to produce a comprehensive
              briefing tailored to your goal.
            </p>
          </section>

          <div className="pt-6 border-t border-zinc-100">
            <p className="text-xs text-zinc-400">
              Questions? Reach out to us at support@ledge.law
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

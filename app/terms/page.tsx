import { cookies } from 'next/headers';
import Header from '@/components/layout/header';

export const metadata = {
  title: 'Terms & Conditions | Ledge',
};

export default async function TermsPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('subscriber_email')?.value || null;

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header email={email} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
          <div>
            <h1 className="text-3xl font-serif font-black text-zinc-900 mb-2">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs text-zinc-400">
              Last updated: February 15, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">1. Acceptance of Terms</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              By creating an account on Ledge (&ldquo;the Platform&rdquo;), you acknowledge that you have
              read, understood, and agree to be bound by these Terms &amp; Conditions. If you do not agree,
              do not create an account or use the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">2. Nature of the Service</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Ledge is an AI-powered legislative monitoring tool that provides automated summaries,
              relevance scores, and analysis of publicly available legislation. The Platform is designed
              to assist organizations in tracking legislation and is provided strictly for
              <strong> informational purposes only</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">3. Not Legal Advice</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Nothing on the Platform constitutes legal advice, professional counsel, or an
              attorney-client relationship. The AI-generated content, including bill summaries,
              relevance scores, implications, and research articles, is produced by automated systems
              and <strong>may contain inaccuracies, omissions, or errors</strong>. You should not rely
              on Ledge output as a substitute for professional legal analysis. Always consult a
              qualified attorney before making decisions based on legislative information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">4. Assumption of Risk</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              You expressly acknowledge and agree that your use of the Platform is at your
              <strong> sole risk</strong>. You assume full responsibility for any decisions, actions,
              or omissions made in reliance on information provided by the Platform, including but
              not limited to:
            </p>
            <ul className="text-sm text-zinc-600 leading-relaxed list-disc pl-5 space-y-1.5">
              <li>AI-generated bill summaries and relevance scores</li>
              <li>Bill status information and legislative tracking data</li>
              <li>Research articles and policy analysis</li>
              <li>&ldquo;Why it matters&rdquo; explanations and implications assessments</li>
              <li>Any recommendations or insights surfaced by the Platform</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">5. Limitation of Liability</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              To the fullest extent permitted by applicable law, Ledge, its operators, developers,
              affiliates, and contributors shall not be liable for any direct, indirect, incidental,
              special, consequential, or punitive damages arising from or related to:
            </p>
            <ul className="text-sm text-zinc-600 leading-relaxed list-disc pl-5 space-y-1.5">
              <li>Your use of or inability to use the Platform</li>
              <li>Any inaccuracies, errors, or omissions in AI-generated content</li>
              <li>Decisions made based on information provided by the Platform</li>
              <li>Any loss of data, business opportunity, or revenue</li>
              <li>Interruptions, delays, or failures in service availability</li>
              <li>Unauthorized access to your account or data</li>
            </ul>
            <p className="text-sm text-zinc-600 leading-relaxed">
              This limitation applies regardless of the theory of liability, whether in contract,
              tort (including negligence), strict liability, or otherwise, even if Ledge has been
              advised of the possibility of such damages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">6. Disclaimer of Warranties</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              The Platform is provided <strong>&ldquo;AS IS&rdquo;</strong> and{' '}
              <strong>&ldquo;AS AVAILABLE&rdquo;</strong> without warranties of any kind, either express
              or implied, including but not limited to implied warranties of merchantability, fitness
              for a particular purpose, accuracy, completeness, or non-infringement. We do not warrant
              that the Platform will be uninterrupted, error-free, or free of harmful components.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">7. AI-Generated Content</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              The Platform uses artificial intelligence and machine learning models to generate content.
              You acknowledge that AI-generated content:
            </p>
            <ul className="text-sm text-zinc-600 leading-relaxed list-disc pl-5 space-y-1.5">
              <li>May not reflect the complete, current, or accurate state of any legislation</li>
              <li>May contain hallucinations, fabricated details, or misinterpretations</li>
              <li>Should be independently verified before any reliance or action</li>
              <li>Does not represent the views or opinions of the Platform operators</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">8. Data &amp; Privacy</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              By creating an account, you consent to the collection and storage of your email address,
              organizational goal, state focus, bill interactions (stars, searches), and related
              preferences. This data is used solely to personalize your experience on the Platform.
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">9. Account Security</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              The Platform uses email-based authentication. You are responsible for maintaining the
              confidentiality of your email and for all activities that occur under your account.
              Ledge is not liable for any loss or damage arising from unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">10. Indemnification</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Ledge, its operators, developers, and
              affiliates from any claims, damages, losses, liabilities, and expenses (including
              reasonable legal fees) arising out of or related to your use of the Platform, your
              violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">11. Modifications</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. Continued use of the Platform
              after any changes constitutes acceptance of the updated Terms. Material changes will be
              indicated by updating the &ldquo;Last updated&rdquo; date at the top of this page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">12. Governing Law</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              United States. Any disputes arising under these Terms shall be resolved through binding
              arbitration in accordance with applicable rules, and you waive any right to participate
              in a class action lawsuit or class-wide arbitration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900">13. Termination</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              We may suspend or terminate your access to the Platform at any time, without prior
              notice, for any reason, including violation of these Terms. Upon termination, your
              right to use the Platform ceases immediately.
            </p>
          </section>

          <div className="pt-6 border-t border-zinc-100">
            <p className="text-xs text-zinc-400">
              If you have questions about these terms, contact us at legal@ledge.law
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import USMap from '@/components/map/USMap';
import { US_STATES } from '@/lib/utils/states';
import { ArrowRight, ArrowLeft, Loader2, Globe, LogIn, Sparkles } from 'lucide-react';

type Mode = 'onboard' | 'signin';
type Step = 'goal' | 'state' | 'email' | 'analyzing';

export default function OnboardingFlow() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('onboard');

  // Onboarding state
  const [step, setStep] = useState<Step>('goal');
  const [orgGoal, setOrgGoal] = useState('');
  const [stateFocus, setStateFocus] = useState<string>('US');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState('');

  const stateName =
    stateFocus === 'US'
      ? 'All / Nationally'
      : US_STATES.find((s) => s.code === stateFocus)?.name ?? stateFocus;

  /** Match existing bills against the user's goal (non-blocking) */
  const matchExistingBills = async (userEmail: string) => {
    try {
      setAnalysisProgress('Analyzing existing legislation...');
      const res = await fetch('/api/match-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (data.matched > 0) {
        setAnalysisProgress(`Found ${data.matched} relevant bill${data.matched > 1 ? 's' : ''}!`);
      } else {
        setAnalysisProgress('Analysis complete.');
      }
    } catch {
      // Non-critical — don't block navigation
      setAnalysisProgress('Analysis complete.');
    }
  };

  const handleOnboardSubmit = async () => {
    if (!orgGoal || !stateFocus || !email) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          org_goal: orgGoal.trim(),
          state_focus: stateFocus,
          accepted_terms_at: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      // Show analyzing screen, match existing bills, then redirect
      setStep('analyzing');
      setSubmitting(false);
      await matchExistingBills(email.toLowerCase().trim());

      // Brief pause so user can see the result
      await new Promise((r) => setTimeout(r, 1200));
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    if (!signInEmail) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/email-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail.toLowerCase().trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign in failed');

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── SIGN IN MODE ──────────────────────────────────────── */
  if (mode === 'signin') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-black text-zinc-900 leading-tight">
            Welcome back
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            Enter your email to access your dashboard.
          </p>
        </div>

        <input
          type="email"
          value={signInEmail}
          onChange={(e) => { setSignInEmail(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
          placeholder="you@organization.com"
          className="w-full px-4 py-3 text-base border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-4">{error}</p>
        )}

        <button
          onClick={handleSignIn}
          disabled={!signInEmail || submitting}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
          ) : (
            <><LogIn className="w-4 h-4" /> Sign in</>
          )}
        </button>

        <p className="text-center text-sm text-zinc-400">
          Don&apos;t have an account?{' '}
          <button
            onClick={() => { setMode('onboard'); setError(''); }}
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Get started
          </button>
        </p>
      </div>
    );
  }

  /* ── ONBOARDING MODE ───────────────────────────────────── */
  return (
    <div className="space-y-8">
      {/* Step 1: Goal */}
      {step === 'goal' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Step 1 of 3</p>
            <h1 className="text-2xl md:text-3xl font-serif font-black text-zinc-900 leading-tight">
              What does your organization care about?
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              Describe your mission. We&apos;ll only surface legislation that matters to this goal.
            </p>
          </div>

          <input
            value={orgGoal}
            onChange={(e) => setOrgGoal(e.target.value)}
            placeholder="e.g. Advancing K-12 STEM Education"
            className="w-full px-4 py-3 text-base border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            autoFocus
          />

          <div className="flex flex-wrap gap-2">
            {[
              'Advancing K-12 STEM Education',
              'Reducing Carbon Emissions',
              'Affordable Housing',
              'Healthcare Access',
              'Criminal Justice Reform',
            ].map((example) => (
              <button
                key={example}
                onClick={() => setOrgGoal(example)}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep('state')}
            disabled={!orgGoal.trim()}
            className="w-full py-3 bg-zinc-900 text-white rounded-lg font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <button
              onClick={() => { setMode('signin'); setError(''); }}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Sign in
            </button>
          </p>
        </div>
      )}

      {/* Step 2: State */}
      {step === 'state' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Step 2 of 3</p>
            <h1 className="text-2xl md:text-3xl font-serif font-black text-zinc-900 leading-tight">
              Select your focus
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              Track nationally or click a state. National is the default.
            </p>
          </div>

          <button
            onClick={() => setStateFocus('US')}
            className={`w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border transition-colors ${
              stateFocus === 'US'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-blue-50 hover:border-blue-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            All / Nationally (Federal legislation)
          </button>

          <div className="relative">
            <div className="absolute inset-x-0 top-1/2 border-t border-zinc-100" />
            <p className="relative text-center">
              <span className="bg-white px-3 text-[11px] text-zinc-400 uppercase tracking-wider">or pick a state</span>
            </p>
          </div>

          <USMap
            selected={stateFocus === 'US' ? null : stateFocus}
            onSelect={(code) => setStateFocus(code)}
          />

          {stateFocus && (
            <p className="text-center text-sm text-zinc-500">
              Focus: <span className="font-bold text-zinc-900">{stateName}</span>
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('goal')}
              className="flex-1 py-3 border border-zinc-200 text-zinc-700 rounded-lg font-semibold text-sm hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep('email')}
              disabled={!stateFocus}
              className="flex-[2] py-3 bg-zinc-900 text-white rounded-lg font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Email */}
      {step === 'email' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Step 3 of 3</p>
            <h1 className="text-2xl md:text-3xl font-serif font-black text-zinc-900 leading-tight">
              Enter your email
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              This is how you sign in and how we send impact alerts.
            </p>
          </div>

          <div className="bg-zinc-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Goal</span>
              <span className="text-zinc-900 font-medium text-right max-w-[60%] truncate">{orgGoal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Focus</span>
              <span className="text-zinc-900 font-medium">{stateName}</span>
            </div>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleOnboardSubmit()}
            placeholder="you@organization.com"
            className="w-full px-4 py-3 text-base border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-4">{error}</p>
          )}

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs text-zinc-500 leading-relaxed">
              I agree to the{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
              >
                Terms &amp; Conditions
              </a>
              . I understand that Ledge provides AI-generated legislative analysis for informational
              purposes only and does not constitute legal advice. I assume all risk associated with
              use of this platform.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('state')}
              className="flex-1 py-3 border border-zinc-200 text-zinc-700 rounded-lg font-semibold text-sm hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleOnboardSubmit}
              disabled={!email || !acceptedTerms || submitting}
              className="flex-[2] py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</>
              ) : (
                <>Launch Dashboard <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 text-center">
            You&apos;ll receive legislative impact alerts. Unsubscribe anytime.
          </p>
        </div>
      )}

      {/* Step 4: Analyzing — auto-matching existing bills */}
      {step === 'analyzing' && (
        <div className="space-y-8 animate-in fade-in duration-300 text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mx-auto">
            <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-black text-zinc-900 leading-tight">
              Personalizing your feed
            </h1>
            <p className="text-zinc-500 text-sm mt-3">
              Our AI is scoring existing legislation against your goal:
            </p>
            <p className="text-blue-600 font-semibold text-sm mt-1">
              &ldquo;{orgGoal}&rdquo;
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-zinc-600">{analysisProgress || 'Starting analysis...'}</span>
          </div>

          <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}
    </div>
  );
}

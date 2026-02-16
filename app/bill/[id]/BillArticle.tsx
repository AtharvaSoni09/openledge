'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ExternalLink, ArrowLeft, Newspaper, BookOpen, Target, CircleDot } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'Signed into Law': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  'Sent to President': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
  'Passed House': { bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
  'Passed Senate': { bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
  'Passed': { bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
  'On Calendar': { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
  'Reported by Committee': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  'Referred to Committee': { bg: 'bg-zinc-50 border-zinc-200', text: 'text-zinc-600' },
  'Received in Senate': { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600' },
  'Received in House': { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600' },
  'Resolving Differences': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  'Vetoed': { bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
  'Introduced': { bg: 'bg-zinc-50 border-zinc-100', text: 'text-zinc-500' },
};

interface Props {
  bill: {
    id: string;
    bill_id: string;
    title: string;
    seo_title: string | null;
    tldr: string | null;
    markdown_body: string;
    source: string | null;
    state_code: string | null;
    congress_gov_url: string | null;
    introduced_date: string | null;
    latest_action: any;
    status: string | null;
    status_date: string | null;
    sponsors: any;
    news_context: any;
    policy_research: any;
    created_at: string;
  };
  matchData: {
    match_score: number;
    summary: string | null;
    why_it_matters: string | null;
    implications: string | null;
  } | null;
  email: string | null;
}

function scoreColor(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 60) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-zinc-50 text-zinc-500 border-zinc-200';
}

export default function BillArticle({ bill, matchData, email }: Props) {
  const news: any[] = Array.isArray(bill.news_context) ? bill.news_context : [];
  const policy: any[] = Array.isArray(bill.policy_research) ? bill.policy_research : [];

  const [localMatch, setLocalMatch] = useState(matchData);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const [explanationError, setExplanationError] = useState(false);

  useEffect(() => {
    // If we have a match with score >= 25 but missing explanation, generate it
    if (localMatch && localMatch.match_score >= 25 && !localMatch.why_it_matters && email && !loadingExplanation && !explanationError) {
      setLoadingExplanation(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      fetch('/api/match-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: bill.id, email }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then((data) => {
          clearTimeout(timeoutId);
          if (data.why_it_matters) {
            setLocalMatch((prev) => prev ? { ...prev, ...data } : data);
          } else {
            setExplanationError(true);
          }
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.error('Explanation fetch failed:', err);
          setExplanationError(true);
        })
        .finally(() => setLoadingExplanation(false));

      return () => clearTimeout(timeoutId);
    }
  }, [localMatch, email, bill.id, explanationError]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to dashboard
        </Link>

        {/* Bill header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {bill.bill_id}
            </span>
            {bill.source === 'state' && bill.state_code && (
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                {bill.state_code}
              </span>
            )}
            {localMatch && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${scoreColor(localMatch.match_score)}`}>
                {localMatch.match_score}% match
              </span>
            )}
            {bill.congress_gov_url && (
              <a
                href={bill.congress_gov_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Congress.gov
              </a>
            )}
            {bill.introduced_date && (
              <span className="text-[10px] text-zinc-300 ml-auto">
                Introduced {new Date(bill.introduced_date).toLocaleDateString()}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-serif font-black text-zinc-900 leading-tight mb-3">
            {bill.seo_title || bill.title}
          </h1>

          {/* Status card */}
          {(() => {
            const statusLabel = bill.status || 'Introduced';
            const style = STATUS_STYLES[statusLabel] || STATUS_STYLES['Introduced'];
            const actionText = (bill.latest_action as any)?.text;
            const actionDate = bill.status_date || (bill.latest_action as any)?.actionDate;
            return (
              <div className={`rounded-lg p-4 border mb-4 ${style.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <CircleDot className={`w-3.5 h-3.5 ${style.text}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
                    {statusLabel}
                  </span>
                  {actionDate && (
                    <span className="text-[10px] text-zinc-400 ml-auto">
                      {new Date(actionDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {actionText && (
                  <p className="text-xs text-zinc-600 leading-relaxed mt-1">
                    {actionText}
                  </p>
                )}
              </div>
            );
          })()}

          {bill.tldr && (
            <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 rounded-lg p-4 border border-zinc-100">
              <span className="font-bold text-zinc-900">TL;DR: </span>
              {bill.tldr}
            </p>
          )}
        </div>

        {/* Relevance card (if matched to user's goal) */}
        {localMatch && localMatch.match_score >= 25 && (
          <div className="mb-8 border border-blue-100 bg-blue-50/50 rounded-lg p-5 space-y-3 min-h-[120px]">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Relevance to your goal
              </h2>
            </div>
            {loadingExplanation ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-3 bg-blue-200 rounded w-3/4"></div>
                <div className="h-3 bg-blue-200 rounded w-1/2"></div>
                <p className="text-xs text-blue-400 italic">Generating analysis...</p>
              </div>
            ) : explanationError ? (
              <p className="text-xs text-red-400 italic">Analysis unavailable. Please try again later.</p>
            ) : (
              <>
                {localMatch.why_it_matters && (
                  <div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Why it matters</p>
                    <p className="text-sm text-blue-900 leading-relaxed">{localMatch.why_it_matters}</p>
                  </div>
                )}
                {localMatch.implications && (
                  <div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Implications</p>
                    <p className="text-sm text-blue-900 leading-relaxed">{localMatch.implications}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Article body — already generated during import */}
        <article className="prose prose-sm prose-zinc max-w-none mb-12">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-lg font-bold text-zinc-900 mt-8 mb-3 border-b border-zinc-100 pb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-bold text-zinc-800 mt-6 mb-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-sm text-zinc-700 leading-relaxed mb-4">{children}</p>
              ),
              li: ({ children }) => (
                <li className="text-sm text-zinc-700 leading-relaxed mb-1">{children}</li>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {bill.markdown_body}
          </ReactMarkdown>
        </article>

        {/* Sources */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {news.length > 0 && (
            <div className="border border-zinc-100 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Related News
                </h3>
              </div>
              <div className="space-y-3">
                {news.map((item: any, i: number) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-zinc-600 hover:text-blue-600 transition-colors leading-relaxed"
                  >
                    {item.title}
                    {item.source_id && (
                      <span className="text-zinc-300 ml-1">({item.source_id})</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {policy.length > 0 && (
            <div className="border border-zinc-100 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Policy Research
                </h3>
              </div>
              <div className="space-y-3">
                {policy.map((item: any, i: number) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-zinc-600 hover:text-blue-600 transition-colors leading-relaxed"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sponsors */}
        {bill.sponsors && Array.isArray(bill.sponsors) && bill.sponsors.length > 0 && (
          <div className="border-t border-zinc-100 pt-6 mb-12">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Sponsors</h3>
            <div className="flex flex-wrap gap-2">
              {bill.sponsors.map((s: any, i: number) => (
                <span
                  key={i}
                  className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full"
                >
                  {s.name || s.fullName} {s.party ? `(${s.party})` : ''} {s.state || ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

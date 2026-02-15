'use client';

import { useState, useCallback } from 'react';
import { FileText, Search, Star } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'Signed into Law': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  'Sent to President': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
  'Passed House': { bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
  'Passed Senate': { bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
  'Passed': { bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
  'On Calendar': { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
  'Reported by Committee': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  'Referred to Committee': { bg: 'bg-zinc-50 border-zinc-200', text: 'text-zinc-500' },
  'Received in Senate': { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600' },
  'Received in House': { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600' },
  'Resolving Differences': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  'Vetoed': { bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
  'Introduced': { bg: 'bg-zinc-50 border-zinc-100', text: 'text-zinc-400' },
};

interface Bill {
  id: string;
  bill_id: string;
  title: string;
  seo_title: string | null;
  url_slug: string;
  tldr: string | null;
  source: string | null;
  state_code: string | null;
  created_at: string;
  latest_action: any;
  status: string | null;
}

interface Props {
  bills: Bill[];
  email: string | null;
  starredIds: string[];
}

export default function BillsClient({ bills, email, starredIds: initialStarredIds }: Props) {
  const [search, setSearch] = useState('');
  const [starred, setStarred] = useState<string[]>(initialStarredIds);

  const toggleStar = useCallback(
    async (billId: string) => {
      if (!email) return;
      const isStarred = starred.includes(billId);
      const action = isStarred ? 'unstar' : 'star';

      setStarred((prev) =>
        isStarred ? prev.filter((id) => id !== billId) : [...prev, billId],
      );

      try {
        await fetch('/api/star', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, legislation_id: billId, action }),
        });
      } catch {
        setStarred((prev) =>
          isStarred ? [...prev, billId] : prev.filter((id) => id !== billId),
        );
      }
    },
    [starred, email],
  );

  const filtered = bills.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.bill_id.toLowerCase().includes(q) ||
      (b.seo_title || '').toLowerCase().includes(q) ||
      (b.tldr || '').toLowerCase().includes(q) ||
      (b.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-serif font-black text-zinc-900">All Bills</h1>
          <span className="text-xs text-zinc-400">{bills.length} bills</span>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills or status..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        {/* Bill list */}
        <div className="divide-y divide-zinc-100">
          {filtered.map((bill) => {
            const statusLabel = bill.status || 'Introduced';
            const style = STATUS_STYLES[statusLabel] || STATUS_STYLES['Introduced'];
            const isStarred = starred.includes(bill.id);

            return (
              <div
                key={bill.id}
                className="flex items-start gap-3 py-4 hover:bg-zinc-50 -mx-3 px-3 rounded transition-colors group"
              >
                {email && (
                  <button
                    onClick={() => toggleStar(bill.id)}
                    className={`shrink-0 mt-1 p-0.5 rounded transition-colors ${
                      isStarred
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-zinc-400 hover:text-amber-500'
                    }`}
                    title={isStarred ? 'Unstar' : 'Star this bill'}
                  >
                    <Star
                      className="w-4 h-4"
                      fill={isStarred ? 'currentColor' : 'none'}
                      strokeWidth={2}
                    />
                  </button>
                )}

                <a
                  href={`/bill/${bill.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {bill.bill_id}
                    </span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${style.bg} ${style.text}`}>
                      {statusLabel}
                    </span>
                    {bill.source === 'state' && bill.state_code && (
                      <span className="text-[10px] font-bold text-purple-500 uppercase">
                        {bill.state_code}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-300 ml-auto">
                      {new Date(bill.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors leading-snug">
                    {bill.seo_title || bill.title}
                  </h3>
                  {bill.tldr && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                      {bill.tldr}
                    </p>
                  )}
                </a>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">
                {search ? 'No bills match your search.' : 'No bills yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

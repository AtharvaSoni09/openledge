'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import USMap from '@/components/map/USMap';
import Header from '@/components/layout/header';
import SettingsModal from '@/components/ui/SettingsModal';
import {
  Target,
  Globe,
  Star,
  Zap,
  FileText,
  ChevronRight,
  Bookmark,
  Bell,
  CircleDot,
  Loader2,
  Sparkles,
  Search,
  X,
  Plus,
  Check,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────── */

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
  status_date: string | null;
  match_score?: number;
  match_summary?: string;
  match_why?: string;
  match_implications?: string;
  match_source?: string;
  match_created_at?: string;
  has_update?: boolean;
}

interface Props {
  subscriber: {
    email: string;
    orgGoal: string;
    stateFocus: string;
    stateName: string;
  };
  matchedBills: Bill[];
  recentBills: Bill[];
  starredBills: Bill[];
  starredIds: string[];
  totalBills?: number;
  interests?: string[];
}

/* ── Status styling ────────────────────────────────────────── */

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

function statusBadge(status: string | null) {
  const s = status || 'Introduced';
  const style = STATUS_STYLES[s] || STATUS_STYLES['Introduced'];
  return { className: `${style.bg} ${style.text} border`, label: s };
}

/* ── Score helpers ─────────────────────────────────────────── */

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-zinc-400';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 60) return 'bg-blue-50 border-blue-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-zinc-50 border-zinc-200';
}

/* ── Dashboard ─────────────────────────────────────────────── */

export default function DashboardClient({
  subscriber,
  matchedBills: initialMatched,
  recentBills,
  starredBills: initialStarred,
  starredIds: initialStarredIds,
  totalBills = 0,
  interests = [],
}: Props) {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [starred, setStarred] = useState<string[]>(initialStarredIds);
  const [starredBills, setStarredBills] = useState<Bill[]>(initialStarred);
  const [matchedBills] = useState<Bill[]>(initialMatched);
  const [isMatching, setIsMatching] = useState(false);
  const [matchingDone, setMatchingDone] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Explore state
  const [exploreQuery, setExploreQuery] = useState('');
  const [exploreResults, setExploreResults] = useState<(Bill & { explore_score?: number })[]>([]);
  const [isExploring, setIsExploring] = useState(false);
  const [exploreSearched, setExploreSearched] = useState(false);
  const [lastExploreQuery, setLastExploreQuery] = useState('');
  const [addingToInterests, setAddingToInterests] = useState(false);
  const [addedToInterests, setAddedToInterests] = useState(false);

  // Auto-match: if there are bills in the DB but 0 matches for this user, trigger matching
  useEffect(() => {
    if (initialMatched.length === 0 && totalBills > 0 && !isMatching && !matchingDone) {
      setIsMatching(true);
      fetch('/api/match-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscriber.email }),
      })
        .then((res) => res.json())
        .then((data) => {
          setMatchingDone(true);
          setIsMatching(false);
          if (data.matched > 0) {
            // Refresh to pick up new matches
            router.refresh();
          }
        })
        .catch(() => {
          setIsMatching(false);
          setMatchingDone(true);
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedInterests = useMemo(() => {
    return [...interests].sort((a, b) => {
      const countA = matchedBills.filter(bill => bill.match_source?.toLowerCase() === a.toLowerCase()).length;
      const countB = matchedBills.filter(bill => bill.match_source?.toLowerCase() === b.toLowerCase()).length;
      return countB - countA; // Descending
    });
  }, [interests, matchedBills]);

  const filteredMatched = activeFilter
    ? matchedBills.filter((b) =>
      b.match_source?.toLowerCase() === activeFilter.toLowerCase(),
    )
    : matchedBills;

  const allLeftBills = [
    ...filteredMatched,
    ...(activeFilter ? [] : recentBills.map((b) => ({ ...b, match_score: undefined }))),
  ];

  const dismissUpdate = useCallback(async (billId: string) => {
    setStarredBills((s) =>
      s.map((b) => (b.id === billId ? { ...b, has_update: false } : b)),
    );
    // Clear the flag in DB
    await fetch('/api/star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: subscriber.email,
        legislation_id: billId,
        action: 'dismiss_update',
      }),
    }).catch(() => { });
  }, [subscriber.email]);

  const toggleStar = useCallback(
    async (bill: Bill) => {
      const isStarred = starred.includes(bill.id);
      const action = isStarred ? 'unstar' : 'star';

      if (isStarred) {
        setStarred((s) => s.filter((id) => id !== bill.id));
        setStarredBills((s) => s.filter((b) => b.id !== bill.id));
      } else {
        setStarred((s) => [...s, bill.id]);
        setStarredBills((s) => [...s, bill]);
      }

      try {
        await fetch('/api/star', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: subscriber.email,
            legislation_id: bill.id,
            action,
          }),
        });
      } catch {
        if (isStarred) {
          setStarred((s) => [...s, bill.id]);
          setStarredBills((s) => [...s, bill]);
        } else {
          setStarred((s) => s.filter((id) => id !== bill.id));
          setStarredBills((s) => s.filter((b) => b.id !== bill.id));
        }
      }
    },
    [starred, subscriber.email],
  );

  const handleExplore = useCallback(async () => {
    if (!exploreQuery.trim() || isExploring) return;
    setIsExploring(true);
    setExploreSearched(false);
    setExploreResults([]);
    setAddedToInterests(false);
    const q = exploreQuery.trim();
    setLastExploreQuery(q);

    try {
      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscriber.email, query: q }),
      });
      const data = await res.json();
      if (data.results) {
        setExploreResults(data.results);
      }
    } catch {
      // silent
    } finally {
      setIsExploring(false);
      setExploreSearched(true);
    }
  }, [exploreQuery, isExploring, subscriber.email]);

  const handleAddToInterests = useCallback(async () => {
    if (!lastExploreQuery || addingToInterests || addedToInterests) return;
    setAddingToInterests(true);

    const billIds = exploreResults
      .filter((b) => (b.explore_score ?? 0) >= 25)
      .map((b) => b.id);
    const scores: Record<string, number> = {};
    for (const b of exploreResults) {
      if (b.explore_score != null) scores[b.id] = b.explore_score;
    }

    try {
      await fetch('/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: subscriber.email,
          action: 'add',
          topic: lastExploreQuery,
          bill_ids: billIds,
          scores,
        }),
      });
      window.location.href = '/dashboard';
    } catch {
      // silent
    } finally {
      setAddingToInterests(false);
    }
  }, [lastExploreQuery, addingToInterests, addedToInterests, exploreResults, subscriber.email, router]);

  const updatedStarredCount = starredBills.filter((b) => b.has_update).length;

  const handleStateClick = async (stateCode: string) => {
    if (addingToInterests) return;
    setAddingToInterests(true);
    // Optional: Show toast "Scanning [State] for relevant bills..."

    try {
      const res = await fetch('/api/explore/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscriber.email, state: stateCode }),
      });
      const data = await res.json();

      if (data.success && data.added > 0) {
        // Refresh to show new matches
        router.refresh();
      } else {
        // Optional: Show "No relevant bills found in [State]"
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingToInterests(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header email={subscriber.email} onOpenSettings={() => setIsSettingsOpen(true)} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentGoal={subscriber.orgGoal}
        currentState={subscriber.stateFocus}
        email={subscriber.email}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT SIDEBAR: Important Bills ─────────────── */}
        <div className="w-[340px] shrink-0 border-r border-zinc-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
              Important Bills
            </span>
            {filteredMatched.length > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold ml-auto">
                {filteredMatched.length}
              </span>
            )}
          </div>

          {/* Interest filter */}
          {sortedInterests.length > 1 && (
            <div className="px-3 py-2 border-b border-zinc-100 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setActiveFilter(null)}
                className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${activeFilter === null
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                  }`}
              >
                All
              </button>
              {sortedInterests.map((interest) => {
                const count = matchedBills.filter(
                  (b) => b.match_source?.toLowerCase() === interest.toLowerCase(),
                ).length;
                return (
                  <button
                    key={interest}
                    onClick={() =>
                      setActiveFilter(activeFilter === interest ? null : interest)
                    }
                    className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${activeFilter === interest
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                      }`}
                  >
                    {interest}
                    {count > 0 && (
                      <span className={`ml-1 ${activeFilter === interest ? 'text-blue-200' : 'text-zinc-300'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* Auto-matching banner */}
            {isMatching && (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span className="text-[11px] text-blue-700 font-medium">
                  Analyzing bills for your goal...
                </span>
              </div>
            )}
            {matchingDone && initialMatched.length === 0 && matchedBills.length === 0 && (
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] text-emerald-700 font-medium">
                  Analysis complete. Refreshing...
                </span>
              </div>
            )}

            {allLeftBills.length === 0 && !isMatching && (
              <div className="p-6 text-center">
                <FileText className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {activeFilter
                    ? `No bills matched for "${activeFilter}" yet.`
                    : "No bills yet. We're monitoring Congress for legislation related to your goal."}
                </p>
              </div>
            )}

            {filteredMatched.map((bill) => (
              <LeftBillRow
                key={bill.id}
                bill={bill}
                isStarred={starred.includes(bill.id)}
                onToggleStar={() => toggleStar(bill)}
                hasMatch
              />
            ))}

            {filteredMatched.length > 0 && recentBills.length > 0 && !activeFilter && (
              <div className="px-4 py-2 bg-zinc-50/50 border-y border-zinc-100">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                  Recent legislation
                </span>
              </div>
            )}

            {!activeFilter && recentBills.map((bill) => (
              <LeftBillRow
                key={bill.id}
                bill={bill}
                isStarred={starred.includes(bill.id)}
                onToggleStar={() => toggleStar(bill)}
                hasMatch={false}
              />
            ))}
          </div>
        </div>

        {/* ── CENTER: Stats + Map + Explore ──────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Profile bar + Stats */}
          <div className="px-6 py-3 border-b border-zinc-100 bg-gradient-to-r from-blue-50/40 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Target className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                  Monitoring for
                </p>
                <p className="text-xs font-semibold text-zinc-900 truncate">
                  {subscriber.orgGoal}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 bg-white px-2.5 py-1 rounded-full border border-zinc-100">
                <Globe className="w-3 h-3" />
                {subscriber.stateName}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 mt-3">
              <Stat label="Matched" value={matchedBills.length} color="text-blue-600" />
              <Stat label="High Impact" value={matchedBills.filter((b) => (b.match_score ?? 0) >= 80).length} color="text-green-600" />
              <Stat label="Starred" value={starred.length} color="text-amber-500" />
              <Stat label="Total" value={allLeftBills.length} color="text-zinc-600" />
            </div>
          </div>

          {/* Map — compact */}
          <div className="flex items-center justify-center px-6 py-3">
            <div className="w-full max-w-md">
              <USMap
                selected={subscriber.stateFocus === 'US' ? null : subscriber.stateFocus}
                interactive={true}
                onSelect={handleStateClick}
                highlightAll={subscriber.stateFocus === 'US'}
              />
              {addingToInterests && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 border border-zinc-100">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold text-zinc-700">Scanning state legislation...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Explore Section — always visible ──────── */}
          <div className="flex-1 border-t border-zinc-100 flex flex-col min-h-0">
            <div className="px-6 py-3 flex items-center gap-2 bg-zinc-50/50 border-b border-zinc-100">
              <Search className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                Explore New Topics
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
              <div className="flex gap-2">
                <input
                  value={exploreQuery}
                  onChange={(e) => setExploreQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExplore()}
                  placeholder="e.g. artificial intelligence, veterans benefits..."
                  className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white"
                />
                <button
                  onClick={handleExplore}
                  disabled={!exploreQuery.trim() || isExploring}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                >
                  {isExploring ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  {isExploring ? 'Searching...' : 'Search'}
                </button>
              </div>

              {!isExploring && !exploreSearched && (
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Search for legislation beyond your primary goal. If the results are useful, click
                  &ldquo;Add to Interests&rdquo; to include them in your Important Bills feed.
                </p>
              )}

              {isExploring && (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                  <span className="text-xs text-zinc-500">AI is scoring bills against &ldquo;{exploreQuery}&rdquo;...</span>
                </div>
              )}

              {exploreSearched && !isExploring && exploreResults.length === 0 && (
                <p className="text-xs text-zinc-400 py-2">No matching bills found for this topic.</p>
              )}

              {exploreResults.length > 0 && (
                <>
                  {/* Add to Interests button */}
                  <button
                    onClick={handleAddToInterests}
                    disabled={addingToInterests || addedToInterests}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${addedToInterests
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50'
                      }`}
                  >
                    {addedToInterests ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Added &ldquo;{lastExploreQuery}&rdquo; to Interests
                      </>
                    ) : addingToInterests ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add &ldquo;{lastExploreQuery}&rdquo; to Interests
                      </>
                    )}
                  </button>

                  <div className="rounded-lg border border-zinc-100 divide-y divide-zinc-50">
                    {exploreResults.map((bill) => (
                      <a
                        key={bill.id}
                        href={`/bill/${bill.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 px-3 py-2.5 hover:bg-violet-50/50 transition-colors group"
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleStar(bill);
                          }}
                          className={`shrink-0 mt-0.5 p-0.5 rounded transition-colors ${starred.includes(bill.id) ? 'text-amber-500' : 'text-zinc-400 hover:text-amber-500'
                            }`}
                        >
                          <Star className="w-3 h-3" fill={starred.includes(bill.id) ? 'currentColor' : 'none'} strokeWidth={2} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">{bill.bill_id}</span>
                            <StatusBadge status={bill.status} />
                            {bill.explore_score != null && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${scoreBg(bill.explore_score)} ${scoreColor(bill.explore_score)}`}>
                                {bill.explore_score}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-zinc-800 group-hover:text-violet-600 leading-snug line-clamp-2">
                            {bill.seo_title || bill.title}
                          </p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-zinc-200 shrink-0 mt-1" />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: Bill Tracker (Starred) ────── */}
        <div className="w-[300px] shrink-0 border-l border-zinc-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
              Bill Tracker
            </span>
            {updatedStarredCount > 0 && (
              <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold ml-auto flex items-center gap-1">
                <Bell className="w-2.5 h-2.5" />
                {updatedStarredCount} update{updatedStarredCount > 1 ? 's' : ''}
              </span>
            )}
            {updatedStarredCount === 0 && starred.length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold ml-auto">
                {starred.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {starredBills.length === 0 && (
              <div className="p-6 text-center">
                <Star className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Star bills from the left panel to track them here.
                </p>
              </div>
            )}

            {/* Show updated bills first */}
            {starredBills
              .sort((a, b) => (b.has_update ? 1 : 0) - (a.has_update ? 1 : 0))
              .map((bill) => (
                <RightBillRow
                  key={bill.id}
                  bill={bill}
                  onUnstar={() => toggleStar(bill)}
                  onDismissUpdate={() => dismissUpdate(bill.id)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-base font-black ${color}`}>{value}</p>
      <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const { className, label } = statusBadge(status);
  return (
    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${className} uppercase tracking-wider whitespace-nowrap`}>
      {label}
    </span>
  );
}

function LeftBillRow({
  bill,
  isStarred,
  onToggleStar,
  hasMatch,
}: {
  bill: Bill;
  isStarred: boolean;
  onToggleStar: () => void;
  hasMatch: boolean;
}) {
  const score = bill.match_score;
  const isNew = bill.match_created_at
    ? Date.now() - new Date(bill.match_created_at).getTime() < 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="group relative border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
      {isNew && (
        <div className="bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wider px-4 py-1 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          New match
        </div>
      )}
      <div className="flex items-start gap-2 px-4 py-3">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleStar();
          }}
          className={`shrink-0 mt-0.5 p-0.5 rounded transition-colors ${isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-zinc-400 hover:text-amber-500'
            }`}
          title={isStarred ? 'Unstar' : 'Star this bill'}
        >
          <Star className="w-3.5 h-3.5" fill={isStarred ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>

        <a href={`/bill/${bill.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
              {bill.bill_id}
            </span>
            <StatusBadge status={bill.status} />
            {hasMatch && score != null && score > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${scoreBg(score)} ${scoreColor(score)}`}>
                {score}%
              </span>
            )}
          </div>
          <h4 className="text-xs font-semibold text-zinc-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
            {bill.seo_title || bill.title}
          </h4>
          {bill.match_summary && (
            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
              {bill.match_summary}
            </p>
          )}
        </a>

        <ChevronRight className="w-3 h-3 text-zinc-200 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function RightBillRow({
  bill,
  onUnstar,
  onDismissUpdate,
}: {
  bill: Bill;
  onUnstar: () => void;
  onDismissUpdate: () => void;
}) {
  const hasUpdate = bill.has_update;

  return (
    <div className={`group border-b transition-colors ${hasUpdate ? 'bg-orange-50/60 border-orange-100' : 'border-zinc-50 hover:bg-amber-50/30'}`}>
      <div className="flex items-start gap-2 px-4 py-3">
        <button
          onClick={onUnstar}
          className="shrink-0 mt-0.5 text-amber-500 hover:text-amber-600 transition-colors p-0.5"
          title="Unstar"
        >
          <Star className="w-3.5 h-3.5" fill="currentColor" strokeWidth={2} />
        </button>

        <a href={`/bill/${bill.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
          {/* Update banner */}
          {hasUpdate && (
            <div className="flex items-center gap-1 mb-1.5">
              <CircleDot className="w-3 h-3 text-orange-500" />
              <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider">
                Status updated
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDismissUpdate();
                }}
                className="text-[9px] text-orange-400 hover:text-orange-600 ml-auto"
              >
                dismiss
              </button>
            </div>
          )}

          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
            {bill.bill_id}
          </span>
          <h4 className="text-xs font-semibold text-zinc-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
            {bill.seo_title || bill.title}
          </h4>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <StatusBadge status={bill.status} />
            {bill.match_score != null && bill.match_score > 0 && (
              <span className={`text-[9px] font-bold ${scoreColor(bill.match_score)}`}>
                {bill.match_score}% match
              </span>
            )}
          </div>
        </a>
      </div>
    </div>
  );
}

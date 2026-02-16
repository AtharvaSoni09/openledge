'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Target, Search, Loader2, Sparkles, Plus, Check } from 'lucide-react';

interface Props {
  email: string;
  orgGoal: string;
  searchInterests: string[];
}

export default function InterestsClient({ email, orgGoal, searchInterests: initial }: Props) {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>(initial);
  const [removing, setRemoving] = useState<string | null>(null);

  // AI parse state
  const [description, setDescription] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [addAllProgress, setAddAllProgress] = useState<{ current: number; total: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleRemove = async (interest: string) => {
    if (interest.toLowerCase() === orgGoal.toLowerCase()) return;
    setRemoving(interest);
    setInterests((prev) => prev.filter((i) => i !== interest));

    await fetch('/api/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'remove', topic: interest }),
    }).catch(() => { });

    setRemoving(null);
    router.refresh();
  };

  const handleParse = async () => {
    if (!description.trim() || isParsing) return;
    setIsParsing(true);
    setSuggestions([]);
    setAddedSuggestions(new Set());
    setAddAllProgress(null);

    try {
      const res = await fetch('/api/interests/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (data.keywords) {
        // Filter out topics that already exist
        const existingLower = new Set([
          orgGoal.toLowerCase(),
          ...interests.map((i) => i.toLowerCase()),
        ]);
        const newSuggestions = data.keywords.filter(
          (k: string) => !existingLower.has(k.toLowerCase()),
        );
        setSuggestions(newSuggestions);
      }
    } catch {
      // silent
    } finally {
      setIsParsing(false);
    }
  };

  // Add a single suggestion: run explore to find matching bills, then save
  const addOneSuggestion = async (topic: string): Promise<boolean> => {
    try {
      // Run explore to find matching bills for this specific topic
      const exploreRes = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, query: topic }),
      });
      const exploreData = await exploreRes.json();
      const results: any[] = exploreData.results || [];

      // Collect bill IDs and scores for bills scoring >= 25
      const billIds = results.filter((b: any) => (b.explore_score ?? 0) >= 25).map((b: any) => b.id);
      const scores: Record<string, number> = {};
      for (const b of results) {
        if (b.explore_score != null) scores[b.id] = b.explore_score;
      }

      // Save interest + matched bills
      await fetch('/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'add', topic, bill_ids: billIds, scores }),
      });

      return true;
    } catch {
      return false;
    }
  };

  const handleAddSuggestion = async (topic: string) => {
    if (addingSuggestion || isAddingAll) return;
    setAddingSuggestion(topic);

    const success = await addOneSuggestion(topic);
    if (success) {
      setInterests((prev) => [...prev, topic]);
      setAddedSuggestions((prev) => new Set([...prev, topic]));
      setToast({ message: `Added "${topic}" to interests`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast({ message: `Failed to add "${topic}"`, type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }

    setAddingSuggestion(null);
  };

  // Add all remaining suggestions one by one, sequentially
  const handleAddAll = async () => {
    if (isAddingAll || addingSuggestion) return;
    const remaining = suggestions.filter((s) => !addedSuggestions.has(s));
    if (remaining.length === 0) return;

    setIsAddingAll(true);
    setAddAllProgress({ current: 0, total: remaining.length });

    for (let i = 0; i < remaining.length; i++) {
      const topic = remaining[i];
      setAddingSuggestion(topic);
      setAddAllProgress({ current: i + 1, total: remaining.length });

      const success = await addOneSuggestion(topic);
      if (success) {
        setInterests((prev) => [...prev, topic]);
        setAddedSuggestions((prev) => new Set([...prev, topic]));
      }

      setAddingSuggestion(null);
    }

    setIsAddingAll(false);
    setAddAllProgress(null);

    // Full reload to show new bills on dashboard
    window.location.href = '/interests';
  };

  const handleDismissSuggestion = (topic: string) => {
    setSuggestions((prev) => prev.filter((s) => s !== topic));
  };

  const remainingSuggestions = suggestions.filter((s) => !addedSuggestions.has(s));

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-2xl font-serif font-black text-zinc-900 mb-2">Your Interests</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            These topics determine which bills appear in your &ldquo;Important Bills&rdquo; feed.
            Your primary goal from onboarding is always active. Add new topics from the
            &ldquo;Explore&rdquo; search on your dashboard, or describe your organization below.
          </p>
        </div>

        {/* AI Description Parser */}
        <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <h2 className="text-sm font-bold text-zinc-800">Describe your organization</h2>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Tell us what your organization does and our AI will suggest legislative topics to monitor.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. We're a nonprofit focused on improving public school funding and teacher training in underserved communities. We also advocate for after-school STEM programs..."
            className="w-full px-3 py-2.5 text-sm border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white resize-none h-24"
          />
          <button
            onClick={handleParse}
            disabled={!description.trim() || isParsing}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Find Interests
              </>
            )}
          </button>

          {/* Suggested keywords */}
          {suggestions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-violet-100">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">
                  Suggested topics
                </p>
                {/* Add All button */}
                {remainingSuggestions.length > 1 && (
                  <button
                    onClick={handleAddAll}
                    disabled={isAddingAll || !!addingSuggestion}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAddingAll ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Adding {addAllProgress?.current}/{addAllProgress?.total}...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        Add all ({remainingSuggestions.length})
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Progress bar for Add All OR Single Add */}
              {(isAddingAll || addingSuggestion) && (
                <div className="w-full space-y-1">
                  <div className="flex justify-between text-xs text-violet-600 font-medium">
                    <span>
                      {isAddingAll
                        ? `Adding ${addAllProgress?.current}/${addAllProgress?.total}...`
                        : `Adding "${addingSuggestion}"...`}
                    </span>
                    <span>ETA: ~3 min{isAddingAll ? '/topic' : ''}</span>
                  </div>
                  <div className="w-full bg-violet-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`bg-violet-600 h-1.5 rounded-full transition-all duration-1000 ${addingSuggestion ? 'animate-pulse w-full' : ''
                        }`}
                      style={
                        isAddingAll && addAllProgress
                          ? { width: `${(addAllProgress.current / addAllProgress.total) * 100}%` }
                          : addingSuggestion
                            ? { width: '100%' }
                            : {}
                      }
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {suggestions.map((topic) => {
                  const isAdded = addedSuggestions.has(topic);
                  const isAdding = addingSuggestion === topic;
                  return (
                    <div
                      key={topic}
                      className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-sm border transition-colors ${isAdded
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : isAdding
                          ? 'bg-violet-50 border-violet-300 text-violet-700'
                          : 'bg-white border-zinc-200 text-zinc-800 hover:border-violet-300'
                        }`}
                    >
                      <span className="font-medium">{topic}</span>
                      {isAdded ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 ml-1" />
                      ) : isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500 ml-1" />
                      ) : (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => handleAddSuggestion(topic)}
                            disabled={!!addingSuggestion || isAddingAll}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-violet-500 hover:bg-violet-100 transition-colors disabled:opacity-50"
                            title="Add to interests"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDismissSuggestion(topic)}
                            disabled={isAddingAll}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Dismiss"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Current interests */}
        <div className="space-y-3">
          {/* Primary goal — not removable */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50/50">
            <Target className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-0.5">Primary Goal</p>
              <p className="text-sm font-semibold text-zinc-900">{orgGoal}</p>
            </div>
          </div>

          {/* Explore interests — removable */}
          {interests
            .filter((i) => i.toLowerCase() !== orgGoal.toLowerCase())
            .map((interest) => (
              <div
                key={interest}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors group"
              >
                <Search className="w-4 h-4 text-violet-500 shrink-0" />
                <p className="flex-1 text-sm font-medium text-zinc-800">{interest}</p>
                <button
                  onClick={() => handleRemove(interest)}
                  disabled={removing === interest}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove interest"
                >
                  {removing === interest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}

          {interests.filter((i) => i.toLowerCase() !== orgGoal.toLowerCase()).length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-zinc-400">
                No additional interests yet. Describe your organization above or use
                &ldquo;Explore New Topics&rdquo; on your dashboard.
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-zinc-100">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Removing an interest removes its matched bills from your &ldquo;Important Bills&rdquo; feed.
            You can always add new topics from the Explore search on your dashboard.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300 z-50 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.message}
        </div>
      )
      }
    </main >
  );
}

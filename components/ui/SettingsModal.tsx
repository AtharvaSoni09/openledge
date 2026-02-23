'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Target, Globe, Check } from 'lucide-react';
import { US_STATES } from '@/lib/utils/states';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentGoal: string;
    currentState: string;
    email: string;
}

export default function SettingsModal({
    isOpen,
    onClose,
    currentGoal,
    currentState,
    email,
}: SettingsModalProps) {
    const router = useRouter();
    const [goal, setGoal] = useState(currentGoal);
    const [state, setState] = useState(currentState);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/subscriber', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    org_goal: goal,
                    state_focus: state,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update settings');

            // If goal changed, trigger re-matching against existing bills
            if (data.goalChanged) {
                try {
                    await fetch('/api/match-existing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                    });
                } catch {
                    // Non-fatal: matches will populate over time via cron
                }
            }

            // Refresh to reflect changes
            router.refresh();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-zinc-100 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <h3 className="text-sm font-bold text-zinc-800">Account Settings</h3>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Goal Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-blue-600" />
                            Primary Goal / Interest
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-snug">
                            Changing this will reset your personalized legislation feed to match the new goal.
                        </p>
                        <textarea
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                            placeholder="e.g. Advancing renewable energy adoption..."
                        />
                    </div>

                    {/* State Select */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                            {/* Globe icon replaced with lucide-react import if available or text */}
                            State Focus
                        </label>
                        <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="US">All / Nationally (Federal only)</option>
                            {US_STATES.map((s) => (
                                <option key={s.code} value={s.code}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !goal.trim()}
                        className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

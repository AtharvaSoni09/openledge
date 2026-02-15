import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ArrowRight, Zap } from 'lucide-react';

interface BillCardProps {
    slug: string;
    bill_id: string;
    title: string;
    summary: string;
    date: string;
    matchScore?: number | null;  // 0-100, null if no match data
    source?: string | null;       // 'federal' | 'state'
    stateCode?: string | null;
    latestAction?: {
        text: string;
        actionDate: string;
    };
}

function scoreColor(score: number): string {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (score >= 40) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-zinc-100 text-zinc-500 border-zinc-200';
}

export function BillCard({
    slug,
    bill_id,
    title,
    summary,
    date,
    matchScore,
    source,
    stateCode,
    latestAction,
}: BillCardProps) {
    return (
        <Link href={`/legislation-summary/${slug}`} className="group">
            <Card className="h-full border-zinc-200 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-zinc-400 rounded-none">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="outline"
                                className="font-sans uppercase tracking-widest text-[10px] text-zinc-500 rounded-sm"
                            >
                                {bill_id.toUpperCase()}
                            </Badge>
                            {source === 'state' && stateCode && (
                                <Badge className="bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-sans uppercase tracking-wider rounded-sm">
                                    {stateCode}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Impact Score Badge */}
                            {matchScore != null && matchScore > 0 && (
                                <div
                                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${scoreColor(matchScore)}`}
                                >
                                    <Zap className="w-3 h-3" />
                                    {matchScore}% Match
                                </div>
                            )}

                            <div className="flex items-center text-zinc-400 text-xs font-sans">
                                <CalendarDays className="w-3 h-3 mr-1" />
                                {new Date(date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <CardTitle className="font-serif text-xl leading-tight font-bold text-zinc-900 group-hover:text-blue-900 transition-colors">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-zinc-600 font-serif leading-relaxed line-clamp-3 text-sm mb-3">
                        {summary}
                    </p>

                    {latestAction?.text && (
                        <div className="text-xs text-zinc-500 font-sans italic border-t border-zinc-100 pt-2">
                            {latestAction.text.length > 60
                                ? `${latestAction.text.substring(0, 60)}...`
                                : latestAction.text}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="pt-0">
                    <div className="flex items-center text-blue-700 font-sans text-xs font-bold uppercase tracking-wide group-hover:underline">
                        Read Analysis <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}

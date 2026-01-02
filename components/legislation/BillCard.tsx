
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight } from "lucide-react";

interface BillCardProps {
    slug: string;
    bill_id: string; // "hr123-118"
    title: string;
    summary: string;
    date: string;
}

export function BillCard({ slug, bill_id, title, summary, date }: BillCardProps) {
    return (
        <Link href={`/legislation-summary/${slug}`} className="group">
            <Card className="h-full border-zinc-200 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-zinc-400 rounded-none">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline" className="font-sans uppercase tracking-widest text-[10px] text-zinc-500 rounded-sm">
                            {bill_id.toUpperCase()}
                        </Badge>
                        <div className="flex items-center text-zinc-400 text-xs font-sans">
                            <CalendarDays className="w-3 h-3 mr-1" />
                            {new Date(date).toLocaleDateString()}
                        </div>
                    </div>
                    <CardTitle className="font-serif text-xl leading-tight font-bold text-zinc-900 group-hover:text-blue-900 transition-colors">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-zinc-600 font-serif leading-relaxed line-clamp-3 text-sm">
                        {summary}
                    </p>
                </CardContent>
                <CardFooter className="pt-0">
                    <div className="flex items-center text-blue-700 font-sans text-xs font-bold uppercase tracking-wide group-hover:underline">
                        Read Investigation <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}

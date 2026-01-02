
import { supabasePublic } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown'; // Ensure user installs this or we use simple rendering
import { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, DollarSign, Newspaper, BookOpen, Scale } from 'lucide-react';

// Force dynamic rendering for these pages
export const revalidate = 3600;

interface PageProps {
    params: Promise<{ slug: string }>
}

async function getBill(slug: string) {
    const { data: bill } = await supabasePublic
        .from('legislation')
        .select('*')
        .eq('url_slug', slug)
        .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return bill as any;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const bill = await getBill(slug);
    if (!bill) return { title: 'Not Found' };

    return {
        title: `${bill.title} | The Daily Law`,
        description: bill.tldr || "Legislative analysis.",
        openGraph: {
            title: bill.title,
            description: bill.tldr || "",
            type: "article",
        }
    };
}

export default async function BillPage({ params }: PageProps) {
    const { slug } = await params;
    const bill = await getBill(slug);

    if (!bill) {
        notFound();
    }

    // Parse JSON columns safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const funds = (bill.sponsor_funds as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const news = (bill.news_context as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policy = (bill.policy_research as any[]) || [];

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            {/* JSON-LD for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": bill.title,
                        "description": bill.tldr,
                        "author": { "@type": "Organization", "name": "The Daily Law" },
                        "datePublished": bill.created_at
                    })
                }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-24 gap-12">
                {/* Main Content: Set to 19/24 (9.5/12) for precise balance */}
                <div className="lg:col-span-19">
                    <header className="mb-8">
                        <Badge variant="secondary" className="mb-4 font-sans tracking-widest text-xs uppercase bg-blue-100 text-blue-800 hover:bg-blue-200">
                            Bill {bill.bill_id}
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-serif font-black text-zinc-900 leading-tight mb-6">
                            {bill.title}
                        </h1>
                        <div className="flex items-center text-zinc-500 font-sans text-sm italic">
                            <span className="mr-4">Published {new Date(bill.created_at).toLocaleDateString()}</span>
                            {bill.sponsor && <span>Sponsored by <span className="font-semibold text-zinc-700">{bill.sponsor}</span></span>}
                        </div>
                    </header>

                    <Separator className="my-8" />

                    {/* Section 1: The Deep Dive - Precise Balance & Generous Flow */}
                    <section className="mb-12 max-w-none font-serif">
                        <h3 className="font-sans font-bold text-2xl mb-8 flex items-center text-black">
                            <BookOpen className="w-6 h-6 mr-2 text-blue-600" /> The Deep Dive
                        </h3>

                        <div className="prose prose-zinc prose-lg max-w-none leading-relaxed text-zinc-800 
                                      prose-p:mb-11 prose-p:leading-8 
                                      prose-h2:mt-16 prose-h2:mb-8 prose-h2:font-sans prose-h2:font-bold prose-h2:text-3xl prose-h2:border-b prose-h2:pb-2
                                      prose-h3:mt-12 prose-h3:mb-6 prose-h3:font-sans prose-h3:font-bold prose-h3:text-2xl
                                      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-a:font-semibold">
                            <ReactMarkdown>
                                {bill.markdown_body}
                            </ReactMarkdown>
                        </div>
                    </section>
                </div>

                {/* Sidebar: Set to 5/24 (2.5/12) */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Official Source Link */}
                    {bill.congress_gov_url && (
                        <Card className="shadow-sm border-zinc-900 bg-zinc-900 text-white">
                            <CardContent className="pt-6">
                                <a
                                    href={bill.congress_gov_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 font-sans font-bold text-xs uppercase tracking-widest hover:text-blue-400 transition-colors"
                                >
                                    Official Source <ExternalLink className="w-4 h-4" />
                                </a>
                            </CardContent>
                        </Card>
                    )}

                    {/* Policy Analysis Sidebar */}
                    <Card className="shadow-sm border-zinc-200 bg-white">
                        <CardHeader className="border-b border-zinc-100 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-zinc-900">
                                <Scale className="w-4 h-4 text-orange-600" /> Policy Papers
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-6">
                                {policy.length > 0 ? (
                                    policy.map((item: any, i: number) => (
                                        <div key={i} className="group">
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 leading-tight block mb-1 group-hover:underline line-clamp-2 break-words"
                                            >
                                                {item.title}
                                            </a>
                                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                                                {item.text}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-zinc-400 italic text-center py-4">Direct research unavailable.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

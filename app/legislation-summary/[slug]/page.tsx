
import { supabasePublic } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, BookOpen, Scale } from 'lucide-react';
import { categorizeBill } from '@/lib/utils/categories';
import { formatDate } from '@/lib/date-utils';
import { RelatedArticles } from '@/components/legislation/RelatedArticles';

// Force dynamic rendering for these pages
export const dynamic = 'force-dynamic';

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

    const canonicalUrl = `https://thedailylaw.org/legislation-summary/${slug}`;

    return {
        title: `${bill.seo_title || bill.title} | The Daily Law`,
        description: bill.meta_description || bill.tldr || "Legislative analysis.",
        openGraph: {
            title: bill.seo_title || bill.title,
            description: bill.meta_description || bill.tldr || "",
            type: "article",
            url: canonicalUrl,
        },
        twitter: {
            card: "summary_large_image",
            title: bill.seo_title || bill.title,
            description: bill.meta_description || bill.tldr || "",
        },
        alternates: {
            canonical: canonicalUrl,
        },
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
    const funds = (bill.sponsor_data as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const news = (bill.news_context as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policy = (bill.policy_research as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sponsors = (bill.sponsors as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cosponsors = (bill.cosponsors as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cosponsorsFunds = (bill.cosponsors_funds as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keywords = (bill.keywords as any[]) || [];

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            {/* JSON-LD for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": bill.schema_type || "Legislation",
                        "headline": bill.seo_title || bill.title,
                        "description": bill.tldr || bill.meta_description,
                        "author": { "@type": "Organization", "name": "The Daily Law" },
                        "datePublished": bill.created_at,
                        "keywords": keywords.join(", "),
                        "about": {
                            "@type": "Thing",
                            "name": bill.title,
                            "identifier": bill.bill_id
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "The Daily Law",
                            "url": "https://thedailylaw.org"
                        }
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
                        
                        {/* Category Badges - Simplified to avoid hydration */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(() => {
                                const categories = categorizeBill(bill);
                                return categories.map((category) => (
                                    <Badge 
                                        key={category.id}
                                        variant="outline" 
                                        className={`font-sans text-xs ${
                                            category.color === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                            category.color === 'red' ? 'border-red-200 bg-red-50 text-red-700' :
                                            category.color === 'green' ? 'border-green-200 bg-green-50 text-green-700' :
                                            category.color === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                            'border-zinc-200 bg-zinc-50 text-zinc-700'
                                        }`}
                                    >
                                        {category.name}
                                    </Badge>
                                ));
                            })()}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-black text-zinc-900 leading-tight mb-6">
                            {bill.seo_title || bill.title}
                        </h1>
                        <div className="flex flex-wrap items-center text-zinc-500 font-sans text-sm italic gap-4 mb-4">
                            <span>Published {formatDate(bill.created_at)}</span>
                            {bill.introduced_date && <span>Introduced {formatDate(bill.introduced_date)}</span>}
                            {(() => {
                                const sponsorName = 
                                    bill.sponsor_data?.sponsors?.[0]?.name || 
                                    bill.sponsor_data?.sponsor?.name || 
                                    bill.sponsor_data?.name ||
                                    bill.sponsor?.name ||
                                    null;
                                return sponsorName && (
                                    <span>Sponsored by <span className="font-semibold text-zinc-700">{sponsorName}</span></span>
                                );
                            })()}
                        </div>

                        {/* Bill Status */}
                        {bill.latest_action && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center text-blue-900">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                                    <div>
                                        <div className="font-semibold text-sm uppercase tracking-wide">Latest Action</div>
                                        <div className="text-xs mt-1">
                                            {bill.latest_action.actionDate && formatDate(bill.latest_action.actionDate)}
                                            {bill.latest_action.text && `: ${bill.latest_action.text}`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </header>

                    <Separator className="my-8" />

                    {/* TLDR Section */}
                    {bill.tldr && (
                        <section className="mb-8 max-w-none">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                                <h3 className="font-sans font-bold text-xl mb-4 flex items-center text-amber-900">
                                    TL;DR
                                </h3>
                                <p className="text-amber-800 leading-relaxed font-medium">
                                    {bill.tldr}
                                </p>
                            </div>
                        </section>
                    )}

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

                    {/* Sponsors Section */}
                    {sponsors.length > 0 && (
                        <Card className="shadow-sm border-zinc-200 bg-white">
                            <CardHeader className="border-b border-zinc-100 pb-4">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-900">
                                    Sponsor{sponsors.length > 1 ? 's' : ''}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {sponsors.map((sponsor: any, i: number) => (
                                        <div key={i} className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm text-zinc-900">{sponsor.name}</div>
                                                <div className="text-xs text-zinc-500">{sponsor.party} • {sponsor.state}</div>
                                                {/* Sponsor Funding Info */}
                                                {funds && funds.total_raised && (
                                                    <div className="text-xs text-green-600 font-medium mt-1">
                                                        💰 ${funds.total_raised.toLocaleString()} raised
                                                    </div>
                                                )}
                                            </div>
                                            {sponsor.bioguideId && (
                                                <div className="text-xs text-zinc-400">
                                                    <a 
                                                        href={`https://bioguide.congress.gov/search/bio/${sponsor.bioguideId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        Bio
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
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

                    {/* Cosponsors Section */}
                    {cosponsors.length > 0 && (
                        <Card className="shadow-sm border-zinc-200 bg-white">
                            <CardHeader className="border-b border-zinc-100 pb-4">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-900">
                                    Cosponsors ({cosponsors.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {cosponsors.map((cosponsor: any, i: number) => (
                                        <div key={i} className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm text-zinc-900">{cosponsor.name}</div>
                                                <div className="text-xs text-zinc-500">{cosponsor.party} • {cosponsor.state}</div>
                                            </div>
                                            <div className="text-xs text-zinc-400 text-right">
                                                {cosponsor.sponsorshipDate && formatDate(cosponsor.sponsorshipDate)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            
            <RelatedArticles currentBill={bill} />
        </div>
    );
}

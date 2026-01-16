
'use client';

import { supabasePublic } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, BookOpen, Scale } from 'lucide-react';
import { categorizeBill } from '@/lib/utils/categories';
import { formatDate } from '@/lib/date-utils';
import RelatedArticles from '@/components/legislation/RelatedArticles';
import { useState, useEffect } from 'react';
import { EmailCaptureModal } from '@/components/ui/EmailCaptureModal';
import { useAuth } from '@/contexts/AuthContext';

// Function to fetch exact bill name using Congress API + OpenAI research
async function getExactBillName(billId: string, currentTitle: string) {
    try {
        console.log('=== FETCHING EXACT BILL NAME (CONGRESS + OPENAI) ===');
        console.log('Bill ID:', billId);
        console.log('Current title:', currentTitle);
        
        // First get Congress API data for accuracy
        const congressData = await getCongressBillInfo(billId);
        console.log('Congress API data:', congressData);
        
        const prompt = `I need the EXACT official name of this US legislation bill. I have Congress API data for accuracy:
        
        Bill ID: ${billId}
        Current Title: "${currentTitle}"
        
        Congress API Data:
        - Chamber: ${congressData?.chamber || 'Unknown'}
        - Bill Type: ${congressData?.billType || 'Unknown'}
        - Bill Number: ${congressData?.billNumber || 'Unknown'}
        - Congress: ${congressData?.congress || 'Unknown'}
        - Congress API Title: "${congressData?.title || 'Not available'}"
        - Congress API Short Title: "${congressData?.shortTitle || 'Not available'}"
        
        Using this Congress API data as the authoritative source, please provide:
        1. The EXACT official bill name from Congress (cross-reference with Congress API title)
        2. Confirm the correct chamber (House or Senate) based on Congress API data
        3. The bill number and Congress session (verify with Congress API data)
        4. Any common short title or nickname (cross-reference with Congress API short title)
        5. Flag any discrepancies between current title and Congress API title
        
        Respond in JSON format:
        {
            "exactTitle": "Official bill name (use Congress API title as primary source)",
            "chamber": "${congressData?.chamber || 'House or Senate'}",
            "billNumber": "${congressData?.billNumber || 'HR123 or S456'}",
            "congress": "${congressData?.congress || '118th'}",
            "shortTitle": "Common short title (use Congress API short title)",
            "discrepancy": "Any noted discrepancies between titles",
            "confidence": "high/medium/low based on data consistency"
        }`;
        
        const response = await fetch('/api/openai-research', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                context: 'bill_research'
            })
        });
        
        if (!response.ok) {
            console.log('OpenAI API response not ok:', response.status);
            return congressData; // Return Congress data as fallback
        }
        
        const data = await response.json();
        console.log('OpenAI research result:', data);
        
        // Combine Congress API data with OpenAI research
        const result = {
            ...congressData,
            ...data.result,
            // Prioritize Congress API data for accuracy
            title: data.result?.exactTitle || congressData?.title || currentTitle,
            chamber: data.result?.chamber || congressData?.chamber,
            confidence: data.result?.confidence || 'medium'
        };
        
        console.log('Combined result:', result);
        return result;
    } catch (error) {
        console.error('Error fetching exact bill name:', error);
        return null;
    }
}

// Function to fetch bill details from Congress API (fallback)
async function getCongressBillInfo(billId: string) {
    try {
        console.log('=== FETCHING CONGRESS BILL INFO ===');
        console.log('Bill ID:', billId);
        
        // Extract the bill number and type from bill_id
        const billMatch = billId.match(/([A-Z]+)(\d+)-(\d+)/);
        if (!billMatch) {
            console.log('Could not parse bill ID:', billId);
            return null;
        }
        
        const [, billType, billNumber, congress] = billMatch;
        const chamber = billType === 'HR' ? 'house' : 'senate';
        
        console.log('Parsed bill info:', { billType, billNumber, congress, chamber });
        
        // Use Congress.gov API
        const apiUrl = `https://api.congress.gov/v3/bill/${congress}/${chamber}/${billNumber}/${congress}`;
        console.log('Congress API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.log('Congress API response not ok:', response.status);
            return null;
        }
        
        const data = await response.json();
        console.log('Congress API response:', data);
        
        return {
            title: data.bill?.title || data.title,
            shortTitle: data.bill?.shortTitle || data.shortTitle,
            chamber: chamber,
            billType: billType,
            billNumber: billNumber,
            congress: congress
        };
    } catch (error) {
        console.error('Error fetching Congress bill info:', error);
        return null;
    }
}

// Force dynamic rendering for these pages
export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ slug: string }>
}

export default function BillPage({ params }: PageProps) {
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    const [bill, setBill] = useState<any>(null);
    const [slug, setSlug] = useState<string>('initial-slug');
    const [loading, setLoading] = useState(true);
    const [congressInfo, setCongressInfo] = useState<any>(null);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const { user } = useAuth();

    // Get slug from params
    useEffect(() => {
        const getSlug = async () => {
            const resolvedParams = await params;
            setSlug(resolvedParams.slug);
        };
        getSlug();
    }, [params]);

    // Fetch bill data
    useEffect(() => {
        if (!slug || slug === 'initial-slug') {
            console.log('Skipping fetch - slug is:', slug);
            return;
        }
        
        console.log('=== ARTICLE PAGE FETCH START ===');
        console.log('Fetching bill for slug:', slug);
        
        const fetchBill = async () => {
            console.log('=== FETCH BILL START ===');
            console.log('Current slug:', slug);
            console.log('Current bill state before fetch:', bill);
            console.log('Loading state before fetch:', loading);
            
            try {
                console.log('Executing Supabase query for slug:', slug);
                
                // Use maybeSingle() to handle both cases (found or not found)
                const { data: billData, error } = await supabasePublic()
                    .from('legislation')
                    .select('*')
                    .eq('url_slug', slug)
                    .maybeSingle(); // Use maybeSingle() to handle 0 or 1 results
                
                console.log('Supabase query result:', { billData, error });
                console.log('About to setBill with:', billData);
                
                if (error) {
                    console.error('Supabase error:', error);
                    console.error('Error code:', error.code);
                    console.error('Error message:', error.message);
                    console.error('Error details:', error.details);
                    
                    // Set bill to null for any error
                    console.log('Setting bill to null due to error');
                    setBill(null);
                } else {
                    if (billData) {
                        console.log('Bill found:', (billData as any).title);
                        console.log('Setting bill to found data');
                        setBill(billData);
                    } else {
                        console.log('No bill found for slug:', slug);
                        console.log('Setting bill to null (no data)');
                        setBill(null);
                    }
                }
                
                console.log('About to setLoading(false)');
                setLoading(false);
            } catch (error) {
                console.error('Error fetching bill:', error);
                console.log('Setting bill to null due to exception');
                setBill(null);
                setLoading(false);
            }
            
            console.log('=== FETCH BILL END ===');
        };

        fetchBill();
    }, [slug]);

    // Add debug logging for bill state changes
    useEffect(() => {
        console.log('=== BILL STATE CHANGE ===');
        console.log('New bill state:', bill);
        console.log('Bill exists:', !!bill);
        console.log('Loading:', loading);
        console.log('Slug:', slug);
        
        // Log bill title if it exists
        if (bill) {
            console.log('Bill title:', (bill as any).title);
        } else {
            console.log('Bill is null - checking why...');
            console.log('This will trigger notFound() if loading is false');
        }
    }, [bill, loading, slug]);
    useEffect(() => {
        console.log('=== ARTICLE PAGE USER STATE CHECK ===');
        console.log('Current user state:', user);
        console.log('User email:', user?.email);
        console.log('User authenticated:', user?.isAuthenticated);
        
        if (user) {
            console.log('User is authenticated, hiding modal');
            setShowSubscribeModal(false);
        } else {
            console.log('User is not authenticated, modal may show');
        }
    }, [user]);

    // Simple scroll detection
    useEffect(() => {
        const handleScroll = () => {
            if (typeof window !== 'undefined') {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                
                const scrollPercentage = scrollTop / (documentHeight - windowHeight);
                
                if (scrollPercentage >= 0.7) {
                    setHasScrolledToBottom(true);
                }
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', handleScroll);
        }
        
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    // Fetch exact bill info when bill loads (Congress + OpenAI)
    useEffect(() => {
        if (bill && bill.bill_id && !congressInfo) {
            console.log('=== FETCHING EXACT BILL INFO (CONGRESS + OPENAI) ===');
            console.log('Bill ID from database:', bill.bill_id);
            console.log('Current title from database:', bill.title);
            
            getExactBillName(bill.bill_id, bill.title).then(info => {
                console.log('Combined bill info received:', info);
                setCongressInfo(info);
            });
        }
    }, [bill, congressInfo]);

    // Show modal when user scrolls to bottom and is not subscribed
    useEffect(() => {
        console.log('=== POP-UP LOGIC CHECK ===');
        console.log('hasScrolledToBottom:', hasScrolledToBottom);
        console.log('user:', user);
        console.log('showSubscribeModal:', showSubscribeModal);
        console.log('loading:', loading);
        
        if (hasScrolledToBottom && !user && !showSubscribeModal && !loading) {
            console.log('Showing subscribe modal');
            setShowSubscribeModal(true);
            setIsBlurred(true);
        } else {
            console.log('Not showing modal - conditions not met');
        }
    }, [hasScrolledToBottom, user, showSubscribeModal, loading]);

    const handleAuthenticated = (status: string) => {
        console.log('=== HANDLE AUTHENTICATED ===');
        console.log('Status:', status);
        
        setShowSubscribeModal(false);
        setIsBlurred(false);
        
        // If user was authenticated, trigger a re-check to update user state
        if (status === 'authenticated' || status === 'subscribed') {
            console.log('User authenticated, triggering auth check...');
            // Force auth context to re-check
            window.location.reload();
        }
    };

    const handleCloseModal = () => {
        setShowSubscribeModal(false);
        setIsBlurred(false);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-6xl">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    if (!bill) {
        console.log('=== BILL IS NULL - TRIGGERING NOT FOUND ===');
        console.log('Current bill state:', bill);
        console.log('Loading state:', loading);
        console.log('Slug:', slug);
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
        <>
            {/* Remove white overlay, just use blur on content */}
            
            <div className="container mx-auto px-4 py-12 max-w-6xl">
                {/* JSON-LD for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": bill?.schema_type || "Legislation",
                        "headline": bill?.seo_title || bill?.title,
                        "description": bill?.tldr || bill?.meta_description,
                        "author": { "@type": "Organization", "name": "The Daily Law" },
                        "datePublished": bill?.created_at,
                        "keywords": keywords.join(", "),
                        "about": {
                            "@type": "Thing",
                            "name": bill?.title,
                            "identifier": bill?.bill_id
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
                            Bill {bill?.bill_id}
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
                            {congressInfo?.exactTitle || bill?.seo_title || bill?.title}
                            {congressInfo && (
                                <div className="space-y-1">
                                    <div className="text-sm font-sans text-gray-500">
                                        {congressInfo.billType}{congressInfo.billNumber} • {congressInfo.chamber === 'house' ? 'House' : 'Senate'} • {congressInfo.congress}th Congress
                                    </div>
                                    {congressInfo.discrepancy && (
                                        <div className="text-xs font-sans text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                            ⚠️ {congressInfo.discrepancy}
                                        </div>
                                    )}
                                    <div className="text-xs font-sans text-gray-400">
                                        Confidence: {congressInfo.confidence} • Source: Congress API + OpenAI Research
                                    </div>
                                </div>
                            )}
                        </h1>
                        <div className="flex flex-wrap items-center text-zinc-500 font-sans text-sm italic gap-4 mb-4">
                            <span>Published {formatDate(bill?.created_at)}</span>
                            {bill?.introduced_date && <span>Introduced {formatDate(bill?.introduced_date)}</span>}
                        </div>
                    </header>

                    <Separator className="my-8" />

                    {/* TLDR Section */}
                    {bill?.tldr && (
                        <section className="mb-8 max-w-none">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                                <h3 className="font-sans font-bold text-xl mb-4 flex items-center text-amber-900">
                                    TL;DR
                                </h3>
                                <p className="text-amber-800 leading-relaxed font-medium">
                                    {bill?.tldr}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Section 1: The Deep Dive - Precise Balance & Generous Flow */}
                    <section className={`mb-12 max-w-none font-serif ${isBlurred ? 'filter blur-sm' : ''}`}>
                        <h3 className="font-sans font-bold text-2xl mb-8 flex items-center text-black">
                            <BookOpen className="w-6 h-6 mr-2 text-blue-600" /> The Deep Dive
                        </h3>

                        <div className={`prose prose-zinc prose-lg max-w-none leading-relaxed text-zinc-800 
                                      prose-p:mb-11 prose-p:leading-8 
                                      prose-h2:mt-16 prose-h2:mb-8 prose-h2:font-sans prose-h2:font-bold prose-h2:text-3xl prose-h2:border-b prose-h2:pb-2
                                      prose-h3:mt-12 prose-h3:mb-6 prose-h3:font-sans prose-h3:font-bold prose-h3:text-2xl
                                      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-a:font-semibold`}>
                            <ReactMarkdown>
                                {bill?.markdown_body}
                            </ReactMarkdown>
                        </div>
                    </section>
                </div>

                {/* Sidebar: Set to 5/24 (2.5/12) */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Official Source Link */}
                    {bill?.congress_gov_url && (
                        <Card className="shadow-sm border-zinc-900 bg-zinc-900 text-white">
                            <CardContent className="pt-6">
                                <a
                                    href={bill?.congress_gov_url}
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
                    {sponsors?.length > 0 && (
                        <Card className="shadow-sm border-zinc-200 bg-white">
                            <CardHeader className="border-b border-zinc-100 pb-4">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-900">
                                    Sponsor{sponsors?.length > 1 ? 's' : ''}
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
                                            <div className="text-xs text-zinc-400 text-right">
                                                {sponsor.bioguideId && (
                                                    <a 
                                                        href={`https://bioguide.congress.gov/search/bio/${sponsor.bioguideId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        Bio
                                                    </a>
                                                )}
                                            </div>
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
            
            {showSubscribeModal && (
                <EmailCaptureModal 
                    isOpen={showSubscribeModal}
                    onClose={handleCloseModal}
                    onAuthenticated={handleAuthenticated}
                    source="popup"
                />
            )}
        </div>
        </>
    );
}

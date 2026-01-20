import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import BillPageClient from './BillPageClient';

interface PageParams {
    params: Promise<{ slug: string }>;
}

// Generate dynamic metadata for social sharing (runs on server)
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
    const { slug } = await params;

    try {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return getDefaultMetadata();
        }

        const { data: bill } = await supabase
            .from('legislation')
            .select('title, seo_title, meta_description, tldr, bill_id')
            .eq('url_slug', slug)
            .single();

        if (!bill) {
            return {
                title: 'Article Not Found | The Daily Law',
                description: 'The requested legislation article was not found.',
            };
        }

        const billData = bill as { title: string; seo_title: string | null; meta_description: string | null; tldr: string | null; bill_id: string | null };
        const title = billData.seo_title || billData.title || 'Legislation Analysis';
        const description = billData.meta_description || billData.tldr || 'AI-powered legislative analysis';
        const ogImageUrl = `https://thedailylaw.org/api/og?title=${encodeURIComponent(title)}&billId=${encodeURIComponent(billData.bill_id || '')}`;

        return {
            title: `${title} | The Daily Law`,
            description: description,
            openGraph: {
                title: title,
                description: description,
                type: 'article',
                url: `https://thedailylaw.org/legislation-summary/${slug}`,
                siteName: 'The Daily Law',
                images: [
                    {
                        url: ogImageUrl,
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description: description,
                images: [ogImageUrl],
            },
            alternates: {
                canonical: `https://thedailylaw.org/legislation-summary/${slug}`,
            },
        };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return getDefaultMetadata();
    }
}

function getDefaultMetadata(): Metadata {
    return {
        title: 'The Daily Law | Legislation Analysis',
        description: 'AI-powered investigative journalism for US legislation.',
    };
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Page component - renders the client component
export default function BillPage({ params }: PageParams) {
    return <BillPageClient params={params} />;
}

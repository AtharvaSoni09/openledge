import { supabasePublic } from '@/lib/supabase';
import { MetadataRoute } from 'next';

// Define TypeScript type for a row in your legislation table
type Bill = {
    slug: string;
    created_at: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Fetch all legislation entries from Supabase
    const { data: bills } = await supabasePublic
        .from<Bill>('legislation')
        .select('slug, created_at');

    // Map Supabase bills to sitemap URLs
    const legislationUrls =
        bills?.map((bill) => ({
            url: `https://thedailylaw.org/legislation-summary/${bill.slug}`,
            lastModified: new Date(bill.created_at),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        })) ?? [];

    // Return full sitemap
    return [
        {
            url: 'https://thedailylaw.org', // Homepage
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: 'https://thedailylaw.org/legislation-summary', // Base legislation page
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...legislationUrls,
    ];
}

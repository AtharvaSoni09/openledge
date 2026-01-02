
import { supabasePublic } from '@/lib/supabase';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const { data: bills } = await supabasePublic
        .from('legislation')
        .select('slug, created_at');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legislationUrls = (bills as any[])?.map((bill) => ({
        url: `https://thedailylaw.com/legislation-summary/${bill.slug}`, // Replace with real domain when live
        lastModified: new Date(bill.created_at),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    })) || [];

    return [
        {
            url: 'https://thedailylaw.com/legislation-summary',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...legislationUrls,
    ];
}

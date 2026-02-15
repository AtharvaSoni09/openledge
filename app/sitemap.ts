import { MetadataRoute } from 'next';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://openledge.vercel.app';

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/bills`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Try to add dynamic bill pages
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return staticUrls;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: bills } = await supabase
      .from('legislation')
      .select('id, created_at, status_changed_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!bills || bills.length === 0) return staticUrls;

    const billUrls: MetadataRoute.Sitemap = bills.map((bill: any) => ({
      url: `${baseUrl}/bill/${bill.id}`,
      lastModified: new Date(bill.status_changed_at || bill.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticUrls, ...billUrls];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticUrls;
  }
}

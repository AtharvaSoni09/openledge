
export interface NewsItem {
    title: string;
    link: string;
    source_id: string;
    pubDate: string;
}

const BASE_URL = 'https://newsdata.io/api/1/news';

export async function fetchNewsContext(query: string): Promise<NewsItem[]> {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) return [];

    // q ensures we get matches across title and description
    const url = `${BASE_URL}?apikey=${apiKey}&q=${encodeURIComponent(query)}&language=en&country=us`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== 'success') return [];

        return data.results.map((item: any) => ({
            title: item.title,
            link: item.link,
            source_id: item.source_id,
            pubDate: item.pubDate
        })).slice(0, 5); // Start with top 5
    } catch (e) {
        console.error("NewsData Error", e);
        return [];
    }
}

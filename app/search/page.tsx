import { supabasePublic } from '@/lib/supabase';
import { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { categories } from '@/lib/utils/categories';

export const dynamic = 'force-dynamic';

interface SearchResultsProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: SearchResultsProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q || '';
  
  return {
    title: query ? `Search Results for "${query}" | The Daily Law` : 'Search | The Daily Law',
    description: query ? `Search results for "${query}" on The Daily Law. Find legislation, analysis, and insights on U.S. congressional bills and policies.` : 'Search The Daily Law for legislation, policy analysis, and insights on U.S. congressional bills.',
    openGraph: {
      title: query ? `Search Results for "${query}" | The Daily Law` : 'Search | The Daily Law',
      description: query ? `Search results for "${query}" on The Daily Law. Find legislation, analysis, and insights on U.S. congressional bills and policies.` : 'Search The Daily Law for legislation, policy analysis, and insights on U.S. congressional bills.',
      url: `https://thedailylaw.org/search${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      type: 'website',
    },
  };
}

export default async function SearchPage({ searchParams }: SearchResultsProps) {
  const { q } = await searchParams;
  const query = q || '';

  if (!query.trim()) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-6" />
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-4">Search Legislation</h1>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Enter keywords to search legislation, policy analysis, and insights from The Daily Law.
          </p>
          <form 
            action="/search" 
            method="GET"
            className="max-w-2xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="search"
                name="q"
                placeholder="Search legislation, topics, or keywords..."
                defaultValue={query}
                className="w-full bg-white text-gray-900 pl-12 pr-4 py-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Enhanced search with better keyword matching and category awareness
  const { data: bills, error } = await supabasePublic
    .from('legislation')
    .select('*')
    .order('update_date', { ascending: false })
    .limit(50);

  // Filter results by query with better keyword matching
  const allBills = (bills as any[]) || [];
  const queryLower = query.toLowerCase();
  
  // Common keyword mappings for better matching
  const keywordMappings: Record<string, string[]> = {
    'tech': ['technology', 'tech', 'software', 'digital', 'computer', 'internet', 'online'],
    'ai': ['artificial intelligence', 'ai', 'machine learning', 'automation'],
    'health': ['health', 'healthcare', 'medical', 'medicine'],
    'defense': ['defense', 'military', 'security', 'national security'],
    'energy': ['energy', 'power', 'renewable', 'solar', 'wind', 'oil', 'gas'],
    'economy': ['economy', 'economic', 'finance', 'business', 'trade'],
    'immigration': ['immigration', 'border', 'citizenship', 'visa'],
    'education': ['education', 'school', 'student', 'college', 'university'],
    'infrastructure': ['infrastructure', 'construction', 'building', 'transport']
  };
  
  // Get expanded search terms
  const expandedTerms = keywordMappings[queryLower] || [queryLower];
  
  const filteredBills = allBills.filter(bill => {
    const searchText = [
      bill.title,
      bill.tldr,
      bill.meta_description,
      ...(bill.keywords || [])
    ].join(' ').toLowerCase();
    
    // Check if any expanded terms match
    return expandedTerms.some((term: string) => {
      // Exact word match
      const exactMatch = new RegExp(`\\b${term}\\b`, 'i').test(searchText);
      // Partial match for short forms
      const partialMatch = searchText.includes(term);
      return exactMatch || partialMatch;
    });
  });

  // Enhanced relevance scoring with category awareness
  const scoredBills = filteredBills.map((bill: any) => {
    let score = 0;
    const searchText = [bill.title, bill.tldr, bill.meta_description, ...(bill.keywords || [])].join(' ').toLowerCase();
    
    // Base score for exact matches
    expandedTerms.forEach((term: string) => {
      const exactMatches = (searchText.match(new RegExp(term, 'g')) || []).length;
      score += exactMatches * 10;
    });
    
    // Category-specific scoring
    categories.forEach((category: any) => {
      const categoryKeywords = category.keywords.map((k: string) => k.toLowerCase());
      let categoryScore = 0;
      
      expandedTerms.forEach((term: string) => {
        // Exact category keyword match
        if (categoryKeywords.includes(term)) {
          categoryScore += 30;
        }
        // Partial category keyword match
        if (categoryKeywords.some((keyword: string) => keyword.includes(term) || term.includes(keyword))) {
          categoryScore += 15;
        }
        // Bill keywords matching category
        if (bill.keywords && Array.isArray(bill.keywords)) {
          if (bill.keywords.some((keyword: string) => {
            const keywordLower = keyword.toLowerCase();
            return categoryKeywords.includes(keywordLower) || keywordLower.includes(term) || term.includes(keywordLower);
          })) {
            categoryScore += 20;
          }
        }
      });
      
      if (categoryScore > 0) {
        score += categoryScore;
        bill.matchedCategory = category.name;
      }
    });
    
    // Title matches get extra points
    expandedTerms.forEach((term: string) => {
      if (bill.title.toLowerCase().includes(term)) {
        score += 5;
      }
    });
    
    return {
      ...bill,
      relevanceScore: score
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
          Search Results for "{query}"
        </h1>
        <p className="text-gray-600 mb-6">
          Found {scoredBills.length} results for "{query}"
        </p>
      </div>

      {scoredBills.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-gray-50 rounded-lg p-8 max-w-2xl mx-auto">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h2 className="text-xl font-serif font-semibold text-gray-900 mb-4">No Results Found</h2>
            <p className="text-gray-600 mb-6">
              No legislation found matching "{query}". Try different keywords or browse our categories.
            </p>
            <div className="space-y-2">
              <Link 
                href="/legislation-summary" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-medium rounded-lg transition-colors"
              >
                Browse All Legislation
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scoredBills.map((bill: any) => (
            <Link 
              key={bill.bill_id} 
              href={`/legislation-summary/${bill.url_slug}`}
              className="block group"
            >
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {bill.bill_id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {bill.origin_chamber}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 line-clamp-2">
                  {bill.seo_title || bill.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {bill.tldr}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link 
          href="/legislation-summary" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          ← Back to All Legislation
        </Link>
      </div>
    </div>
  );
}

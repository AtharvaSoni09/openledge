import { Metadata } from 'next';
import Link from 'next/link';
import { categories } from '@/lib/utils/categories';
import { supabasePublic } from '@/lib/supabase';
import { categorizeBill } from '@/lib/utils/categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Topics | The Daily Law',
  description: 'Browse all legislative topics and categories. Explore technology law, national security, healthcare, economy, energy, immigration, education, and infrastructure legislation.',
  openGraph: {
    title: 'Topics | The Daily Law',
    description: 'Browse all legislative topics and categories. Explore technology law, national security, healthcare, economy, energy, immigration, education, and infrastructure legislation.',
    url: 'https://thedailylaw.org/topics',
    type: 'website',
  },
};

export default async function TopicsPage() {
  // Get all bills to count per category
  const { data: bills, error } = await supabasePublic()
    .from('legislation')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const allBills = (bills as any[]) || [];

  // Count bills per category
  const categoryCounts: Record<string, number> = {};

  categories.forEach(category => {
    categoryCounts[category.id] = 0;
  });

  allBills.forEach(bill => {
    const billCategories = categorizeBill(bill);
    billCategories.forEach(cat => {
      categoryCounts[cat.id] = (categoryCounts[cat.id] || 0) + 1;
    });
  });

  // Filter out miscellaneous from main display
  const mainCategories = categories.filter(cat => cat.id !== 'miscellaneous');

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="space-y-12">
        {/* Header */}
        <section className="text-center">
          <h1 className="text-5xl font-serif font-black text-zinc-900 mb-6">
            Topics
          </h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed">
            Browse all legislative topics and categories. Explore in-depth analysis of legislation across 
            key policy areas affecting our nation.
          </p>
        </section>

        {/* Topics Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainCategories.map((category) => (
              <Link
                key={category.id}
                href={`/topics/${category.id}`}
                className="group block"
              >
                <div className="bg-white border border-zinc-200 rounded-lg p-8 hover:border-zinc-300 hover:shadow-lg transition-all duration-200 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-${category.color}-100 rounded-lg flex items-center justify-center`}>
                      <div className={`w-6 h-6 bg-${category.color}-500 rounded`}></div>
                    </div>
                    <div className="text-sm text-zinc-500 font-medium">
                      {categoryCounts[category.id] || 0} bills
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-serif font-bold text-zinc-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                  
                  <p className="text-zinc-600 leading-relaxed mb-6">
                    {category.description}
                  </p>
                  
                  <div className="flex items-center text-blue-600 font-medium text-sm group-hover:underline">
                    Explore {category.name.toLowerCase()} →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Search Section */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-zinc-900 mb-6 text-center">
            Can't Find What You're Looking For?
          </h2>
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Use our search functionality to find specific legislation, bills, or policy topics across all categories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/search" 
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium rounded-lg transition-colors"
              >
                Search Legislation
              </Link>
              <Link 
                href="/legislation-summary" 
                className="inline-flex items-center justify-center border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 font-medium rounded-lg transition-colors"
              >
                Browse All Bills
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

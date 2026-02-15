import { supabasePublic } from '@/lib/supabase';
import { Metadata } from 'next';
import Link from 'next/link';
import { getCategoryById, categories, categorizeBill } from '@/lib/utils/categories';
import { notFound } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination-new';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ category: string; page?: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryData = getCategoryById(category);
  
  if (!categoryData) {
    return { title: 'Category Not Found' };
  }

  return {
    title: `${categoryData.name} Legislation | The Daily Law`,
    description: `Comprehensive coverage of ${categoryData.name.toLowerCase()} legislation. ${categoryData.description}`,
    openGraph: {
      title: `${categoryData.name} Legislation | The Daily Law`,
      description: `Comprehensive coverage of ${categoryData.name.toLowerCase()} legislation. ${categoryData.description}`,
      url: `https://thedailylaw.org/topics/${category}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${categoryData.name} Legislation | The Daily Law`,
      description: `Comprehensive coverage of ${categoryData.name.toLowerCase()} legislation. ${categoryData.description}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const { page } = await searchParams;
  const categoryData = getCategoryById(category);
  
  if (!categoryData) {
    notFound();
  }

  // Parse page number
  const currentPage = parseInt(page || '1', 10);
  const billsPerPage = 6; // Back to 6 bills per page
  const offset = (currentPage - 1) * billsPerPage;

  // Get all bills for this category
  const { data: allBills, error } = await supabasePublic()
    .from('legislation')
    .select('*')
    .order('update_date', { ascending: false }); // Sort by latest legislative action

  const bills = (allBills as any[]) || [];

  // Filter bills by category using centralized categorization
  const categoryBills = bills.filter(bill => {
    const billCategories = categorizeBill(bill);
    return billCategories.some(cat => cat.id === category);
  });

  // Calculate pagination
  const totalPages = Math.ceil(categoryBills.length / billsPerPage);
  const paginatedBills = categoryBills.slice(offset, offset + billsPerPage);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="space-y-12">
        {/* Header */}
        <section className="text-center">
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium mb-6 ${
            categoryData.color === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-700' :
            categoryData.color === 'red' ? 'border-red-200 bg-red-50 text-red-700' :
            categoryData.color === 'green' ? 'border-green-200 bg-green-50 text-green-700' :
            categoryData.color === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' :
            categoryData.color === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
            categoryData.color === 'purple' ? 'border-purple-200 bg-purple-50 text-purple-700' :
            categoryData.color === 'indigo' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' :
            categoryData.color === 'orange' ? 'border-orange-200 bg-orange-50 text-orange-700' :
            'border-zinc-200 bg-zinc-50 text-zinc-700'
          }`}>
            <span>{categoryData.name}</span>
          </div>
          <h1 className="text-5xl font-serif font-black text-zinc-900 mb-6">
            {categoryData.name} Legislation
          </h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed">
            {categoryData.description}
          </p>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-50 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-zinc-900">{categoryBills.length}</div>
            <div className="text-sm text-zinc-600 mt-2">{categoryData.name} Bills Tracked</div>
          </div>
          <div className="bg-zinc-50 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-zinc-900">119th</div>
            <div className="text-sm text-zinc-600 mt-2">Current Congress</div>
          </div>
          <div className="bg-zinc-50 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-zinc-900">24/7</div>
            <div className="text-sm text-zinc-600 mt-2">Real-time Updates</div>
          </div>
        </section>

        {/* Featured Bills */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-black text-zinc-900">
              {categoryData.name} Legislation
              {totalPages > 1 && (
                <span className="text-lg font-normal text-zinc-600 ml-2">
                  (Page {currentPage} of {totalPages})
                </span>
              )}
            </h2>
            {categoryBills.length > 0 && (
              <div className="text-sm text-zinc-600">
                Showing {offset + 1}-{Math.min(offset + billsPerPage, categoryBills.length)} of {categoryBills.length}
              </div>
            )}
          </div>
          
          {paginatedBills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedBills.map((bill) => (
                <Link 
                  key={bill.bill_id} 
                  href={`/legislation-summary/${bill.url_slug}`}
                  className="block group"
                >
                  <div className="border border-zinc-200 rounded-xl p-6 hover:border-zinc-300 hover:bg-zinc-50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`text-xs font-medium px-2 py-1 rounded ${
                        categoryData.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        categoryData.color === 'red' ? 'bg-red-50 text-red-600' :
                        categoryData.color === 'green' ? 'bg-green-50 text-green-600' :
                        categoryData.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                        categoryData.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                        categoryData.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                        categoryData.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                        categoryData.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                        'bg-zinc-50 text-zinc-600'
                      }`}>
                        {bill.bill_id}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {bill.origin_chamber}
                      </div>
                    </div>
                    <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors mb-3">
                      {bill.title}
                    </h3>
                    <p className="text-sm text-zinc-600 line-clamp-3 mb-4">
                      {bill.tldr}
                    </p>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{bill.bill_id}</span>
                      <span>{bill.origin_chamber}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-600">No {categoryData.name.toLowerCase()} legislation found.</p>
              <Link href="/legislation-summary" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
                View all legislation
              </Link>
            </div>
          )}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <section className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl={`/topics/${category}`}
            />
          </section>
        )}

        {/* Back to All Legislation */}
        <section className="text-center">
          <Link 
            href="/legislation-summary" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            ← Back to All Legislation
          </Link>
        </section>

        {/* All Categories */}
        <section>
          <h2 className="text-2xl font-serif font-black text-zinc-900 mb-6">All Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories
              .filter(cat => cat.id !== category)
              .map((relatedCategory) => (
                <Link key={relatedCategory.id} href={`/topics/${relatedCategory.id}`} className="block group">
                  <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                    <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">{relatedCategory.name}</h3>
                    <p className="text-sm text-zinc-600 mt-1">{relatedCategory.description}</p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

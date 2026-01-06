import { supabasePublic } from '@/lib/supabase';
import { BillCard } from '@/components/legislation/BillCard';
import { Metadata } from 'next';
import Link from 'next/link';
import { categorizeBill } from '@/lib/utils/categories';
import { Pagination } from '@/components/ui/pagination-new';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'National Security Legislation | The Daily Law',
  description: 'Comprehensive coverage of national security legislation, defense policy, and intelligence-related bills. Track security legislation and understand policy impacts.',
  openGraph: {
    title: 'National Security Legislation | The Daily Law',
    description: 'Comprehensive coverage of national security legislation, defense policy, and intelligence-related bills.',
    url: 'https://thedailylaw.org/topics/national-security',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'National Security Legislation | The Daily Law',
    description: 'Comprehensive coverage of national security legislation, defense policy, and intelligence-related bills.',
  },
};

export default async function NationalSecurityTopicHub({ searchParams }: PageProps) {
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1', 10);
  const { data: bills, error } = await supabasePublic
    .from('legislation')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const allBills = (bills as any[]) || [];

  // Use centralized categorization system
  const securityBills = allBills.filter(bill => {
    const categories = categorizeBill(bill);
    return categories.some(cat => cat.id === 'national-security');
  });

  const billsPerPage = 6;
  const offset = (currentPage - 1) * billsPerPage;
  const paginatedBills = securityBills.slice(offset, offset + billsPerPage);
  const totalPages = Math.ceil(securityBills.length / billsPerPage);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="space-y-12">
        {/* Header */}
        <section className="text-center">
          <h1 className="text-5xl font-serif font-black text-zinc-900 mb-6">
            National Security Legislation
          </h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed">
            Comprehensive coverage of national security legislation, defense policy, and intelligence-related bills. 
            Track security legislation and understand policy impacts on national defense and homeland security.
          </p>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-50 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-zinc-900">{securityBills.length}</div>
            <div className="text-sm text-zinc-600 mt-2">Security Bills Tracked</div>
          </div>
          <div className="bg-red-50 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-red-900">119th</div>
            <div className="text-sm text-red-600 mt-2">Current Congress</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-900">24/7</div>
            <div className="text-sm text-blue-600 mt-2">Real-time Updates</div>
          </div>
        </section>

        {/* Security Topics */}
        <section className="bg-zinc-50 rounded-xl p-8">
          <h2 className="text-2xl font-serif font-black text-zinc-900 mb-6">Key Security Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-zinc-200">
              <h3 className="font-semibold text-zinc-900 mb-2">Defense Authorization</h3>
              <p className="text-sm text-zinc-600">Annual defense spending and military policy</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-zinc-200">
              <h3 className="font-semibold text-zinc-900 mb-2">Intelligence Reform</h3>
              <p className="text-sm text-zinc-600">Oversight and modernization of intelligence agencies</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-zinc-200">
              <h3 className="font-semibold text-zinc-900 mb-2">Cybersecurity</h3>
              <p className="text-sm text-zinc-600">Critical infrastructure and cyber defense</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-zinc-200">
              <h3 className="font-semibold text-zinc-900 mb-2">Foreign Policy</h3>
              <p className="text-sm text-zinc-600">International security and diplomatic measures</p>
            </div>
          </div>
        </section>

        {/* Featured Security Bills */}
        <section>
          <h2 className="text-2xl font-serif font-black text-zinc-900 mb-6">Featured Security Legislation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedBills.map((bill) => (
              <Link 
                key={bill.bill_id} 
                href={`/legislation-summary/${bill.url_slug}`}
                className="block group"
              >
                <div className="border border-zinc-200 rounded-xl p-6 hover:border-zinc-300 hover:bg-zinc-50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
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
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <section className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl="/topics/national-security"
            />
          </section>
        )}

        {/* Related Topics */}
        <section>
          <h2 className="text-2xl font-serif font-black text-zinc-900 mb-6">Related Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/topics/technology-law" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Technology Law</h3>
                <p className="text-sm text-zinc-600 mt-1">Cybersecurity and tech regulation</p>
              </div>
            </Link>
            <Link href="/topics/healthcare" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Healthcare</h3>
                <p className="text-sm text-zinc-600 mt-1">Medical services and veterans healthcare</p>
              </div>
            </Link>
            <Link href="/topics/economy" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Economy</h3>
                <p className="text-sm text-zinc-600 mt-1">Defense spending and economic policy</p>
              </div>
            </Link>
          </div>
        </section>

        {/* All Categories */}
        <section>
          <h2 className="text-2xl font-serif font-black text-zinc-900 mb-6">All Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/topics/technology-law" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Technology Law</h3>
                <p className="text-sm text-zinc-600 mt-1">AI, cybersecurity, and digital policy</p>
              </div>
            </Link>
            <Link href="/topics/healthcare" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Healthcare</h3>
                <p className="text-sm text-zinc-600 mt-1">Health policy, Medicare, and Medicaid</p>
              </div>
            </Link>
            <Link href="/topics/economy" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Economy</h3>
                <p className="text-sm text-zinc-600 mt-1">Taxes, finance, and economic policy</p>
              </div>
            </Link>
            <Link href="/topics/energy" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Energy</h3>
                <p className="text-sm text-zinc-600 mt-1">Climate, environment, and renewable energy</p>
              </div>
            </Link>
            <Link href="/topics/immigration" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Immigration</h3>
                <p className="text-sm text-zinc-600 mt-1">Border security, visas, and immigration policy</p>
              </div>
            </Link>
            <Link href="/topics/education" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Education</h3>
                <p className="text-sm text-zinc-600 mt-1">Schools, student loans, and education policy</p>
              </div>
            </Link>
            <Link href="/topics/infrastructure" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Infrastructure</h3>
                <p className="text-sm text-zinc-600 mt-1">Transportation, broadband, and public works</p>
              </div>
            </Link>
            <Link href="/topics/miscellaneous" className="block group">
              <div className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-zinc-300 transition-all">
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">Miscellaneous</h3>
                <p className="text-sm text-zinc-600 mt-1">Other legislation not fitting specific categories</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

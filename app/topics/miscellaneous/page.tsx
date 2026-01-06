import { supabasePublic } from '@/lib/supabase';
import { BillCard } from '@/components/legislation/BillCard';
import { Metadata } from 'next';
import Link from 'next/link';
import { categorizeBill } from '@/lib/utils/categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Miscellaneous Legislation | The Daily Law',
  description: 'Other legislation not fitting specific categories. Track miscellaneous bills and general government legislation.',
  openGraph: {
    title: 'Miscellaneous Legislation | The Daily Law',
    description: 'Other legislation not fitting specific categories. Track miscellaneous bills and general government legislation.',
    url: 'https://thedailylaw.org/topics/miscellaneous',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miscellaneous Legislation | The Daily Law',
    description: 'Other legislation not fitting specific categories. Track miscellaneous bills and general government legislation.',
  },
};

export default async function MiscellaneousTopicHub() {
  const { data: bills, error } = await supabasePublic
    .from('legislation')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const allBills = (bills as any[]) || [];

  // Use centralized categorization system
  const miscBills = allBills.filter(bill => {
    const categories = categorizeBill(bill);
    return categories.some(cat => cat.id === 'miscellaneous');
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="space-y-12">
        {/* Header */}
        <section className="text-center">
          <h1 className="text-5xl font-serif font-black text-zinc-900 mb-6">
            Miscellaneous Legislation
          </h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed">
            Other legislation not fitting specific categories. Track miscellaneous bills and general government legislation 
            that doesn't fall under our primary topic areas.
          </p>
        </section>

        {/* Bills Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif font-bold text-zinc-900">
              Recent Miscellaneous Legislation
            </h2>
            <div className="text-sm text-zinc-500">
              {miscBills.length} bills found
            </div>
          </div>
          
          {miscBills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {miscBills.map((bill) => (
                <Link
                  key={bill.bill_id}
                  href={`/legislation-summary/${bill.url_slug}`}
                  className="group"
                >
                  <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {bill.bill_id}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {bill.origin_chamber}
                        </div>
                      </div>
                      <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors mb-3 line-clamp-2">
                        {bill.seo_title || bill.title}
                      </h3>
                      <p className="text-sm text-zinc-600 line-clamp-3 mb-4">
                        {bill.tldr}
                      </p>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{bill.bill_id}</span>
                        <span>{bill.origin_chamber}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-600">No miscellaneous legislation found.</p>
              <Link href="/legislation-summary" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
                View all legislation
              </Link>
            </div>
          )}
        </section>

        {/* Back to All Legislation */}
        <section className="text-center">
          <Link 
            href="/legislation-summary" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            ← Back to All Legislation
          </Link>
        </section>
      </div>
    </div>
  );
}

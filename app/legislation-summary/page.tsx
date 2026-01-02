import { supabasePublic } from '@/lib/supabase';
import { BillCard } from '@/components/legislation/BillCard';
import { formatDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export default async function LegislationSummary() {
    const { data: bills, error } = await supabasePublic
        .from('legislation')
        .select('*')
        .order('created_at', { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allBills = (bills as any[]) || [];

    // Feature the most recently published bill automatically
    const featuredBill = allBills[0];
    const otherBills = allBills.slice(1);

    if (error) {
        console.error("Supabase Error:", error);
        return <div className="p-12 text-center text-red-500">Failed to load legislation.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto mb-16 text-center">
                <h1 className="text-4xl md:text-5xl font-serif font-black mb-4 tracking-tight text-zinc-900 uppercase">
                    The Daily Law
                </h1>
                <p className="text-xl text-zinc-600 font-sans max-w-xl mx-auto">
                    We read every bill so you don't have to.
                    <span className="block mt-2 text-sm text-zinc-400 uppercase tracking-widest font-bold">
                        Transparent • AI-Powered • Non-Partisan
                    </span>
                </p>
            </div>

            {/* Featured Bill Section */}
            {featuredBill && (
                <div className="max-w-4xl mx-auto mb-16">
                    <div className="bg-zinc-900 border-zinc-800 text-white rounded-2xl overflow-hidden shadow-xl group transition-all duration-300 hover:scale-[1.01]">
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-0">
                            <div className="p-8 md:p-10 text-center text-balance flex flex-col items-center">
                                <span className="inline-block bg-blue-600 text-white px-3 py-1 font-bold font-sans text-[10px] tracking-[0.2em] uppercase mb-4 rounded-full">
                                    Editor's Choice • Bill {featuredBill.bill_id}
                                </span>
                                <h2 className="text-2xl md:text-4xl font-serif font-black mb-6 leading-tight tracking-tight">
                                    {featuredBill.title}
                                </h2>
                                <p className="text-base md:text-lg text-zinc-400 font-sans leading-relaxed mb-8 max-w-2xl">
                                    {featuredBill.tldr}
                                </p>
                                <a
                                    href={`/legislation-summary/${featuredBill.url_slug}`}
                                    className="bg-white text-zinc-900 px-6 py-3 rounded-full font-bold font-sans text-xs tracking-widest uppercase hover:bg-zinc-200 transition-colors inline-block"
                                >
                                    Read Full Investigation
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="mt-20 border-b border-zinc-100 mb-16 relative">
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 text-zinc-400 font-sans text-[10px] uppercase tracking-[0.3em] font-black">
                            Latest Publications
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherBills?.map((bill) => (
                    <BillCard
                        key={bill.id}
                        slug={bill.url_slug}
                        bill_id={bill.bill_id}
                        title={bill.title}
                        summary={bill.tldr || "No summary available."}
                        date={formatDate(bill.created_at)}
                    />
                ))}

                {allBills?.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-zinc-50 border border-zinc-100 rounded-lg">
                        <p className="text-zinc-500 font-sans italic">No legislation published yet. Trigger the agent to start.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

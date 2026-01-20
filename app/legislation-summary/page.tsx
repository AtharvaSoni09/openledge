import { supabasePublic } from '@/lib/supabase';
import { BillCard } from '@/components/legislation/BillCard';
import { formatDate } from '@/lib/date-utils';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: "Latest Legislation | The Daily Law",
    description: "Comprehensive analysis of recent US legislation and bills. AI-powered insights on congressional actions and policy changes.",
    openGraph: {
        title: "Latest Legislation | The Daily Law",
        description: "Comprehensive analysis of recent US legislation and bills. AI-powered insights on congressional actions and policy changes.",
        url: "https://thedailylaw.org/legislation-summary",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Latest Legislation | The Daily Law",
        description: "Comprehensive analysis of recent US legislation and bills. AI-powered insights on congressional actions and policy changes.",
    },
};

export default async function LegislationSummary() {
    const { data: bills, error } = await supabasePublic()
        .from('legislation')
        .select('*')
        .order('created_at', { ascending: false }); // Sort by publication date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allBills = (bills as any[]) || [];

    // Remove duplicates by keeping only the newest version of each bill
    const uniqueBills = allBills.reduce((acc: any[], bill: any) => {
        const billNumber = bill.bill_id.split('-')[0]; // Extract base bill number (e.g., "HR1234" from "HR1234-119")
        const existingIndex = acc.findIndex((b: any) => b.bill_id.split('-')[0] === billNumber);

        if (existingIndex === -1) {
            acc.push(bill);
        } else {
            // Keep the newer version (compare update_date)
            const existingBill = acc[existingIndex];
            const existingDate = new Date(existingBill.update_date || existingBill.created_at);
            const currentDate = new Date(bill.update_date || bill.created_at);

            if (currentDate > existingDate) {
                acc[existingIndex] = bill; // Replace with newer version
            }
        }

        return acc;
    }, []);

    // Feature the most recently published bill automatically
    const featuredBill = uniqueBills[0];
    const otherBills = uniqueBills.slice(1);

    if (error) {
        console.error("Supabase Error:", error);
        return <div className="p-12 text-center text-red-500">Failed to load legislation.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-12">
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
                                    {featuredBill.seo_title || featuredBill.title}
                                </h2>
                                <p className="text-base md:text-lg text-zinc-400 font-sans leading-relaxed mb-6 max-w-2xl">
                                    {featuredBill.tldr}
                                </p>

                                {/* Bill Status for Featured Bill */}
                                {featuredBill.latest_action && (
                                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-6 text-left max-w-2xl">
                                        <div className="flex items-center text-zinc-300">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                            <div>
                                                <div className="font-semibold text-xs uppercase tracking-wide text-blue-400">Latest Action</div>
                                                <div className="text-xs mt-1 text-zinc-400">
                                                    {featuredBill.latest_action.actionDate && new Date(featuredBill.latest_action.actionDate).toLocaleDateString()}
                                                    {featuredBill.latest_action.text && `: ${featuredBill.latest_action.text}`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                        title={bill.seo_title || bill.title}
                        summary={bill.tldr || "No summary available."}
                        date={formatDate(bill.created_at)}
                        latestAction={bill.latest_action}
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

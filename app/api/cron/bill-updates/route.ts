import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchRecentBills } from '@/lib/agents/congress';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        console.log("BILL UPDATE: Checking for bill updates");

        // Get all existing bills from database
        const supabase = getSupabaseAdmin();
        const { data: existingBills, error: fetchError } = await supabase
            .from('legislation')
            .select('bill_id, update_date, latest_action, title, origin_chamber');

        if (fetchError) {
            console.error("BILL UPDATE: Error fetching existing bills:", fetchError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        console.log(`BILL UPDATE: Checking ${existingBills?.length || 0} bills for updates...`);

        // Get fresh data from Congress API
        const freshBills = await fetchRecentBills(200, 0);
        
        let updateCount = 0;

        for (const existingBill of (existingBills as any[]) || []) {
            const freshBill = freshBills.find(b => b.bill_id === existingBill.bill_id);
            
            if (freshBill && freshBill.updateDate !== existingBill.update_date) {
                console.log(`BILL UPDATE: Update found for ${existingBill.bill_id}`);
                
                // Add update notice to the article
                const updateNotice = `
---
## 🚨 UPDATE NOTICE

**Last Updated:** ${new Date().toLocaleDateString()}

This bill has been updated since our original analysis.

**Previous Update Date:** ${existingBill.update_date}
**Latest Update Date:** ${freshBill.updateDate}

**Latest Action:** ${freshBill.latestAction?.text || 'No new action'}

*Our analysis reflects the most current information available as of the date above.*
                `.trim();

                // Update the bill with fresh data and notice
                const updateData: any = {
                    update_date: freshBill.updateDate,
                    latest_action: freshBill.latestAction ? {
                        text: freshBill.latestAction.text,
                        actionDate: freshBill.updateDate
                    } : existingBill.latest_action,
                    markdown_body: (existingBill.markdown_body || '') + updateNotice,
                    last_updated: new Date().toISOString()
                };

                const { error: updateError } = await (supabase
                    .from('legislation') as any)
                    .update(updateData)
                    .eq('bill_id', existingBill.bill_id);

                if (updateError) {
                    console.error(`BILL UPDATE: Failed to update ${existingBill.bill_id}:`, updateError);
                } else {
                    console.log(`BILL UPDATE: Successfully updated ${existingBill.bill_id}`);
                    updateCount++;
                }
            }
        }

        console.log(`BILL UPDATE: Completed. Updated ${updateCount} bills`);

        return NextResponse.json({ 
            message: 'Bill update check completed',
            billsChecked: existingBills?.length || 0,
            billsUpdated: updateCount
        });

    } catch (error) {
        console.error("BILL UPDATE: Unexpected error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

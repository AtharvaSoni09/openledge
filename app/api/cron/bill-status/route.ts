import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchBillAction } from '@/lib/agents/congress';
import { parseStatusFromAction, isSignificantChange } from '@/lib/utils/bill-status';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Bill Status Cron — runs daily (or on-demand).
 *
 * 1. Fetches all federal bills from the DB
 * 2. Checks Congress.gov for updated latest_action
 * 3. If the action text changed → update status, status_date, status_changed_at
 * 4. If a starred bill changed → set has_update = true on that starred_bills row
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Auth
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const log: string[] = [];
  const push = (msg: string) => { console.log(msg); log.push(msg); };

  push('BILL-STATUS: Starting status check...');

  try {
    const supabase = getSupabaseAdmin();

    // Get all federal bills (state bills don't use Congress.gov)
    const { data: bills } = await (supabase as any)
      .from('legislation')
      .select('id, bill_id, latest_action, status, update_date')
      .or('source.is.null,source.eq.federal')
      .order('created_at', { ascending: false });

    if (!bills || bills.length === 0) {
      push('BILL-STATUS: No bills to check.');
      return NextResponse.json({ success: true, checked: 0, updated: 0, log });
    }

    push(`BILL-STATUS: Checking ${bills.length} federal bills...`);

    let updated = 0;
    let starredHighlighted = 0;

    // Process in batches to avoid rate limits (Congress.gov allows ~1000/hr)
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      const billId: string = bill.bill_id;

      // Skip non-standard IDs (state bills that slipped through)
      if (billId.startsWith('STATE-')) continue;

      try {
        const latestAction = await fetchBillAction(billId);
        if (!latestAction) continue;

        const oldActionText = (bill.latest_action as any)?.text || '';
        const newActionText = latestAction.text;

        // Skip if nothing changed
        if (oldActionText === newActionText) continue;

        const newStatus = parseStatusFromAction(newActionText);
        const oldStatus = bill.status || parseStatusFromAction(oldActionText);
        const significant = isSignificantChange(oldStatus, newStatus);

        push(`  ${billId}: "${oldStatus}" → "${newStatus}" ${significant ? '⚡ SIGNIFICANT' : ''}`);

        // Update the legislation row
        const { error: updateErr } = await (supabase as any)
          .from('legislation')
          .update({
            latest_action: latestAction,
            status: newStatus,
            status_date: latestAction.actionDate,
            status_changed_at: new Date().toISOString(),
            update_date: latestAction.actionDate,
          })
          .eq('id', bill.id);

        if (updateErr) {
          push(`  ERROR updating ${billId}: ${updateErr.message}`);
          continue;
        }

        updated++;

        // If this bill is starred by anyone, flag has_update = true
        if (significant) {
          const { data: starredRows, error: starErr } = await (supabase as any)
            .from('starred_bills')
            .update({
              has_update: true,
              last_status: newStatus,
            })
            .eq('legislation_id', bill.id)
            .select('id');

          if (!starErr && starredRows && starredRows.length > 0) {
            starredHighlighted += starredRows.length;
            push(`  → Highlighted ${starredRows.length} starred entries`);
          }
        }

        // Small delay to be nice to Congress API
        if (i % 10 === 9) {
          await new Promise(r => setTimeout(r, 1000));
        }

      } catch (err: any) {
        push(`  ERROR ${billId}: ${err.message}`);
      }
    }

    // Revalidate pages
    if (updated > 0) {
      try {
        revalidatePath('/dashboard');
        revalidatePath('/bills');
      } catch (e: any) {
        push(`Revalidation error: ${e.message}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    push(`\nBILL-STATUS: Done. Checked: ${bills.length}, Updated: ${updated}, Starred highlighted: ${starredHighlighted}, Duration: ${duration}s`);

    return NextResponse.json({
      success: true,
      checked: bills.length,
      updated,
      starredHighlighted,
      duration: `${duration}s`,
      log,
    });

  } catch (error: any) {
    push(`BILL-STATUS FATAL: ${error.message}`);
    return NextResponse.json({ error: error.message, log }, { status: 500 });
  }
}

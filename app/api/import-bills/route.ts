import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchRecentBills, fetchBillText } from '@/lib/agents/congress';
import { fetchSponsorFunds } from '@/lib/agents/openfec';
import { fetchNewsContext } from '@/lib/agents/newsdata';
import { fetchPolicyResearch } from '@/lib/agents/exa';
import { synthesizeLegislation } from '@/lib/agents/openai';
import { scoreBillForGoal } from '@/lib/agents/relevance';
import { generateSlug } from '@/lib/utils/slugs';
import { parseStatusFromAction } from '@/lib/utils/bill-status';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — this is a long-running import

/**
 * Bulk import endpoint — fetches bills from Congress API, runs full pipeline.
 *
 * GET /api/import-bills?count=20&secret=<CRON_SECRET>
 *
 * Query params:
 *   count  — number of bills to fetch from Congress (default 20, max 50)
 *   offset — offset into the Congress API results (default 0)
 *   secret — must match CRON_SECRET for auth
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Auth
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized. Pass ?secret=YOUR_CRON_SECRET' }, { status: 401 });
  }

  const count = Math.min(parseInt(req.nextUrl.searchParams.get('count') || '20', 10), 50);
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10);

  const log: string[] = [];
  const push = (msg: string) => { console.log(msg); log.push(msg); };

  push(`IMPORT: Starting bulk import — fetching ${count} bills (offset ${offset})`);

  try {
    const supabase = getSupabaseAdmin();

    // 1. Get existing bill IDs to skip duplicates
    const { data: allIds } = await (supabase as any)
      .from('legislation')
      .select('bill_id');
    const existingSet = new Set((allIds || []).map((b: any) => b.bill_id));
    push(`IMPORT: ${existingSet.size} bills already in DB`);

    // 2. Fetch from Congress API
    const congressBills = await fetchRecentBills(count, offset);
    push(`IMPORT: Congress API returned ${congressBills.length} bills`);

    const newBills = congressBills.filter(b => !existingSet.has(b.bill_id));
    push(`IMPORT: ${newBills.length} new bills after dedup`);

    if (newBills.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new bills to import — all already in DB.',
        log,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      });
    }

    // 3. Process each bill through the full pipeline
    const processed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = []; // bills with no text available yet
    let totalMatches = 0;

    // Process sequentially to avoid overwhelming Groq rate limits
    for (const bill of newBills) {
      push(`\n--- Processing: ${bill.bill_id} — "${bill.title.slice(0, 80)}..." ---`);

      try {
        // STEP 1: Fetch full bill text — skip if unavailable
        push(`  Fetching bill text...`);
        const billText = await fetchBillText(bill.bill_id);

        if (!billText) {
          push(`  SKIPPED: Bill text not yet available for ${bill.bill_id}`);
          skipped.push(bill.bill_id);
          continue;
        }

        push(`  Got ${billText.length} chars of bill text. Running research...`);

        // STEP 2: Research phase (parallel)
        const safeFetch = async (name: string, p: Promise<any>) => {
          try { return await p; } catch (e: any) {
            push(`  [${name}] failed: ${e.message}`);
            return null;
          }
        };

        const searchQuery = `${bill.bill_id} ${bill.title.split(' ').slice(0, 10).join(' ')}`;

        const [sponsorFunds, newsContext, policyResearch] = await Promise.all([
          safeFetch('Sponsors', bill.sponsors?.length
            ? fetchSponsorFunds(bill.sponsors[0].name)
            : Promise.resolve(null)),
          safeFetch('News', fetchNewsContext(searchQuery)),
          safeFetch('Policy', fetchPolicyResearch(searchQuery)),
        ]);

        push(`  Research done. Synthesizing with full bill text...`);

        // STEP 3: Synthesis via Groq — pass ACTUAL bill text
        const synthesisResult = await synthesizeLegislation(
          bill.title,
          bill.bill_id,
          billText,   // <-- full bill text, NOT just the title
          sponsorFunds,
          newsContext,
          policyResearch,
          bill.congressGovUrl,
        );

        if (!synthesisResult) {
          push(`  SYNTHESIS FAILED for ${bill.bill_id}`);
          failed.push(bill.bill_id);
          continue;
        }

        push(`  Synthesis success (${synthesisResult.markdown_body.length} chars). Inserting...`);

        // Insert into DB
        const standardSlug = generateSlug(bill.bill_id);
        const insertData: any = {
          bill_id: bill.bill_id,
          title: bill.title.slice(0, 255),
          congress: bill.congress,
          type: bill.type,
          update_date: bill.updateDate,
          origin_chamber: bill.originChamber,
          introduced_date: bill.introducedDate,
          latest_action: JSON.parse(JSON.stringify(bill.latestAction || {})),
          sponsors: JSON.parse(JSON.stringify(bill.sponsors || [])),
          cosponsors: JSON.parse(JSON.stringify(bill.cosponsors || [])),
          seo_title: synthesisResult.seo_title.slice(0, 255),
          url_slug: standardSlug,
          meta_description: synthesisResult.meta_description.slice(0, 255),
          tldr: synthesisResult.tldr.slice(0, 1000),
          keywords: JSON.parse(JSON.stringify(synthesisResult.keywords || [])),
          schema_type: synthesisResult.schema_type || 'Legislation',
          markdown_body: synthesisResult.markdown_body.slice(0, 50000),
          sponsor_data: JSON.parse(JSON.stringify(sponsorFunds || {})),
          news_context: JSON.parse(JSON.stringify(newsContext || [])),
          policy_research: JSON.parse(JSON.stringify(policyResearch || [])),
          congress_gov_url: bill.congressGovUrl,
          is_published: true,
          source: 'federal',
          state_code: null,
          status: parseStatusFromAction(bill.latestAction?.text),
          status_date: bill.latestAction?.actionDate || null,
          status_changed_at: new Date().toISOString(),
        };

        const { data: inserted, error: insertError } = await (supabase as any)
          .from('legislation')
          .insert(insertData)
          .select('id')
          .single();

        if (insertError) {
          push(`  DB INSERT ERROR: ${insertError.message}`);
          failed.push(bill.bill_id);
          continue;
        }

        processed.push(bill.bill_id);
        push(`  Inserted: ${bill.bill_id} (id: ${inserted.id})`);

        // Relevance scoring against all subscribers
        const { data: subscribers } = await (supabase as any)
          .from('subscribers')
          .select('id, org_goal, state_focus')
          .not('org_goal', 'is', null);

        let matchCount = 0;
        for (const sub of (subscribers || [])) {
          if (!sub.org_goal) continue;

          const billText = synthesisResult.tldr || bill.title;
          const result = await scoreBillForGoal(bill.title, billText, sub.org_goal);

          if (result.match_score > 0) {
            const { error: matchErr } = await (supabase as any)
              .from('bill_matches')
              .upsert({
                subscriber_id: sub.id,
                legislation_id: inserted.id,
                match_score: result.match_score,
                summary: result.summary || null,
                why_it_matters: result.why_it_matters || null,
                implications: result.implications || null,
                notified: false,
              }, { onConflict: 'subscriber_id,legislation_id' });

            if (!matchErr) matchCount++;
          }
        }

        totalMatches += matchCount;
        push(`  Matched against ${(subscribers || []).length} subscribers → ${matchCount} matches`);

        // Small delay to be kind to Groq rate limits
        await new Promise(r => setTimeout(r, 1000));

      } catch (err: any) {
        push(`  FATAL ERROR for ${bill.bill_id}: ${err.message}`);
        failed.push(bill.bill_id);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    push(`\n=== IMPORT COMPLETE ===`);
    push(`Processed: ${processed.length}, Skipped (no text): ${skipped.length}, Failed: ${failed.length}, Matches: ${totalMatches}, Duration: ${duration}s`);

    return NextResponse.json({
      success: true,
      processed: processed.length,
      skipped: skipped.length,
      failed: failed.length,
      totalMatches,
      processedBills: processed,
      skippedBills: skipped,
      failedBills: failed,
      duration: `${duration}s`,
      log,
    });

  } catch (error: any) {
    push(`IMPORT FATAL: ${error.message}`);
    return NextResponse.json({ error: error.message, log }, { status: 500 });
  }
}

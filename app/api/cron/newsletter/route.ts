import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/*  Ledge Impact Alert Cron                                            */
/*  Instead of a generic daily digest, this sends a personalized       */
/*  "Impact Alert" to each subscriber ONLY when a high-relevance      */
/*  bill was detected for their specific goal.                         */
/* ------------------------------------------------------------------ */

const SCORE_THRESHOLD = 60; // Only alert on matches >= this score

export async function GET(req: NextRequest) {
    try {
        // TEMPORARILY DISABLED
        return NextResponse.json({ message: 'Email sending temporarily disabled' });

        const resend = new Resend(process.env.RESEND_API_KEY);

        // Security
        const authHeader = req.headers.get('authorization');
        const { searchParams } = new URL(req.url);
        const secretParam = searchParams.get('secret');
        const testEmail = searchParams.get('testEmail');

        const isValid =
            authHeader === `Bearer ${process.env.CRON_SECRET}` ||
            secretParam === process.env.CRON_SECRET;

        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Find un-notified, high-score matches grouped by subscriber
        const { data: matches, error: matchErr } = await (supabase as any)
            .from('bill_matches')
            .select(`
                id,
                match_score,
                summary,
                why_it_matters,
                implications,
                subscriber_id,
                legislation_id
            `)
            .eq('notified', false)
            .gte('match_score', SCORE_THRESHOLD)
            .order('match_score', { ascending: false });

        if (matchErr) {
            console.error('ALERT CRON: Error fetching matches:', matchErr);
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        if (!matches || matches.length === 0) {
            return NextResponse.json({ message: 'No pending alerts.' });
        }

        // Group matches by subscriber
        const bySubscriber = new Map<string, any[]>();
        for (const m of matches) {
            const list = bySubscriber.get(m.subscriber_id) || [];
            list.push(m);
            bySubscriber.set(m.subscriber_id, list);
        }

        let sentCount = 0;
        let failCount = 0;
        const matchIdsToMark: string[] = [];

        for (const [subscriberId, subMatches] of bySubscriber.entries()) {
            // Fetch subscriber email + goal
            const { data: sub } = await (supabase as any)
                .from('subscribers')
                .select('email, org_goal, state_focus')
                .eq('id', subscriberId)
                .single();

            if (!sub?.email) continue;

            // If testing, skip non-test emails
            if (testEmail && sub.email !== testEmail) continue;

            // Fetch legislation details for each match
            const alertItems: { title: string; score: number; summary: string; why: string; implications: string; slug: string }[] = [];
            for (const m of subMatches.slice(0, 5)) { // Max 5 per email
                const { data: bill } = await (supabase as any)
                    .from('legislation')
                    .select('title, seo_title, url_slug')
                    .eq('id', m.legislation_id)
                    .single();

                if (bill) {
                    alertItems.push({
                        title: bill.seo_title || bill.title,
                        score: m.match_score,
                        summary: m.summary || '',
                        why: m.why_it_matters || '',
                        implications: m.implications || '',
                        slug: bill.url_slug,
                    });
                }
                matchIdsToMark.push(m.id);
            }

            if (alertItems.length === 0) continue;

            // Build HTML email
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ledge.law';
            const html = buildAlertEmail(sub.org_goal || 'your goal', alertItems, siteUrl);

            try {
                await resend.emails.send({
                    from: 'Ledge Impact Alerts <alerts@thedailylaw.org>',
                    to: sub.email,
                    subject: `Impact Alert: ${alertItems[0].title} (${alertItems[0].score}% match)`,
                    html,
                });
                sentCount++;
            } catch (err) {
                console.error(`ALERT CRON: Failed to send to ${sub.email}:`, err);
                failCount++;
            }
        }

        // Mark as notified
        if (matchIdsToMark.length > 0) {
            await (supabase as any)
                .from('bill_matches')
                .update({ notified: true })
                .in('id', matchIdsToMark);
        }

        return NextResponse.json({
            success: true,
            alertsSent: sentCount,
            alertsFailed: failCount,
            matchesProcessed: matchIdsToMark.length,
        });
    } catch (error: any) {
        console.error('ALERT CRON FATAL:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/* ------------------------------------------------------------------ */
/*  Build a clean HTML email for Impact Alerts                        */
/* ------------------------------------------------------------------ */
function buildAlertEmail(
    orgGoal: string,
    items: { title: string; score: number; summary: string; why: string; implications: string; slug: string }[],
    siteUrl: string,
): string {
    const rows = items
        .map(
            (item) => `
        <tr>
            <td style="padding:20px 0; border-bottom:1px solid #f0f0f0;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <span style="background:#2563eb; color:#fff; font-weight:700; font-size:12px; padding:3px 10px; border-radius:99px;">
                        ${item.score}% Match
                    </span>
                </div>
                <h3 style="margin:0 0 6px 0; font-size:18px; color:#18181b;">
                    <a href="${siteUrl}/legislation-summary/${item.slug}" style="color:#18181b; text-decoration:none;">
                        ${item.title}
                    </a>
                </h3>
                <p style="margin:0 0 6px 0; font-size:14px; color:#52525b;">${item.summary}</p>
                <p style="margin:0 0 4px 0; font-size:13px; color:#3b82f6;"><strong>Why it matters to you:</strong></p>
                <p style="margin:0 0 6px 0; font-size:13px; color:#52525b;">${item.why}</p>
                <p style="margin:0 0 4px 0; font-size:13px; color:#3b82f6;"><strong>Implications:</strong></p>
                <p style="margin:0; font-size:13px; color:#52525b;">${item.implications}</p>
            </td>
        </tr>`,
        )
        .join('');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f9fafb; padding:40px 20px;">
    <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #e4e4e7; overflow:hidden;">
        <div style="background:#18181b; padding:24px 30px;">
            <h1 style="margin:0; color:#fff; font-size:20px; font-weight:800; letter-spacing:-0.02em;">LEDGE</h1>
            <p style="margin:4px 0 0; color:#a1a1aa; font-size:12px; text-transform:uppercase; letter-spacing:0.1em;">Impact Alert</p>
        </div>
        <div style="padding:24px 30px;">
            <p style="font-size:14px; color:#71717a; margin:0 0 20px;">
                New legislation relevant to <strong style="color:#18181b;">"${orgGoal}"</strong>
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${rows}
            </table>
            <div style="margin-top:24px; text-align:center;">
                <a href="${siteUrl}/dashboard" style="display:inline-block; background:#2563eb; color:#fff; font-weight:600; font-size:14px; padding:10px 24px; border-radius:8px; text-decoration:none;">
                    View Dashboard
                </a>
            </div>
        </div>
        <div style="padding:16px 30px; background:#f9fafb; border-top:1px solid #e4e4e7; text-align:center;">
            <p style="margin:0; font-size:11px; color:#a1a1aa;">Ledge AI Legislative Monitor &bull; Unsubscribe anytime</p>
        </div>
    </div>
</body>
</html>`;
}

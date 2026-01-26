
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import { DailyNewsletterTemplate } from '@/components/email/DailyNewsletter';
import * as React from 'react';
import fs from 'fs';
import path from 'path';

// Force dynamic to ensure it runs every time (Vercel Cron requirement)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Manual fallback for local dev if server wasn't restarted after adding key
        if (!process.env.RESEND_API_KEY) {
            try {
                const envPath = path.resolve(process.cwd(), '.env.local');
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const match = envContent.match(/RESEND_API_KEY=(.*)/);
                    if (match && match[1]) {
                        process.env.RESEND_API_KEY = match[1].trim();
                    }
                }
            } catch (e) {
                console.error("CRON: Failed to manually load .env.local", e);
            }
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const { searchParams } = new URL(req.url);
        const testEmail = searchParams.get('testEmail');
        const testFrom = searchParams.get('testFrom');
        const secretParam = searchParams.get('secret');

        // 1. Security Check
        const authHeader = req.headers.get('authorization');
        const isValidSecret = authHeader === `Bearer ${process.env.CRON_SECRET}` || secretParam === process.env.CRON_SECRET;

        if (!isValidSecret) {
            console.error("CRON: Unauthorized attempt to trigger newsletter");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // 2. Fetch New Legislation (last 24 hours)
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        const { data: newBills, error: billsError } = await (supabase as any)
            .from('legislation')
            .select('bill_id, title, url_slug, tldr, seo_title, created_at')
            .gte('created_at', yesterday.toISOString())
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (billsError) {
            console.error("CRON: Error fetching new legislation:", billsError);
            return NextResponse.json({ error: 'Database error fetching bills' }, { status: 500 });
        }

        if (!newBills || newBills.length === 0) {
            return NextResponse.json({ message: "No new articles today. Skipping newsletter." });
        }

        // 3. Determine Recipients
        let recipientEmails: string[] = [];

        if (testEmail) {
            recipientEmails = [testEmail];
            console.log(`CRON: Sending test newsletter to: ${testEmail}`);
        } else {
            const { data: subscribers, error: subError } = await (supabase as any)
                .from('subscribers')
                .select('email');

            if (subError) {
                console.error("CRON: Error fetching subscribers:", subError);
                return NextResponse.json({ error: 'Database error fetching subscribers' }, { status: 500 });
            }

            if (!subscribers || subscribers.length === 0) {
                return NextResponse.json({ message: "No subscribers found." });
            }

            recipientEmails = subscribers.map((s: any) => s.email);
            console.log(`CRON: Sending newsletter to ${recipientEmails.length} subscribers`);
        }

        const articles = newBills.map((b: any) => ({
            bill_id: b.bill_id,
            title: b.seo_title || b.title,
            url_slug: b.url_slug,
            tldr: b.tldr
        }));

        const dateString = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // 4. Send Emails via Resend Batch API
        // This is more efficient and avoids the 2 requests/second rate limit
        const sender = testFrom || 'The Daily Law <updates@thedailylaw.org>';

        const batchEmails = recipientEmails.map((email: string) => ({
            from: sender,
            to: email,
            subject: `Daily News Updated: ${articles[0].title}`,
            react: React.createElement(DailyNewsletterTemplate, {
                articles,
                date: dateString
            }),
        }));

        console.log(`CRON: Sending batch of ${batchEmails.length} emails...`);
        const batchResponse = await resend.batch.send(batchEmails);

        // Detailed info for debugging
        let actualSuccess = 0;
        let actualFail = 0;

        const deliveryDetails = (batchResponse.data?.data || []).map((item: any, idx: number) => {
            const recipient = recipientEmails[idx];
            if (item.id) {
                actualSuccess++;
                return {
                    recipient,
                    status: 'success',
                    id: item.id,
                    error: null
                };
            } else {
                actualFail++;
                return {
                    recipient,
                    status: 'error',
                    id: null,
                    error: item.error || "Unknown batch error"
                };
            }
        });

        // Handle case where the entire batch request failed
        if (batchResponse.error) {
            console.error("CRON: Batch send failed entirely:", batchResponse.error);
            actualFail = recipientEmails.length;
            return NextResponse.json({
                success: false,
                error: batchResponse.error.message,
                details: recipientEmails.map(email => ({ recipient: email, status: 'error', error: batchResponse.error }))
            }, { status: 500 });
        }

        if (actualFail > 0) {
            deliveryDetails.forEach(detail => {
                if (detail.status === 'error') {
                    console.error(`CRON: Failed to send to ${detail.recipient}:`, detail.error);
                }
            });
        }

        return NextResponse.json({
            success: true,
            sent: actualSuccess,
            failed: actualFail,
            articles: articles.length,
            details: deliveryDetails
        });

    } catch (error: any) {
        console.error("CRON FATAL ERROR (Newsletter):", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

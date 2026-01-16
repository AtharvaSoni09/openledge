import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { synthesizeLegislation } from '@/lib/agents/openai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        console.log("TEST: Manual article regeneration started");

        // Get a few existing articles to regenerate
        const supabase = supabaseAdmin();
        const { data: articles, error } = await supabase
            .from('legislation')
            .select('*')
            .limit(3)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("TEST: Error fetching articles:", error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!articles || articles.length === 0) {
            return NextResponse.json({ message: 'No articles found' });
        }

        const results: any[] = [];

        // Regenerate each article with new SEO prompt
        for (const article of articles as any[]) {
            console.log(`TEST: Regenerating ${article.bill_id}`);
            
            try {
                const synthesisResult = await synthesizeLegislation(
                    article.title,
                    article.markdown_body || '',
                    article.sponsor_data,
                    article.news_context || [],
                    article.policy_research || [],
                    article.congress_gov_url
                );

                if (synthesisResult) {
                    // Update the article
                    const { error: updateError } = await (supabase
                        .from('legislation') as any)
                        .update({
                            seo_title: synthesisResult.seo_title,
                            meta_description: synthesisResult.meta_description,
                            tldr: synthesisResult.tldr,
                            keywords: synthesisResult.keywords,
                            markdown_body: synthesisResult.markdown_body,
                            schema_type: synthesisResult.schema_type,
                        })
                        .eq('bill_id', article.bill_id);

                    if (updateError) {
                        console.error(`TEST: Update failed for ${article.bill_id}:`, updateError);
                        results.push({ bill_id: article.bill_id, status: 'failed', error: updateError.message });
                    } else {
                        console.log(`TEST: Successfully regenerated ${article.bill_id}`);
                        results.push({ 
                            bill_id: article.bill_id, 
                            status: 'success',
                            new_title: synthesisResult.seo_title,
                            content_length: synthesisResult.markdown_body.length
                        });
                    }
                } else {
                    results.push({ bill_id: article.bill_id, status: 'failed', error: 'Synthesis returned null' });
                }

                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (err: any) {
                console.error(`TEST: Error regenerating ${article.bill_id}:`, err);
                results.push({ bill_id: article.bill_id, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({ 
            message: 'Test regeneration completed',
            results: results
        });

    } catch (err: any) {
        console.error("TEST: Manual regeneration failed:", err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

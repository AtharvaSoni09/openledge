// Script to regenerate all existing articles with new SEO-enhanced prompt
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Import the TypeScript module
import { synthesizeLegislation } from './lib/agents/openai.ts';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function regenerateAllArticles() {
  try {
    console.log('🔄 Starting article regeneration with new SEO-enhanced prompt...\n');

    // Get all existing articles
    const { data: articles, error } = await supabase
      .from('legislation')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      return;
    }

    console.log(`Found ${articles.length} articles to regenerate\n`);

    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`\n--- [${i + 1}/${articles.length}] Regenerating: ${article.bill_id} ---`);

      try {
        // Generate new SEO-optimized content
        const synthesisResult = await synthesizeLegislation(
          article.title,
          article.bill_id, // Pass bill_id
          article.markdown_body || '', // Use existing content as context
          article.sponsor_data,
          article.news_context || [],
          article.policy_research || [],
          article.congress_gov_url
        );

        if (!synthesisResult) {
          console.error(`❌ Failed to regenerate ${article.bill_id}`);
          continue;
        }

        // Update the article with new SEO-optimized content
        const { error: updateError } = await supabase
          .from('legislation')
          .update({
            seo_title: synthesisResult.seo_title,
            meta_description: synthesisResult.meta_description,
            tldr: synthesisResult.tldr,
            keywords: synthesisResult.keywords,
            markdown_body: synthesisResult.markdown_body,
            schema_type: synthesisResult.schema_type,
            // Keep existing url_slug to maintain links
          })
          .eq('bill_id', article.bill_id);

        if (updateError) {
          console.error(`❌ Database update failed for ${article.bill_id}:`, updateError);
        } else {
          console.log(`✅ Successfully regenerated ${article.bill_id}`);
          console.log(`   New title: ${synthesisResult.seo_title}`);
          console.log(`   Content length: ${synthesisResult.markdown_body.length} chars`);
        }

        // Add delay to avoid rate limiting
        if (i < articles.length - 1) {
          console.log('⏳ Waiting 2 seconds before next article...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (err) {
        console.error(`❌ Error processing ${article.bill_id}:`, err);
      }
    }

    console.log('\n🎉 Article regeneration completed!');
    console.log('📊 Summary:');
    console.log(`- Total articles processed: ${articles.length}`);
    console.log('- Check individual logs for success/failure status');

  } catch (err) {
    console.error('❌ Regeneration failed:', err);
  }
}

regenerateAllArticles();

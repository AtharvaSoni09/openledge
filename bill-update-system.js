import { createClient } from '@supabase/supabase-js';
import { fetchRecentBills } from './lib/agents/congress.js';
import { synthesizeLegislation } from './lib/agents/openai.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBillUpdates() {
  console.log('🔄 Checking for bill updates...');

  // Get all existing bills from database
  const { data: existingBills, error: fetchError } = await supabase
    .from('legislation')
    .select('bill_id, update_date, latest_action, title, origin_chamber');

  if (fetchError) {
    console.error('Error fetching existing bills:', fetchError);
    return;
  }

  console.log(`Checking ${existingBills.length} bills for updates...`);

  // Get fresh data from Congress API
  const freshBills = await fetchRecentBills(200, 0);

  const updates = [];

  for (const existingBill of existingBills) {
    const freshBill = freshBills.find(b => b.bill_id === existingBill.bill_id);

    if (freshBill && freshBill.updateDate !== existingBill.update_date) {
      console.log(`📝 Update found for ${existingBill.bill_id}:`);
      console.log(`  Old: ${existingBill.update_date}`);
      console.log(`  New: ${freshBill.updateDate}`);

      const changes = [];

      // Check for status changes
      if (freshBill.latestAction?.text) {
        const oldAction = existingBill.latest_action?.text || '';
        if (oldAction !== freshBill.latestAction.text) {
          changes.push(`Action: "${oldAction}" → "${freshBill.latestAction.text}"`);
        }
      }

      updates.push({
        bill_id: existingBill.bill_id,
        old_update_date: existingBill.update_date,
        new_update_date: freshBill.updateDate,
        old_status: existingBill.latest_action?.text,
        new_status: freshBill.latestAction?.text,
        changes
      });
    }
  }

  if (updates.length === 0) {
    console.log('✅ No updates found');
    return;
  }

  console.log(`📊 Found ${updates.length} bills with updates`);

  // Process updates
  for (const update of updates) {
    await processBillUpdate(update);
  }
}

async function processBillUpdate(update) {
  console.log(`\n🔄 Processing update for ${update.bill_id}`);

  // Get the full bill data
  const { data: bill } = await supabase
    .from('legislation')
    .select('*')
    .eq('bill_id', update.bill_id)
    .single();

  if (!bill) {
    console.error(`Bill ${update.bill_id} not found`);
    return;
  }

  // Generate updated content with change notification
  const updateContext = `
UPDATE NOTIFICATION:
This bill has been updated since our original analysis. Here are the latest changes:

${update.changes.map(change => `• ${change}`).join('\n')}

Previous analysis date: ${update.old_update_date}
Latest update date: ${update.new_update_date}

Please update the analysis to reflect these changes and ensure all information is current. 
If the bill has passed, failed, or had major status changes, emphasize this in the updated analysis.
  `.trim();

  try {
    const synthesisResult = await synthesizeLegislation(
      bill.title,
      bill.bill_id, // Pass bill_id
      bill.markdown_body + '\n\n' + updateContext,
      bill.sponsor_data,
      bill.news_context || [],
      bill.policy_research || [],
      bill.congress_gov_url
    );

    if (synthesisResult) {
      // Update the bill with fresh data
      const { error: updateError } = await supabase
        .from('legislation')
        .update({
          update_date: update.new_update_date,
          latest_action: update.new_status ? {
            text: update.new_status,
            actionDate: update.new_update_date
          } : bill.latest_action,
          title: synthesisResult.title,
          seo_title: synthesisResult.seo_title,
          meta_description: synthesisResult.meta_description,
          markdown_body: synthesisResult.markdown_body,
          tldr: synthesisResult.tldr,
          keywords: synthesisResult.keywords,
          // Add update tracking
          last_updated: new Date().toISOString()
        })
        .eq('bill_id', update.bill_id);

      if (updateError) {
        console.error(`Failed to update ${update.bill_id}:`, updateError);
      } else {
        console.log(`✅ Successfully updated ${update.bill_id}`);
      }
    }
  } catch (error) {
    console.error(`Error processing update for ${update.bill_id}:`, error);
  }
}

// Run the update check
checkBillUpdates().then(() => {
  console.log('\n🎉 Bill update check completed!');
}).catch(error => {
  console.error('❌ Update check failed:', error);
});

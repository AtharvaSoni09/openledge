const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function deleteArticles() {
  const articlesToDelete = [
    's3493-119',
    's3515-119', 
    's3508-119',
    's3494-119',
    's3520-119'
  ];

  console.log('=== DELETING SPECIFIC ARTICLES ===');
  console.log('Articles to delete:', articlesToDelete);

  for (const slug of articlesToDelete) {
    try {
      console.log(`Deleting article with slug: ${slug}`);
      
      const { data, error } = await supabase
        .from('legislation')
        .delete()
        .eq('url_slug', slug);
      
      if (error) {
        console.error(`Error deleting ${slug}:`, error);
      } else {
        console.log(`Successfully deleted: ${slug}`);
      }
    } catch (err) {
      console.error(`Exception deleting ${slug}:`, err);
    }
  }

  console.log('=== DELETION COMPLETE ===');
}

deleteArticles().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});

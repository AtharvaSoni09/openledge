// Script to delete incomplete HR6937 article
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteIncompleteArticle() {
  try {
    console.log('Deleting incomplete HR6937 article...');
    
    const { error } = await supabase
      .from('legislation')
      .delete()
      .eq('bill_id', 'HR6937-119');
    
    if (error) {
      console.error('Error deleting article:', error);
    } else {
      console.log('✅ Successfully deleted incomplete HR6937 article');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

deleteIncompleteArticle();

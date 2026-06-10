const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', 'cyberpunk-growth-hub', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = dotenv.parse(envContent);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findPublicGoal() {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, metadata')
    .limit(10);
  
  if (error) {
    console.error('Error fetching goals:', error);
    return;
  }
  
  console.log('Goals in database:');
  data.forEach(g => {
    console.log(`ID: ${g.id}, Title: ${g.title}, Public: ${g.metadata?.public_share}`);
  });
}

findPublicGoal();

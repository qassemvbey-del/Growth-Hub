const path = require('path');
const projectNodeModules = path.join(__dirname, 'cyberpunk-growth-hub', 'node_modules', '@supabase', 'supabase-js');
const { createClient } = require(projectNodeModules);

const supabaseUrl = 'https://jniaoqiwltuylkoryefr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWFvcWl3bHR1eWxrb3J5ZWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0NTA0MiwiZXhwIjoyMDkzNTIxMDQyfQ.uH9DPv7JMkE8fsthT4ck6KYqEXnD2cnmVv_D22gex6M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Testing check_and_increment_quota RPC...");
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, user_tier, ai_request_count, last_ai_reset').limit(5);
  if (pError) {
    console.error("Failed to fetch profiles:", pError);
    return;
  }

  console.log("Fetched profiles:", profiles);
  if (profiles.length === 0) {
    console.log("No profiles in database.");
    return;
  }

  const testUser = profiles[0];
  console.log(`\nTesting with User ID: ${testUser.id}`);
  
  const { data, error } = await supabase.rpc('check_and_increment_quota', {
    p_user_id: testUser.id
  });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("RPC Data returned:", data);
    console.log("Data type:", typeof data);
  }
}

run();

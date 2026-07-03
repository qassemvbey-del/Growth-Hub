const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase config");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log("Checking Supabase connection...");
  try {
    // 1. Fetch some profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(5);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
    } else {
      console.log(`Successfully fetched ${profiles.length} profiles:`);
      profiles.forEach(p => {
        console.log(`- ID: ${p.id}, Email: ${p.email || p.username}, Tier: ${p.user_tier}, Count: ${p.ai_request_count}`);
      });

      if (profiles.length > 0) {
        const testUser = profiles[0];
        console.log(`\nTesting RPC check_and_increment_quota for user ID: ${testUser.id}`);
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('check_and_increment_quota', {
          p_user_id: testUser.id
        });

        if (rpcError) {
          console.error("RPC Error:", rpcError);
        } else {
          console.log("RPC Result:", rpcData);
        }
      }
    }
  } catch (err) {
    console.error("Exception during DB check:", err);
  }
}

checkDatabase();

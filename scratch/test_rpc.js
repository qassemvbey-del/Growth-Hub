const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envConfig = {};
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    envConfig[key] = val;
  }
});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const rpcs = ['execute_sql', 'run_sql', 'exec_sql', 'query', 'sql'];
  for (const rpc of rpcs) {
    console.log(`Testing RPC: ${rpc}`);
    const { data, error } = await supabase.rpc(rpc, { query: 'SELECT 1', sql: 'SELECT 1', sql_query: 'SELECT 1' });
    if (error) {
      console.log(`  Error: ${error.message} (${error.code})`);
    } else {
      console.log(`  Success! RPC ${rpc} exists! Data:`, data);
    }
  }
}

test();

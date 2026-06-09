const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function getProc() {
  const { data, error } = await supabase.rpc('get_function_def', { function_name: 'submit_squad_join_request' });
  // If get_function_def RPC doesn't exist, we can try to query it using postgrest or list it if we can.
  // Wait, let's try calling pg_proc query via RPC or custom sql client if possible.
  // Wait! Supabase Rest API doesn't expose pg_proc. But we can search for it in other files, maybe it is in the repository?
  // Let's first run it and see if get_function_def works.
  console.log('getProc result:', { data, error });
}

getProc();

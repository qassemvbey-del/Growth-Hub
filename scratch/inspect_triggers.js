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

async function checkTriggers() {
  // Try querying pg_trigger via RPC or direct select if the database has exposed it
  // Let's try select * from pg_trigger
  const { data, error } = await supabase
    .from('pg_trigger')
    .select('*');
  console.log('pg_trigger select:', { data, error });

  // Let's try information_schema.triggers
  const { data: data2, error: error2 } = await supabase
    .from('triggers')
    .select('*');
  console.log('triggers select:', { data: data2, error: error2 });
}

checkTriggers();

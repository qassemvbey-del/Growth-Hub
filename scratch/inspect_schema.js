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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  // Check if squad_join_requests or goals has requires_approval and is_public
  const { data: goalsData, error: goalsError } = await supabase.from('goals').select('*').limit(1);
  if (goalsError) {
    console.error('Error selecting goals:', goalsError);
  } else {
    console.log('Goals columns:', Object.keys(goalsData[0] || {}));
  }

  // Check squad_join_requests
  const { data: reqData, error: reqError } = await supabase.from('squad_join_requests').select('*').limit(1);
  if (reqError) {
    console.error('Error selecting squad_join_requests:', reqError);
  } else {
    console.log('squad_join_requests columns:', Object.keys(reqData[0] || {}));
  }

  // Check goal_members
  const { data: memData, error: memError } = await supabase.from('goal_members').select('*').limit(1);
  if (memError) {
    console.error('Error selecting goal_members:', memError);
  } else {
    console.log('goal_members columns:', Object.keys(memData[0] || {}));
  }
}

inspectSchema();

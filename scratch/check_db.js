const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Manually parse .env.local
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
  console.log('Testing inserts of all 21 notification types...');
  const testTypes = [
    'daily_brief',
    'deadline_alert',
    'mission_complete',
    'weekly_review',
    'squad_join_request',
    'squad_join_approved',
    'squad_join_rejected',
    'squad_request',
    'squad_accept',
    'squad_reject',
    'squad_promote',
    'squad_demote',
    'custom_alert',
    'rank_up',
    'squad_invite',
    'system',
    'squad_request_pending',
    'join_approved',
    'join_rejected',
    'squad_member_joined',
    'squad_member_left'
  ];
  
  const results = [];
  for (const t of testTypes) {
    const { data, error } = await supabase
      .from('inbox_reports')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        type: t,
        title: 'Test Constraint',
        content: { test: true },
        is_read: false
      })
      .select();
    
    if (error) {
      if (error.message.includes('profiles') || error.message.includes('user_id') || error.message.includes('violates foreign key')) {
        results.push({ type: t, status: 'Allowed (Passed Check Constraint, failed on user_id FK)' });
      } else {
        results.push({ type: t, status: 'Failed: ' + error.message });
      }
    } else {
      results.push({ type: t, status: 'Allowed (Inserted successfully)' });
      if (data && data[0]) {
        await supabase.from('inbox_reports').delete().eq('id', data[0].id);
      }
    }
  }
  console.table(results);
}

test();

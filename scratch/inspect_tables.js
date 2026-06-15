const path = require('path');
const projectNodeModules = path.join(__dirname, '..', 'cyberpunk-growth-hub', 'node_modules', '@supabase', 'supabase-js');
const { createClient } = require(projectNodeModules);

const supabaseUrl = 'https://jniaoqiwltuylkoryefr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWFvcWl3bHR1eWxrb3J5ZWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0NTA0MiwiZXhwIjoyMDkzNTIxMDQyfQ.uH9DPv7JMkE8fsthT4ck6KYqEXnD2cnmVv_D22gex6M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching profiles columns by querying profiles...");
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles sample:", profiles, "Error:", pError);

  console.log("\nFetching goals columns by querying goals...");
  const { data: goals, error: gError } = await supabase.from('goals').select('*').limit(1);
  console.log("Goals sample:", goals, "Error:", gError);

  console.log("\nFetching tasks columns by querying tasks...");
  const { data: tasks, error: tError } = await supabase.from('tasks').select('*').limit(1);
  console.log("Tasks sample:", tasks, "Error:", tError);

  console.log("\nFetching goal_members columns by querying goal_members...");
  const { data: goalMembers, error: gmError } = await supabase.from('goal_members').select('*').limit(1);
  console.log("Goal Members sample:", goalMembers, "Error:", gmError);
}

run();

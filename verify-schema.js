const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('Checking assessment_tokens...');
  const { data: tokens, error: tokensErr } = await supabase
    .from('assessment_tokens')
    .select('*')
    .limit(1);
  
  if (tokensErr) console.log('❌', tokensErr.message);
  else {
    console.log('✅ assessment_tokens exists');
    if (tokens[0]) console.log('Columns:', Object.keys(tokens[0]).join(', '));
  }

  console.log('\nChecking assessment_sessions...');
  const { data: sessions, error: sessionsErr } = await supabase
    .from('assessment_sessions')
    .select('*')
    .limit(1);
  
  if (sessionsErr) console.log('❌', sessionsErr.message);
  else {
    console.log('✅ assessment_sessions exists');
    if (sessions[0]) console.log('Columns:', Object.keys(sessions[0]).join(', '));
  }

  console.log('\nChecking user_milestones...');
  const { data: milestones, error: milestonesErr } = await supabase
    .from('user_milestones')
    .select('*')
    .limit(1);
  
  if (milestonesErr) console.log('❌', milestonesErr.message);
  else {
    console.log('✅ user_milestones exists');
    if (milestones[0]) console.log('Columns:', Object.keys(milestones[0]).join(', '));
  }
}

checkTables().then(() => process.exit(0)).catch(console.error);

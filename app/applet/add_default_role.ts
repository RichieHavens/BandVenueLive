import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { error: e1 } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_role user_role;' });
  console.log('profiles default_role:', e1 || 'success');
  
  const { error: e2 } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE people ADD COLUMN IF NOT EXISTS default_role user_role;' });
  console.log('people default_role:', e2 || 'success');
}
run();

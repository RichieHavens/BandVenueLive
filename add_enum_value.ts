import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  // Try to add 'registered_guest' to the enum
  const { error } = await supabase.rpc('exec_sql', { 
    sql: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'registered_guest';` 
  });
  console.log('Result:', error || 'success');
}
run();

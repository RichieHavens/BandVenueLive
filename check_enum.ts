import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'user_role';` 
  });
  console.log('Enum values:', data);
  if (error) console.error('Error:', error);
}
run();

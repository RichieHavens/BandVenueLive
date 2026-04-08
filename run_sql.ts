import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE musicians ADD COLUMN IF NOT EXISTS open_for_gigs BOOLEAN DEFAULT FALSE;' });
  console.log('exec_sql result:', error || 'success');
}
run();

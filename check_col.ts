import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('profiles').select('default_role').limit(1);
  console.log('profiles default_role exists:', !error);
  if (error) console.error(error);
}
run();

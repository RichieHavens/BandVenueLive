import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
async function run() {
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('first_name', 'Jason');
  console.log('Profiles:', profiles);
  if (profiles && profiles.length > 0) {
    const { data: venues } = await supabase.from('venues').select('*').eq('manager_id', profiles[0].id);
    console.log('Venues:', venues);
  }
}
run();

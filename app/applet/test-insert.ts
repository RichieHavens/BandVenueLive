import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('people').insert({
    first_name: 'Test',
    last_name: 'NoEmail',
    roles: ['guest'],
    venue_ids: [],
    band_ids: []
  }).select();
  console.log(error || data);
}
run();

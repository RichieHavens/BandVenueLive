import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work if the RPC doesn't exist
  if (error) {
    // Fallback: try to query musician_profiles
    const { error: err1 } = await supabase.from('musician_profiles').select('id').limit(1);
    console.log('musician_profiles exists:', !err1);
    const { error: err2 } = await supabase.from('musicians').select('id').limit(1);
    console.log('musicians exists:', !err2);
  } else {
    console.log('Tables:', data);
  }
}

checkTables();

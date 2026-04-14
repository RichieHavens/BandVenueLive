import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('musicians').select('*').limit(1);
  if (error) {
    console.error('Error fetching from musicians:', error);
  } else {
    console.log('Musicians columns:', data.length > 0 ? Object.keys(data[0]) : 'No data');
  }
  
  const { data: data2, error: error2 } = await supabase.from('musician_profiles').select('*').limit(1);
  if (error2) {
    console.error('Error fetching from musician_profiles:', error2);
  } else {
    console.log('Musician_profiles columns:', data2.length > 0 ? Object.keys(data2[0]) : 'No data');
  }
}

checkColumns();

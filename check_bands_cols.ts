import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking bands table columns...');
  const { data: bandData, error: bandError } = await supabase.from('bands').select('*').limit(1);
  if (bandError) {
    console.error('Error fetching bands:', bandError);
  } else {
    console.log('Bands columns:', Object.keys(bandData?.[0] || {}));
  }

  console.log('\nChecking if bands_ordered view exists...');
  const { data: viewData, error: viewError } = await supabase.from('bands_ordered').select('*').limit(1);
  if (viewError) {
    console.log('bands_ordered view does not exist or error:', viewError.message);
  } else {
    console.log('bands_ordered view exists!');
    console.log('bands_ordered columns:', Object.keys(viewData?.[0] || {}));
  }
}

check();

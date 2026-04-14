import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking venues table...');
  const { data: vData, error: vError } = await supabase.from('venues').select('*').limit(1);
  if (vData && vData.length > 0) {
    console.log('Venues Columns:', Object.keys(vData[0]));
  } else if (vError) {
    console.log('Venues Error:', vError);
  } else {
    console.log('Venues table is empty.');
    // Try to get columns from information_schema if possible, but select * limit 1 is usually enough if there's data.
    // If empty, we might need a different approach or just assume based on schema file if we can't run raw SQL.
  }

  console.log('\nChecking bands table...');
  const { data: bData, error: bError } = await supabase.from('bands').select('*').limit(1);
  if (bData && bData.length > 0) {
    console.log('Bands Columns:', Object.keys(bData[0]));
  } else if (bError) {
    console.log('Bands Error:', bError);
  } else {
    console.log('Bands table is empty.');
  }
}

check();

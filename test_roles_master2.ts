import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: content, error: contentError } = await supabase.from('role_page_content').select('*');
  console.log('Content:', content);
  console.log('Content Error:', contentError);
  
  const { data: alerts, error: alertsError } = await supabase.from('role_alerts').select('*');
  console.log('Alerts:', alerts);
  console.log('Alerts Error:', alertsError);
}
test();

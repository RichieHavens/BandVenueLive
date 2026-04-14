import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const sql = `
-- Venues table updates
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS x_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

UPDATE venues SET address_line1 = street WHERE address_line1 IS NULL AND street IS NOT NULL;
UPDATE venues SET postal_code = zip WHERE postal_code IS NULL AND zip IS NOT NULL;
UPDATE venues SET x_url = twitter_url WHERE x_url IS NULL AND twitter_url IS NOT NULL;

-- Bands table updates
ALTER TABLE bands ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS x_url TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

UPDATE bands SET address_line1 = street WHERE address_line1 IS NULL AND street IS NOT NULL;
UPDATE bands SET postal_code = zip WHERE postal_code IS NULL AND zip IS NOT NULL;
UPDATE bands SET x_url = twitter_url WHERE x_url IS NULL AND twitter_url IS NOT NULL;

-- Events table updates
ALTER TABLE events ADD COLUMN IF NOT EXISTS promoter_confirmed BOOLEAN DEFAULT FALSE;
`;

async function run() {
  console.log('Running SQL updates...');
  // We might need to run these one by one if exec_sql doesn't support multiple statements
  const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
  
  for (const statement of statements) {
    console.log(`Executing: ${statement}`);
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    if (error) {
      console.error(`Error executing statement: ${error.message}`);
    } else {
      console.log('Success');
    }
  }
}

run();

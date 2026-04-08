import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedRoles() {
  const roles = [
    {
      id: 'venue_manager',
      name: 'Venue Manager',
      description: 'Manage venues, events, and bookings.',
      welcome_template: 'Welcome back, {first_name}!'
    },
    {
      id: 'band_manager',
      name: 'Band Manager',
      description: 'Manage bands, members, and gig applications.',
      welcome_template: 'Ready to rock, {first_name}?'
    },
    {
      id: 'admin',
      name: 'Administrator',
      description: 'System administration and oversight.',
      welcome_template: 'Admin Dashboard - Welcome {first_name}'
    }
  ];

  for (const role of roles) {
    const { error } = await supabase.from('roles_master').upsert(role);
    if (error) {
      console.error(`Error inserting role ${role.id}:`, error);
    } else {
      console.log(`Successfully inserted role ${role.id}`);
    }
  }
}

seedRoles();

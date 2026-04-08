import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseUrl !== 'https://your-project-id.supabase.co';

console.log('Supabase URL loaded:', !!supabaseUrl);
console.log('Supabase Anon Key loaded:', !!supabaseAnonKey);
console.log('Supabase isConfigured:', !!isConfigured);

if (!isConfigured) {
  console.warn('Supabase credentials missing or using default placeholder. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

let validUrl = supabaseUrl || 'https://placeholder.supabase.co';
if (validUrl && !validUrl.startsWith('http')) {
  validUrl = `https://${validUrl}`;
}

export const supabase = createClient(
  validUrl,
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    },
    global: {
      fetch: (...args) => {
        if (!isConfigured) {
          return Promise.reject(new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'));
        }
        return fetch(args[0], args[1] as RequestInit);
      }
    }
  }
);

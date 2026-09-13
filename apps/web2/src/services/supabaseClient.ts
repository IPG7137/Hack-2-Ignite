import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://qxiivlfecbklwtnfsnjg.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aWl2bGZlY2JrbHd0bmZzbmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njk0OTIsImV4cCI6MjEwNDU0NTQ5Mn0.gZXjrzaMiYl_6JyozMfCbnjirQGerkliVEKC_xVCTbA';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Health check helper for database connection
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('reports').select('id').limit(1);
    if (error) {
      console.warn('⚠️ Supabase connection warning:', error.message);
      return false;
    }
    console.log(`✅ Supabase connected (found ${data?.length ?? 0} sample rows)`);
    return true;
  } catch (err) {
    console.error('❌ Supabase connection error:', err);
    return false;
  }
}

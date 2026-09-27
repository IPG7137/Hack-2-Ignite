import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const missing = [
    !SUPABASE_URL ? 'VITE_SUPABASE_URL' : null,
    !SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : null,
  ]
    .filter(Boolean)
    .join(', ');

  throw new Error(
    `❌ [CivicResolve Configuration Error]: Missing required Supabase environment configuration: ${missing}.\n` +
    `Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment (.env). ` +
    `Hardcoded credentials and fallback URLs have been permanently removed.`
  );
}

// In test or live mode, create client directly using environment variables.
// Hardcoded URLs, anon tokens, and fallback values have been removed.
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

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

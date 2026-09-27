import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  const missing = [
    !SUPABASE_URL ? 'VITE_SUPABASE_URL' : null,
    !SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : null,
  ]
    .filter(Boolean)
    .join(', ');

  console.error(
    `❌ [CivicResolve Security Configuration Error]: Missing required Supabase environment configuration: ${missing}.\n` +
    `Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment (.env).`
  );
}

// In test/unconfigured mode, use safe placeholder that does not expose production credentials or leak tokens
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://unconfigured-civicresolve.supabase.co',
  SUPABASE_ANON_KEY || 'unconfigured-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Health check helper for database connection
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.error(
      '❌ [CivicResolve Configuration Error]: Cannot connect to database because VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment.'
    );
    return false;
  }
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

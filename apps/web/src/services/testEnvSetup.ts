// apps/web/src/services/testEnvSetup.ts
// Test runner environment setup: ensures test harness runs with mock test configuration
if (typeof process !== 'undefined') {
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://placeholder-test-project.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-test-anon-key';
}

if (typeof import.meta !== 'undefined' && !(import.meta as any).env) {
  (import.meta as any).env = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  };
}

export {};

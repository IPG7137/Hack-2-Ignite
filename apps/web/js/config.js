// Centralized Configuration for CivicResolve Web Dashboard
// Allows runtime overrides via window.__ENV__ or localStorage without leaking raw secrets

(function() {
    const env = window.__ENV__ || {};
    
    window.CIVIC_CONFIG = {
        supabaseUrl: env.SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || 'https://qxiivlfecbklwtnfsnjg.supabase.co',
        supabaseKey: env.SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aWl2bGZlY2JrbHd0bmZzbmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njk0OTIsImV4cCI6MjEwNDU0NTQ5Mn0.gZXjrzaMiYl_6JyozMfCbnjirQGerkliVEKC_xVCTbA',
        geminiApiKey: env.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || '',
        appVersion: '2.0.0',
        environment: env.NODE_ENV || 'production'
    };

    console.log('⚙️ CivicResolve Configuration loaded (Env/Secure Store)');
})();


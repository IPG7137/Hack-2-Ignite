import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Building2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { Button } from '../ui/Button';

// Standard dedicated Hackathon Demo credentials (autofill only — authenticates via Supabase Auth)
export const DEMO_CREDENTIALS = {
  officer: {
    label: 'Zone 2 Duty Officer',
    email: 'demo.officer@civicresolve.gov',
    password: 'civic123456',
    role: 'Duty Officer (Field Operations)',
  },
  admin: {
    label: 'Municipal Administrator',
    email: 'demo.admin@civicresolve.gov',
    password: 'admin123456',
    role: 'Command Administrator (HQ)',
  },
};

export const MunicipalAuthScreen: React.FC = () => {
  const { signIn, error, clearError, loading } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) return;
    await signIn(email, password);
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    clearError();
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B4D] flex flex-col justify-between font-sans selection:bg-[#1769D2] selection:text-white">
      {/* ==================================================
          MUNICIPAL HEADER (Matches Authenticated Portal)
          ================================================== */}
      <header className="h-[76px] w-full border-b border-[#D9E2EC] bg-white sticky top-0 z-40 px-4 xl:px-6 flex items-center justify-between shadow-xs select-none">
        {/* Left: Municipal Corporation Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/assets/images/municipal_emblem.png"
            alt="Solapur Municipal Corporation Emblem"
            className="w-11 h-11 object-contain shrink-0 drop-shadow-xs"
          />
          <div className="flex flex-col justify-center shrink-0">
            <div className="text-[14px] font-bold text-[#123B6D] tracking-tight leading-snug">
              SOLAPUR MUNICIPAL CORPORATION
            </div>
            <div className="text-[11px] font-semibold text-[#526581] leading-snug">
              सोलापूर महानगरपालिका तक्रार निवारण कक्ष
            </div>
            <div className="text-[9px] text-[#718096] uppercase tracking-wider leading-snug hidden sm:block">
              Clean Solapur • Safe Solapur • Smart Solapur
            </div>
          </div>
        </div>

        {/* Center: CivicResolve Branding */}
        <div className="hidden md:flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#123B6D] tracking-wide">
              CivicResolve
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-bold">
              Command Portal v2.0
            </span>
          </div>
          <span className="text-[11px] text-[#526581] font-medium tracking-tight mt-0.5">
            Municipal Operations & Grievance Redressal System
          </span>
        </div>

        {/* Right: Security Badge */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] text-[#526581] shadow-2xs font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#16803C] animate-pulse" />
            <span className="font-bold text-[#172B4D]">RLS PROTECTED</span>
          </div>
        </div>
      </header>

      {/* ==================================================
          MAIN AUTHENTICATION CONTAINER
          ================================================== */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Municipal Platform Overview */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1769D2] text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1769D2]" />
              <span>Restricted Municipal Access</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#123B6D] tracking-tight leading-tight">
              Municipal Command & Decision Support Center
            </h1>

            <p className="text-xs sm:text-sm text-[#526581] leading-relaxed">
              Official administrative portal for grievance dispatch, SLA monitoring, geospatial incident triage, and evidence-grounded AI decision support.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-white border border-[#D9E2EC] shadow-2xs">
                <div className="flex items-center gap-2 text-[#1769D2] text-xs font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3A–3E Intelligence</span>
                </div>
                <p className="text-[11px] text-[#718096]">
                  Real-time duplicate clustering, smart priority ranking, and emerging incident radar.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-[#D9E2EC] shadow-2xs">
                <div className="flex items-center gap-2 text-[#16803C] text-xs font-bold mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>PostgreSQL RLS</span>
                </div>
                <p className="text-[11px] text-[#718096]">
                  Role-based data access strictly enforced at the database layer with zero service-role leaks.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Notice:</strong> This terminal is strictly for authorized municipal staff and department officers. Citizens should use the mobile citizen grievance app.
              </span>
            </div>
          </div>

          {/* Right Column: Clean White Authentication Card */}
          <div className="lg:col-span-6">
            <div className="rounded-xl bg-white border border-[#D9E2EC] shadow-lg overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
                    <Lock className="w-4 h-4 text-blue-200" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">Staff Sign In</h2>
                    <p className="text-[11px] text-blue-100 font-medium">Official Municipal Officer Authentication</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white border border-white/20 font-semibold">
                  Secure Gateway
                </span>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <div className="font-bold">Authentication Failed</div>
                      <div>{error}</div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] mb-1.5">
                      Official Municipal Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#718096] absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="officer@civicresolve.gov"
                        autoComplete="email"
                        className="w-full rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] pl-9 pr-3 py-2.5 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#718096] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        className="w-full rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] pl-9 pr-3 py-2.5 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2] transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full bg-[#1769D2] hover:bg-[#123B6D] text-white py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <span>Authenticate Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </form>

                {/* ==================================================
                    HACKATHON DEMO QUICK-FILL SECTION (AUTOFILL ONLY)
                    ================================================== */}
                <div className="pt-3 border-t border-[#D9E2EC]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#526581] mb-2">
                    <KeyRound className="w-3.5 h-3.5 text-[#1769D2]" />
                    <span>HACKATHON DEMO LOGINS (Quick Fill):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDemoFill(DEMO_CREDENTIALS.officer.email, DEMO_CREDENTIALS.officer.password)}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">
                        Zone 2 Duty Officer
                      </div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">
                        {DEMO_CREDENTIALS.officer.email}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoFill(DEMO_CREDENTIALS.admin.email, DEMO_CREDENTIALS.admin.password)}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">
                        Municipal Admin
                      </div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">
                        {DEMO_CREDENTIALS.admin.email}
                      </div>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#718096] mt-2 leading-tight">
                    ⚡ <em>Clicking fills demo credentials into the form. Authentication executes via live Supabase Auth.</em>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D9E2EC] bg-white px-6 py-3 text-center text-xs text-[#718096]">
        CivicResolve Municipal Operations Platform · Government of Maharashtra · Protected by PostgreSQL Row Level Security (RLS)
      </footer>
    </div>
  );
};

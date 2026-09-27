import React, { useState, useMemo } from 'react';
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
  Landmark,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { Button } from '../ui/Button';
import {
  MAHARASHTRA_DISTRICTS,
  getCorporationsForDistrict,
  getCorporationById,
} from '../../data/maharashtraDistricts';
import {
  DISTRICT_CREDENTIAL_REGISTRY,
  STATE_ADMIN_CREDENTIAL,
  resolveDistrictCredential,
} from '../../data/districtCredentials';

// Demo password shown in the UI — not a production secret
const DEMO_PASSWORD = 'demo@2026';

export const MunicipalAuthScreen: React.FC = () => {
  const { signIn, error, clearError, loading } = useAuthContext();
  const { setOrganization } = useOrganization();

  // Admin Type Toggle: 'MUNICIPAL_CORPORATION' or 'STATE'
  const [adminType, setAdminType] = useState<'MUNICIPAL_CORPORATION' | 'STATE'>('MUNICIPAL_CORPORATION');

  // Hierarchy selections
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('pune');
  const [selectedCorporationId, setSelectedCorporationId] = useState<string>('pmc');

  // Form credentials — pre-filled from district registry
  const [loginId, setLoginId] = useState('pune_admin');
  const [password, setPassword] = useState(DEMO_PASSWORD);

  // Available corporations for currently chosen district
  const availableCorporations = useMemo(() => {
    const dist = MAHARASHTRA_DISTRICTS.find((d) => d.id === selectedDistrictId);
    return dist ? dist.corporations : [];
  }, [selectedDistrictId]);

  // When district changes, update loginId and corporation to match the district credential
  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    const corps = getCorporationsForDistrict(districtId);
    const firstCorpId = corps.length > 0 ? corps[0].id : '';
    setSelectedCorporationId(firstCorpId);
    // Auto-fill the district-specific loginId from the registry
    const cred = DISTRICT_CREDENTIAL_REGISTRY.find((d) => d.districtId === districtId);
    if (cred) setLoginId(cred.loginId);
  };

  const handleAdminTypeChange = (type: 'MUNICIPAL_CORPORATION' | 'STATE') => {
    setAdminType(type);
    clearError();
    if (type === 'STATE') {
      setLoginId(STATE_ADMIN_CREDENTIAL.loginId);
      setPassword(DEMO_PASSWORD);
      setOrganization('STATE', null, null);
    } else {
      const cred = DISTRICT_CREDENTIAL_REGISTRY.find((d) => d.districtId === selectedDistrictId);
      if (cred) {
        setLoginId(cred.loginId);
        setPassword(DEMO_PASSWORD);
      }
      const distObj = MAHARASHTRA_DISTRICTS.find((d) => d.id === selectedDistrictId);
      setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!loginId || !password) return;

    // Set org context BEFORE signing in so the dashboard loads the right district
    if (adminType === 'STATE') {
      setOrganization('STATE', null, null);
    } else {
      setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId);
    }

    await signIn(loginId, password);
  };

  /**
   * One-click demo login for a specific district.
   * Uses the district's unique loginId from the registry.
   */
  const handleDemoLogin = async (
    demoLoginId: string,
    type: 'MUNICIPAL_CORPORATION' | 'STATE',
    distId?: string,
    corpId?: string
  ) => {
    clearError();
    setLoginId(demoLoginId);
    setPassword(DEMO_PASSWORD);
    setAdminType(type);

    if (type === 'STATE') {
      setOrganization('STATE', null, null);
    } else if (distId) {
      const finalCorpId = corpId || selectedCorporationId;
      setSelectedDistrictId(distId);
      setSelectedCorporationId(finalCorpId || '');
      setOrganization('MUNICIPAL_CORPORATION', distId, finalCorpId || null);
    }

    await signIn(demoLoginId, DEMO_PASSWORD);
  };

  const selectedCorpObj = getCorporationById(selectedCorporationId);
  const selectedDistrictObj = MAHARASHTRA_DISTRICTS.find((d) => d.id === selectedDistrictId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B4D] flex flex-col justify-between font-sans selection:bg-[#1769D2] selection:text-white">
      {/* ==================================================
          STATE & MUNICIPAL HEADER
          ================================================== */}
      <header className="h-[76px] w-full border-b border-[#D9E2EC] bg-white sticky top-0 z-40 px-4 xl:px-6 flex items-center justify-between shadow-xs select-none">
        {/* Left: Maharashtra State Governance Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-lg bg-[#123B6D] text-white flex items-center justify-center font-bold text-lg shadow-sm border border-blue-900">
            🏛️
          </div>
          <div className="flex flex-col justify-center shrink-0">
            <div className="text-[14px] font-bold text-[#123B6D] tracking-tight leading-snug">
              GOVERNMENT OF MAHARASHTRA
            </div>
            <div className="text-[11px] font-semibold text-[#526581] leading-snug">
              Urban Development Department • Municipal Administration
            </div>
            <div className="text-[9px] text-[#718096] uppercase tracking-wider leading-snug hidden sm:block">
              महाराष्ट्र शासन • नगर विकास विभाग • नागरी तक्रार निवारण प्रणाली
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
              Maharashtra State Portal
            </span>
          </div>
          <span className="text-[11px] text-[#526581] font-medium tracking-tight mt-0.5">
            State-Wide Municipal Operations & Grievance Redressal
          </span>
        </div>

        {/* Right: Security Badge */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] text-[#526581] shadow-2xs font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#16803C] animate-pulse" />
            <span className="font-bold text-[#172B4D]">STATE RBAC & RLS</span>
          </div>
        </div>
      </header>

      {/* ==================================================
          MAIN AUTHENTICATION CONTAINER
          ================================================== */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Maharashtra Governance Hierarchy */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1769D2] text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1769D2]" />
              <span>Multi-Tier Municipal Governance</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#123B6D] tracking-tight leading-tight">
              Maharashtra Municipal Command & Operations Network
            </h1>

            <p className="text-xs sm:text-sm text-[#526581] leading-relaxed">
              Unified digital infrastructure connecting the Maharashtra State Administration with jurisdictional Municipal Corporations for grievance triage, SLA enforcement, and AI-powered operational dispatch.
            </p>

            {/* Hierarchical Conceptual Flow Visualizer */}
            <div className="p-3.5 rounded-xl bg-white border border-[#D9E2EC] shadow-2xs space-y-2 text-xs">
              <div className="font-bold text-[#123B6D] uppercase text-[10px] tracking-wider">
                Organizational Hierarchy:
              </div>
              <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-[#1769D2] font-bold">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Level 1: Maharashtra State Administration (Monitoring & Oversight)</span>
                </div>
                <div className="pl-5 text-[#526581]">↓ Division → District Coordination</div>
                <div className="flex items-center gap-2 text-[#16803C] font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Level 2: Municipal Corporations (Command Center & Dispatch)</span>
                </div>
                <div className="pl-5 text-[#526581]">↓ Ward Officers & Field Crews (On-Site Resolution)</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-white border border-[#D9E2EC] shadow-2xs">
                <div className="flex items-center gap-2 text-[#1769D2] text-xs font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3A–3E Intelligence</span>
                </div>
                <p className="text-[11px] text-[#718096]">
                  Cross-corporation duplicate detection, priority ranking, and emerging surge radar.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-[#D9E2EC] shadow-2xs">
                <div className="flex items-center gap-2 text-[#16803C] text-xs font-bold mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>PostgreSQL RLS</span>
                </div>
                <p className="text-[11px] text-[#718096]">
                  Strict data isolation ensuring municipal corporations operate within their jurisdictions.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Authentication Card */}
          <div className="lg:col-span-6">
            <div className="rounded-xl bg-white border border-[#D9E2EC] shadow-lg overflow-hidden">
              {/* Card Header with Level Switcher */}
              <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-6 py-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
                      <Lock className="w-4 h-4 text-blue-200" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight">Administrative Sign In</h2>
                      <p className="text-[11px] text-blue-100">Select administration type to proceed</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white border border-white/20 font-semibold">
                    v2.0 State
                  </span>
                </div>

                {/* Level 1 vs Level 2 Tab Switcher */}
                <div className="grid grid-cols-2 p-1 bg-black/25 rounded-lg text-xs font-semibold gap-1">
                  <button
                    type="button"
                    id="tab-btn-municipal"
                    onClick={() => handleAdminTypeChange('MUNICIPAL_CORPORATION')}
                    className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      adminType === 'MUNICIPAL_CORPORATION'
                        ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                        : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Municipal Corporation</span>
                  </button>

                  <button
                    type="button"
                    id="tab-btn-state-admin"
                    onClick={() => handleAdminTypeChange('STATE')}
                    className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      adminType === 'STATE'
                        ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                        : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>State Administration</span>
                  </button>
                </div>
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

                <form onSubmit={handleSignIn} className="space-y-3.5">
                  {/* =======================================================
                      MUNICIPAL CORPORATION FLOW: DISTRICT -> CORPORATION
                      ======================================================= */}
                  {adminType === 'MUNICIPAL_CORPORATION' && (
                    <div className="space-y-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      {/* Step 1: Select District */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#172B4D] mb-1 uppercase tracking-wider">
                          Step 1: Select District
                        </label>
                        <select
                          value={selectedDistrictId}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          className="w-full rounded-md border border-[#D9E2EC] bg-white px-2.5 py-2 text-xs text-[#172B4D] font-medium focus:border-[#1769D2] focus:outline-hidden"
                        >
                          {MAHARASHTRA_DISTRICTS.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} District ({d.division} Division)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Step 2: Select Municipal Corporation */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#172B4D] mb-1 uppercase tracking-wider">
                          Step 2: Select Municipal Corporation
                        </label>
                        <select
                          value={selectedCorporationId}
                          onChange={(e) => setSelectedCorporationId(e.target.value)}
                          className="w-full rounded-md border border-[#D9E2EC] bg-white px-2.5 py-2 text-xs text-[#172B4D] font-bold focus:border-[#1769D2] focus:outline-hidden"
                        >
                          {availableCorporations.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.shortName})
                            </option>
                          ))}
                        </select>
                        {selectedCorpObj && (
                          <div className="mt-1 text-[10px] text-[#526581] font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>HQ: {selectedCorpObj.headquarters} • Status: {selectedCorpObj.status.toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      {/* District login ID hint */}
                      {selectedDistrictObj && (
                        <div className="text-[10px] text-[#526581] bg-blue-50 rounded px-2 py-1 font-mono border border-blue-100">
                          District Login ID:{' '}
                          <strong className="text-[#1769D2]">
                            {DISTRICT_CREDENTIAL_REGISTRY.find((d) => d.districtId === selectedDistrictId)?.loginId || `${selectedDistrictId}_admin`}
                          </strong>
                          {' '}· Each district has a unique account.
                        </div>
                      )}
                    </div>
                  )}

                  {/* =======================================================
                      STATE ADMINISTRATION FLOW: MAHARASHTRA BADGE
                      ======================================================= */}
                  {adminType === 'STATE' && (
                    <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                      <div className="text-[11px] font-bold text-[#123B6D] uppercase tracking-wider flex items-center justify-between">
                        <span>State Authority Level</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-100 text-[#1769D2] font-bold">
                          LEVEL 1 OVERSIGHT
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#172B4D]">
                        State: <strong className="text-[#1769D2]">Maharashtra</strong> (Urban Development Department)
                      </div>
                      <p className="text-[11px] text-[#526581]">
                        Aggregated monitoring across all 29+ Municipal Corporations in Maharashtra.
                        View district-wise operational progress separately.
                      </p>
                      <div className="text-[10px] font-mono text-[#526581] bg-white rounded px-2 py-1 border border-blue-100">
                        State Login ID: <strong className="text-[#1769D2]">state_admin</strong>
                      </div>
                    </div>
                  )}

                  {/* Step 3: ID / Login */}
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] mb-1">
                      {adminType === 'STATE' ? 'State Administration ID' : 'District Administration ID'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#718096] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={loginId}
                        onChange={(e) => {
                          setLoginId(e.target.value);
                          if (error) clearError();
                        }}
                        placeholder={
                          adminType === 'STATE'
                            ? 'state_admin'
                            : `e.g. ${DISTRICT_CREDENTIAL_REGISTRY.find((d) => d.districtId === selectedDistrictId)?.loginId || 'pune_admin'}`
                        }
                        autoComplete="username"
                        className="w-full rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Step 4: Password */}
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#718096] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) clearError();
                        }}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        className="w-full rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full bg-[#1769D2] hover:bg-[#123B6D] text-white py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <span>
                      {adminType === 'STATE'
                        ? 'Sign In to Maharashtra State Administration'
                        : `Sign In to ${selectedCorpObj?.shortName || 'Municipal Corporation'}`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </form>

                {/* ==================================================
                    HACKATHON DEMO QUICK-FILL SECTION (AUTOFILL ONLY)
                    ================================================== */}
                <div className="pt-3 border-t border-[#D9E2EC]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#526581] mb-2">
                    <KeyRound className="w-3.5 h-3.5 text-[#1769D2]" />
                    <span>DEMO QUICK-LOGIN (District-Specific Accounts):</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* PMC — Pune */}
                    <button
                      type="button"
                      id="demo-btn-pune"
                      onClick={() => handleDemoLogin('pune_admin', 'MUNICIPAL_CORPORATION', 'pune', 'pmc')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">PMC — Pune</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">pune_admin</div>
                    </button>

                    {/* SMC — Solapur */}
                    <button
                      type="button"
                      id="demo-btn-solapur"
                      onClick={() => handleDemoLogin('solapur_admin', 'MUNICIPAL_CORPORATION', 'solapur', 'smc')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">SMC — Solapur</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">solapur_admin</div>
                    </button>

                    {/* BMC — Mumbai */}
                    <button
                      type="button"
                      id="demo-btn-mumbai"
                      onClick={() => handleDemoLogin('mumbai_admin', 'MUNICIPAL_CORPORATION', 'mumbai', 'bmc')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">BMC — Mumbai</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">mumbai_admin</div>
                    </button>

                    {/* NMC — Nashik */}
                    <button
                      type="button"
                      id="demo-btn-nashik"
                      onClick={() => handleDemoLogin('nashik_admin', 'MUNICIPAL_CORPORATION', 'nashik', 'nmc')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">NMC — Nashik</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">nashik_admin</div>
                    </button>

                    {/* NMC — Nagpur */}
                    <button
                      type="button"
                      id="demo-btn-nagpur"
                      onClick={() => handleDemoLogin('nagpur_admin', 'MUNICIPAL_CORPORATION', 'nagpur', 'nmc_nagpur')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">NMC — Nagpur</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">nagpur_admin</div>
                    </button>

                    {/* CSMC — Chhatrapati Sambhajinagar */}
                    <button
                      type="button"
                      id="demo-btn-csn"
                      onClick={() => handleDemoLogin('csn_admin', 'MUNICIPAL_CORPORATION', 'chhatrapati_sambhajinagar', 'csmc')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">CSMC — Sambhajinagar</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">csn_admin</div>
                    </button>

                    {/* State: Maharashtra State Admin */}
                    <button
                      type="button"
                      id="demo-btn-state-admin"
                      onClick={() => handleDemoLogin('state_admin', 'STATE')}
                      className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 text-left transition-all group cursor-pointer col-span-2 sm:col-span-1"
                    >
                      <div className="text-[11px] font-bold text-[#1769D2] flex items-center justify-between">
                        <span>State Admin</span>
                        <span className="text-[9px] bg-[#1769D2] text-white px-1.5 py-0.5 rounded font-bold">STATE</span>
                      </div>
                      <div className="text-[10px] text-[#526581] font-mono truncate">state_admin</div>
                    </button>
                  </div>

                  <p className="text-[10px] text-[#718096] mt-2 leading-tight">
                    ⚡ <em>Each district has its own unique account. Password for all demo accounts: <strong className="font-mono text-[#172B4D]">{DEMO_PASSWORD}</strong></em>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D9E2EC] bg-white px-6 py-3 text-center text-xs text-[#718096]">
        CivicResolve Maharashtra Municipal Administration Platform · Government of Maharashtra · Protected by PostgreSQL Row Level Security (RLS)
      </footer>
    </div>
  );
};

export default MunicipalAuthScreen;

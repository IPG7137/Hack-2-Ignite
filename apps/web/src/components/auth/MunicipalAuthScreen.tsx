import React, { useState, useMemo } from 'react';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Building2,
  KeyRound,
  ShieldCheck,
  Landmark,
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
  const { signIn, signUp, error, clearError, loading } = useAuthContext();
  const { setOrganization } = useOrganization();

  // Admin Type Toggle: 'CITIZEN' | 'MUNICIPAL_CORPORATION' | 'STATE'
  const [adminType, setAdminType] = useState<'CITIZEN' | 'MUNICIPAL_CORPORATION' | 'STATE'>('CITIZEN');
  const [citizenMode, setCitizenMode] = useState<'signin' | 'signup'>('signin');

  // Citizen registration state
  const [citizenFullName, setCitizenFullName] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenPassword, setCitizenPassword] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenWard, setCitizenWard] = useState('Zone 2 Command');
  const [citizenDistrictId, setCitizenDistrictId] = useState('pune');
  const [citizenSuccessMsg, setCitizenSuccessMsg] = useState<string | null>(null);

  // Hierarchy selections
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('pune');
  const [selectedCorporationId, setSelectedCorporationId] = useState<string>('pmc');

  // Form credentials — pre-filled from district registry
  const [loginId, setLoginId] = useState('citizen.pune@example.com');
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

  const handleAdminTypeChange = (type: 'CITIZEN' | 'MUNICIPAL_CORPORATION' | 'STATE') => {
    setAdminType(type);
    clearError();
    setCitizenSuccessMsg(null);
    if (type === 'STATE') {
      setLoginId(STATE_ADMIN_CREDENTIAL.loginId);
      setPassword(DEMO_PASSWORD);
      setOrganization('STATE', null, null);
    } else if (type === 'MUNICIPAL_CORPORATION') {
      const cred = DISTRICT_CREDENTIAL_REGISTRY.find((d) => d.districtId === selectedDistrictId);
      if (cred) {
        setLoginId(cred.loginId);
        setPassword(DEMO_PASSWORD);
      }
      setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId);
    } else {
      setLoginId('citizen.pune@example.com');
      setPassword(DEMO_PASSWORD);
      setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setCitizenSuccessMsg(null);
    if (!loginId || !password) return;

    if (adminType === 'STATE') {
      setOrganization('STATE', null, null);
    } else {
      setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId);
    }

    await signIn(loginId, password);
  };

  const handleCitizenSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setCitizenSuccessMsg(null);
    if (!citizenEmail || !citizenPassword) return;

    const res = await signUp(citizenEmail, citizenPassword, {
      fullName: citizenFullName || citizenEmail.split('@')[0],
      departmentName: 'Citizen Grievance Desk',
      ward: citizenWard,
      districtId: citizenDistrictId,
      phone: citizenPhone,
    });

    if (res.success) {
      setCitizenSuccessMsg('Account registered successfully! Signing in to your Citizen Portal...');
      setOrganization('MUNICIPAL_CORPORATION', citizenDistrictId, null);
      await signIn(citizenEmail, citizenPassword);
    }
  };

  /**
   * One-click demo login for testing
   */
  const handleDemoLogin = async (
    demoLoginId: string,
    type: 'CITIZEN' | 'MUNICIPAL_CORPORATION' | 'STATE',
    distId?: string,
    corpId?: string
  ) => {
    clearError();
    setCitizenSuccessMsg(null);
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
                    SEC-v2.4
                  </span>
                </div>

                {/* 3-Tier Tab Switcher */}
                <div className="grid grid-cols-3 p-1 bg-black/25 rounded-lg text-xs font-semibold gap-1">
                  <button
                    type="button"
                    id="tab-btn-citizen"
                    onClick={() => handleAdminTypeChange('CITIZEN')}
                    className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                      adminType === 'CITIZEN'
                        ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                        : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <span>👥 Citizen Portal</span>
                  </button>

                  <button
                    type="button"
                    id="tab-btn-municipal"
                    onClick={() => handleAdminTypeChange('MUNICIPAL_CORPORATION')}
                    className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                      adminType === 'MUNICIPAL_CORPORATION'
                        ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                        : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Municipal HQ</span>
                  </button>

                  <button
                    type="button"
                    id="tab-btn-state-admin"
                    onClick={() => handleAdminTypeChange('STATE')}
                    className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                      adminType === 'STATE'
                        ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                        : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <Landmark className="w-3 h-3" />
                    <span>State HQ</span>
                  </button>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <div className="font-bold">Authentication Notice</div>
                      <div>{error}</div>
                    </div>
                  </div>
                )}

                {citizenSuccessMsg && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <div>{citizenSuccessMsg}</div>
                  </div>
                )}

                {/* =======================================================
                    CITIZEN FLOW: SIGN IN VS DYNAMIC REGISTRATION
                    ======================================================= */}
                {adminType === 'CITIZEN' && (
                  <div className="space-y-3">
                    {/* Citizen Mode Switcher */}
                    <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setCitizenMode('signin');
                          clearError();
                          setCitizenSuccessMsg(null);
                        }}
                        className={`flex-1 py-1.5 rounded-md text-center transition-all cursor-pointer ${
                          citizenMode === 'signin'
                            ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                            : 'text-[#526581] hover:text-[#172B4D]'
                        }`}
                      >
                        Citizen Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCitizenMode('signup');
                          clearError();
                          setCitizenSuccessMsg(null);
                        }}
                        className={`flex-1 py-1.5 rounded-md text-center transition-all cursor-pointer ${
                          citizenMode === 'signup'
                            ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                            : 'text-[#526581] hover:text-[#172B4D]'
                        }`}
                      >
                        Register New Citizen
                      </button>
                    </div>

                    {citizenMode === 'signin' ? (
                      <form onSubmit={handleSignIn} className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-[#172B4D] mb-1">
                            Citizen Email or ID
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-[#718096] absolute left-3 top-3" />
                            <input
                              type="text"
                              required
                              value={loginId}
                              onChange={(e) => setLoginId(e.target.value)}
                              placeholder="citizen@example.com"
                              className="w-full rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                            />
                          </div>
                        </div>

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
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          loading={loading}
                          className="w-full bg-[#1769D2] hover:bg-[#123B6D] text-white py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <span>Sign In to Citizen Portal</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleCitizenSignUp} className="space-y-2.5">
                        <div>
                          <label className="block text-xs font-bold text-[#172B4D] mb-0.5">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={citizenFullName}
                            onChange={(e) => setCitizenFullName(e.target.value)}
                            placeholder="Aarav Sharma"
                            className="w-full rounded-md border border-[#D9E2EC] bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-[#172B4D] mb-0.5">Email Address *</label>
                            <input
                              type="email"
                              required
                              value={citizenEmail}
                              onChange={(e) => setCitizenEmail(e.target.value)}
                              placeholder="aarav@example.com"
                              className="w-full rounded-md border border-[#D9E2EC] bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#172B4D] mb-0.5">Password *</label>
                            <input
                              type="password"
                              required
                              value={citizenPassword}
                              onChange={(e) => setCitizenPassword(e.target.value)}
                              placeholder="Min 6 characters"
                              className="w-full rounded-md border border-[#D9E2EC] bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-[#172B4D] mb-0.5">District *</label>
                            <select
                              value={citizenDistrictId}
                              onChange={(e) => setCitizenDistrictId(e.target.value)}
                              className="w-full rounded-md border border-[#D9E2EC] bg-white px-2 py-1.5 text-xs text-[#172B4D] focus:border-[#1769D2] focus:outline-hidden"
                            >
                              {MAHARASHTRA_DISTRICTS.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#172B4D] mb-0.5">Ward / Area</label>
                            <input
                              type="text"
                              value={citizenWard}
                              onChange={(e) => setCitizenWard(e.target.value)}
                              placeholder="Zone 2"
                              className="w-full rounded-md border border-[#D9E2EC] bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div className="pt-1">
                          <Button
                            type="submit"
                            loading={loading}
                            className="w-full bg-[#1769D2] hover:bg-[#123B6D] text-white py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <span>Register & Enter Citizen Portal</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* =======================================================
                    MUNICIPAL & STATE FLOWS
                    ======================================================= */}
                {adminType !== 'CITIZEN' && (
                  <form onSubmit={handleSignIn} className="space-y-3.5">
                    {adminType === 'MUNICIPAL_CORPORATION' && (
                      <div className="space-y-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
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
                        </div>
                      </div>
                    )}

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
                      </div>
                    )}

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
                          className="w-full rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#172B4D] mb-1">Password</label>
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
                          className="w-full rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      loading={loading}
                      className="w-full bg-[#1769D2] hover:bg-[#123B6D] text-white py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>
                        {adminType === 'STATE'
                          ? 'Sign In to Maharashtra State Administration'
                          : `Sign In to ${selectedCorpObj?.shortName || 'Municipal Corporation'}`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                )}

                {/* ==================================================
                    HACKATHON DEMO QUICK-FILL SECTION (AUTOFILL ONLY)
                    ================================================== */}
                <div className="pt-3 border-t border-[#D9E2EC]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#526581] mb-2">
                    <KeyRound className="w-3.5 h-3.5 text-[#1769D2]" />
                    <span>DEMO QUICK-LOGIN:</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Pune Citizen */}
                    <button
                      type="button"
                      id="demo-btn-citizen-pune"
                      onClick={() => handleDemoLogin('citizen.pune@example.com', 'CITIZEN', 'pune', 'pmc')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-emerald-50 border border-[#D9E2EC] hover:border-emerald-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-emerald-800 group-hover:text-emerald-900">Pune Citizen</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">citizen.pune</div>
                    </button>

                    {/* PMC — Pune Admin */}
                    <button
                      type="button"
                      id="demo-btn-pune"
                      onClick={() => handleDemoLogin('pune_admin', 'MUNICIPAL_CORPORATION', 'pune', 'pmc')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">PMC — Pune Admin</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">pune_admin</div>
                    </button>

                    {/* SMC — Solapur Admin */}
                    <button
                      type="button"
                      id="demo-btn-solapur"
                      onClick={() => handleDemoLogin('solapur_admin', 'MUNICIPAL_CORPORATION', 'solapur', 'smc')}
                      className="p-2 rounded-lg bg-[#F8FAFC] hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#123B6D] group-hover:text-[#1769D2]">SMC — Solapur Admin</div>
                      <div className="text-[10px] text-[#718096] font-mono truncate">solapur_admin</div>
                    </button>

                    {/* State Admin */}
                    <button
                      type="button"
                      id="demo-btn-state-admin"
                      onClick={() => handleDemoLogin('state_admin', 'STATE')}
                      className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 text-left transition-all group cursor-pointer col-span-2 sm:col-span-3"
                    >
                      <div className="text-[11px] font-bold text-[#1769D2] flex items-center justify-between">
                        <span>Maharashtra State Administrator</span>
                        <span className="text-[9px] bg-[#1769D2] text-white px-1.5 py-0.5 rounded font-bold">STATE LEVEL</span>
                      </div>
                      <div className="text-[10px] text-[#526581] font-mono truncate">state_admin</div>
                    </button>
                  </div>

                  <p className="text-[10px] text-[#718096] mt-2 leading-tight">
                    ⚡ <em>Password for all demo accounts: <strong className="font-mono text-[#172B4D]">{DEMO_PASSWORD}</strong></em>
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

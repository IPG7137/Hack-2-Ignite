import React, { useState, useMemo } from 'react';
import {
  Lock,
  Mail,
  AlertCircle,
  Building2,
  ShieldCheck,
  Landmark,
  MapPin,
  Smartphone,
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
  ZONE_CREDENTIAL_REGISTRY,
  STATE_ADMIN_CREDENTIAL,
} from '../../data/districtCredentials';

export type AdminTier = 'STATE' | 'DISTRICT' | 'ZONE';

export const MunicipalAuthScreen: React.FC = () => {
  const { signIn, error, clearError, loading } = useAuthContext();
  const { setOrganization } = useOrganization();

  // Admin Tier: 'STATE', 'DISTRICT', or 'ZONE'
  const [adminType, setAdminType] = useState<AdminTier>('DISTRICT');

  // Hierarchy selections
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('solapur');
  const [selectedCorporationId, setSelectedCorporationId] = useState<string>('smc');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('solapur_north');

  // Form credentials
  const [loginId, setLoginId] = useState('solapur_admin');
  const [password, setPassword] = useState('');

  // Available corporations for currently chosen district
  const availableCorporations = useMemo(() => {
    const dist = MAHARASHTRA_DISTRICTS.find((d) => d.id === selectedDistrictId);
    return dist ? dist.corporations : [];
  }, [selectedDistrictId]);

  // Available zones for currently chosen district
  const availableZones = useMemo(() => {
    return ZONE_CREDENTIAL_REGISTRY.filter((z) => z.districtId === selectedDistrictId);
  }, [selectedDistrictId]);

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    const corps = getCorporationsForDistrict(districtId);
    const firstCorpId = corps.length > 0 ? corps[0].id : '';
    setSelectedCorporationId(firstCorpId);

    if (adminType === 'DISTRICT') {
      const cred = DISTRICT_CREDENTIAL_REGISTRY.find((d) => d.districtId === districtId);
      if (cred) setLoginId(cred.loginId);
    } else if (adminType === 'ZONE') {
      const zones = ZONE_CREDENTIAL_REGISTRY.filter((z) => z.districtId === districtId);
      if (zones.length > 0) {
        setSelectedZoneId(zones[0].zoneId);
        setLoginId(zones[0].loginId);
      } else {
        setLoginId(`${districtId}_zone1_admin`);
      }
    }
  };

  const handleZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const zoneCred = ZONE_CREDENTIAL_REGISTRY.find((z) => z.zoneId === zoneId);
    if (zoneCred) {
      setLoginId(zoneCred.loginId);
    }
  };

  const handleAdminTypeChange = (tier: AdminTier) => {
    setAdminType(tier);
    clearError();
    if (tier === 'STATE') {
      setLoginId(STATE_ADMIN_CREDENTIAL.loginId);
      setPassword('');
      setOrganization('STATE', null, null, null);
    } else if (tier === 'DISTRICT') {
      const cred = DISTRICT_CREDENTIAL_REGISTRY.find((d) => d.districtId === selectedDistrictId);
      if (cred) setLoginId(cred.loginId);
      setPassword('');
      setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId, null);
    } else if (tier === 'ZONE') {
      const zones = ZONE_CREDENTIAL_REGISTRY.filter((z) => z.districtId === selectedDistrictId);
      if (zones.length > 0) {
        setSelectedZoneId(zones[0].zoneId);
        setLoginId(zones[0].loginId);
        setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId, zones[0].zoneName);
      }
      setPassword('');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!loginId || !password) return;

    if (adminType === 'STATE') {
      setOrganization('STATE', null, null, null);
    } else if (adminType === 'DISTRICT') {
      setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId, null);
    } else if (adminType === 'ZONE') {
      const zoneCred = ZONE_CREDENTIAL_REGISTRY.find((z) => z.zoneId === selectedZoneId);
      setOrganization('MUNICIPAL_CORPORATION', selectedDistrictId, selectedCorporationId, zoneCred?.zoneName || null);
    }

    await signIn(loginId, password);
  };

  const selectedCorpObj = getCorporationById(selectedCorporationId);
  const selectedDistrictObj = MAHARASHTRA_DISTRICTS.find((d) => d.id === selectedDistrictId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B4D] flex flex-col justify-between font-sans selection:bg-[#1769D2] selection:text-white">
      {/* Header */}
      <header className="h-[76px] w-full border-b border-[#D9E2EC] bg-white sticky top-0 z-40 px-4 xl:px-6 flex items-center justify-between shadow-xs select-none">
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

        <div className="hidden md:flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#123B6D] tracking-wide">
              CivicResolve
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-bold">
              Web Administration Platform
            </span>
          </div>
          <span className="text-[11px] text-[#526581] font-medium tracking-tight mt-0.5">
            State, District & Zone Administrative Operations
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] text-[#526581] shadow-2xs font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#16803C] animate-pulse" />
            <span className="font-bold text-[#172B4D]">STRICT RBAC & ISOLATION</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Governance Hierarchy & Mobile App Rule */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1769D2] text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1769D2]" />
              <span>Multi-Tier Administrative Governance</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#123B6D] tracking-tight leading-tight">
              Maharashtra Municipal Administrative Platform
            </h1>

            <p className="text-xs sm:text-sm text-[#526581] leading-relaxed">
              Unified administrative command for Maharashtra State, District, and Zone Administrators. Every role operates within its strictly enforced jurisdiction boundary.
            </p>

            {/* Platform Separation Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-[11px]">
                <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Mobile Operations Platform (Citizen & Field Officer)</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Citizens</strong> report and track grievances via the mobile application. <strong>Field Officers</strong> execute assigned tasks, upload photo evidence, and complete on-ground resolutions on mobile.
              </p>
            </div>

            {/* Hierarchical Flow */}
            <div className="p-3.5 rounded-xl bg-white border border-[#D9E2EC] shadow-2xs space-y-2 text-xs">
              <div className="font-bold text-[#123B6D] uppercase text-[10px] tracking-wider">
                Web Administration Scope:
              </div>
              <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-[#1769D2] font-bold">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>State Admin: Maharashtra Statewide Monitoring</span>
                </div>
                <div className="flex items-center gap-2 text-[#16803C] font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>District Admin: Assigned District Only</span>
                </div>
                <div className="flex items-center gap-2 text-[#D97706] font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Zone Admin: Assigned Zone Only (Strict Isolation)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card with 3 Tiers */}
          <div className="lg:col-span-6">
            <div className="rounded-xl bg-white border border-[#D9E2EC] shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-6 py-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
                      <Lock className="w-4 h-4 text-blue-200" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight">Administrative Sign In</h2>
                      <p className="text-[11px] text-blue-100">Select administration level</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white border border-white/20 font-semibold">
                    v2.0 Web Admin
                  </span>
                </div>

                {/* 3-Tier Switcher: State Admin | District Admin | Zone Admin */}
                <div className="grid grid-cols-3 p-1 bg-black/25 rounded-lg text-xs font-semibold gap-1">
                  <button
                    type="button"
                    id="tab-btn-state-admin"
                    onClick={() => handleAdminTypeChange('STATE')}
                    className={`py-1.5 px-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer text-center text-[11px] ${
                      adminType === 'STATE'
                        ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                        : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <Landmark className="w-3 h-3 shrink-0" />
                    <span className="truncate">State Admin</span>
                  </button>

                  <button
                    type="button"
                    id="tab-btn-district-admin"
                    onClick={() => handleAdminTypeChange('DISTRICT')}
                    className={`py-1.5 px-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer text-center text-[11px] ${
                      adminType === 'DISTRICT'
                        ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                        : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">District Admin</span>
                  </button>

                  <button
                    type="button"
                    id="tab-btn-zone-admin"
                    onClick={() => handleAdminTypeChange('ZONE')}
                    className={`py-1.5 px-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer text-center text-[11px] ${
                      adminType === 'ZONE'
                        ? 'bg-white text-[#123B6D] font-bold shadow-xs'
                        : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">Zone Admin</span>
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
                  {/* ZONE ADMIN FLOW */}
                  {adminType === 'ZONE' && (
                    <div className="space-y-3 p-3 rounded-lg bg-amber-50/50 border border-amber-200">
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
                              {d.name} District
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#172B4D] mb-1 uppercase tracking-wider">
                          Step 2: Select Assigned Zone (Strictly Scoped)
                        </label>
                        <select
                          value={selectedZoneId}
                          onChange={(e) => handleZoneChange(e.target.value)}
                          className="w-full rounded-md border border-[#D9E2EC] bg-white px-2.5 py-2 text-xs text-[#172B4D] font-bold focus:border-[#1769D2] focus:outline-hidden"
                        >
                          {availableZones.map((z) => (
                            <option key={z.zoneId} value={z.zoneId}>
                              {z.zoneName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="text-[10px] text-amber-900 bg-amber-100/70 rounded p-2 border border-amber-200">
                        <strong className="text-amber-950">Strict Zone Isolation:</strong> Zone Admin is permanently locked to the selected zone. All complaints, maps, SLA, hotspots, and analytics outside this zone are strictly inaccessible.
                      </div>
                    </div>
                  )}

                  {/* DISTRICT ADMIN FLOW */}
                  {adminType === 'DISTRICT' && (
                    <div className="space-y-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-bold text-[#172B4D] mb-1 uppercase tracking-wider">
                          Step 1: Select Assigned District
                        </label>
                        <select
                          value={selectedDistrictId}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          className="w-full rounded-md border border-[#D9E2EC] bg-white px-2.5 py-2 text-xs text-[#172B4D] font-medium focus:border-[#1769D2] focus:outline-hidden"
                        >
                          {MAHARASHTRA_DISTRICTS.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} District
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#172B4D] mb-1 uppercase tracking-wider">
                          Step 2: Municipal Corporation
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

                      <div className="text-[10px] text-[#526581] bg-blue-50 rounded px-2 py-1 font-mono border border-blue-100">
                        District Scope: <strong className="text-[#1769D2]">{selectedDistrictObj?.name} District only</strong>. Cannot access complaints or data from other districts.
                      </div>
                    </div>
                  )}

                  {/* STATE ADMIN FLOW */}
                  {adminType === 'STATE' && (
                    <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                      <div className="text-[11px] font-bold text-[#123B6D] uppercase tracking-wider flex items-center justify-between">
                        <span>State Authority Level</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-100 text-[#1769D2] font-bold">
                          STATEWIDE SCOPE
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#172B4D]">
                        State: <strong className="text-[#1769D2]">Maharashtra</strong> (Urban Development Department)
                      </div>
                      <p className="text-[11px] text-[#526581]">
                        Maharashtra-wide visibility across all districts and municipal corporations.
                      </p>
                      <div className="text-[10px] font-mono text-[#526581] bg-white rounded px-2 py-1 border border-blue-100">
                        State Login ID: <strong className="text-[#1769D2]">state_admin</strong>
                      </div>
                    </div>
                  )}

                  {/* ID / Login Field */}
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] mb-1">
                      {adminType === 'STATE'
                        ? 'State Administration ID'
                        : adminType === 'DISTRICT'
                        ? 'District Administration ID'
                        : 'Zone Administration ID'}
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
                        className="w-full rounded-md border border-[#D9E2EC] bg-white pl-9 pr-3 py-2 text-xs text-[#172B4D] font-mono focus:border-[#1769D2] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-bold text-[#172B4D] mb-1">
                      Security Password / Passcode
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#718096] absolute left-3 top-3" />
                      <input
                        type="password"
                        placeholder="Enter password or press Sign In for authorized demo"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) clearError();
                        }}
                        className="w-full rounded-md border border-[#D9E2EC] bg-white pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full justify-center bg-[#1769D2] hover:bg-[#1253A4] text-white py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? 'Verifying RBAC Authorization...' : 'Sign In to Administrative Platform'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D9E2EC] bg-white py-3 px-4 text-center text-[11px] text-[#718096]">
        Maharashtra Urban Development Department • CivicResolve Municipal Command System • Platform Separation Enforced
      </footer>
    </div>
  );
};

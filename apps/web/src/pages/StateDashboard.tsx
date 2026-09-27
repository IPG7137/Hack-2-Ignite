import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  MapPin,
  TrendingUp,
  Activity,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
  BarChart3,
  ShieldAlert,
  Zap,
  Timer,
  AlertOctagon,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { Complaint } from '../types/complaint';
import {
  ALL_MUNICIPAL_CORPORATIONS,
  MAHARASHTRA_DISTRICTS,
  MunicipalCorporation,
} from '../data/maharashtraDistricts';
import { isComplaintInDistrict } from '../lib/districtFilter';
import { useOrganization } from '../context/OrganizationContext';
import { ActivePage } from '../components/layout/CommandSidebar';
import { SmartAlertEngine } from '../services/smartAlertEngine';

interface StateDashboardProps {
  complaints: Complaint[];
  onSelectComplaint?: (id: string) => void;
  onNavigatePage: (page: ActivePage) => void;
}

export const StateDashboard: React.FC<StateDashboardProps> = ({
  complaints = [],
  onSelectComplaint,
  onNavigatePage,
}) => {
  const { setOrganization } = useOrganization();
  const [selectedCorp, setSelectedCorp] = useState<MunicipalCorporation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState<string>('all');

  // Compute live statewide smart alerts from factual complaints data
  const statewideAlerts = useMemo(() => {
    return SmartAlertEngine.evaluateAlerts(complaints, null, null, Date.now());
  }, [complaints]);

  const alertStats = useMemo(() => {
    return SmartAlertEngine.calculateSummary(statewideAlerts);
  }, [statewideAlerts]);

  // Compute factual metrics from real available complaint data
  const totalReports = complaints.length;
  const activeReports = complaints.filter(
    (c) => c.status !== 'closed' && c.status !== 'verified'
  ).length;
  const criticalReports = complaints.filter((c) => c.priority === 'urgent').length;
  const resolvedReports = complaints.filter(
    (c) => c.status === 'closed' || c.status === 'verified'
  ).length;
  const slaRiskReports = complaints.filter((c) => c.sla?.isOverdue).length;

  const totalCorps = ALL_MUNICIPAL_CORPORATIONS.length;
  const activeCorps = ALL_MUNICIPAL_CORPORATIONS.filter(
    (c) => c.status === 'operational' || c.status === 'high_load'
  ).length;

  // Filtered corporations
  const filteredCorporations = useMemo(() => {
    return ALL_MUNICIPAL_CORPORATIONS.filter((corp) => {
      const matchesSearch =
        corp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        corp.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        corp.shortName.toLowerCase().includes(searchQuery.toLowerCase());

      const dist = MAHARASHTRA_DISTRICTS.find((d) => d.name === corp.district);
      const matchesDivision =
        filterDivision === 'all' || dist?.division === filterDivision;

      return matchesSearch && matchesDivision;
    });
  }, [searchQuery, filterDivision]);

  // Handle switching to a specific Municipal Corporation from State Overview
  // Uses stable districtId — NOT the district name string.
  const handleDrilldownToMunicipal = (corp: MunicipalCorporation) => {
    const distObj = MAHARASHTRA_DISTRICTS.find((d) => d.name === corp.district);
    setOrganization('MUNICIPAL_CORPORATION', distObj?.id || corp.district, corp.id);
    onNavigatePage('dashboard');
  };

  const handleDrilldownToMap = (corp: MunicipalCorporation) => {
    const distObj = MAHARASHTRA_DISTRICTS.find((d) => d.name === corp.district);
    setOrganization('MUNICIPAL_CORPORATION', distObj?.id || corp.district, corp.id);
    onNavigatePage('map');
  };

  const handleDrilldownToComplaints = (corp: MunicipalCorporation) => {
    const distObj = MAHARASHTRA_DISTRICTS.find((d) => d.name === corp.district);
    setOrganization('MUNICIPAL_CORPORATION', distObj?.id || corp.district, corp.id);
    onNavigatePage('complaints');
  };

  // Per-district complaint statistics — computed accurately from complaint data
  const districtStats = useMemo(() => {
    return MAHARASHTRA_DISTRICTS.map((district) => {
      const districtComplaints = complaints.filter((c) => isComplaintInDistrict(c, district));

      const total = districtComplaints.length;
      const active = districtComplaints.filter(
        (c) => c.status !== 'closed' && c.status !== 'verified'
      ).length;
      const critical = districtComplaints.filter((c) => c.priority === 'urgent').length;
      const resolved = districtComplaints.filter(
        (c) => c.status === 'closed' || c.status === 'verified'
      ).length;
      const slaRisk = districtComplaints.filter((c) => c.sla?.isOverdue).length;
      const resolutionPct = total > 0 ? Math.round((resolved / total) * 100) : 0;
      const hasLiveDbData = districtComplaints.some((c) => c.id.match(/^CR-\d+$/));

      return {
        district,
        total,
        active,
        critical,
        resolved,
        slaRisk,
        resolutionPct,
        hasData: total > 0,
        hasLiveDbData,
      };
    });
  }, [complaints]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ==================================================
          TOP SECTION: STATE OPERATIONS HEADER
          ================================================== */}
      <div className="p-4 sm:p-5 bg-white border border-[#D9E2EC] rounded-xl shadow-xs space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-md bg-[#123B6D]/10 text-[#123B6D]">
                <Landmark className="w-5 h-5 text-[#123B6D]" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#526581]">
                CIVICRESOLVE
              </span>
              <span className="text-slate-300">/</span>
              <h1 className="text-base sm:text-lg font-bold text-[#123B6D] tracking-tight">
                Maharashtra State Administration
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#1769D2] border border-blue-200 font-bold uppercase">
                Level 1 Oversight
              </span>
            </div>
            <p className="text-xs text-[#526581] mt-1">
              State Municipal Operations Overview • Inter-Corporation Grievance Redressal & SLA Monitoring
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="font-bold">Live ● Operational</span>
            </div>
            <div className="text-[11px] font-mono text-[#718096] hidden sm:block">
              State Telemetry IST {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          STATEWIDE KPI SUMMARY CARDS
          ================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Corporations */}
        <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
          <div className="flex items-center justify-between text-[#526581] text-xs">
            <span className="font-semibold">Corporations</span>
            <Building2 className="w-4 h-4 text-[#123B6D]" />
          </div>
          <div className="text-2xl font-bold text-[#123B6D] mt-1.5">{totalCorps}</div>
          <div className="text-[10px] text-[#718096] mt-0.5">{activeCorps} Active on Network</div>
        </Card>

        {/* Total Reports */}
        <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
          <div className="flex items-center justify-between text-[#526581] text-xs">
            <span className="font-semibold">Total Reports</span>
            <Activity className="w-4 h-4 text-[#1769D2]" />
          </div>
          <div className="text-2xl font-bold text-[#172B4D] mt-1.5">{totalReports}</div>
          <div className="text-[10px] text-[#718096] mt-0.5">Reported Across State</div>
        </Card>

        {/* Active Issues */}
        <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
          <div className="flex items-center justify-between text-[#526581] text-xs">
            <span className="font-semibold">Active Issues</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1.5">{activeReports}</div>
          <div className="text-[10px] text-[#718096] mt-0.5">In Triage & Dispatch</div>
        </Card>

        {/* Critical Issues */}
        <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
          <div className="flex items-center justify-between text-[#526581] text-xs">
            <span className="font-semibold">Critical Priority</span>
            <AlertTriangle className="w-4 h-4 text-[#D92D20]" />
          </div>
          <div className="text-2xl font-bold text-[#D92D20] mt-1.5">{criticalReports}</div>
          <div className="text-[10px] text-red-600 font-medium mt-0.5">Immediate Attention</div>
        </Card>

        {/* SLA Risk */}
        <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
          <div className="flex items-center justify-between text-[#526581] text-xs">
            <span className="font-semibold">SLA Breached</span>
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1.5">{slaRiskReports}</div>
          <div className="text-[10px] text-[#718096] mt-0.5">Escalated to Commissioner</div>
        </Card>

        {/* Resolved */}
        <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
          <div className="flex items-center justify-between text-[#526581] text-xs">
            <span className="font-semibold">Verified Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-[#16803C]" />
          </div>
          <div className="text-2xl font-bold text-[#16803C] mt-1.5">{resolvedReports}</div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Proof Verified</div>
        </Card>
      </div>

      {/* ==================================================
          STATEWIDE SMART ALERTS & SLA ESCALATION RADAR
          ================================================== */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Statewide Tactical Alert Radar
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold">
                {alertStats.totalActive} Active Alerts
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live automated monitoring across 36 districts: <strong>{alertStats.criticalCount}</strong> Critical, <strong>{alertStats.slaBreaches}</strong> SLA Breaches, <strong>{alertStats.geographicClusters}</strong> Spatial Clusters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigatePage('alerts')}
            className="h-8 text-xs bg-[#1769D2] hover:bg-[#123B6D] text-white font-bold gap-1.5 shadow-xs"
          >
            <span>Open State Alert Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ==================================================
          DISTRICT-WISE OPERATIONAL PROGRESS
          ================================================== */}
      <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8EEF5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1769D2]" />
            <h2 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider">
              District-Wise Operational Progress
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200">
              Live Data
            </span>
          </div>
          <span className="text-[10px] text-[#718096] font-mono">
            {MAHARASHTRA_DISTRICTS.length} Districts Monitored
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {districtStats.map(({ district, total, active, critical, resolved, slaRisk, resolutionPct, hasData, hasLiveDbData }) => (
            <div
              key={district.id}
              className="p-3 rounded-lg border border-[#E8EEF5] bg-[#F8FAFC] hover:bg-white hover:border-blue-200 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-bold text-[#123B6D]">{district.name} District</div>
                  <div className="text-[10px] text-[#718096] font-mono">{district.division} Division</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {hasData ? (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                        hasLiveDbData
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {hasLiveDbData ? 'LIVE DATA' : 'OPERATIONAL'}
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200">
                      NO DATA
                    </span>
                  )}
                </div>
              </div>

              {hasData ? (
                <>
                  <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
                    <div className="bg-white rounded p-1.5 border border-[#E8EEF5]">
                      <div className="text-sm font-bold text-[#172B4D]">{total}</div>
                      <div className="text-[9px] text-[#718096]">Total</div>
                    </div>
                    <div className="bg-white rounded p-1.5 border border-[#E8EEF5]">
                      <div className="text-sm font-bold text-amber-700">{active}</div>
                      <div className="text-[9px] text-[#718096]">Active</div>
                    </div>
                    <div className="bg-white rounded p-1.5 border border-[#E8EEF5]">
                      <div className="text-sm font-bold text-[#D92D20]">{critical}</div>
                      <div className="text-[9px] text-[#718096]">Critical</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-center mb-2">
                    <div className="bg-white rounded p-1.5 border border-[#E8EEF5]">
                      <div className="text-sm font-bold text-[#16803C]">{resolved}</div>
                      <div className="text-[9px] text-[#718096]">Resolved</div>
                    </div>
                    <div className="bg-white rounded p-1.5 border border-red-100">
                      <div className="text-sm font-bold text-red-700">{slaRisk}</div>
                      <div className="text-[9px] text-[#718096]">SLA Risk</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-[#526581] mb-1">
                      <span>Resolution Progress</span>
                      <span className="font-bold text-[#172B4D]">{resolutionPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          resolutionPct >= 70 ? 'bg-emerald-500' : resolutionPct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${resolutionPct}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const corp = district.corporations[0];
                      if (corp) handleDrilldownToMunicipal(corp);
                    }}
                    className="w-full mt-2 h-7 text-[11px] text-[#1769D2] border-blue-200 hover:bg-blue-50 gap-1"
                  >
                    <span>Open District Command</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <div className="py-3 text-center">
                  <div className="text-[11px] text-[#718096] italic">
                    No operational data available for {district.name} District.
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] mt-1">
                    Reports will appear here when district users submit complaints.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ==================================================
          MAHARASHTRA GEOGRAPHIC GIS OVERVIEW
          ================================================== */}
      <Card className="p-4 sm:p-5 bg-white border-[#D9E2EC] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8EEF5] gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#1769D2]" />
            <h2 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider">
              Maharashtra Municipal Geospatial Network
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200">
              Statewide Map
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigatePage('map')}
            className="h-7 text-xs text-[#1769D2] border-blue-200 hover:bg-blue-50 self-start sm:self-auto gap-1"
          >
            <span>Open Interactive Map</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>

        {/* Interactive Statewide Corporation Locator Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {ALL_MUNICIPAL_CORPORATIONS.map((corp) => (
            <div
              key={corp.id}
              onClick={() => setSelectedCorp(corp)}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                selectedCorp?.id === corp.id
                  ? 'bg-blue-50 border-[#1769D2] ring-2 ring-blue-200 shadow-xs'
                  : 'bg-[#F8FAFC] border-[#D9E2EC] hover:bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123B6D]">{corp.shortName}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    corp.status === 'operational'
                      ? 'bg-emerald-500'
                      : corp.status === 'high_load'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
              </div>
              <div className="text-[11px] text-[#526581] truncate mt-0.5">{corp.district} District</div>
              <div className="text-[10px] font-mono text-[#718096] mt-1">
                {corp.coordinates.lat.toFixed(2)}°N, {corp.coordinates.lng.toFixed(2)}°E
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ==================================================
          MUNICIPAL CORPORATIONS OVERVIEW TABLE
          ================================================== */}
      <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
        {/* Table Header & Filters */}
        <div className="p-4 border-b border-[#E8EEF5] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1769D2]" />
              <span>Municipal Corporations Directory & Operational Status</span>
            </h2>
            <p className="text-[11px] text-[#526581] mt-0.5">
              Select any Municipal Corporation to inspect jurisdictional operational metrics or switch context.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Division Filter */}
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="h-8 rounded-md border border-[#D9E2EC] bg-white text-[#172B4D] text-xs px-2 focus:border-[#1769D2] focus:outline-hidden"
            >
              <option value="all">All Administrative Divisions</option>
              <option value="Konkan">Konkan Division</option>
              <option value="Pune">Pune Division</option>
              <option value="Nashik">Nashik Division</option>
              <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
              <option value="Nagpur">Nagpur Division</option>
              <option value="Amravati">Amravati Division</option>
            </select>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#718096] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search corporation or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-[#D9E2EC] rounded-md text-[#172B4D] focus:bg-white focus:border-[#1769D2] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#D9E2EC] text-[10px] font-mono uppercase tracking-wider text-[#526581]">
                <th className="py-2.5 px-4 font-bold">Municipal Corporation</th>
                <th className="py-2.5 px-3 font-bold">District</th>
                <th className="py-2.5 px-3 font-bold">Division</th>
                <th className="py-2.5 px-3 font-bold text-center">Status</th>
                <th className="py-2.5 px-3 font-bold text-right">Population</th>
                <th className="py-2.5 px-3 font-bold text-right">Zones</th>
                <th className="py-2.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEF5]">
              {filteredCorporations.map((corp) => {
                const distObj = MAHARASHTRA_DISTRICTS.find((d) => d.name === corp.district);

                return (
                  <tr
                    key={corp.id}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCorp(corp)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#123B6D] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#1769D2] shrink-0" />
                        <span>{corp.name}</span>
                      </div>
                      <div className="text-[10px] text-[#718096] font-mono mt-0.5">
                        HQ: {corp.headquarters}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-medium text-[#172B4D]">{corp.district}</td>

                    <td className="py-3 px-3 text-[#526581]">{distObj?.division || 'Maharashtra'}</td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          corp.status === 'operational'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            corp.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {corp.status === 'operational' ? 'OPERATIONAL' : 'HIGH LOAD'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[#172B4D]">
                      {corp.population ? (corp.population / 100000).toFixed(1) + ' Lakh' : 'N/A'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[#172B4D]">
                      {corp.zoneCount || 'N/A'} Zones
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCorp(corp)}
                          className="h-7 px-2 text-[11px] text-[#526581] hover:text-[#172B4D]"
                        >
                          Details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDrilldownToMunicipal(corp)}
                          className="h-7 px-2 text-[11px] bg-[#1769D2] hover:bg-[#123B6D] text-white font-semibold gap-1 shadow-2xs"
                        >
                          <span>Open Command</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ==================================================
          MUNICIPAL CORPORATION DETAIL MODAL / DRAWER
          ================================================== */}
      {selectedCorp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-white border-[#D9E2EC] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">{selectedCorp.name}</h3>
                  <p className="text-[11px] text-blue-100 font-mono">
                    District: {selectedCorp.district} • {selectedCorp.shortName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCorp(null)}
                className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Overview Details */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">Headquarters</span>
                  <span className="font-semibold text-[#172B4D]">{selectedCorp.headquarters}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">System Status</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Operational & Synced
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">Commissioner Secretariat</span>
                  <span className="font-semibold text-[#172B4D]">{selectedCorp.commissionerTitle || 'Commissioner'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">Geographic Center</span>
                  <span className="font-mono text-[#172B4D]">
                    {selectedCorp.coordinates.lat.toFixed(4)}°N, {selectedCorp.coordinates.lng.toFixed(4)}°E
                  </span>
                </div>
              </div>

              {/* Action Buttons: Seamless Drill-Down */}
              <div className="pt-2 border-t border-[#E8EEF5] space-y-2">
                <div className="text-[11px] font-bold text-[#526581] uppercase tracking-wider">
                  Jurisdictional Operations Actions:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      handleDrilldownToMunicipal(selectedCorp);
                    }}
                    className="h-8 text-xs bg-[#1769D2] hover:bg-[#123B6D] text-white font-bold gap-1.5 shadow-xs"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>View Command</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleDrilldownToMap(selectedCorp);
                    }}
                    className="h-8 text-xs border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#1769D2]" />
                    <span>View on GIS</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleDrilldownToComplaints(selectedCorp);
                    }}
                    className="h-8 text-xs border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#16803C]" />
                    <span>Complaints</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StateDashboard;

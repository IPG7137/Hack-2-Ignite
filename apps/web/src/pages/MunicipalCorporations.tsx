import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  ArrowRight,
  ExternalLink,
  MapPin,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Layers,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ALL_MUNICIPAL_CORPORATIONS,
  MAHARASHTRA_DISTRICTS,
  MunicipalCorporation,
} from '../data/maharashtraDistricts';
import { useOrganization } from '../context/OrganizationContext';
import { ActivePage } from '../components/layout/CommandSidebar';

interface MunicipalCorporationsProps {
  onNavigatePage: (page: ActivePage) => void;
}

export const MunicipalCorporations: React.FC<MunicipalCorporationsProps> = ({
  onNavigatePage,
}) => {
  const { setOrganization } = useOrganization();
  const [selectedCorp, setSelectedCorp] = useState<MunicipalCorporation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState<string>('all');

  // Filtered corporations
  const filteredCorporations = useMemo(() => {
    return ALL_MUNICIPAL_CORPORATIONS.filter((corp) => {
      const matchesSearch =
        corp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        corp.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        corp.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        corp.headquarters.toLowerCase().includes(searchQuery.toLowerCase());

      const dist = MAHARASHTRA_DISTRICTS.find((d) => d.name === corp.district);
      const matchesDivision =
        filterDivision === 'all' || dist?.division === filterDivision;

      return matchesSearch && matchesDivision;
    });
  }, [searchQuery, filterDivision]);

  // Drilldown navigation handlers
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

  const operationalCount = ALL_MUNICIPAL_CORPORATIONS.filter(
    (c) => c.status === 'operational'
  ).length;
  const highLoadCount = ALL_MUNICIPAL_CORPORATIONS.length - operationalCount;
  const totalPopulation = ALL_MUNICIPAL_CORPORATIONS.reduce(
    (acc, curr) => acc + (curr.population || 0),
    0
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-2 border-b border-[#D9E2EC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1769D2]" />
            <span>Maharashtra Municipal Corporations Directory</span>
          </h2>
          <p className="text-xs text-[#526581]">
            Supervisory directory, division allocation, jurisdictional operations, and command routing across all 29 urban local bodies.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-[#123B6D] text-[11px] font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1769D2]" />
          <span>29 Urban Municipal Corporations</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
            Total Corporations
          </div>
          <div className="text-xl font-bold text-blue-900 mt-0.5">
            {ALL_MUNICIPAL_CORPORATIONS.length}
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-0.5">
            Across 6 Divisions
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Operational
          </div>
          <div className="text-xl font-bold text-emerald-900 mt-0.5">
            {operationalCount}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Normal telemetry sync
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            High Workload
          </div>
          <div className="text-xl font-bold text-amber-900 mt-0.5">
            {highLoadCount}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
            Capacity monitoring
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Covered Urban Population
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">
            {(totalPopulation / 10000000).toFixed(2)} Cr
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Citizens in jurisdiction
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-[#E8EEF5] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1769D2]" />
              <span>Corporation Roster &amp; Operational Status</span>
            </h3>
            <p className="text-[11px] text-[#526581] mt-0.5">
              Click &quot;Open Command&quot; to switch the console into that municipal corporation&apos;s administrative view.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Division Filter */}
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="h-8 rounded-md border border-[#D9E2EC] bg-white text-[#172B4D] text-xs px-2 focus:border-[#1769D2] focus:outline-hidden"
            >
              <option value="all">All Administrative Divisions (6)</option>
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
              {filteredCorporations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No Municipal Corporations found matching &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                filteredCorporations.map((corp) => {
                  const distObj = MAHARASHTRA_DISTRICTS.find((d) => d.name === corp.district);

                  return (
                    <tr
                      key={corp.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedCorp(corp)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#123B6D] flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-white p-0.5 border border-slate-200 shrink-0 shadow-2xs flex items-center justify-center overflow-hidden">
                            <img
                              src={corp.logoUrl}
                              alt={corp.shortName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/assets/images/corporations/state.png';
                              }}
                            />
                          </div>
                          <div>
                            <div className="leading-snug">{corp.name}</div>
                            <div className="text-[10px] text-[#718096] font-mono">
                              HQ: {corp.headquarters}
                            </div>
                          </div>
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
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Detail View */}
      {selectedCorp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-white border-[#D9E2EC] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white p-1 border border-white/20 shrink-0 shadow-sm flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedCorp.logoUrl}
                    alt={selectedCorp.shortName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/assets/images/corporations/state.png';
                    }}
                  />
                </div>
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
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">
                    Headquarters
                  </span>
                  <span className="font-semibold text-[#172B4D]">{selectedCorp.headquarters}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">
                    System Status
                  </span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Operational &amp; Synced
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">
                    Commissioner Secretariat
                  </span>
                  <span className="font-semibold text-[#172B4D]">
                    {selectedCorp.commissionerTitle || 'Commissioner'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718096] block">
                    Geographic Center
                  </span>
                  <span className="font-mono text-[#172B4D]">
                    {selectedCorp.coordinates.lat.toFixed(4)}°N, {selectedCorp.coordinates.lng.toFixed(4)}°E
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#718096] block">
                      Official Portal
                    </span>
                    <span className="text-[11px] text-[#526581] font-mono">
                      {selectedCorp.emblemSource || 'Official Government Portal'}
                    </span>
                  </div>
                  <a
                    href={selectedCorp.officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1769D2]/10 text-[#1769D2] hover:bg-[#1769D2]/20 font-bold text-[11px] transition-colors"
                  >
                    <span>Visit Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
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

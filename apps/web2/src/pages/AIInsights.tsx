import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Flame,
  Layers,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Info,
  ChevronRight,
  CheckCircle,
  FileCheck2,
  TrendingUp,
  ThumbsDown,
  Camera,
  Activity,
  Compass,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Complaint } from '../types/complaint';
import {
  AIInsightsService,
  AIInsightsSynthesis,
  CriticalDispatchInsight,
  EmergingAnomalyInsight,
  IncidentGroupingInsight,
  ResolutionAuditInsight,
} from '../services/aiInsightsService';

interface AIInsightsProps {
  complaints: Complaint[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSelectComplaint?: (id: string) => void;
  onNavigatePage?: (page: any) => void;
}

type InsightSection = 'all' | 'dispatch' | 'anomalies' | 'grouping' | 'audits';

export const AIInsights: React.FC<AIInsightsProps> = ({
  complaints = [],
  loading = false,
  error = null,
  onRefresh,
  onSelectComplaint,
  onNavigatePage,
}) => {
  const [activeTab, setActiveTab] = useState<InsightSection>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Synthesize operational insights deterministically from live complaints (Phases 3A - 3E)
  const synthesis: AIInsightsSynthesis = useMemo(() => {
    return AIInsightsService.synthesizeOperationalInsights(complaints);
  }, [complaints]);

  const { executiveBrief, criticalDispatch, emergingAnomalies, incidentGrouping, resolutionAudits } = synthesis;

  // Filtered lists based on search query
  const filteredDispatch = useMemo(() => {
    if (!searchQuery.trim()) return criticalDispatch;
    const q = searchQuery.toLowerCase();
    return criticalDispatch.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.complaintId.toLowerCase().includes(q) ||
        c.categoryLabel.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [criticalDispatch, searchQuery]);

  const filteredAnomalies = useMemo(() => {
    if (!searchQuery.trim()) return emergingAnomalies;
    const q = searchQuery.toLowerCase();
    return emergingAnomalies.filter(
      (a) =>
        a.categoryLabel.toLowerCase().includes(q) ||
        a.complaintIds.some((id) => id.toLowerCase().includes(q)) ||
        a.explainableReasons.some((r) => r.toLowerCase().includes(q))
    );
  }, [emergingAnomalies, searchQuery]);

  const filteredIncidents = useMemo(() => {
    if (!searchQuery.trim()) return incidentGrouping;
    const q = searchQuery.toLowerCase();
    return incidentGrouping.filter(
      (inc) =>
        inc.incidentLabel.toLowerCase().includes(q) ||
        inc.memberComplaintIds.some((id) => id.toLowerCase().includes(q)) ||
        inc.primaryCategoryLabel.toLowerCase().includes(q)
    );
  }, [incidentGrouping, searchQuery]);

  const filteredAudits = useMemo(() => {
    if (!searchQuery.trim()) return resolutionAudits;
    const q = searchQuery.toLowerCase();
    return resolutionAudits.filter(
      (aud) =>
        aud.title.toLowerCase().includes(q) ||
        aud.complaintId.toLowerCase().includes(q) ||
        aud.categoryLabel.toLowerCase().includes(q) ||
        (aud.citizenFeedbackText && aud.citizenFeedbackText.toLowerCase().includes(q))
    );
  }, [resolutionAudits, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-[#1769D2]/10 text-[#1769D2]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">
              Municipal AI Decision Support & Insights
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#1769D2] border border-blue-200">
              Grounded 3A–3E Intelligence
            </span>
          </div>
          <p className="text-xs text-[#526581] mt-1">
            Deterministic cross-signal synthesis (Priority, Spatio-Temporal Hotspots, Incident Clusters, Resolution Verification)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 text-xs bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </Button>
          )}
          {onNavigatePage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigatePage('copilot')}
              className="h-8 text-xs bg-[#1769D2] hover:bg-[#1457B0] text-white"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              <span>Launch Officer Copilot</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grounded Executive Briefing Box */}
      <Card borderAccent="info" className="p-5 bg-gradient-to-br from-white to-blue-50/40 shadow-sm border border-blue-100 space-y-4">
        <div className="flex items-center justify-between border-b border-blue-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1769D2]">
            <Activity className="w-4 h-4 text-[#1769D2]" />
            <span>Executive Operational Telemetry Brief</span>
          </div>
          <div className="text-[11px] font-mono text-[#526581]">
            Evaluated live: <span className="font-bold text-[#172B4D]">{complaints.length} Total Reports</span> · {new Date().toLocaleTimeString()}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#172B4D] bg-white/80 p-3 rounded border border-blue-100">
          {executiveBrief.summaryParagraph}
        </p>

        {/* 4 Quick Stat Signals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div
            onClick={() => setActiveTab('dispatch')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'dispatch' ? 'bg-red-50/80 border-red-300 ring-2 ring-red-200' : 'bg-white border-[#E2E8F0] hover:border-red-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#526581] font-medium">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D92D20]" />
                Critical Dispatch
              </span>
              <span className="font-mono text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                Phase 3B
              </span>
            </div>
            <div className="text-xl font-bold text-[#172B4D] mt-1.5">
              {executiveBrief.criticalDispatchCount}
            </div>
            <div className="text-[10px] text-[#718096] mt-0.5">Priority Score ≥ 60 or SLA breached</div>
          </div>

          <div
            onClick={() => setActiveTab('anomalies')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'anomalies' ? 'bg-orange-50/80 border-orange-300 ring-2 ring-orange-200' : 'bg-white border-[#E2E8F0] hover:border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#526581] font-medium">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#EA580C]" />
                Hotspot Surges
              </span>
              <span className="font-mono text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                Phase 3C
              </span>
            </div>
            <div className="text-xl font-bold text-[#172B4D] mt-1.5">
              {executiveBrief.activeHotspotsCount}
            </div>
            <div className="text-[10px] text-[#718096] mt-0.5">500m localized cluster anomalies</div>
          </div>

          <div
            onClick={() => setActiveTab('grouping')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'grouping' ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-[#E2E8F0] hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#526581] font-medium">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#D99A00]" />
                Common Incidents
              </span>
              <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                Phase 3D
              </span>
            </div>
            <div className="text-xl font-bold text-[#172B4D] mt-1.5">
              {executiveBrief.potentialIncidentsCount}
            </div>
            <div className="text-[10px] text-[#718096] mt-0.5">Grouped infrastructure work orders</div>
          </div>

          <div
            onClick={() => setActiveTab('audits')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'audits' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-200' : 'bg-white border-[#E2E8F0] hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#526581] font-medium">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#16803C]" />
                Resolution Audits
              </span>
              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                Phase 3E
              </span>
            </div>
            <div className="text-xl font-bold text-[#172B4D] mt-1.5">
              {executiveBrief.resolutionAuditCount}
            </div>
            <div className="text-[10px] text-[#718096] mt-0.5">Cases flagged for officer audit</div>
          </div>
        </div>
      </Card>

      {/* Search & Section Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#D9E2EC] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'all' ? 'bg-[#172B4D] text-white' : 'bg-slate-100 text-[#526581] hover:bg-slate-200'
            }`}
          >
            All Grounded Insights
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'dispatch' ? 'bg-[#D92D20] text-white' : 'bg-slate-100 text-[#526581] hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Critical Dispatch ({criticalDispatch.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'anomalies' ? 'bg-[#EA580C] text-white' : 'bg-slate-100 text-[#526581] hover:bg-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Emerging Anomalies ({emergingAnomalies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('grouping')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'grouping' ? 'bg-[#D99A00] text-white' : 'bg-slate-100 text-[#526581] hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Incident Groups ({incidentGrouping.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'audits' ? 'bg-[#16803C] text-white' : 'bg-slate-100 text-[#526581] hover:bg-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Resolution Audits ({resolutionAudits.length})</span>
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" />
          <input
            type="text"
            placeholder="Search insights or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-[#CBD5E1] rounded text-xs text-[#172B4D] focus:outline-none focus:bg-white focus:border-[#1769D2]"
          />
        </div>
      </div>

      {/* Main Grounded Insights List */}
      <div className="space-y-8">
        {/* ========================================================================= */}
        {/* SECTION 1: CRITICAL DISPATCH BRIEFING (Phase 3B Priority Engine)          */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'dispatch') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D92D20] live-pulse-dot" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
                  1. Critical Dispatch Briefing
                </h2>
                <span className="text-[11px] text-[#526581] font-normal">
                  (Phase 3B Multi-Signal Priority Engine)
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#D92D20]">
                {filteredDispatch.length} Urgent / High Risk Action{filteredDispatch.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredDispatch.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#526581] bg-slate-50 border-dashed border-[#CBD5E1]">
                <ShieldAlert className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-[#172B4D]">No Critical Dispatch Escalations Active</p>
                <p className="text-[11px] text-[#718096] mt-0.5">
                  All current municipal grievances are within standard operating thresholds.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDispatch.map((item) => (
                  <Card
                    key={item.complaintId}
                    borderAccent={item.priorityScore >= 80 ? 'urgent' : 'warning'}
                    className="p-4 space-y-3 bg-white shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${item.badgeBg} ${item.badgeBorder} ${item.badgeText}`}
                            >
                              Priority {item.scoreDisplay}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[#526581]">
                              #{item.complaintId}
                            </span>
                            {item.isOverdue && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200">
                                SLA Breached
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-[#172B4D] line-clamp-1">
                            {item.title}
                          </h3>
                        </div>

                        <span className="text-[10px] font-semibold text-[#526581] bg-slate-100 px-2 py-0.5 rounded shrink-0">
                          {item.categoryLabel}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#526581] flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#718096] shrink-0" />
                        <span className="truncate">{item.address || 'Location Coordinates Registered'}</span>
                        {item.ward && <span className="font-semibold text-[#172B4D]">({item.ward})</span>}
                      </div>

                      {/* Priority Decision Drivers */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.topDrivers.map((driver, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-red-50/80 border border-red-200 text-red-700 px-2 py-0.5 rounded"
                          >
                            • {driver}
                          </span>
                        ))}
                      </div>

                      {/* Evidence Rationale & Grounded Directive */}
                      <div className="p-2.5 rounded bg-slate-50 border border-[#E2E8F0] text-[11px] space-y-1">
                        <div className="font-bold text-[#172B4D] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D92D20]" />
                          <span>Officer Directive:</span>
                        </div>
                        <p className="text-[#526581] leading-relaxed">
                          {item.recommendedAction}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E8EEF5] flex items-center justify-between">
                      <span className="text-[10px] text-[#718096]">
                        {item.hoursRemaining <= 0
                          ? 'Statutory deadline overdue'
                          : `${item.hoursRemaining}h remaining in SLA`}
                      </span>

                      {onSelectComplaint && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectComplaint(item.complaintId)}
                          className="h-7 text-xs bg-white border-blue-200 text-[#1769D2] hover:bg-blue-50"
                        >
                          <span>Inspect Dossier</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: EMERGING ANOMALY ALERTS (Phase 3C Hotspots Engine)             */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'anomalies') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#EA580C]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
                  2. Emerging Anomaly & Hotspot Alerts
                </h2>
                <span className="text-[11px] text-[#526581] font-normal">
                  (Phase 3C 500m Spatio-Temporal Engine)
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#EA580C]">
                {filteredAnomalies.length} Active Hotspot Zone{filteredAnomalies.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredAnomalies.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#526581] bg-slate-50 border-dashed border-[#CBD5E1]">
                <Activity className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-[#172B4D]">No Spatio-Temporal Anomalies Detected</p>
                <p className="text-[11px] text-[#718096] mt-0.5">
                  Complaint volume across all 500m municipal zones is currently within normal historical limits.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAnomalies.map((anom) => (
                  <Card
                    key={anom.hotspotId}
                    borderAccent={anom.emergingScore >= 60 ? 'urgent' : 'warning'}
                    className="p-4 space-y-3 bg-white shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${anom.badgeBg} ${anom.badgeBorder} ${anom.badgeText}`}
                            >
                              Hotspot Score {anom.scoreDisplay}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                              {anom.levelLabel}
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-[#172B4D] mt-1">
                            {anom.categoryLabel} Activity Surge (500m Zone)
                          </h3>
                        </div>

                        <span className="text-[11px] font-mono font-bold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                          {anom.increaseRatio.toFixed(1)}× Spike
                        </span>
                      </div>

                      {/* Evidence Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-slate-50 border border-[#E2E8F0] text-center">
                        <div>
                          <div className="text-[10px] text-[#718096]">Recent 24h</div>
                          <div className="text-xs font-bold text-[#172B4D]">{anom.currentWindowCount} Reports</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#718096]">Total in Zone</div>
                          <div className="text-xs font-bold text-[#172B4D]">{anom.complaintCount} Reports</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#718096]">Center GPS</div>
                          <div className="text-xs font-mono font-bold text-[#172B4D]">
                            {anom.centerLatitude.toFixed(3)}, {anom.centerLongitude.toFixed(3)}
                          </div>
                        </div>
                      </div>

                      {/* Member Complaint Traceability */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#526581]">
                          Underlying Complaint Records ({anom.complaintIds.length}):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {anom.complaintIds.slice(0, 5).map((cid) => (
                            <button
                              key={cid}
                              onClick={() => onSelectComplaint?.(cid)}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#1769D2] hover:bg-blue-100 font-medium"
                            >
                              #{cid}
                            </button>
                          ))}
                          {anom.complaintIds.length > 5 && (
                            <span className="text-[10px] text-[#718096] self-center">
                              +{anom.complaintIds.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grounded Directive */}
                      <div className="p-2.5 rounded bg-orange-50/50 border border-orange-200 text-[11px] space-y-1">
                        <div className="font-bold text-[#B45309] flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Remediation Recommendation:</span>
                        </div>
                        <p className="text-[#172B4D] leading-relaxed">
                          {anom.recommendedAction}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E8EEF5] flex items-center justify-between">
                      <span className="text-[10px] text-[#718096]">
                        {anom.explainableReasons[0] || 'Spatio-temporal cluster evaluated'}
                      </span>

                      {onNavigatePage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigatePage('map')}
                          className="h-7 text-xs bg-white border-orange-200 text-[#EA580C] hover:bg-orange-50"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          <span>View on GIS Map</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: INCIDENT GROUPING RECOMMENDATIONS (Phase 3D Incident Grouping) */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'grouping') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D99A00]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
                  3. Potential Common Incident Groupings
                </h2>
                <span className="text-[11px] text-[#526581] font-normal">
                  (Phase 3D Multi-Report Work Order Consolidation)
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#D99A00]">
                {filteredIncidents.length} Incident Group{filteredIncidents.length !== 1 ? 's' : ''} Identified
              </span>
            </div>

            {filteredIncidents.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#526581] bg-slate-50 border-dashed border-[#CBD5E1]">
                <Layers className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-[#172B4D]">No Multi-Report Incidents Formed</p>
                <p className="text-[11px] text-[#718096] mt-0.5">
                  Current reports do not share overlapping spatial, temporal, and semantic characteristics requiring unified work order grouping.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredIncidents.map((inc) => (
                  <Card
                    key={inc.incidentId}
                    borderAccent="warning"
                    className="p-4 space-y-3 bg-white shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${inc.badgeBg} ${inc.badgeBorder} ${inc.badgeText}`}
                            >
                              Confidence {inc.confidenceDisplay}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              {inc.complaintCount} Reports Linked
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-[#172B4D] mt-1">
                            {inc.incidentLabel}
                          </h3>
                        </div>

                        <span className="text-[10px] font-semibold text-[#526581] bg-slate-100 px-2 py-0.5 rounded">
                          {inc.primaryCategoryLabel}
                        </span>
                      </div>

                      {/* Cluster Metrics */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-slate-50 border border-[#E2E8F0] text-center">
                        <div>
                          <div className="text-[10px] text-[#718096]">Spatial Radius</div>
                          <div className="text-xs font-bold text-[#172B4D]">~{Math.round(inc.affectedRadiusMeters)} meters</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#718096]">Time Span</div>
                          <div className="text-xs font-bold text-[#172B4D]">
                            {inc.timeSpanHours < 24
                              ? `${Math.round(inc.timeSpanHours)} hours`
                              : `${Math.round(inc.timeSpanHours / 24)} days`}
                          </div>
                        </div>
                      </div>

                      {/* Member Complaints */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#526581]">
                          Member Citizen Grievances ({inc.memberComplaintIds.length}):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {inc.memberComplaintIds.map((cid) => (
                            <button
                              key={cid}
                              onClick={() => onSelectComplaint?.(cid)}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#1769D2] hover:bg-blue-100 font-medium"
                            >
                              #{cid}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Grounded Directive */}
                      <div className="p-2.5 rounded bg-amber-50/50 border border-amber-200 text-[11px] space-y-1">
                        <div className="font-bold text-[#92400E] flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Dispatch Optimization Directive:</span>
                        </div>
                        <p className="text-[#172B4D] leading-relaxed">
                          {inc.recommendedAction}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E8EEF5] flex items-center justify-between">
                      <span className="text-[10px] text-[#718096]">
                        {inc.explainableReasons[0] || 'Multi-report evidence verified'}
                      </span>

                      {onSelectComplaint && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectComplaint(inc.memberComplaintIds[0])}
                          className="h-7 text-xs bg-white border-amber-200 text-[#D99A00] hover:bg-amber-50"
                        >
                          <span>Inspect Primary #{inc.memberComplaintIds[0]}</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: RESOLUTION AUDIT FLAGS (Phase 3E Resolution Verification)      */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'audits') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#16803C]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
                  4. Resolution Verification & Audit Flags
                </h2>
                <span className="text-[11px] text-[#526581] font-normal">
                  (Phase 3E Photographic & Citizen Feedback Verification)
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#16803C]">
                {filteredAudits.length} Audited Case{filteredAudits.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredAudits.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#526581] bg-slate-50 border-dashed border-[#CBD5E1]">
                <CheckCircle2 className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-[#172B4D]">No Pending Resolution Audits</p>
                <p className="text-[11px] text-[#718096] mt-0.5">
                  Completed complaints have either been signed off or have not yet submitted resolution proof.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAudits.map((aud) => (
                  <Card
                    key={aud.complaintId}
                    borderAccent={aud.needsHumanVerification ? 'urgent' : 'resolved'}
                    className="p-4 space-y-3 bg-white shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${aud.badgeBg} ${aud.badgeBorder} ${aud.badgeText}`}
                            >
                              Audit Score {aud.scoreDisplay}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[#526581]">
                              #{aud.complaintId}
                            </span>
                            {aud.needsHumanVerification && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200">
                                Review Required
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-[#172B4D] line-clamp-1">
                            {aud.title}
                          </h3>
                        </div>

                        <span className="text-[10px] font-semibold text-[#526581] bg-slate-100 px-2 py-0.5 rounded">
                          {aud.categoryLabel}
                        </span>
                      </div>

                      {/* Evidence & Citizen Rating Breakdown */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-slate-50 border border-[#E2E8F0] text-xs">
                        <div className="flex items-center gap-1.5 text-[#526581]">
                          <Camera className="w-3.5 h-3.5 text-[#718096]" />
                          <span>
                            Proof: <strong className="text-[#172B4D]">{aud.hasAfterEvidence ? 'Present' : 'Missing After Proof'}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#526581]">
                          {aud.feedbackSentiment === 'negative' ? (
                            <ThumbsDown className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>
                            Citizen:{' '}
                            <strong className="text-[#172B4D]">
                              {aud.citizenRating ? `${aud.citizenRating}/5 Stars` : 'No Feedback Yet'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Citizen Feedback text if available */}
                      {aud.citizenFeedbackText && (
                        <div className="p-2 rounded bg-amber-50/60 border border-amber-200 text-[11px] text-[#92400E]">
                          "{aud.citizenFeedbackText}"
                        </div>
                      )}

                      {/* Grounded Verification Directive */}
                      <div className="p-2.5 rounded bg-slate-50 border border-[#E2E8F0] text-[11px] space-y-1">
                        <div className="font-bold text-[#172B4D] flex items-center gap-1">
                          <FileCheck2 className="w-3.5 h-3.5 text-[#16803C]" />
                          <span>Officer Audit Action:</span>
                        </div>
                        <p className="text-[#526581] leading-relaxed">
                          {aud.recommendedAction}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E8EEF5] flex items-center justify-between">
                      <span className="text-[10px] text-[#718096]">
                        {aud.improvementAssessment}
                      </span>

                      {onSelectComplaint && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectComplaint(aud.complaintId)}
                          className="h-7 text-xs bg-white border-emerald-200 text-[#16803C] hover:bg-emerald-50"
                        >
                          <span>Review Case</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;

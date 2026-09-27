import React, { useState, useMemo } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../hooks/useAuth';
import { Complaint } from '../types/complaint';
import {
  SmartAlert,
  AlertSeverity,
  AlertType,
  AlertStatus,
  AlertFilterParams,
} from '../types/alert';
import { SLARule, ComplaintSLAEvaluation } from '../types/sla';
import { SmartAlertEngine } from '../services/smartAlertEngine';
import { SLAEngine } from '../services/slaEngine';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Eye,
  Filter,
  Search,
  Sliders,
  Timer,
  ChevronRight,
  MapPin,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  Check,
  Zap,
} from 'lucide-react';

interface AlertCenterProps {
  complaints: Complaint[];
  onSelectComplaint: (id: string) => void;
  onNavigatePage?: (page: string) => void;
  onRefresh?: () => Promise<void>;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  complaints,
  onSelectComplaint,
  onNavigatePage,
  onRefresh,
}) => {
  const { user } = useAuth();
  const {
    organizationType,
    stateName,
    division,
    district,
    districtId,
    municipalCorporationId,
    municipalCorporationName,
  } = useOrganization();

  const isStateAdmin = organizationType === 'STATE' || user?.role === 'state_admin';
  const isMunicipalAdmin = isStateAdmin || user?.role === 'municipal_admin' || user?.role === 'super_admin';

  // Filters State
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [selectedType, setSelectedType] = useState<AlertType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | '24h' | '7d' | '30d'>('all');

  // Selected Alert for Detail Panel / Modal
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);
  const [isAckModalOpen, setIsAckModalOpen] = useState<boolean>(false);
  const [ackNotes, setAckNotes] = useState<string>('');
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState<boolean>(false);
  const [escalateReason, setEscalateReason] = useState<string>('');
  const [escalateTargetTier, setEscalateTargetTier] = useState<1 | 2 | 3 | 4>(3);
  const [isSLARulesModalOpen, setIsSLARulesModalOpen] = useState<boolean>(false);

  // 1. Evaluate Live Alerts using deterministic SmartAlertEngine
  const rawAlerts = useMemo(() => {
    return SmartAlertEngine.evaluateAlerts(
      complaints,
      districtId,
      municipalCorporationId,
      Date.now()
    );
  }, [complaints, districtId, municipalCorporationId]);

  // 2. Filter Alerts
  const filteredAlerts = useMemo(() => {
    return rawAlerts.filter((a) => {
      if (selectedSeverity !== 'all' && a.severity !== selectedSeverity) return false;
      if (selectedType !== 'all' && a.type !== selectedType) return false;
      if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;

      // Time Range Filter
      if (timeRange !== 'all') {
        const now = Date.now();
        const createdMs = new Date(a.createdAt).getTime();
        let cutoffMs = 0;
        if (timeRange === 'today') {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          cutoffMs = d.getTime();
        } else if (timeRange === '24h') cutoffMs = now - 24 * 3600 * 1000;
        else if (timeRange === '7d') cutoffMs = now - 7 * 24 * 3600 * 1000;
        else if (timeRange === '30d') cutoffMs = now - 30 * 24 * 3600 * 1000;

        if (createdMs < cutoffMs) return false;
      }

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(term);
        const matchesDesc = a.description.toLowerCase().includes(term);
        const matchesId = a.complaintId?.toLowerCase().includes(term);
        const matchesLoc = a.location?.address.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDesc && !matchesId && !matchesLoc) return false;
      }

      return true;
    });
  }, [rawAlerts, selectedSeverity, selectedType, selectedStatus, timeRange, searchTerm]);

  // 3. Compute Summary Statistics
  const stats = useMemo(() => {
    return SmartAlertEngine.calculateSummary(rawAlerts);
  }, [rawAlerts]);

  // Handlers
  const handleAcknowledge = (alert: SmartAlert) => {
    SmartAlertEngine.acknowledgeAlert({
      alertId: alert.id,
      acknowledgedBy: user?.fullName || 'Duty Officer',
      role: user?.role || 'officer',
      notes: ackNotes,
    });
    setIsAckModalOpen(false);
    setAckNotes('');
    if (selectedAlert?.id === alert.id) {
      setSelectedAlert({
        ...selectedAlert,
        status: 'ACKNOWLEDGED',
        acknowledgedBy: `${user?.fullName || 'Duty Officer'} (${user?.role || 'officer'})`,
        acknowledgedAt: new Date().toISOString(),
      });
    }
  };

  const handleEscalate = (alert: SmartAlert) => {
    SmartAlertEngine.escalateAlert({
      alertId: alert.id,
      escalatedBy: user?.fullName || 'Municipal Administrator',
      targetLevel: escalateTargetTier,
      reason: escalateReason || 'Escalated past standard SLA threshold.',
    });
    setIsEscalateModalOpen(false);
    setEscalateReason('');
    if (selectedAlert?.id === alert.id) {
      setSelectedAlert({
        ...selectedAlert,
        status: 'ACKNOWLEDGED',
        escalationLevel: escalateTargetTier,
        escalationReason: escalateReason,
      });
    }
  };

  const getSeverityBadgeClass = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200 font-extrabold animate-pulse';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200 font-bold';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      case 'LOW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'INFO':
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'CRITICAL_COMPLAINT':
        return <AlertOctagon className="w-4 h-4 text-red-600" />;
      case 'SLA_OVERDUE':
        return <Timer className="w-4 h-4 text-orange-600" />;
      case 'SLA_DUE_SOON':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'GEOGRAPHIC_CLUSTER':
        return <Flame className="w-4 h-4 text-orange-600" />;
      case 'COMPLAINT_SPIKE':
        return <Zap className="w-4 h-4 text-purple-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Administrative Context */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-mono text-slate-500 font-semibold">Maharashtra</span>
            <span className="text-slate-300">/</span>
            {division && (
              <>
                <span className="text-slate-500">{division} Div</span>
                <span className="text-slate-300">/</span>
              </>
            )}
            {district && (
              <>
                <span className="text-[#1769D2] font-bold">{district}</span>
                <span className="text-slate-300">/</span>
              </>
            )}
            <span className="text-slate-800 font-bold">
              {organizationType === 'STATE'
                ? 'Statewide Command Alerts'
                : municipalCorporationName || 'Municipal Command'}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              LIVE SLA RADAR
            </span>
          </div>
          <h1 className="text-base font-extrabold text-[#123B6D] mt-1 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#D92D20]" />
            <span>Smart Alerts & Statutory SLA Command Center</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isMunicipalAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSLARulesModalOpen(true)}
              className="h-8 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>SLA Policy Benchmarks</span>
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 px-2.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              title="Refresh Live Alerts"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            </Button>
          )}
        </div>
      </div>

      {/* Top 5 Key Stat Cards (Section 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Critical Alerts */}
        <Card
          className={`p-3 border-slate-200 cursor-pointer transition-all ${
            selectedSeverity === 'CRITICAL' ? 'ring-2 ring-red-500 bg-red-50/50' : 'bg-white hover:bg-red-50/20'
          }`}
          onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? 'all' : 'CRITICAL')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-red-700 font-bold">Critical</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-red-800 mt-1">
            {stats.criticalCount}
          </div>
          <div className="text-[10px] text-red-600 mt-0.5">Emergency Triage</div>
        </Card>

        {/* Card 2: SLA Breaches (Overdue) */}
        <Card
          className={`p-3 border-slate-200 cursor-pointer transition-all ${
            selectedType === 'SLA_OVERDUE' ? 'ring-2 ring-orange-500 bg-orange-50/50' : 'bg-white hover:bg-orange-50/20'
          }`}
          onClick={() => setSelectedType(selectedType === 'SLA_OVERDUE' ? 'all' : 'SLA_OVERDUE')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-orange-700 font-bold">SLA Breaches</span>
            <Timer className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-orange-800 mt-1">
            {stats.slaBreaches}
          </div>
          <div className="text-[10px] text-orange-600 mt-0.5">Tier 3 Escalations</div>
        </Card>

        {/* Card 3: SLA Due Soon */}
        <Card
          className={`p-3 border-slate-200 cursor-pointer transition-all ${
            selectedType === 'SLA_DUE_SOON' ? 'ring-2 ring-amber-500 bg-amber-50/50' : 'bg-white hover:bg-amber-50/20'
          }`}
          onClick={() => setSelectedType(selectedType === 'SLA_DUE_SOON' ? 'all' : 'SLA_DUE_SOON')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-700 font-bold">Due Soon</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-amber-800 mt-1">
            {stats.slaDueSoon}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">Under 6h Deadline</div>
        </Card>

        {/* Card 4: Unacknowledged Alerts */}
        <Card
          className={`p-3 border-slate-200 cursor-pointer transition-all ${
            selectedStatus === 'ACTIVE' ? 'ring-2 ring-blue-500 bg-blue-50/50' : 'bg-white hover:bg-blue-50/20'
          }`}
          onClick={() => setSelectedStatus(selectedStatus === 'ACTIVE' ? 'all' : 'ACTIVE')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#1769D2] font-bold">Pending Triage</span>
            <ShieldAlert className="w-4 h-4 text-[#1769D2]" />
          </div>
          <div className="text-xl font-extrabold font-mono text-[#123B6D] mt-1">
            {stats.unacknowledgedCount}
          </div>
          <div className="text-[10px] text-[#1769D2] mt-0.5">Unacknowledged</div>
        </Card>

        {/* Card 5: Spikes & Clusters */}
        <Card
          className={`p-3 border-slate-200 cursor-pointer transition-all ${
            selectedType === 'GEOGRAPHIC_CLUSTER' ? 'ring-2 ring-purple-500 bg-purple-50/50' : 'bg-white hover:bg-purple-50/20'
          }`}
          onClick={() => setSelectedType(selectedType === 'GEOGRAPHIC_CLUSTER' ? 'all' : 'GEOGRAPHIC_CLUSTER')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-purple-700 font-bold">Clusters & Spikes</span>
            <Flame className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-purple-800 mt-1">
            {stats.geographicClusters + stats.complaintSpikes}
          </div>
          <div className="text-[10px] text-purple-600 mt-0.5">Spatial Anomalies</div>
        </Card>
      </div>

      {/* Filter & Tactical Search Controls Bar */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search alerts by complaint ID, title, ward, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
            />
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono">
            {(['all', 'today', '24h', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeRange(tf)}
                className={`px-2 py-1 rounded text-[10px] transition-colors ${
                  timeRange === tf
                    ? 'bg-[#1769D2] text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf === 'all'
                  ? 'All Time'
                  : tf === 'today'
                  ? 'Today'
                  : tf === '24h'
                  ? '24h'
                  : tf === '7d'
                  ? '7d'
                  : '30d'}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns for Severity, Type, Status */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-slate-100">
          <span className="text-[11px] font-mono text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Filters:</span>
          </span>

          {/* Severity Select */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as any)}
            className="h-7 text-xs bg-white border border-slate-200 rounded px-2 text-slate-800"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">🔴 Critical Only</option>
            <option value="HIGH">🟠 High Priority</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="LOW">🔵 Low</option>
            <option value="INFO">⚪ Informational</option>
          </select>

          {/* Type Select */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="h-7 text-xs bg-white border border-slate-200 rounded px-2 text-slate-800"
          >
            <option value="all">All Alert Types</option>
            <option value="CRITICAL_COMPLAINT">Critical Grievances</option>
            <option value="SLA_OVERDUE">SLA Breaches (Overdue)</option>
            <option value="SLA_DUE_SOON">SLA Approaching Deadline</option>
            <option value="GEOGRAPHIC_CLUSTER">Geographic Clusters (Hotspots)</option>
            <option value="COMPLAINT_SPIKE">Category Volume Spikes</option>
          </select>

          {/* Status Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="h-7 text-xs bg-white border border-slate-200 rounded px-2 text-slate-800"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">⚡ Active (Unacknowledged)</option>
            <option value="ACKNOWLEDGED">✓ Acknowledged</option>
            <option value="RESOLVED">● Resolved / Remediated</option>
          </select>

          {(selectedSeverity !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || searchTerm || timeRange !== 'all') && (
            <button
              onClick={() => {
                setSelectedSeverity('all');
                setSelectedType('all');
                setSelectedStatus('all');
                setSearchTerm('');
                setTimeRange('all');
              }}
              className="text-[11px] font-mono text-[#1769D2] hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Alerts List & Feed */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 uppercase px-1">
          <span>Active Tactical Queue ({filteredAlerts.length} Alerts)</span>
          <span>District Isolation: {district || 'Statewide Scope'}</span>
        </div>

        {filteredAlerts.length === 0 ? (
          <Card className="p-8 text-center bg-white border-slate-200 shadow-2xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800">No Active Alerts</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No operational alerts match the selected criteria for this administrative context.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredAlerts.map((alert) => (
              <Card
                key={alert.id}
                className={`p-3.5 border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs ${
                  alert.status === 'ACTIVE' && alert.severity === 'CRITICAL' ? 'border-l-4 border-l-red-600' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        {getTypeIcon(alert.type)}
                      </span>

                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getSeverityBadgeClass(alert.severity)}`}>
                        {alert.severity}
                      </span>

                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        Tier {alert.escalationLevel} Escalation
                      </span>

                      {alert.complaintId && (
                        <span className="text-[10px] font-mono text-[#1769D2] font-bold">
                          #{alert.complaintId}
                        </span>
                      )}

                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        alert.status === 'ACKNOWLEDGED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : alert.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200 font-bold'
                      }`}>
                        {alert.status}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 mt-1">{alert.title}</h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                      {alert.description}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono flex-wrap pt-1">
                      {alert.location && <span>📍 {alert.location.address || alert.location.ward}</span>}
                      {alert.departmentName && <span>🏢 {alert.departmentName}</span>}
                      <span>🕒 {new Date(alert.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      {alert.acknowledgedBy && (
                        <span className="text-blue-700 font-semibold">✓ Acknowledged by: {alert.acknowledgedBy}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {alert.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAlert(alert);
                          setIsAckModalOpen(true);
                        }}
                        className="h-7 text-xs bg-white border-blue-200 text-[#1769D2] hover:bg-blue-50 font-semibold"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        <span>Acknowledge</span>
                      </Button>
                    )}

                    {alert.complaintId && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onSelectComplaint(alert.complaintId!)}
                        className="h-7 text-xs bg-[#1769D2] hover:bg-[#123B6D] text-white font-semibold"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span>Inspect Dossier</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAlert(alert)}
                      className="h-7 px-2 text-slate-600 hover:text-slate-900"
                      title="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Alert Detail Drawer / Modal */}
      {selectedAlert && !isAckModalOpen && !isEscalateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-white border-slate-200 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getSeverityBadgeClass(selectedAlert.severity)}`}>
                    {selectedAlert.severity}
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-bold">
                    Tier {selectedAlert.escalationLevel}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{selectedAlert.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div>
                <span className="font-bold text-slate-700">Incident Description:</span>
                <p className="text-slate-600 mt-0.5 leading-relaxed">{selectedAlert.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div>District: <strong className="text-slate-800">{selectedAlert.districtName}</strong></div>
                <div>Municipal ULB: <strong className="text-slate-800">{selectedAlert.municipalCorporationName || 'Standard'}</strong></div>
                <div>Department: <strong className="text-slate-800">{selectedAlert.departmentName || 'General Works'}</strong></div>
                <div>Status: <strong className="text-slate-800">{selectedAlert.status}</strong></div>
              </div>
            </div>

            {/* Recommended Operational Action (Section 6) */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs space-y-1">
              <div className="font-bold text-[#123B6D] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>Recommended Operational Action</span>
              </div>
              <p className="text-blue-900 leading-relaxed">{selectedAlert.recommendedAction}</p>
            </div>

            {/* Audit History (Section 7) */}
            {selectedAlert.acknowledgedBy && (
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Acknowledgement Audit Trail:</div>
                <div>• Officer: {selectedAlert.acknowledgedBy}</div>
                <div>• Timestamp: {selectedAlert.acknowledgedAt}</div>
                {selectedAlert.acknowledgementNotes && <div>• Notes: {selectedAlert.acknowledgementNotes}</div>}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <div className="flex items-center gap-2">
                {selectedAlert.status === 'ACTIVE' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAckModalOpen(true)}
                    className="h-8 text-xs bg-[#1769D2] hover:bg-[#123B6D] text-white"
                  >
                    Acknowledge Alert
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEscalateModalOpen(true)}
                  className="h-8 text-xs border-orange-300 text-orange-800 hover:bg-orange-50"
                >
                  Escalate Tier
                </Button>
              </div>

              {selectedAlert.complaintId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSelectComplaint(selectedAlert.complaintId!);
                    setSelectedAlert(null);
                  }}
                  className="h-8 text-xs border-slate-200 text-slate-700"
                >
                  Inspect Full Complaint
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Acknowledge Action Modal */}
      {isAckModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-slate-200 p-5 shadow-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Acknowledge Alert & Assign Field Review
            </h3>
            <p className="text-xs text-slate-600">
              Confirming this alert records officer attribution and notes in the statutory audit log.
            </p>
            <textarea
              placeholder="Add operational acknowledgement notes or immediate instructions..."
              value={ackNotes}
              onChange={(e) => setAckNotes(e.target.value)}
              className="w-full h-20 p-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAckModalOpen(false)}
                className="h-8 text-xs border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAcknowledge(selectedAlert)}
                className="h-8 text-xs bg-[#1769D2] hover:bg-[#123B6D] text-white"
              >
                Confirm Acknowledgement
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Escalate Tier Modal */}
      {isEscalateModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-slate-200 p-5 shadow-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-900">
              Escalate Alert to Higher Executive Tier
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Target Escalation Tier:</label>
                <select
                  value={escalateTargetTier}
                  onChange={(e) => setEscalateTargetTier(Number(e.target.value) as any)}
                  className="w-full h-8 mt-1 border border-slate-200 rounded px-2 text-xs"
                >
                  <option value={2}>Tier 2: Deputy Engineer / Zonal Officer</option>
                  <option value={3}>Tier 3: Executive Engineer Notice</option>
                  <option value={4}>Tier 4: Municipal Commissioner & Contractor Penalty</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Escalation Justification:</label>
                <textarea
                  placeholder="State reason for escalation (e.g. repeated contractor breach, public hazard)..."
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="w-full h-16 mt-1 p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEscalateModalOpen(false)}
                className="h-8 text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleEscalate(selectedAlert)}
                className="h-8 text-xs bg-orange-700 hover:bg-orange-800 text-white"
              >
                Confirm Escalation
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SLA Statutory Benchmarks Reference Modal */}
      {isSLARulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border-slate-200 p-5 shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-[#1769D2]" />
                <span>Maharashtra Statutory Resolution SLA Matrix (Charter 2026)</span>
              </h3>
              <button onClick={() => setIsSLARulesModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                    <th className="p-2">Priority / Category</th>
                    <th className="p-2">SLA Duration</th>
                    <th className="p-2">Due Soon Threshold</th>
                    <th className="p-2">Tier 4 Escalation</th>
                    <th className="p-2">Penalty / Recipient</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {SLAEngine.getAllRules().map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-800 capitalize">
                        {rule.category !== 'all' ? `${rule.category} (${rule.priority})` : `${rule.priority} Priority`}
                      </td>
                      <td className="p-2 text-[#1769D2] font-bold">{rule.durationHours} Hours</td>
                      <td className="p-2 text-amber-700">{rule.dueSoonHours} Hours</td>
                      <td className="p-2 text-red-700">{rule.escalationThresholdHours}h Past Breach</td>
                      <td className="p-2 text-slate-600">
                        {rule.penaltyAmountPerHour ? `₹${rule.penaltyAmountPerHour}/hr` : 'Warning notice'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSLARulesModalOpen(false)}
                className="h-8 text-xs border-slate-200"
              >
                Close Policy View
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

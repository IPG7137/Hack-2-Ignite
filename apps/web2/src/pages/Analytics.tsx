import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Complaint, IncidentCategory, ComplaintStatus, ComplaintPriority } from '../types/complaint';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Timer,
  AlertCircle,
  RefreshCw,
  Layers,
  Building2,
  MapPin,
  CheckCircle2,
  Inbox,
  Filter,
  Flame,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';
import { CATEGORY_CONFIG } from '../lib/constants';

interface AnalyticsProps {
  complaints?: Complaint[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void>;
  onSelectComplaint?: (id: string) => void;
}

const CANONICAL_DEPARTMENTS = [
  { id: 'DEP-ROADS', name: 'Roads & Infrastructure', categories: ['roads'], targetHours: 24 },
  { id: 'DEP-WATER', name: 'Water Works Dept', categories: ['water_sewage'], targetHours: 12 },
  { id: 'DEP-DRAINAGE', name: 'Sewerage & Drainage', categories: ['drainage'], targetHours: 24 },
  { id: 'DEP-SANITATION', name: 'Public Health & Sanitation', categories: ['waste_management'], targetHours: 18 },
  { id: 'DEP-ELECTRICAL', name: 'Electrical Engineering', categories: ['streetlights'], targetHours: 24 },
  { id: 'DEP-SAFETY', name: 'Disaster Management', categories: ['public_safety'], targetHours: 12 },
  { id: 'DEP-PARKS', name: 'Horticulture Dept', categories: ['parks'], targetHours: 48 },
];

export const Analytics: React.FC<AnalyticsProps> = ({
  complaints = [],
  loading = false,
  error = null,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'all'>('all');

  // Filter complaints if a category filter is selected
  const activeComplaints = useMemo(() => {
    if (selectedCategory === 'all') return complaints;
    return complaints.filter((c) => c.category === selectedCategory);
  }, [complaints, selectedCategory]);

  // 1. High-Level Performance Metrics & SLA Adherence
  const metrics = useMemo(() => {
    const total = activeComplaints.length;
    const open = activeComplaints.filter(
      (c) => c.status !== 'closed' && c.status !== 'resolved' && c.status !== 'verified' && c.status !== 'rejected'
    ).length;
    const overdue = activeComplaints.filter(
      (c) => c.sla.isOverdue && c.status !== 'closed' && c.status !== 'resolved' && c.status !== 'verified'
    ).length;
    const resolved = activeComplaints.filter(
      (c) => c.status === 'verified' || c.status === 'resolved' || c.status === 'closed' || c.status === 'resolution_submitted'
    ).length;
    const verified = activeComplaints.filter((c) => c.status === 'verified' || c.status === 'resolved').length;
    const closed = activeComplaints.filter((c) => c.status === 'closed').length;
    const rejected = activeComplaints.filter((c) => c.status === 'rejected').length;

    // SLA Compliance: complaints within target window / total active + closed
    const complianceRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

    return {
      total,
      open,
      overdue,
      resolved,
      verified,
      closed,
      rejected,
      complianceRate,
    };
  }, [activeComplaints]);

  // 2. Real Category Distribution for Horizontal Bar Chart
  const categoryData = useMemo(() => {
    const counts: Record<string, { label: string; count: number; color: string }> = {};

    Object.entries(CATEGORY_CONFIG).forEach(([catKey, config]) => {
      counts[catKey] = {
        label: config.label,
        count: 0,
        color: config.color,
      };
    });

    complaints.forEach((c) => {
      if (counts[c.category]) {
        counts[c.category].count++;
      } else {
        counts[c.category] = {
          label: c.categoryLabel || c.category,
          count: 1,
          color: '#526581',
        };
      }
    });

    return Object.entries(counts)
      .map(([key, data]) => ({
        category: key,
        categoryLabel: data.label,
        count: data.count,
        color: data.color,
        percentage: complaints.length > 0 ? Math.round((data.count / complaints.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [complaints]);

  // 3. Real Time-Series Intake vs Resolution Trends (Daily/Chronological grouping)
  const trendData = useMemo(() => {
    const map = new Map<string, { date: string; submitted: number; resolved: number; slaBreached: number }>();

    // Sort chronologically
    const sorted = [...activeComplaints].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((c) => {
      const d = new Date(c.createdAt);
      const dateKey = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })}`;
      const current = map.get(dateKey) || { date: dateKey, submitted: 0, resolved: 0, slaBreached: 0 };
      current.submitted++;
      if (c.status === 'verified' || c.status === 'resolved' || c.status === 'closed' || c.status === 'resolution_submitted') {
        current.resolved++;
      }
      if (c.sla.isOverdue) {
        current.slaBreached++;
      }
      map.set(dateKey, current);
    });

    return Array.from(map.values());
  }, [activeComplaints]);

  // 4. Complete Lifecycle Stage Counts (Preserving all 9 DB statuses)
  const lifecycleCounts = useMemo(() => {
    return {
      submitted: activeComplaints.filter((c) => c.status === 'submitted').length,
      under_review: activeComplaints.filter((c) => c.status === 'under_review').length,
      assigned: activeComplaints.filter((c) => c.status === 'assigned').length,
      in_progress: activeComplaints.filter((c) => c.status === 'in_progress').length,
      resolution_submitted: activeComplaints.filter((c) => c.status === 'resolution_submitted').length,
      resolved: activeComplaints.filter((c) => c.status === 'resolved').length,
      verified: activeComplaints.filter((c) => c.status === 'verified').length,
      closed: activeComplaints.filter((c) => c.status === 'closed').length,
      rejected: activeComplaints.filter((c) => c.status === 'rejected').length,
    };
  }, [activeComplaints]);

  // 5. Priority Analysis (Urgent / Critical, High, Medium, Low)
  const priorityBreakdown = useMemo(() => {
    const total = activeComplaints.length;
    const urgent = activeComplaints.filter((c) => c.priority === 'urgent').length;
    const high = activeComplaints.filter((c) => c.priority === 'high').length;
    const medium = activeComplaints.filter((c) => c.priority === 'medium').length;
    const low = activeComplaints.filter((c) => c.priority === 'low').length;

    return [
      {
        key: 'urgent',
        label: 'Critical / Urgent',
        count: urgent,
        percentage: total > 0 ? Math.round((urgent / total) * 100) : 0,
        color: 'text-red-700 bg-red-50 border-red-200',
        barColor: '#D92D20',
        sla: '12h Target',
      },
      {
        key: 'high',
        label: 'High Priority',
        count: high,
        percentage: total > 0 ? Math.round((high / total) * 100) : 0,
        color: 'text-orange-700 bg-orange-50 border-orange-200',
        barColor: '#EA580C',
        sla: '24h Target',
      },
      {
        key: 'medium',
        label: 'Medium Priority',
        count: medium,
        percentage: total > 0 ? Math.round((medium / total) * 100) : 0,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        barColor: '#D99A00',
        sla: '48h Target',
      },
      {
        key: 'low',
        label: 'Low Priority',
        count: low,
        percentage: total > 0 ? Math.round((low / total) * 100) : 0,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        barColor: '#1769D2',
        sla: '72h Target',
      },
    ];
  }, [activeComplaints]);

  // 6. Department Breakdown Matrix
  const departmentMetrics = useMemo(() => {
    return CANONICAL_DEPARTMENTS.map((dept) => {
      const deptComplaints = complaints.filter((c) => dept.categories.includes(c.category));
      const active = deptComplaints.filter(
        (c) => c.status !== 'closed' && c.status !== 'resolved' && c.status !== 'verified' && c.status !== 'rejected'
      );
      const overdue = active.filter((c) => c.sla.isOverdue);
      const resolved = deptComplaints.filter(
        (c) => c.status === 'verified' || c.status === 'resolved' || c.status === 'closed'
      );
      const urgent = deptComplaints.filter((c) => c.priority === 'urgent');
      const slaRate =
        deptComplaints.length > 0
          ? Math.round(((deptComplaints.length - overdue.length) / deptComplaints.length) * 100)
          : 100;

      return {
        id: dept.id,
        name: dept.name,
        total: deptComplaints.length,
        active: active.length,
        overdue: overdue.length,
        resolved: resolved.length,
        urgent: urgent.length,
        slaRate,
        targetHours: dept.targetHours,
      };
    });
  }, [complaints]);

  // 7. Ward / Location Performance Table
  const { wardPerformance, hasExplicitWardData } = useMemo(() => {
    const map = new Map<
      string,
      { ward: string; zone: string; active: number; resolved: number; overdue: number; total: number }
    >();

    let explicitCount = 0;

    complaints.forEach((c) => {
      const wardRaw = c.location.ward?.trim();
      const zoneRaw = c.location.zone?.trim();
      if (wardRaw && wardRaw.length > 0) {
        explicitCount++;
      }
      const ward = wardRaw || 'General Municipal Jurisdiction';
      const zone = zoneRaw || 'Central Zone';
      const current = map.get(ward) || { ward, zone, active: 0, resolved: 0, overdue: 0, total: 0 };
      current.total++;
      if (c.status === 'verified' || c.status === 'resolved' || c.status === 'closed') {
        current.resolved++;
      } else {
        current.active++;
      }
      if (c.sla.isOverdue) {
        current.overdue++;
      }
      map.set(ward, current);
    });

    const perfList = Array.from(map.values()).map((w) => {
      const slaRate = w.total > 0 ? Math.round(((w.total - w.overdue) / w.total) * 100) : 100;
      const riskScore = Math.min(100, Math.round(w.active * 15 + w.overdue * 25));
      return {
        ...w,
        slaRate,
        riskScore,
      };
    });

    return {
      wardPerformance: perfList,
      hasExplicitWardData: explicitCount > 0,
    };
  }, [complaints]);

  // Loading State
  if (loading && complaints.length === 0) {
    return (
      <div className="p-16 text-center text-[#526581]">
        <div className="flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#1769D2]" />
          <span className="text-sm font-semibold text-[#172B4D]">Loading municipal analytics dataset...</span>
          <span className="text-xs text-[#718096]">Aggregating live Supabase complaint records</span>
        </div>
      </div>
    );
  }

  // Error State
  if (error && complaints.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-lg border border-red-200 max-w-lg mx-auto mt-8 shadow-sm">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#172B4D]">Unable to Load Municipal Analytics</h3>
        <p className="text-xs text-red-600 mt-1 mb-4">{error}</p>
        {onRefresh && (
          <Button
            variant="primary"
            size="sm"
            onClick={onRefresh}
            className="bg-[#1769D2] text-white inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#D9E2EC]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1769D2]" />
            <span>Operational Analytics & SLA Adherence Intelligence</span>
          </h2>
          <p className="text-xs text-[#526581] mt-0.5">
            Real-time performance metrics derived from live Supabase grievance records ({complaints.length} total on record).
          </p>
        </div>

        {/* Category Filter & Refresh */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#526581]" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="h-8 text-xs bg-white border border-[#D9E2EC] text-[#172B4D] rounded px-2.5 shadow-xs font-medium"
          >
            <option value="all">All Incident Categories ({complaints.length})</option>
            <option value="roads">Roads & Pavements</option>
            <option value="water_sewage">Water Works</option>
            <option value="drainage">Drainage & Sewage</option>
            <option value="waste_management">Public Health & Sanitation</option>
            <option value="streetlights">Electrical Engineering</option>
            <option value="public_safety">Public Safety Hazards</option>
            <option value="parks">Horticulture & Greens</option>
          </select>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 px-2.5 bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50"
              title="Refresh Analytics Dataset"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#526581]" />
            </Button>
          )}
        </div>
      </div>

      {/* Empty Database State Notice (If 0 records in Supabase) */}
      {complaints.length === 0 && (
        <div className="p-6 bg-blue-50/60 border border-blue-200 rounded-lg text-center space-y-2">
          <Inbox className="w-8 h-8 text-[#1769D2] mx-auto" />
          <h3 className="text-sm font-bold text-[#172B4D]">No Complaint Data Available</h3>
          <p className="text-xs text-[#526581] max-w-md mx-auto">
            The Supabase reports database currently contains zero grievance records. As citizens file reports via the mobile app or web portal, live analytics will automatically populate.
          </p>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm">
          <span className="text-[10px] font-mono uppercase text-[#526581] font-semibold block">
            SLA Compliance Rate
          </span>
          <div className="text-2xl font-bold font-mono text-[#16803C] mt-1">
            {metrics.complianceRate}%
          </div>
          <span className="text-[10px] text-[#718096]">
            {metrics.overdue} breached of {metrics.total} total
          </span>
        </Card>

        <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm">
          <span className="text-[10px] font-mono uppercase text-[#526581] font-semibold block">
            Active Grievances
          </span>
          <div className="text-2xl font-bold font-mono text-[#1769D2] mt-1">
            {metrics.open}
          </div>
          <span className="text-[10px] text-[#718096]">
            Undergoing field remediation
          </span>
        </Card>

        <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm">
          <span className="text-[10px] font-mono uppercase text-[#526581] font-semibold block">
            Resolved & Verified
          </span>
          <div className="text-2xl font-bold font-mono text-purple-700 mt-1">
            {metrics.verified + metrics.closed}
          </div>
          <span className="text-[10px] text-[#718096]">
            Completed & verified in DB
          </span>
        </Card>

        <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm">
          <span className="text-[10px] font-mono uppercase text-[#526581] font-semibold block">
            Total Database Records
          </span>
          <div className="text-2xl font-bold font-mono text-[#123B6D] mt-1">
            {metrics.total}
          </div>
          <span className="text-[10px] text-[#718096]">
            Live synchronized records
          </span>
        </Card>
      </div>

      {/* Priority Distribution Bar */}
      <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-600" />
            <span>Priority Breakdown & SLA Targets</span>
          </span>
          <span className="text-[10px] font-mono text-[#526581]">Live Severity Distribution</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {priorityBreakdown.map((p) => (
            <div key={p.key} className={`p-2.5 rounded border ${p.color} text-center space-y-1`}>
              <div className="text-[10px] font-mono uppercase font-bold">{p.label}</div>
              <div className="text-xl font-bold font-mono">{p.count}</div>
              <div className="text-[10px] font-mono text-[#526581]">
                {p.percentage}% ({p.sla})
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts Grid: Trendline & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Trend Area Chart (7 cols) */}
        <Card className="lg:col-span-7 p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#1769D2]" />
              <span>Grievance Intake vs Resolution Curve</span>
            </span>
            <span className="text-[10px] font-mono text-[#526581]">Chronological Daily Series</span>
          </div>

          <div className="h-64 w-full">
            {trendData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#718096] text-xs">
                <Inbox className="w-6 h-6 text-[#A0AEC0] mb-1.5" />
                <span>No time-series data recorded yet in database</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1769D2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1769D2" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16803C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16803C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#718096" fontSize={11} />
                  <YAxis stroke="#718096" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9E2EC',
                      color: '#172B4D',
                      fontSize: '11px',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="submitted"
                    stroke="#1769D2"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSub)"
                    name="Intake (Created)"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stroke="#16803C"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRes)"
                    name="Remediated / Resolved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Category Breakdown Bar Chart (5 cols) */}
        <Card className="lg:col-span-5 p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#1769D2]" />
              <span>Incident Volume by Category</span>
            </span>
            <span className="text-[10px] font-mono text-[#526581]">Real Database Counts</span>
          </div>

          <div className="h-64 w-full">
            {complaints.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#718096] text-xs">
                <Inbox className="w-6 h-6 text-[#A0AEC0] mb-1.5" />
                <span>Zero category records found</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#718096" fontSize={11} allowDecimals={false} />
                  <YAxis
                    dataKey="categoryLabel"
                    type="category"
                    stroke="#718096"
                    fontSize={10}
                    width={90}
                    tickFormatter={(val) => (val.length > 13 ? `${val.slice(0, 12)}…` : val)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9E2EC',
                      color: '#172B4D',
                      fontSize: '11px',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="count" fill="#1769D2" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Lifecycle Progression Breakdown (All 9 Database Supported Statuses) */}
      <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#1769D2]" />
            <span>Database Lifecycle Progression Matrix</span>
          </span>
          <span className="text-[10px] font-mono text-[#526581]">
            All 9 Database-Supported Stages Preserved
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {/* 1. Submitted */}
          <div className="p-2 rounded bg-amber-50/60 border border-amber-200 text-center">
            <div className="text-[9px] font-mono uppercase text-amber-800 font-semibold truncate">Submitted</div>
            <div className="text-lg font-bold font-mono text-amber-900 mt-0.5">{lifecycleCounts.submitted}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.submitted / metrics.total) * 100) : 0}%
            </div>
          </div>

          {/* 2. Under Review */}
          <div className="p-2 rounded bg-blue-50/60 border border-blue-200 text-center">
            <div className="text-[9px] font-mono uppercase text-blue-800 font-semibold truncate">Under Review</div>
            <div className="text-lg font-bold font-mono text-blue-900 mt-0.5">{lifecycleCounts.under_review}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.under_review / metrics.total) * 100) : 0}%
            </div>
          </div>

          {/* 3. Assigned */}
          <div className="p-2 rounded bg-purple-50/60 border border-purple-200 text-center">
            <div className="text-[9px] font-mono uppercase text-purple-800 font-semibold truncate">Assigned</div>
            <div className="text-lg font-bold font-mono text-purple-900 mt-0.5">{lifecycleCounts.assigned}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.assigned / metrics.total) * 100) : 0}%
            </div>
          </div>

          {/* 4. In Progress */}
          <div className="p-2 rounded bg-orange-50/60 border border-orange-200 text-center">
            <div className="text-[9px] font-mono uppercase text-orange-800 font-semibold truncate">In Progress</div>
            <div className="text-lg font-bold font-mono text-orange-900 mt-0.5">{lifecycleCounts.in_progress}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.in_progress / metrics.total) * 100) : 0}%
            </div>
          </div>

          {/* 5. Resolution Submitted */}
          <div className="p-2 rounded bg-sky-50/60 border border-sky-200 text-center">
            <div className="text-[9px] font-mono uppercase text-sky-800 font-semibold truncate">Res. Submitted</div>
            <div className="text-lg font-bold font-mono text-sky-900 mt-0.5">{lifecycleCounts.resolution_submitted}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.resolution_submitted / metrics.total) * 100) : 0}%
            </div>
          </div>

          {/* 6. Resolved */}
          <div className="p-2 rounded bg-emerald-50/60 border border-emerald-200 text-center">
            <div className="text-[9px] font-mono uppercase text-emerald-800 font-semibold truncate">Resolved</div>
            <div className="text-lg font-bold font-mono text-emerald-900 mt-0.5">{lifecycleCounts.resolved}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.resolved / metrics.total) * 100) : 0}%
            </div>
          </div>

          {/* 7. Verified */}
          <div className="p-2 rounded bg-teal-50/60 border border-teal-200 text-center">
            <div className="text-[9px] font-mono uppercase text-teal-800 font-semibold truncate">Verified</div>
            <div className="text-lg font-bold font-mono text-teal-900 mt-0.5">{lifecycleCounts.verified}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.verified / metrics.total) * 100) : 0}%
            </div>
          </div>

          {/* 8. Closed */}
          <div className="p-2 rounded bg-slate-100 border border-slate-200 text-center">
            <div className="text-[9px] font-mono uppercase text-slate-700 font-semibold truncate">Closed</div>
            <div className="text-lg font-bold font-mono text-slate-800 mt-0.5">{lifecycleCounts.closed}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.closed / metrics.total) * 100) : 0}%
            </div>
          </div>

          {/* 9. Rejected */}
          <div className="p-2 rounded bg-rose-50/60 border border-rose-200 text-center">
            <div className="text-[9px] font-mono uppercase text-rose-800 font-semibold truncate">Rejected</div>
            <div className="text-lg font-bold font-mono text-rose-900 mt-0.5">{lifecycleCounts.rejected}</div>
            <div className="text-[9px] text-[#718096]">
              {metrics.total > 0 ? Math.round((lifecycleCounts.rejected / metrics.total) * 100) : 0}%
            </div>
          </div>
        </div>
      </Card>

      {/* Department Breakdown Matrix */}
      <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#1769D2]" />
            <span>Departmental Workload & Resolution Matrix</span>
          </span>
          <span className="text-[10px] font-mono text-[#526581]">7 Canonical Divisions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[#526581] font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Municipal Department</th>
                <th className="py-2.5 px-3">Total Grievances</th>
                <th className="py-2.5 px-3">Active Workload</th>
                <th className="py-2.5 px-3">Critical / Urgent</th>
                <th className="py-2.5 px-3">Overdue SLA</th>
                <th className="py-2.5 px-3">Resolved / Closed</th>
                <th className="py-2.5 px-3">SLA Compliance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEF5]">
              {departmentMetrics.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#172B4D]">{dept.name}</td>
                  <td className="py-2.5 px-3 font-mono text-[#172B4D]">{dept.total}</td>
                  <td className="py-2.5 px-3 font-mono text-[#172B4D] font-bold">{dept.active}</td>
                  <td className="py-2.5 px-3 font-mono text-red-700">{dept.urgent}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {dept.overdue > 0 ? (
                      <span className="text-[#D92D20] font-bold">({dept.overdue} overdue)</span>
                    ) : (
                      <span className="text-emerald-700">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-emerald-800">{dept.resolved}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#16803C]">
                    {dept.slaRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Ward-Level Performance Table */}
      <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1769D2]" />
            <span>Ward & Regional Jurisdiction Performance Matrix</span>
          </span>
          <span className="text-[10px] font-mono text-[#526581]">
            {hasExplicitWardData
              ? `${wardPerformance.length} Administrative Wards Active`
              : 'Jurisdiction Breakdown'}
          </span>
        </div>

        {!hasExplicitWardData && complaints.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-[#526581] flex items-center gap-2">
            <Info className="w-4 h-4 text-[#1769D2] shrink-0" />
            <span>
              Explicit ward numbers are not populated in the current grievance table. Data is grouped by administrative municipal jurisdiction while preserving geographic coordinates and street landmarks.
            </span>
          </div>
        )}

        {complaints.length === 0 ? (
          <div className="p-8 text-center text-[#718096] text-xs">
            <Inbox className="w-6 h-6 text-[#A0AEC0] mx-auto mb-1.5" />
            <span>No complaint records available in database</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[#526581] font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Ward / Regional Area</th>
                  <th className="py-2.5 px-3">Total Grievances</th>
                  <th className="py-2.5 px-3">Active Incidents</th>
                  <th className="py-2.5 px-3">Resolved / Audited</th>
                  <th className="py-2.5 px-3">Overdue Count</th>
                  <th className="py-2.5 px-3">SLA Compliance</th>
                  <th className="py-2.5 px-3">Spatial Risk Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF5]">
                {wardPerformance.map((w, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#172B4D]">
                      {w.ward} <span className="text-[10px] text-[#718096] font-mono">({w.zone})</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#172B4D]">{w.total}</td>
                    <td className="py-2.5 px-3 font-mono text-[#172B4D] font-bold">{w.active}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-800">{w.resolved}</td>
                    <td className="py-2.5 px-3 font-mono text-red-700 font-semibold">{w.overdue}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#16803C]">
                      {w.slaRate}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                          w.riskScore > 60
                            ? 'bg-red-50 text-[#D92D20] border border-red-200'
                            : w.riskScore > 30
                            ? 'bg-amber-50 text-[#EA580C] border border-amber-200'
                            : 'bg-emerald-50 text-[#16803C] border border-emerald-200'
                        }`}
                      >
                        Index: {w.riskScore}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

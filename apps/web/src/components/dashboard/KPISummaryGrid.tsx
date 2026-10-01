import React from 'react';
import {
  FileText,
  AlertOctagon,
  Wrench,
  CheckCircle2,
  ClockAlert,
  Timer,
  LucideIcon,
} from 'lucide-react';
import { KPISummary } from '../../types/analytics';
import { KPISkeleton } from '../ui/LoadingSkeleton';

interface KPISummaryGridProps {
  kpis: KPISummary | null;
  loading?: boolean;
  onCardClick?: (key: 'total' | 'open' | 'critical' | 'overdue' | 'in_progress' | 'resolved') => void;
}

interface KPICardData {
  key: 'total' | 'open' | 'critical' | 'overdue' | 'in_progress' | 'resolved';
  title: string;
  value: number;
  subtext: string;
  contextTag: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const KPISummaryGrid: React.FC<KPISummaryGridProps> = ({ kpis, loading = false, onCardClick }) => {
  if (loading) {
    return <KPISkeleton />;
  }

  const total = kpis?.totalComplaints ?? 0;
  const open = kpis?.openComplaints ?? 0;
  const critical = kpis?.criticalComplaints ?? 0;
  const overdue = kpis?.overdueComplaints ?? 0;
  const inProgress = kpis?.activeFieldCrewsCount ?? 0;
  const resolved = kpis?.resolvedComplaints ?? 0;
  const compliance = kpis?.slaComplianceRate ?? 100;

  const cards: KPICardData[] = [
    {
      key: 'total',
      title: 'Total Grievances',
      value: total,
      subtext: 'Registered municipal reports',
      contextTag: 'System Intake',
      icon: FileText,
      iconBg: 'bg-blue-50',
      iconColor: 'text-[#1769D2]',
      badgeBg: 'bg-slate-50',
      badgeBorder: 'border-slate-200',
      badgeText: 'text-slate-700',
    },
    {
      key: 'open',
      title: 'Active Issues',
      value: open,
      subtext: 'Awaiting completion/closure',
      contextTag: 'Pending Resolution',
      icon: ClockAlert,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-700',
      badgeBg: 'bg-sky-50',
      badgeBorder: 'border-sky-200',
      badgeText: 'text-sky-800',
    },
    {
      key: 'critical',
      title: 'Critical Under SLA',
      value: critical,
      subtext: 'Life-safety 12h response limit',
      contextTag: critical > 0 ? 'Immediate Action' : 'All Clear',
      icon: AlertOctagon,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-700',
      badgeBg: critical > 0 ? 'bg-red-50' : 'bg-emerald-50',
      badgeBorder: critical > 0 ? 'border-red-200' : 'border-emerald-200',
      badgeText: critical > 0 ? 'text-red-800' : 'text-emerald-800',
    },
    {
      key: 'overdue',
      title: 'Overdue Breaches',
      value: overdue,
      subtext: 'Exceeded statutory SLA hours',
      contextTag: overdue > 0 ? 'Escalated' : 'On Schedule',
      icon: Timer,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700',
      badgeBg: overdue > 0 ? 'bg-amber-50' : 'bg-slate-50',
      badgeBorder: overdue > 0 ? 'border-amber-200' : 'border-slate-200',
      badgeText: overdue > 0 ? 'text-amber-800' : 'text-slate-700',
    },
    {
      key: 'in_progress',
      title: 'Active Field Crews',
      value: inProgress,
      subtext: 'Work orders on-site',
      contextTag: 'Field Operations',
      icon: Wrench,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-700',
      badgeBg: 'bg-indigo-50',
      badgeBorder: 'border-indigo-200',
      badgeText: 'text-indigo-800',
    },
    {
      key: 'resolved',
      title: 'Resolved & Verified',
      value: resolved,
      subtext: `${compliance}% statutory SLA compliance`,
      contextTag: 'Verified Quality',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
      badgeText: 'text-emerald-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            onClick={() => onCardClick?.(card.key)}
            className={`p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs transition-all flex flex-col justify-between ${
              onCardClick ? 'hover:border-blue-300 hover:shadow-xs cursor-pointer group' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate group-hover:text-slate-900 transition-colors">
                {card.title}
              </span>
              <div
                className={`w-7 h-7 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-4 h-4 stroke-[2.25]" />
              </div>
            </div>

            <div>
              <div className="text-2xl lg:text-[28px] font-extrabold font-mono tracking-tight text-slate-900 leading-none">
                {card.value}
              </div>

              <div className="mt-2 flex items-center justify-between gap-1">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${card.badgeBg} ${card.badgeBorder} ${card.badgeText}`}
                >
                  {card.contextTag}
                </span>
                {onCardClick && (
                  <span className="text-[10px] text-slate-400 group-hover:text-[#1769D2] font-semibold transition-colors">
                    View →
                  </span>
                )}
              </div>

              <div className="text-[10px] text-slate-500 mt-1.5 truncate">
                {card.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

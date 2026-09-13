import React from 'react';
import { FileText, AlertOctagon, Wrench, CheckCircle2, ClockAlert, Timer } from 'lucide-react';
import { Card } from '../ui/Card';
import { KPISummary } from '../../types/analytics';

interface KPISummaryGridProps {
  kpis: KPISummary | null;
  loading?: boolean;
}

export const KPISummaryGrid: React.FC<KPISummaryGridProps> = ({ kpis, loading = false }) => {
  const total = kpis?.totalComplaints ?? 0;
  const open = kpis?.openComplaints ?? 0;
  const critical = kpis?.criticalComplaints ?? 0;
  const overdue = kpis?.overdueComplaints ?? 0;
  const inProgress = kpis?.activeFieldCrewsCount ?? 0;
  const resolved = kpis?.resolvedComplaints ?? 0;
  const compliance = kpis?.slaComplianceRate ?? 100;

  const cards = [
    {
      title: 'Total Grievances',
      value: total,
      change: `${total} registered in DB`,
      subtext: 'Municipal database',
      icon: FileText,
      color: 'text-[#1769D2]',
      borderAccent: 'default' as const,
    },
    {
      title: 'Needs Triage',
      value: open,
      change: open > 0 ? `${open} active reports` : 'Zero pending triage',
      subtext: 'Pending resolution',
      icon: ClockAlert,
      color: 'text-[#0284C7]',
      borderAccent: 'info' as const,
    },
    {
      title: 'Critical / Urgent',
      value: critical,
      change: critical > 0 ? '12h SLA target' : 'Zero critical incidents',
      subtext: 'Life-safety priority',
      icon: AlertOctagon,
      color: 'text-[#D92D20]',
      borderAccent: 'urgent' as const,
      glow: critical > 0,
    },
    {
      title: 'Overdue Complaints',
      value: overdue,
      change: overdue > 0 ? `${overdue} breached limit` : 'Zero SLA breaches',
      subtext: 'Statutory deadline',
      icon: Timer,
      color: 'text-[#EA580C]',
      borderAccent: 'warning' as const,
    },
    {
      title: 'In Progress / Assigned',
      value: inProgress,
      change: inProgress > 0 ? `${inProgress} under field action` : 'Zero active field jobs',
      subtext: 'Assigned / In progress',
      icon: Wrench,
      color: 'text-[#123B6D]',
      borderAccent: 'default' as const,
    },
    {
      title: 'Resolved & Verified',
      value: resolved,
      change: `${compliance}% SLA Compliance`,
      subtext: 'Completed remediation',
      icon: CheckCircle2,
      color: 'text-[#16803C]',
      borderAccent: 'resolved' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            borderAccent={card.borderAccent}
            glow={card.glow}
            className="p-3.5 flex flex-col justify-between bg-white border-[#D9E2EC]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#526581] uppercase tracking-wider">
                {card.title}
              </span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>

            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-[#172B4D]">
                {loading ? '...' : card.value}
              </div>
              <div className="text-[11px] font-semibold text-[#123B6D] mt-1 flex items-center gap-1">
                <span>{card.change}</span>
              </div>
              <div className="text-[10px] text-[#718096] truncate mt-0.5">
                {card.subtext}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

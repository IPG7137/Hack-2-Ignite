import React from 'react';
import { ShieldAlert, FileCheck2, Bell, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Complaint } from '../../types/complaint';
import { SmartAlertEngine } from '../../services/smartAlertEngine';
import { Button } from '../ui/Button';

interface OperationsSummaryCardProps {
  complaints: Complaint[];
  districtId?: string | null;
  municipalCorporationId?: string | null;
  onNavigatePage: (page: string, filterParams?: any) => void;
}

export const OperationsSummaryCard: React.FC<OperationsSummaryCardProps> = ({
  complaints,
  districtId,
  municipalCorporationId,
  onNavigatePage,
}) => {
  // 1. Evaluate active smart alerts
  const smartAlerts = React.useMemo(() => {
    return SmartAlertEngine.evaluateAlerts(
      complaints,
      districtId || 'pune',
      municipalCorporationId || undefined
    ).filter((a) => a.status === 'ACTIVE');
  }, [complaints, districtId, municipalCorporationId]);

  // 2. Pending Citizen Sign-offs
  const pendingVerifications = React.useMemo(() => {
    return complaints.filter((c) => c.status === 'resolution_submitted');
  }, [complaints]);

  // 3. Overdue SLA breaches
  const overdueCount = React.useMemo(() => {
    return complaints.filter((c) => c.sla.isOverdue && c.status !== 'closed' && c.status !== 'verified').length;
  }, [complaints]);

  return (
    <div className="flex flex-col h-full rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Operational Attention & Verification
            </h3>
            <p className="text-[10px] text-slate-500">Events requiring field or citizen sign-off</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigatePage('notifications')}
          className="h-6.5 text-[11px] text-[#1769D2] hover:text-[#123B6D] hover:bg-blue-50 font-bold gap-1 px-2"
        >
          <span>Notification Center</span>
          <ArrowUpRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Body: 3 Summary Action Rows */}
      <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto">
        {/* Row 1: Active Operational Alerts */}
        <div
          onClick={() => onNavigatePage('alerts')}
          className="p-3 rounded-lg border border-red-200/80 bg-red-50/40 hover:bg-red-50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-red-100 border border-red-200 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Critical Safety Alerts
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold border border-red-200">
                  {smartAlerts.length} ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {smartAlerts.length > 0
                  ? smartAlerts[0].title
                  : 'Zero unacknowledged emergency safety alerts'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
        </div>

        {/* Row 2: Resolution Verification Sign-offs */}
        <div
          onClick={() => onNavigatePage('complaints', { status: 'resolution_submitted' })}
          className="p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck2 className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Awaiting Citizen Verification
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  {pendingVerifications.length} PENDING
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {pendingVerifications.length > 0
                  ? `${pendingVerifications.length} work orders submitted with proof photos awaiting citizen sign-off`
                  : 'All remediated grievances closed or audited'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
        </div>

        {/* Row 3: SLA Escalation Breaches */}
        <div
          onClick={() => onNavigatePage('sla')}
          className="p-3 rounded-lg border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  SLA Escalation Queue
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  {overdueCount} OVERDUE
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {overdueCount > 0
                  ? `${overdueCount} complaints exceeded statutory SLA threshold`
                  : 'Zero overdue complaints across active departments'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
        </div>
      </div>

      {/* Footer Navigation Link */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 font-medium">
          Primary verification & notification channels
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigatePage('notifications')}
          className="h-7 text-xs text-[#1769D2] hover:bg-blue-50 border-blue-200 font-semibold gap-1"
        >
          <span>All Notifications</span>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

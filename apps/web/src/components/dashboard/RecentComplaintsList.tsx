import React from 'react';
import { Clock, MapPin, ArrowRight, UserCheck, Inbox } from 'lucide-react';
import { Complaint } from '../../types/complaint';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { Button } from '../ui/Button';

interface RecentComplaintsListProps {
  complaints: Complaint[];
  onSelectComplaint: (id: string) => void;
  onViewAll?: () => void;
}

export const RecentComplaintsList: React.FC<RecentComplaintsListProps> = ({
  complaints,
  onSelectComplaint,
  onViewAll,
}) => {
  const recentList = complaints.slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            📋
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Grievances Intake
            </h3>
            <p className="text-[10px] text-slate-500">Chronological log of registered grievances</p>
          </div>
        </div>

        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="h-6 text-[11px] text-[#1769D2] hover:text-[#123B6D] gap-1 font-semibold"
          >
            <span>View All Queue</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Body Table / List */}
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
        {recentList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
            <Inbox className="w-7 h-7 text-slate-300 mb-1.5" />
            <span>No grievances registered for this jurisdiction yet.</span>
          </div>
        ) : (
          recentList.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectComplaint(item.id)}
              className="p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#1769D2]">
                    #{item.id}
                  </span>
                  <PriorityBadge priority={item.priority} />
                  <StatusBadge status={item.status} />
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>

                <div className="font-semibold text-xs text-slate-800 group-hover:text-[#1769D2] transition-colors truncate">
                  {item.title}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{item.location.address}</span>
                  {item.assignment?.departmentName && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium shrink-0">
                        {item.assignment.departmentName}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* SLA & Action */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 text-right">
                <div
                  className={`text-[10.5px] font-mono font-bold flex items-center gap-1 ${
                    item.sla.isOverdue
                      ? 'text-red-700'
                      : item.sla.hoursRemaining <= 6
                      ? 'text-amber-700'
                      : 'text-slate-600'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    {item.sla.isOverdue
                      ? 'OVERDUE'
                      : `${item.sla.hoursRemaining}h remaining`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-[#1769D2] font-semibold flex items-center gap-0.5">
                  Dossier <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

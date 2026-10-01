import { Building2, ArrowUpRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Complaint } from '../../types/complaint';
import { Department } from '../../types/department';

interface DepartmentWorkloadProps {
  departments?: Department[];
  complaints?: Complaint[];
  onViewAll?: () => void;
}

const CANONICAL_DIVISIONS = [
  { id: 'DEP-ROADS', name: 'Roads & Infrastructure', categories: ['roads'], targetHours: 24 },
  { id: 'DEP-WATER', name: 'Water Works Dept', categories: ['water_sewage'], targetHours: 12 },
  { id: 'DEP-DRAINAGE', name: 'Sewerage & Drainage', categories: ['drainage'], targetHours: 24 },
  { id: 'DEP-SANITATION', name: 'Public Health & Sanitation', categories: ['waste_management'], targetHours: 18 },
  { id: 'DEP-ELECTRICAL', name: 'Electrical Engineering', categories: ['streetlights'], targetHours: 24 },
  { id: 'DEP-SAFETY', name: 'Disaster Management', categories: ['public_safety'], targetHours: 12 },
  { id: 'DEP-PARKS', name: 'Horticulture Dept', categories: ['parks'], targetHours: 48 },
];

export const DepartmentWorkload: React.FC<DepartmentWorkloadProps> = ({
  complaints = [],
  onViewAll,
}) => {
  const workloads = CANONICAL_DIVISIONS.map((division) => {
    const deptComplaints = complaints.filter((c) => division.categories.includes(c.category));
    const active = deptComplaints.filter((c) => c.status !== 'closed' && c.status !== 'verified');
    const overdue = active.filter((c) => c.sla.isOverdue);
    const resolved = deptComplaints.filter((c) => c.status === 'verified' || c.status === 'closed');
    const slaPercent =
      deptComplaints.length > 0
        ? Math.round(((deptComplaints.length - overdue.length) / deptComplaints.length) * 100)
        : 100;

    return {
      id: division.id,
      name: division.name,
      openCount: active.length,
      overdueCount: overdue.length,
      resolvedCount: resolved.length,
      totalCount: deptComplaints.length,
      slaCompliance: slaPercent,
      targetHours: division.targetHours,
    };
  });

  return (
    <Card className="flex flex-col h-full border-[#D9E2EC] bg-white">
      <div className="px-4 py-3 border-b border-[#D9E2EC] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#1769D2]" />
          <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
            Departmental Capacity & SLA Matrix
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#526581] font-bold hidden sm:inline">
            {CANONICAL_DIVISIONS.length} DIVISIONS
          </span>
          {onViewAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="h-6 text-[11px] text-[#1769D2] hover:text-[#123B6D] hover:bg-blue-50 font-bold gap-1 px-1.5"
            >
              <span>View Roster</span>
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
        {workloads.map((dept) => {
          const maxCapacity = 20;
          const loadPercent = Math.min(100, Math.round((dept.openCount / maxCapacity) * 100));

          return (
            <div key={dept.id} className="space-y-1.5 p-2.5 rounded bg-[#F8FAFC] border border-[#E8EEF5]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#172B4D]">{dept.name}</span>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#526581]">
                    <strong className="text-[#172B4D]">{dept.openCount}</strong> active ({dept.totalCount} total)
                  </span>
                  {dept.overdueCount > 0 && (
                    <span className="text-[#D92D20] font-bold">
                      ({dept.overdueCount} overdue)
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    dept.overdueCount > 0
                      ? 'bg-[#D92D20]'
                      : dept.openCount > 5
                      ? 'bg-[#EA580C]'
                      : dept.openCount > 0
                      ? 'bg-[#1769D2]'
                      : 'bg-slate-300'
                  }`}
                  style={{ width: `${Math.max(5, loadPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#718096] pt-0.5">
                <span>Target SLA: {dept.targetHours}h</span>
                <span className="flex items-center gap-1 font-mono">
                  Compliance: <strong className="text-[#16803C] font-bold">{dept.slaCompliance}%</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import { Users, Truck, Phone, CheckCircle, Navigation, Wrench, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { FieldTeam } from '../types/officer';
import { Complaint } from '../types/complaint';
import { departmentService } from '../services/departmentService';

interface FieldTeamsProps {
  complaints?: Complaint[];
  onSelectComplaint?: (id: string) => void;
}

export const FieldTeams: React.FC<FieldTeamsProps> = ({ complaints = [], onSelectComplaint }) => {
  const [teams, setTeams] = useState<FieldTeam[]>([]);

  useEffect(() => {
    async function load() {
      const res = await departmentService.getFieldTeams();
      setTeams(res);
    }
    load();
  }, []);

  const getStatusBadge = (status: FieldTeam['status']) => {
    switch (status) {
      case 'remediation_active':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-50 text-[#EA580C] border border-orange-200">REMEDIATION ACTIVE</span>;
      case 'on_site':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#1769D2] border border-blue-200">ON SITE INSPECTING</span>;
      case 'en_route':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-[#B45309] border border-amber-200">DISPATCH EN ROUTE</span>;
      case 'idle':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#16803C] border border-emerald-200">IDLE STANDBY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#526581] bg-slate-100 border border-slate-200">OFF DUTY</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-[#D9E2EC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#1769D2]" />
            <span>Field Response Squads & Telemetry Roster</span>
          </h2>
          <p className="text-xs text-[#526581]">
            Real-time unit deployment tracking, vehicle allocation, and active work orders.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-[#123B6D] text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1769D2]" />
          <span>Operational Telemetry: {complaints.length} Live Reports</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <Card key={team.id} className="p-4 space-y-3 border-[#D9E2EC] bg-white shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#526581]">{team.id}</span>
                {getStatusBadge(team.status)}
              </div>

              <h3 className="text-sm font-bold text-[#172B4D]">{team.name}</h3>
              <div className="text-xs text-[#526581]">
                Lead Officer: <strong className="text-[#172B4D]">{team.leadOfficer}</strong>
              </div>

              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E8EEF5] text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[#526581]">
                  <Navigation className="w-3 h-3 text-[#1769D2] shrink-0" />
                  <span>Sector: <strong className="text-[#172B4D]">{team.currentZone}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[#526581]">
                  <Truck className="w-3 h-3 text-[#718096] shrink-0" />
                  <span className="font-mono text-[11px] truncate text-[#172B4D]">{team.vehicleRegNumber}</span>
                </div>
              </div>

              {/* Active Assignment */}
              {team.assignedComplaintId ? (
                <div className="p-2.5 rounded bg-blue-50/60 border border-blue-200 text-xs">
                  <div className="text-[10px] font-mono text-[#1769D2] uppercase font-bold">
                    Active Incident Assigned
                  </div>
                  <div
                    onClick={() => onSelectComplaint?.(team.assignedComplaintId!)}
                    className="text-[#172B4D] font-semibold truncate hover:text-[#1769D2] cursor-pointer mt-0.5"
                  >
                    #{team.assignedComplaintId}: {team.assignedComplaintTitle}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#16803C] italic font-medium">
                  Available for immediate emergency dispatch.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E8EEF5] flex items-center justify-between text-xs text-[#526581]">
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#718096]" />
                <span>{team.contactNumber}</span>
              </div>
              <span className="font-mono text-[11px] text-[#16803C] font-semibold">
                {team.resolvedThisWeek} fixes this wk
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

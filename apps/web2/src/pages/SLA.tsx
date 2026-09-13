import React from 'react';
import { Timer, AlertOctagon, Clock, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Complaint } from '../types/complaint';

interface SLAPageProps {
  complaints: Complaint[];
  onSelectComplaint: (id: string) => void;
}

export const SLA: React.FC<SLAPageProps> = ({ complaints, onSelectComplaint }) => {
  const breached = complaints.filter((c) => c.sla.isOverdue && c.status !== 'closed');
  const warning = complaints.filter((c) => !c.sla.isOverdue && c.sla.hoursRemaining <= 6 && c.status !== 'closed');
  const onTrack = complaints.filter((c) => !c.sla.isOverdue && c.sla.hoursRemaining > 6);

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-[#D9E2EC]">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
          <Timer className="w-4 h-4 text-[#D99A00]" />
          <span>Statutory SLA Compliance & Escalation Matrix</span>
        </h2>
        <p className="text-xs text-[#526581]">
          Enforcing contractor accountability, breach penalties, and automated escalation timers.
        </p>
      </div>

      {/* Top Breached Alerts */}
      {breached.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#D92D20] flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-[#D92D20]" />
            <span>Tier 3 Escalation: Immediate Breached Incidents ({breached.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {breached.map((c) => (
              <Card
                key={c.id}
                borderAccent="urgent"
                className="p-3.5 space-y-2 cursor-pointer bg-white hover:bg-red-50/20 shadow-sm transition-colors"
                onClick={() => onSelectComplaint(c.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#D92D20]">#{c.id}</span>
                    <Badge priority={c.priority} />
                  </div>
                  <span className="text-xs font-mono font-bold text-[#D92D20] animate-pulse">
                    {Math.abs(c.sla.hoursRemaining)} HOURS BREACHED
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[#172B4D] line-clamp-1">{c.title}</h4>
                <p className="text-[11px] text-[#526581] line-clamp-2">{c.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-[#E8EEF5] text-[11px]">
                  <span className="text-[#526581]">Escalated to: <strong className="text-[#172B4D]">Executive Engineer & Contractor MD</strong></span>
                  <Button variant="danger" size="sm" className="h-6 text-[10px]">
                    Dispatch Penalty Notice
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Warning Impending Breaches (within 6 hours) */}
      <div className="space-y-2 pt-2">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#B45309]" />
          <span>Tier 2 Warning: Approaching SLA Limit Within 6 Hours ({warning.length})</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {warning.map((c) => (
            <Card
              key={c.id}
              borderAccent="warning"
              className="p-3 space-y-2 cursor-pointer bg-white hover:bg-amber-50/20 shadow-sm transition-colors"
              onClick={() => onSelectComplaint(c.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#B45309]">#{c.id}</span>
                <span className="text-xs font-mono font-bold text-[#B45309]">
                  {c.sla.hoursRemaining}h left
                </span>
              </div>
              <h4 className="text-xs font-semibold text-[#172B4D] line-clamp-1">{c.title}</h4>
              <div className="text-[10px] text-[#526581] font-mono">{c.location.ward}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Statutory Guidelines Reference Table */}
      <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm mt-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
          Statutory Municipal Resolution Benchmarks (Charter of Rights 2026)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[#526581] font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Priority Level</th>
                <th className="py-2.5 px-3">Statutory SLA Target</th>
                <th className="py-2.5 px-3">Escalation Tier 1 (50% Time)</th>
                <th className="py-2.5 px-3">Escalation Tier 2 (80% Time)</th>
                <th className="py-2.5 px-3">Breach Consequence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEF5] font-sans">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-3 font-bold text-[#D92D20]">Urgent / Critical</td>
                <td className="py-2 px-3 font-mono font-bold text-[#172B4D]">12 Hours</td>
                <td className="py-2 px-3 text-[#526581]">6 Hours (Ward Officer Alert)</td>
                <td className="py-2 px-3 text-[#526581]">9 Hours (Exec Engineer)</td>
                <td className="py-2 px-3 text-[#D92D20] font-mono text-[11px] font-semibold">Contractor Penalty ₹5,000/hr</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-3 font-bold text-[#EA580C]">High Priority</td>
                <td className="py-2 px-3 font-mono font-bold text-[#172B4D]">24 Hours</td>
                <td className="py-2 px-3 text-[#526581]">12 Hours</td>
                <td className="py-2 px-3 text-[#526581]">18 Hours</td>
                <td className="py-2 px-3 text-[#EA580C] font-mono text-[11px] font-semibold">Contractor Penalty ₹2,500/hr</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-3 font-bold text-[#D99A00]">Medium Priority</td>
                <td className="py-2 px-3 font-mono font-bold text-[#172B4D]">48 Hours</td>
                <td className="py-2 px-3 text-[#526581]">24 Hours</td>
                <td className="py-2 px-3 text-[#526581]">36 Hours</td>
                <td className="py-2 px-3 text-[#718096] font-mono text-[11px]">Performance rating deduction</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-3 font-bold text-[#1769D2]">Low Priority</td>
                <td className="py-2 px-3 font-mono font-bold text-[#172B4D]">72 Hours</td>
                <td className="py-2 px-3 text-[#526581]">36 Hours</td>
                <td className="py-2 px-3 text-[#526581]">54 Hours</td>
                <td className="py-2 px-3 text-[#718096] font-mono text-[11px]">Warning letter</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

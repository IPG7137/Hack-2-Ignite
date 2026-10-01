import React from 'react';
import {
  FileText,
  Cpu,
  Inbox,
  Wrench,
  CheckCircle2,
  ShieldCheck,
  Landmark,
  ChevronRight,
} from 'lucide-react';

interface GrievanceLifecycleBannerProps {
  activeStage?: number;
  onNavigatePage?: (page: string) => void;
}

export const GrievanceLifecycleBanner: React.FC<GrievanceLifecycleBannerProps> = ({
  onNavigatePage,
}) => {
  const stages = [
    {
      step: 1,
      name: 'Citizen Reports',
      desc: 'Mobile or portal intake with GPS proof',
      icon: FileText,
      page: 'complaints',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      step: 2,
      name: 'CivicResolve Analyzes',
      desc: 'Duplicates & smart priority evaluation',
      icon: Cpu,
      page: 'ai_insights',
      color: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    {
      step: 3,
      name: 'Municipality Triages',
      desc: 'SLA assignment to department / ward',
      icon: Inbox,
      page: 'complaints',
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      step: 4,
      name: 'Field Crew Acts',
      desc: 'Rapid on-site dispatch & remediation',
      icon: Wrench,
      page: 'field_teams',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      step: 5,
      name: 'Issue Resolved',
      desc: 'Officer logs before/after photographic proof',
      icon: CheckCircle2,
      page: 'complaints',
      color: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
      step: 6,
      name: 'Citizen Verifies',
      desc: 'On-site satisfaction sign-off or dispute',
      icon: ShieldCheck,
      page: 'complaints',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      step: 7,
      name: 'State Monitors',
      desc: 'Real-time multi-corporation oversight',
      icon: Landmark,
      page: 'dashboard',
      color: 'text-sky-700 bg-sky-50 border-sky-200',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1769D2]" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
            Maharashtra Municipal Operations & Grievance Redressal Architecture
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
          Closed-Loop Statutory Redressal Workflow
        </span>
      </div>

      {/* Responsive Horizontal Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {stages.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div
              key={st.step}
              onClick={() => onNavigatePage?.(st.page)}
              className="p-2 sm:p-2.5 rounded-lg border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
              title={`Click to view ${st.name} in command console`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="font-mono text-[10px] font-black text-slate-400 group-hover:text-[#1769D2] transition-colors">
                  0{st.step}
                </span>
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center border shrink-0 ${st.color}`}
                >
                  <Icon className="w-3 h-3 stroke-[2.25]" />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-800 group-hover:text-[#123B6D] transition-colors leading-tight">
                  {st.name}
                </div>
                <div className="text-[9.5px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                  {st.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

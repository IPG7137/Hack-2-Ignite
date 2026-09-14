import React from 'react';
import {
  LayoutDashboard,
  FileText,
  MapPin,
  BarChart3,
  Cpu,
  Building2,
  Users,
  Timer,
  Bot,
  Settings,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export type ActivePage =
  | 'dashboard'
  | 'complaints'
  | 'complaint_details'
  | 'map'
  | 'analytics'
  | 'ai_insights'
  | 'departments'
  | 'field_teams'
  | 'sla'
  | 'copilot'
  | 'settings';

interface CommandSidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  urgentCount?: number;
  openCount?: number;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  activePage,
  onSelectPage,
  urgentCount = 4,
  openCount = 18,
}) => {
  const { user } = useAuth();
  const isMunicipalAdmin = user?.role === 'municipal_admin' || user?.role === 'super_admin';

  const municipalAdminMenuItems: Array<{
    id: ActivePage;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: 'dashboard', label: 'Command Overview', icon: LayoutDashboard },
    { id: 'complaints', label: 'Complaints Queue', icon: FileText, badge: openCount },
    { id: 'map', label: 'GIS Incident Map', icon: MapPin },
    { id: 'analytics', label: 'Operations Analytics', icon: BarChart3 },
    { id: 'ai_insights', label: 'Hazard & Anomaly Radar', icon: Cpu, badge: 3, badgeColor: 'bg-red-50 text-red-700 border border-red-200' },
    { id: 'departments', label: 'Departments & Wards', icon: Building2 },
    { id: 'field_teams', label: 'Field Response Crews', icon: Users },
    { id: 'sla', label: 'SLA Escalation Matrix', icon: Timer, badge: urgentCount, badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200' },
    { id: 'copilot', label: 'Decision Support Studio', icon: Bot },
    { id: 'settings', label: 'System Configuration', icon: Settings },
  ];

  const zoneAdminMenuItems: Array<{
    id: ActivePage;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: 'dashboard', label: 'Zone 2 Overview', icon: LayoutDashboard },
    { id: 'complaints', label: 'Zone 2 Queue', icon: FileText, badge: openCount },
    { id: 'map', label: 'Zone 2 Incident Map', icon: MapPin },
    { id: 'field_teams', label: 'Field Response Crews', icon: Users },
    { id: 'sla', label: 'Zone 2 SLA Matrix', icon: Timer, badge: urgentCount, badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200' },
    { id: 'copilot', label: 'Field Decision Copilot', icon: Bot },
  ];

  const menuItems = isMunicipalAdmin ? municipalAdminMenuItems : zoneAdminMenuItems;

  return (
    <aside className="w-64 border-r border-[#D9E2EC] bg-white flex flex-col shrink-0 select-none shadow-xs h-full min-h-0">
      <div className="p-3 text-[10px] font-mono uppercase tracking-wider text-[#718096] font-bold border-b border-[#E8EEF5] shrink-0 flex items-center justify-between">
        <span>{isMunicipalAdmin ? 'Operations Control (HQ)' : 'Zone 2 Operations Desk'}</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-[#172B4D] font-bold font-mono">
          {isMunicipalAdmin ? 'HQ' : 'ZONE 2'}
        </span>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto min-h-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id || (item.id === 'complaints' && activePage === 'complaint_details');

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-all group text-left border-l-4',
                isActive
                  ? 'bg-blue-50/80 text-[#123B6D] border-l-[#1769D2] border-t-transparent border-r-transparent border-b-transparent shadow-xs'
                  : 'border-l-transparent text-[#526581] hover:text-[#172B4D] hover:bg-slate-50'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-[#1769D2]' : 'text-[#718096] group-hover:text-[#526581]'
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded font-mono font-bold leading-tight',
                      item.badgeColor || 'bg-slate-100 text-[#172B4D] border border-[#D9E2EC]'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#1769D2]" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Anchored Bottom Government & Operational Branding */}
      <div className="shrink-0 mt-auto">
        {/* Institutional Initiative Badge */}
        <div className="p-2.5 border-t border-[#E8EEF5] bg-[#F8FAFC]">
          <div className="p-2 rounded bg-white border border-[#D9E2EC] flex items-center gap-2.5 shadow-xs">
            <img
              src="/assets/images/digital_india_badge.svg"
              alt="National Flag"
              className="w-7 h-auto shrink-0 rounded border border-[#E8EEF5]"
            />
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-[#123B6D] tracking-tight">Digital India</div>
              <div className="text-[9px] text-[#526581] font-medium">Urban Grievance Platform</div>
            </div>
          </div>
        </div>

        {/* Ward Status Footnote */}
        <div className="p-2.5 border-t border-[#E8EEF5] bg-[#F8FAFC] text-[11px]">
          <div className="flex items-center justify-between text-[#526581]">
            <span>Active Command Ward:</span>
            <span className="font-mono text-[#172B4D] font-bold">
              {isMunicipalAdmin ? 'City-wide HQ (All Wards)' : user?.ward || 'Zone 2 Command'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#718096] text-[10px] mt-1">
            <span>SLA Adherence:</span>
            <span className="text-[#16803C] font-mono font-bold">91.8% Target Met</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

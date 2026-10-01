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
  Shield,
  ShieldAlert,
  Trophy,
  Award,
  Layers,
  Bell,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

import { useOrganization } from '../../context/OrganizationContext';
import { STATE_OF_MAHARASHTRA_SEAL } from '../../data/maharashtraDistricts';

export type ActivePage =
  | 'dashboard'
  | 'complaints'
  | 'complaint_details'
  | 'map'
  | 'alerts'
  | 'notifications'
  | 'analytics'
  | 'ai_insights'
  | 'departments'
  | 'field_teams'
  | 'sla'
  | 'copilot'
  | 'civic_champions'
  | 'settings'
  | 'privacy'
  | 'terms';

interface CommandSidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  urgentCount?: number;
  openCount?: number;
  alertCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  activePage,
  onSelectPage,
  urgentCount = 4,
  openCount = 18,
  alertCount = 3,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const { organizationType, currentCorporation, municipalCorporationName, setOrganization } = useOrganization();
  const isStateAdmin = organizationType === 'STATE' || user?.role === 'state_admin';
  const isDistrictAdmin = user?.role === 'district_admin' || user?.role === 'municipal_admin' || user?.role === 'super_admin';
  const isMunicipalAdmin = isDistrictAdmin;
  const isZoneAdmin = user?.role === 'zone_admin';

  const zoneSections: NavSection[] = [
    {
      title: 'ZONE OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Zone Dashboard', icon: LayoutDashboard },
        { id: 'map', label: 'Zone GIS Map', icon: MapPin },
        { id: 'civic_champions', label: 'Civic Champions & Rewards', icon: Trophy },
      ],
    },
    {
      title: 'ZONE OPERATIONS',
      items: [
        {
          id: 'alerts',
          label: 'Zone Alert Center',
          icon: ShieldAlert,
          badge: alertCount,
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
        },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'complaints', label: 'Zone Complaints Queue', icon: FileText, badge: openCount },
        {
          id: 'sla',
          label: 'Zone SLA Compliance',
          icon: Timer,
          badge: urgentCount,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        },
        { id: 'field_teams', label: 'Zone Field Crews', icon: Users },
      ],
    },
    {
      title: 'ZONE INTELLIGENCE',
      items: [
        {
          id: 'ai_insights',
          label: 'Zone Hazard Radar',
          icon: Cpu,
          badge: 3,
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
        },
        { id: 'analytics', label: 'Zone Analytics', icon: BarChart3 },
        { id: 'copilot', label: 'Zone Copilot', icon: Bot },
      ],
    },
  ];

  const stateSections: NavSection[] = [
    {
      title: 'STATE OVERVIEW',
      items: [
        { id: 'dashboard', label: 'State Dashboard', icon: LayoutDashboard },
        { id: 'map', label: 'Maharashtra GIS Map', icon: MapPin },
        { id: 'civic_champions', label: 'Civic Champions & Rewards', icon: Trophy },
      ],
    },
    {
      title: 'MUNICIPAL MONITORING',
      items: [
        { id: 'departments', label: 'Municipal Corporations', icon: Building2 },
        { id: 'complaints', label: 'State Grievances Queue', icon: FileText, badge: openCount },
        {
          id: 'alerts',
          label: 'Smart Alert Center',
          icon: ShieldAlert,
          badge: alertCount,
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
        },
        {
          id: 'sla',
          label: 'SLA Escalation Monitoring',
          icon: Timer,
          badge: urgentCount,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        },
      ],
    },
    {
      title: 'STATE INTELLIGENCE',
      items: [
        {
          id: 'ai_insights',
          label: 'State Anomaly Radar',
          icon: Cpu,
          badge: 3,
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
        },
        { id: 'analytics', label: 'Statewide Analytics', icon: BarChart3 },
        { id: 'copilot', label: 'Executive Copilot', icon: Bot },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [{ id: 'settings', label: 'State Policy & Config', icon: Settings }],
    },
  ];

  const municipalSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Command Overview', icon: LayoutDashboard },
        { id: 'map', label: 'Live GIS Map', icon: MapPin },
        { id: 'civic_champions', label: 'Civic Champions & Rewards', icon: Trophy },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          id: 'alerts',
          label: 'Smart Alert Center',
          icon: ShieldAlert,
          badge: alertCount,
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
        },
        { id: 'notifications', label: 'Notification Center', icon: Bell },
        { id: 'complaints', label: 'Complaints Queue', icon: FileText, badge: openCount },
        {
          id: 'sla',
          label: 'SLA Escalation Matrix',
          icon: Timer,
          badge: urgentCount,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        },
        { id: 'field_teams', label: 'Field Response Crews', icon: Users },
        ...(isDistrictAdmin
          ? [{ id: 'departments' as ActivePage, label: 'Departments & Wards', icon: Building2 }]
          : []),
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        {
          id: 'ai_insights',
          label: 'Hazard & Anomaly Radar',
          icon: Cpu,
          badge: 3,
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
        },
        { id: 'analytics', label: 'Operations Analytics', icon: BarChart3 },
        { id: 'copilot', label: 'Decision Copilot', icon: Bot },
      ],
    },
    ...(isDistrictAdmin
      ? [
          {
            title: 'ADMINISTRATION',
            items: [{ id: 'settings' as ActivePage, label: 'System Configuration', icon: Settings }],
          },
        ]
      : []),
  ];

  const citizenSections: NavSection[] = [
    {
      title: 'CITIZEN SERVICES',
      items: [
        { id: 'dashboard', label: 'Civic Feed & Overview', icon: LayoutDashboard },
        { id: 'complaints', label: 'My Grievance Tracking', icon: FileText, badge: openCount },
        { id: 'map', label: 'Ward GIS Map', icon: MapPin },
        { id: 'civic_champions', label: 'Civic Rewards & Badges', icon: Trophy },
      ],
    },
    {
      title: 'COMMUNITY & NOTIFICATIONS',
      items: [
        { id: 'notifications', label: 'Status Updates & Alerts', icon: Bell },
        {
          id: 'alerts',
          label: 'Public Safety Alerts',
          icon: ShieldAlert,
          badge: alertCount,
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
        },
      ],
    },
  ];

  const sections: NavSection[] =
    user?.role === 'citizen'
      ? citizenSections
      : isZoneAdmin
      ? zoneSections
      : organizationType === 'STATE'
      ? stateSections
      : municipalSections;

  const handleItemClick = (id: ActivePage) => {
    onSelectPage(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-64 min-w-[256px] max-w-[256px] border-r border-slate-200 bg-white flex flex-col shrink-0 select-none shadow-xs h-full min-h-0 z-30 transition-transform duration-200 ease-in-out',
          'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header / Brand Indicator */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center p-0.5 border border-slate-200 shadow-2xs shrink-0">
              <img
                src={
                  isStateAdmin
                    ? STATE_OF_MAHARASHTRA_SEAL
                    : currentCorporation?.logoUrl || STATE_OF_MAHARASHTRA_SEAL
                }
                alt={currentCorporation?.shortName || 'Logo'}
                className="w-full h-full object-contain"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = STATE_OF_MAHARASHTRA_SEAL;
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight text-[#123B6D] truncate">
                {isStateAdmin ? 'MAHARASHTRA' : currentCorporation?.shortName || 'CIVICRESOLVE'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
                {isStateAdmin
                  ? 'State Admin HQ'
                  : currentCorporation?.name
                  ? currentCorporation.name
                  : isMunicipalAdmin
                  ? 'Command HQ'
                  : user?.ward || 'Zone 2 Desk'}
              </div>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* State Admin Drilldown Return Quick Action */}
        {user?.role === 'state_admin' && organizationType === 'MUNICIPAL_CORPORATION' && (
          <div className="p-2 border-b border-blue-100 bg-blue-50/70 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOrganization('STATE', null, null);
                onSelectPage('dashboard');
              }}
              className="w-full py-1.5 px-2 rounded-md bg-[#123B6D] hover:bg-[#1769D2] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span>🏛️ Return to State Overview</span>
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto min-h-0">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activePage === item.id ||
                    (item.id === 'complaints' && activePage === 'complaint_details');

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all group text-left',
                        isActive
                          ? 'bg-blue-50/90 text-[#123B6D] font-bold shadow-2xs border border-blue-200/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 transition-colors',
                            isActive ? 'text-[#1769D2]' : 'text-slate-400 group-hover:text-slate-600'
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none border',
                              item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#1769D2] shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Anchored Bottom Government & Operational Footnote */}
        <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 p-3 space-y-2">
          {/* Institutional Initiative Badge */}
          <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center gap-2.5 shadow-2xs">
            <img
              src="/assets/images/digital_india_badge.svg"
              alt="Digital India Initiative"
              className="w-6 h-auto shrink-0 rounded border border-slate-100"
            />
            <div className="leading-tight min-w-0">
              <div className="text-[11px] font-bold text-[#123B6D] truncate">Digital India Urban</div>
              <div className="text-[9px] text-slate-500 font-medium">Grievance Redressal</div>
            </div>
          </div>

          {/* Operational Ward Status */}
          <div className="px-1 text-[11px] space-y-0.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px]">Command Scope:</span>
              <span className="font-mono text-slate-800 font-bold text-[10px] truncate max-w-[120px]">
                {isMunicipalAdmin ? 'HQ (City-wide)' : user?.ward || 'Zone 2'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px]">SLA Target:</span>
              <span className="text-emerald-700 font-mono font-bold text-[10px]">
                91.8% Compliant
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
              <button
                onClick={() => onSelectPage('privacy')}
                className="hover:text-[#1769D2] hover:underline"
              >
                Privacy
              </button>
              <span>•</span>
              <button
                onClick={() => onSelectPage('terms')}
                className="hover:text-[#1769D2] hover:underline"
              >
                Terms
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

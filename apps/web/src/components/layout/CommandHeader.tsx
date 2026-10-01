import React, { useState, useEffect } from 'react';
import { RefreshCw, LogIn, LogOut, ShieldCheck, Building, Menu, Bot, FilePlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../context/OrganizationContext';
import { LoginModal } from '../auth/LoginModal';
import { NotificationBell } from '../notifications/NotificationBell';
import { JurisdictionSelector } from './JurisdictionSelector';
import { STATE_OF_MAHARASHTRA_SEAL } from '../../data/maharashtraDistricts';

interface CommandHeaderProps {
  onOpenCopilot?: () => void;
  onOpenReport?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onToggleMobileMenu?: () => void;
  onNavigateToNotifications?: () => void;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  onOpenCopilot,
  onOpenReport,
  onRefresh,
  isRefreshing = false,
  onToggleMobileMenu,
  onNavigateToNotifications,
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const {
    organizationType,
    municipalCorporationName,
    currentCorporation,
    district,
    stateName,
  } = useOrganization();

  const isStateAdmin = organizationType === 'STATE' || user?.role === 'state_admin';
  const isMunicipalAdmin = user?.role === 'municipal_admin' || user?.role === 'super_admin';
  const isZoneAdmin = user?.role === 'officer' || user?.role === 'dept_admin';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'MO';
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'state_admin':
        return 'State Administrator';
      case 'super_admin':
        return 'Super Admin';
      case 'municipal_admin':
        return 'Municipal Admin (HQ)';
      case 'dept_admin':
        return 'Dept Admin';
      case 'citizen':
        return 'Citizen Portal';
      case 'officer':
      default:
        return 'Field Duty Officer';
    }
  };

  const isCitizen = user?.role === 'citizen';

  // Header Title and Subtitle dynamically formatted per Role / State vs Municipal selection
  const headerTitle = isCitizen
    ? 'CivicResolve — Citizen Grievance Portal'
    : isStateAdmin
    ? 'CivicResolve — Maharashtra State Command'
    : `CivicResolve — ${currentCorporation?.shortName || municipalCorporationName || 'Municipal'} Command`;

  const headerSubtitle = isCitizen
    ? `District of ${(user?.districtId || district || 'Pune').toUpperCase()} • Participatory Governance`
    : isStateAdmin
    ? 'Statewide Municipal Operations & Multi-Corporation Oversight'
    : `${municipalCorporationName || 'Municipal Corporation'} • Command Center Operations Desk`;

  const orgEmblemTitle = isCitizen
    ? `CITIZEN GRIEVANCE PORTAL — ${(user?.districtId || district || 'MAHARASHTRA').toUpperCase()}`
    : isStateAdmin
    ? 'MAHARASHTRA STATE ADMINISTRATION'
    : (municipalCorporationName || 'MUNICIPAL CORPORATION').toUpperCase();

  const orgEmblemSubtitle = isCitizen
    ? 'Public Grievance Redressal & Resolution Tracking'
    : isStateAdmin
    ? 'Urban Development Department • State Oversight'
    : `District: ${district || 'Maharashtra'} • Municipal Command Center`;

  return (
    <>
      <header className="h-[68px] w-full max-w-full border-b border-[#D9E2EC] bg-white sticky top-0 z-40 px-3 sm:px-4 lg:px-5 flex items-center justify-between shadow-xs select-none gap-2 overflow-hidden shrink-0">
        {/* ==================================================
            1. GOVERNMENT BRANDING (LEFT)
            ================================================== */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 max-w-[260px] lg:max-w-[300px] xl:max-w-[340px]">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center p-0.5 shadow-2xs border border-slate-200 shrink-0">
            <img
              src={
                isStateAdmin
                  ? STATE_OF_MAHARASHTRA_SEAL
                  : currentCorporation?.logoUrl || STATE_OF_MAHARASHTRA_SEAL
              }
              alt={currentCorporation?.name || 'Maharashtra Emblem'}
              className="w-full h-full object-contain"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = STATE_OF_MAHARASHTRA_SEAL;
              }}
            />
          </div>
          <div className="flex flex-col justify-center min-w-0 overflow-hidden">
            <div className="text-xs sm:text-[13px] font-bold text-[#123B6D] tracking-tight leading-snug truncate">
              {orgEmblemTitle}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-[#526581] leading-snug truncate">
              {orgEmblemSubtitle}
            </div>
            <div className="text-[9px] text-[#718096] uppercase tracking-wider leading-none hidden xl:block truncate">
              {isStateAdmin
                ? 'Government of Maharashtra • Level 1 Governance'
                : `State of Maharashtra • Level 2 Municipal Administration`}
            </div>
          </div>
        </div>

        {/* ==================================================
            2. COMMAND JURISDICTION SWITCHER (CENTER)
            ================================================== */}
        <div className="flex-1 min-w-0 px-2 flex items-center justify-center">
          <JurisdictionSelector variant="header" />
        </div>

        {/* ==================================================
            3. RIGHT CONTROLS: [ Status ] [ Demo ] [ Time ] [ Copilot ] [ Sync ] [ Notification ] [ User ]
            ================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Status Heartbeat */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] shadow-2xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#16803C] live-pulse-dot shrink-0" />
            <span className="text-[#172B4D] text-[10.5px] font-mono font-bold tracking-wider whitespace-nowrap">
              OPERATIONAL
            </span>
          </div>

          {/* Demonstration Environment Tag */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50/80 border border-amber-200/80 text-amber-800 shadow-2xs shrink-0" title="Demonstration & Evaluation Environment for Hack-2-Ignite">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase whitespace-nowrap">
              DEMO ENVIRONMENT
            </span>
          </div>

          {/* Time (IST) */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] text-[#526581] shadow-2xs shrink-0">
            <span className="text-[#718096] text-[9px] font-bold font-mono">IST</span>
            <span className="text-[#172B4D] font-bold text-[11px] font-mono whitespace-nowrap">
              {timeString || '--:--:--'}
            </span>
          </div>

          {/* Report Issue Action (if provided) */}
          {onOpenReport && (
            <div className="flex items-center shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenReport}
                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shrink-0 flex items-center gap-1 rounded-lg border border-emerald-500 cursor-pointer"
                title="Lodge a new civic grievance"
              >
                <FilePlus className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                <span className="hidden xl:inline font-bold whitespace-nowrap">Report</span>
              </Button>
            </div>
          )}

          {/* AI Civic Copilot Launcher */}
          {onOpenCopilot && (
            <div className="flex items-center shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenCopilot}
                className="h-8 px-2 sm:px-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold shadow-xs shrink-0 flex items-center gap-1 rounded-lg border border-blue-600"
                title="Open Civic Copilot AI Assistant"
              >
                <Bot className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                <span className="hidden sm:inline font-bold whitespace-nowrap">Civic Copilot</span>
              </Button>
            </div>
          )}

          {/* Live Sync / Refresh */}
          <div className="flex items-center shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              loading={isRefreshing}
              className="h-8 px-2 text-[#526581] border-[#D9E2EC] hover:text-[#172B4D] hover:bg-slate-50 text-xs shadow-2xs shrink-0"
              title="Synchronize incident feeds"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:mr-1 text-[#718096] shrink-0" />
              <span className="hidden xl:inline font-medium whitespace-nowrap">Live Sync</span>
            </Button>
          </div>

          {/* Notification Bell */}
          <div className="flex items-center shrink-0">
            <NotificationBell onNavigateToNotifications={onNavigateToNotifications} />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[#D9E2EC] mx-0.5 shrink-0" />

          {/* User Profile / Supabase Session Widget */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 border border-blue-200 text-[#1769D2] flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                {getInitials(user.fullName, user.email)}
              </div>
              <div className="text-left shrink-0 hidden 2xl:block max-w-[110px]">
                <div className="text-xs font-bold text-[#172B4D] leading-tight truncate">
                  {user.fullName || getRoleLabel(user.role)}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1.5 text-[#718096] hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                title="Sign out of Administrative Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLoginOpen(true)}
                className="h-8 px-2.5 text-[#123B6D] border-[#1769D2] hover:bg-blue-50 text-xs font-bold shadow-2xs shrink-0 flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5 text-[#1769D2]" />
                <span className="whitespace-nowrap">Login</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};

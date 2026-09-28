import React, { useState, useEffect } from 'react';
import { RefreshCw, LogIn, LogOut, ShieldCheck, MapPin, Building, Menu, Bot } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../context/OrganizationContext';
import { LoginModal } from '../auth/LoginModal';
import { NotificationBell } from '../notifications/NotificationBell';

interface CommandHeaderProps {
  onOpenCopilot?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onToggleMobileMenu?: () => void;
  onNavigateToNotifications?: () => void;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  onOpenCopilot,
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

  // Header Title and Subtitle dynamically formatted per State vs Municipal selection
  const headerTitle = isStateAdmin
    ? 'CivicResolve — Maharashtra State Command'
    : `CivicResolve — ${currentCorporation?.shortName || municipalCorporationName || 'Municipal'} Command`;

  const headerSubtitle = isStateAdmin
    ? 'Statewide Municipal Operations & Multi-Corporation Oversight'
    : `${municipalCorporationName || 'Municipal Corporation'} • Command Center Operations Desk`;

  const scopeBadgeLabel = isStateAdmin
    ? 'Maharashtra Statewide'
    : isMunicipalAdmin
    ? `${currentCorporation?.shortName || 'City-wide'} HQ`
    : user?.ward || `${currentCorporation?.shortName || 'Zone'} Command`;

  const orgEmblemTitle = isStateAdmin
    ? 'MAHARASHTRA STATE ADMINISTRATION'
    : (municipalCorporationName || 'MUNICIPAL CORPORATION').toUpperCase();

  const orgEmblemSubtitle = isStateAdmin
    ? 'Urban Development Department • State Oversight'
    : `District: ${district || 'Maharashtra'} • Municipal Command Center`;

  return (
    <>
      <header className="h-[74px] w-full max-w-full border-b border-[#D9E2EC] bg-white sticky top-0 z-40 px-3 sm:px-4 lg:px-6 flex items-center justify-between shadow-xs select-none gap-3 overflow-hidden">
        {/* ==================================================
            ZONE 1 (LEFT): STATE / MUNICIPAL CORPORATION IDENTITY
            ================================================== */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#123B6D] text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs border border-blue-900 shrink-0">
            {isStateAdmin ? '🏛️' : '🏢'}
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-xs sm:text-[13px] lg:text-[14px] font-bold text-[#123B6D] tracking-tight leading-snug whitespace-nowrap">
              {orgEmblemTitle}
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-[#526581] leading-snug whitespace-nowrap">
              {orgEmblemSubtitle}
            </div>
            <div className="text-[9px] text-[#718096] uppercase tracking-wider leading-snug hidden md:block whitespace-nowrap">
              {isStateAdmin
                ? 'Government of Maharashtra • Level 1 Governance'
                : `State of Maharashtra • Level 2 Municipal Administration`}
            </div>
          </div>
        </div>

        {/* Divider between Municipal Identity and CivicResolve Portal on large screens */}
        <div className="hidden 2xl:block h-8 w-px bg-[#D9E2EC] shrink-0" />

        {/* ==================================================
            ZONE 2 (CENTER): CIVICRESOLVE PORTAL BRANDING (ROLE SPECIFIC)
            ================================================== */}
        <div className="hidden lg:flex flex-1 min-w-0 max-w-[560px] flex-col items-center justify-center px-2 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-sm xl:text-[15px] font-bold text-[#123B6D] tracking-wide whitespace-nowrap">
              {headerTitle}
            </span>
            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold whitespace-nowrap border ${
              isMunicipalAdmin
                ? 'bg-blue-50 text-[#1769D2] border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {isMunicipalAdmin ? 'HQ Command' : 'Zone 2 Operations'}
            </span>
            {isAuthenticated && (
              <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-50 text-[#526581] border border-[#D9E2EC] whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>AUTH SESSION</span>
              </span>
            )}
          </div>
          <span className="text-[10.5px] xl:text-[11px] text-[#526581] font-medium tracking-tight mt-0.5 truncate max-w-full">
            {headerSubtitle}
          </span>
        </div>

        {/* ==================================================
            ZONE 3 (RIGHT): STATUS, TELEMETRY, ACTIONS & PROFILE
            ================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Operational Telemetry & Time */}
          <div className="hidden md:flex items-center gap-1.5 xl:gap-2 text-xs font-mono shrink-0">
            {/* Jurisdiction Badge */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] text-[#526581] shadow-2xs shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#1769D2]" />
              <span className="text-[#172B4D] font-bold text-xs whitespace-nowrap">{scopeBadgeLabel}</span>
            </div>

            {/* System Operational Heartbeat */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] shadow-2xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#16803C] live-pulse-dot" />
              <span className="text-[#172B4D] text-[11px] font-bold tracking-wider whitespace-nowrap">
                OPERATIONAL
              </span>
            </div>

            {/* IST Clock */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] text-[#526581] shadow-2xs shrink-0">
              <span className="text-[#718096] text-[10px] font-bold">IST</span>
              <span className="text-[#172B4D] font-bold text-xs whitespace-nowrap">{timeString || '--:--:--'}</span>
            </div>
          </div>

          {/* AI Civic Copilot Launcher */}
          {onOpenCopilot && (
            <div className="flex items-center shrink-0">
              <Button
                variant="default"
                size="sm"
                onClick={onOpenCopilot}
                className="h-8.5 px-2.5 sm:px-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold shadow-xs shrink-0 flex items-center gap-1.5 rounded-lg border border-blue-600"
                title="Open Civic Copilot AI Assistant"
              >
                <Bot className="w-3.5 h-3.5 text-blue-200" />
                <span className="hidden sm:inline font-bold whitespace-nowrap">Civic Copilot</span>
              </Button>
            </div>
          )}

          {/* Refresh Control */}
          <div className="flex items-center shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              loading={isRefreshing}
              className="h-8.5 px-2 sm:px-2.5 text-[#526581] border-[#D9E2EC] hover:text-[#172B4D] hover:bg-slate-50 text-xs shadow-2xs shrink-0"
              title="Synchronize incident feeds"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:mr-1 text-[#718096]" />
              <span className="hidden sm:inline font-medium whitespace-nowrap">Live Sync</span>
            </Button>
          {/* Notification Bell */}
          <div className="flex items-center shrink-0">
            <NotificationBell onNavigateToNotifications={onNavigateToNotifications} />
          </div>

          {/* Divider */}
          <div className="h-7 w-px bg-[#D9E2EC] mx-0.5 sm:mx-1 shrink-0" />

          {/* User Profile / Supabase Session Widget */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-[#1769D2] flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                {getInitials(user.fullName, user.email)}
              </div>
              <div className="text-left shrink-0 hidden xl:block max-w-[130px]">
                <div className="text-xs font-bold text-[#172B4D] leading-tight truncate">
                  {user.fullName || getRoleLabel(user.role)}
                </div>
                <div className="text-[10px] text-[#526581] font-medium leading-tight truncate">
                  {user.ward || user.departmentName || getRoleLabel(user.role)}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="px-2 py-1 text-[11px] font-semibold text-[#526581] hover:text-[#123B6D] hover:bg-slate-100 rounded border border-[#D9E2EC] transition-colors shrink-0 hidden sm:flex items-center gap-1"
                title="Switch Administrative Level or Corporation"
              >
                <span>Switch Org</span>
              </button>
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
                className="h-8.5 px-2.5 sm:px-3 text-[#123B6D] border-[#1769D2] hover:bg-blue-50 text-xs font-bold shadow-2xs shrink-0 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-[#1769D2]" />
                <span className="whitespace-nowrap">Officer Login</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};

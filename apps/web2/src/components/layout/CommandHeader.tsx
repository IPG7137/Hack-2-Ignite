import React, { useState, useEffect } from 'react';
import { RefreshCw, LogIn, LogOut, UserCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { LoginModal } from '../auth/LoginModal';

interface CommandHeaderProps {
  onOpenCopilot?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  onRefresh,
  isRefreshing = false,
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();

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
      case 'super_admin':
        return 'Super Admin';
      case 'municipal_admin':
        return 'Municipal Admin';
      case 'dept_admin':
        return 'Dept Admin';
      case 'citizen':
        return 'Citizen Portal';
      case 'officer':
      default:
        return 'Duty Officer';
    }
  };

  return (
    <>
      <header className="h-[76px] w-full max-w-full border-b border-[#D9E2EC] bg-white sticky top-0 z-40 px-4 xl:px-5 flex items-center justify-between shadow-xs select-none overflow-hidden">
        {/* ==================================================
            ZONE 1 (LEFT): MUNICIPAL CORPORATION IDENTITY
            ================================================== */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/assets/images/municipal_emblem.png"
            alt="Municipal Corporation Emblem"
            className="w-11 h-11 object-contain shrink-0 drop-shadow-xs"
          />
          <div className="flex flex-col justify-center shrink-0">
            <div className="text-[14px] font-bold text-[#123B6D] tracking-tight leading-snug whitespace-nowrap">
              MUNICIPAL CORPORATION
            </div>
            <div className="text-[11px] font-semibold text-[#526581] leading-snug whitespace-nowrap">
              महानगरपालिका तक्रार निवारण कक्ष
            </div>
            <div className="text-[9px] text-[#718096] uppercase tracking-wider leading-snug hidden sm:block whitespace-nowrap">
              Clean City • Safe City • Smart City
            </div>
          </div>
        </div>

        {/* ==================================================
            ZONE 2 (CENTER): CIVICRESOLVE PORTAL BRANDING
            ================================================== */}
        <div className="hidden lg:flex flex-1 min-w-0 flex-col items-center justify-center px-4 text-center">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base font-bold text-[#123B6D] tracking-wide whitespace-nowrap">
              CivicResolve
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-bold whitespace-nowrap">
              Portal v2.0
            </span>
            {isAuthenticated && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>AUTH SESSION</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#526581] font-medium tracking-tight mt-0.5 truncate max-w-full">
            Municipal Operations & Grievance Redressal System
          </span>
        </div>

        {/* ==================================================
            ZONE 3 (RIGHT): STATUS, TELEMETRY, ACTIONS & PROFILE
            ================================================== */}
        <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
          {/* Operational Telemetry & Time */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono shrink-0">
            {/* Weather Widget */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] text-[#526581] shadow-2xs shrink-0">
              <span className="text-amber-500 text-xs">☀️</span>
              <span className="text-[#172B4D] font-bold text-xs">28°C</span>
              <span className="text-[10px] text-[#718096] hidden 2xl:inline">HQ Command</span>
            </div>

            {/* System Operational Heartbeat */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] shadow-2xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#16803C] live-pulse-dot" />
              <span className="text-[#172B4D] text-[11px] font-bold tracking-wider whitespace-nowrap">
                OPERATIONAL
              </span>
            </div>

            {/* IST Clock */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] text-[#526581] shadow-2xs shrink-0">
              <span className="text-[#718096] text-[10px] font-bold">IST</span>
              <span className="text-[#172B4D] font-bold text-xs whitespace-nowrap">{timeString || '--:--:--'}</span>
            </div>
          </div>

          {/* Refresh Control */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              loading={isRefreshing}
              className="h-8.5 px-2.5 text-[#526581] border-[#D9E2EC] hover:text-[#172B4D] hover:bg-slate-50 text-xs shadow-2xs shrink-0"
              title="Synchronize incident feeds"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#718096]" />
              <span className="hidden sm:inline font-medium whitespace-nowrap">Live Sync</span>
            </Button>
          </div>

          {/* Divider */}
          <div className="h-7 w-px bg-[#D9E2EC] mx-1 shrink-0 hidden sm:block" />

          {/* User Profile / Supabase Session Widget */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 shrink-0 pl-1 pr-1">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-[#1769D2] flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                {getInitials(user.fullName, user.email)}
              </div>
              <div className="text-left shrink-0 hidden sm:block">
                <div className="text-xs font-bold text-[#172B4D] leading-tight whitespace-nowrap">
                  {user.fullName || getRoleLabel(user.role)}
                </div>
                <div className="text-[10px] text-[#526581] font-medium leading-tight whitespace-nowrap">
                  {user.ward || user.departmentName || getRoleLabel(user.role)}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1.5 text-[#718096] hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Sign out of Supabase Auth"
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
                className="h-8.5 px-3 text-[#123B6D] border-[#1769D2] hover:bg-blue-50 text-xs font-bold shadow-2xs shrink-0 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>Officer Login</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};

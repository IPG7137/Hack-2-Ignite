import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface CommandHeaderProps {
  onOpenCopilot?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  onOpenCopilot,
  onRefresh,
  isRefreshing = false,
}) => {
  const [timeString, setTimeString] = useState<string>('');

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

  return (
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
          Flexible width that absorbs remaining horizontal space
          without causing overflow
          ================================================== */}
      <div className="hidden lg:flex flex-1 min-w-0 flex-col items-center justify-center px-4 text-center">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-base font-bold text-[#123B6D] tracking-wide whitespace-nowrap">
            CivicResolve
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-bold whitespace-nowrap">
            Portal v2.0
          </span>
        </div>
        <span className="text-[11px] text-[#526581] font-medium tracking-tight mt-0.5 truncate max-w-full">
          Municipal Operations & Grievance Redressal System
        </span>
      </div>

      {/* ==================================================
          ZONE 3 (RIGHT): STATUS, TELEMETRY, ACTIONS & PROFILE
          Strictly shrink-0 with comfortable margins & padding
          ================================================== */}
      <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
        {/* Visual Group 1: Operational Telemetry & Time */}
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

        {/* Visual Group 2: Action Controls */}
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

        {/* Visual Group 3: Duty Officer Profile */}
        <div className="flex items-center gap-2.5 shrink-0 pl-1 pr-1">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-[#1769D2] flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
            MO
          </div>
          <div className="text-left shrink-0">
            <div className="text-xs font-bold text-[#172B4D] leading-tight whitespace-nowrap">
              Duty Officer
            </div>
            <div className="text-[10px] text-[#526581] font-medium leading-tight whitespace-nowrap">
              Zone 2 Command
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

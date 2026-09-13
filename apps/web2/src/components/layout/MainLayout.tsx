import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CommandHeader } from './CommandHeader';
import { CommandSidebar, ActivePage } from './CommandSidebar';
import { CopilotDrawer } from '../copilot/CopilotDrawer';
import { Complaint } from '../../types/complaint';

interface MainLayoutProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  complaints: Complaint[];
  onSelectComplaint?: (id: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activePage,
  onSelectPage,
  complaints,
  onSelectComplaint,
  onRefresh = () => {},
  isRefreshing = false,
  children,
}) => {
  const [copilotOpen, setCopilotOpen] = useState(false);

  const urgentCount = complaints.filter((c) => c.priority === 'urgent' && c.status !== 'closed').length;
  const openCount = complaints.filter((c) => c.status !== 'closed' && c.status !== 'verified').length;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F7F9FC] text-[#172B4D] flex flex-col font-sans">
      {/* Top Tactical Command Header */}
      <CommandHeader
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Body: Fixed Sidebar + Independently Scrollable Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <CommandSidebar
          activePage={activePage}
          onSelectPage={onSelectPage}
          urgentCount={urgentCount}
          openCount={openCount}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#F8FAFC] min-h-0">
          {children}
        </main>
      </div>

      {/* Floating Circular AI Copilot Assistant Trigger (Bottom-Right) */}
      <button
        type="button"
        onClick={() => setCopilotOpen(true)}
        aria-label="Open AI Decision Support Copilot"
        title="Open AI Decision Support Copilot"
        className="fixed bottom-[24px] right-[24px] z-40 w-[56px] h-[56px] rounded-full bg-[#1769D2] hover:bg-[#123B6D] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 border-2 border-white/25 cursor-pointer group"
      >
        <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-200" />
      </button>

      {/* Grounded Copilot Drawer */}
      <CopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        complaints={complaints}
        onSelectComplaint={onSelectComplaint}
      />
    </div>
  );
};

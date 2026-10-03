import React, { useState } from 'react';
import { Sparkles, Bot } from 'lucide-react';
import { CommandHeader } from './CommandHeader';
import { CommandSidebar, ActivePage } from './CommandSidebar';
import { CivicCopilotModal } from '../copilot/CivicCopilotModal';
import { Complaint } from '../../types/complaint';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../context/OrganizationContext';
import { CopilotSecurityContext } from '../../services/copilotService';

import { SmartAlertEngine } from '../../services/smartAlertEngine';

interface MainLayoutProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (id: string) => void;
  onOpenReport?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activePage,
  onSelectPage,
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  onOpenReport,
  onRefresh = () => {},
  isRefreshing = false,
  children,
}) => {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { district, districtId, municipalCorporationId, organizationType } = useOrganization();

  const urgentCount = complaints.filter((c) => c.priority === 'urgent' && c.status !== 'closed').length;
  const openCount = complaints.filter((c) => c.status !== 'closed' && c.status !== 'verified').length;

  const smartAlerts = SmartAlertEngine.evaluateAlerts(
    complaints,
    districtId || (user as any)?.districtId || 'pune',
    municipalCorporationId
  );
  const activeAlertCount = smartAlerts.filter((a) => a.status === 'ACTIVE').length;

  const securityContext: CopilotSecurityContext = {
    userId: user?.id,
    role: (organizationType === 'STATE' || user?.role === 'state_admin'
      ? 'state_admin'
      : user?.role === 'citizen'
      ? 'citizen'
      : (user?.role as any) || 'municipal_admin'),
    districtId: district || (user as any)?.district || 'pune',
  };

  return (
    <div className="h-screen w-full max-w-full overflow-hidden bg-[#F7F9FC] text-[#172B4D] flex flex-col font-sans">
      {/* Top Tactical Command Header */}
      <CommandHeader
        onOpenCopilot={() => setCopilotOpen(true)}
        onOpenReport={onOpenReport}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Body: Fixed Sidebar + Independently Scrollable Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0 w-full relative">
        <CommandSidebar
          activePage={activePage}
          onSelectPage={onSelectPage}
          urgentCount={urgentCount}
          openCount={openCount}
          alertCount={activeAlertCount}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 bg-[#F8FAFC] min-h-0 min-w-0">
          <Breadcrumbs
            activePage={activePage}
            selectedComplaintId={selectedComplaintId}
            onNavigate={onSelectPage}
          />
          <div className="flex-1 min-h-0 min-w-0 flex flex-col">
            {children}
          </div>
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

      {/* Grounded Copilot Modal */}
      <CivicCopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        complaints={complaints}
        securityContext={securityContext}
        onSelectComplaint={(complaint) => {
          if (onSelectComplaint) {
            onSelectComplaint(complaint.id);
          }
        }}
        onCreateComplaintFromCopilot={(proposal) => {
          // Open intake or switch to complaints
          onSelectPage('complaints');
        }}
      />
    </div>
  );
};


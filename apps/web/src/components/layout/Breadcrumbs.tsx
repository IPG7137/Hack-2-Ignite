import React from 'react';
import { ChevronRight, Home, Building2, Landmark } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuthContext } from '../../context/AuthContext';
import { ActivePage } from './CommandSidebar';

interface BreadcrumbsProps {
  activePage: ActivePage;
  selectedComplaintId?: string | null;
  onNavigate?: (page: ActivePage) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activePage,
  selectedComplaintId,
  onNavigate,
}) => {
  const { user } = useAuthContext();
  const { organizationType, stateName, district, municipalCorporationName, currentCorporation, setOrganization } = useOrganization();

  const getPageTitle = (page: ActivePage): string => {
    switch (page) {
      case 'dashboard':
        return organizationType === 'STATE' ? 'State Dashboard' : 'Municipal Command Center';
      case 'complaints':
        return 'Complaints Queue';
      case 'complaint_details':
        return 'Complaint Dossier';
      case 'map':
        return organizationType === 'STATE' ? 'Maharashtra GIS' : 'Live GIS Map';
      case 'analytics':
        return 'Operations Analytics';
      case 'ai_insights':
        return 'AI Decision Support';
      case 'departments':
        return organizationType === 'STATE' ? 'Municipal Corporations' : 'Departments & Wards';
      case 'field_teams':
        return 'Field Response Crews';
      case 'sla':
        return 'SLA Escalation Matrix';
      case 'copilot':
        return 'Officer Copilot';
      case 'settings':
        return 'System Configuration';
      default:
        return 'Overview';
    }
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-[#526581] pb-3 mb-4 border-b border-[#E2E8F0] overflow-x-auto select-none"
    >
      {/* 1. State Level */}
      {user?.role === 'state_admin' && organizationType !== 'STATE' ? (
        <button
          type="button"
          onClick={() => {
            setOrganization('STATE', null, null);
            onNavigate?.('dashboard');
          }}
          className="flex items-center gap-1 font-semibold text-[#1769D2] hover:underline cursor-pointer shrink-0 transition-colors"
          title="Return to Maharashtra State Oversight"
        >
          <Landmark className="w-3.5 h-3.5 text-[#1769D2]" />
          <span>{stateName} (State Oversight)</span>
        </button>
      ) : (
        <span className="flex items-center gap-1 font-semibold text-[#172B4D] shrink-0">
          <Landmark className="w-3.5 h-3.5 text-[#1769D2]" />
          <span>{stateName}</span>
        </span>
      )}

      <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0" />

      {/* 2. District / State Administration Level */}
      {organizationType === 'STATE' ? (
        <span className="font-semibold text-[#172B4D] shrink-0">
          State Administration
        </span>
      ) : (
        <>
          <span className="font-medium text-[#526581] shrink-0">
            {district || 'Pune'}
          </span>
          <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0" />
          <span className="flex items-center gap-1 font-semibold text-[#172B4D] shrink-0">
            <Building2 className="w-3.5 h-3.5 text-[#16803C]" />
            <span>{currentCorporation?.shortName || municipalCorporationName || 'Municipal Corporation'}</span>
          </span>
        </>
      )}

      <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0" />

      {/* 3. Current Page */}
      <button
        onClick={() => onNavigate?.(activePage === 'complaint_details' ? 'complaints' : activePage)}
        className={`font-semibold shrink-0 hover:text-[#1769D2] transition-colors ${
          selectedComplaintId ? 'text-[#526581]' : 'text-[#1769D2]'
        }`}
      >
        {getPageTitle(activePage)}
      </button>

      {/* 4. Selected Record (if any) */}
      {selectedComplaintId && (
        <>
          <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0" />
          <span className="font-mono font-bold text-[#1769D2] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
            #{selectedComplaintId}
          </span>
        </>
      )}
    </nav>
  );
};

import React, { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { ActivePage } from './components/layout/CommandSidebar';
import { Dashboard } from './pages/Dashboard';
import { Complaints } from './pages/Complaints';
import { ComplaintDetails } from './pages/ComplaintDetails';
import { LiveMap } from './pages/LiveMap';
import { Analytics } from './pages/Analytics';
import { AIInsights } from './pages/AIInsights';
import { Departments } from './pages/Departments';
import { FieldTeams } from './pages/FieldTeams';
import { SLA } from './pages/SLA';
import { Copilot } from './pages/Copilot';
import { Settings } from './pages/Settings';
import { useComplaints } from './hooks/useComplaints';
import { useAnalytics } from './hooks/useAnalytics';
import { useAIInsights } from './hooks/useAIInsights';
import { departmentService } from './services/departmentService';
import { Department } from './types/department';
import { ComplaintStatus } from './types/complaint';

export function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    complaints,
    loading: complaintsLoading,
    error: complaintsError,
    filters,
    setFilters,
    refetch,
    updateStatus,
    assignOfficer,
    addAdminNote,
  } = useComplaints();

  const { kpis, loading: kpisLoading } = useAnalytics();
  const { insights, acknowledge } = useAIInsights();

  React.useEffect(() => {
    departmentService.getDepartments().then(setDepartments);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSelectComplaint = (id: string) => {
    setSelectedComplaintId(id);
    setActivePage('complaint_details');
  };

  const handleAdvanceStatus = async (
    id: string,
    nextStatus: ComplaintStatus,
    notes?: string,
    proofUrl?: string
  ) => {
    await updateStatus(id, nextStatus, 'Executive Duty Officer', notes, proofUrl);
  };

  const selectedComplaint = complaints.find((c) => c.id === selectedComplaintId) || null;

  return (
    <MainLayout
      activePage={activePage}
      onSelectPage={(page) => {
        if (page !== 'complaint_details') {
          setSelectedComplaintId(null);
        }
        setActivePage(page);
      }}
      complaints={complaints}
      onSelectComplaint={handleSelectComplaint}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      {activePage === 'dashboard' && (
        <Dashboard
          complaints={complaints}
          kpis={kpis}
          insights={insights}
          departments={departments}
          loading={complaintsLoading || kpisLoading}
          error={complaintsError}
          onSelectComplaint={handleSelectComplaint}
          onNavigatePage={(p) => setActivePage(p)}
          onAcknowledgeInsight={acknowledge}
          onOpenCopilot={() => setActivePage('copilot')}
          onRefresh={handleRefresh}
        />
      )}

      {activePage === 'complaints' && (
        <Complaints
          complaints={complaints}
          filters={filters}
          onFilterChange={setFilters}
          onSelectComplaint={handleSelectComplaint}
          onAdvanceStatus={(id, nextStatus) => handleAdvanceStatus(id, nextStatus)}
          onRefresh={handleRefresh}
          loading={complaintsLoading}
          error={complaintsError}
        />
      )}

      {activePage === 'complaint_details' && (
        <ComplaintDetails
          complaint={selectedComplaint}
          allComplaints={complaints}
          onSelectComplaint={handleSelectComplaint}
          onBack={() => setActivePage('complaints')}
          onAdvanceStatus={handleAdvanceStatus}
          onAssignOfficer={async (id, officer, dept, contractor) => {
            await assignOfficer(id, officer, dept, contractor);
          }}
          onAddNote={async (id, text) => {
            await addAdminNote(id, text);
          }}
          onRefresh={handleRefresh}
          loading={complaintsLoading && !selectedComplaint}
        />
      )}

      {activePage === 'map' && (
        <LiveMap
          complaints={complaints}
          onSelectComplaint={handleSelectComplaint}
          loading={complaintsLoading}
          error={complaintsError}
          onRefresh={handleRefresh}
        />
      )}

      {activePage === 'analytics' && (
        <Analytics
          complaints={complaints}
          loading={complaintsLoading}
          error={complaintsError}
          onRefresh={handleRefresh}
          onSelectComplaint={handleSelectComplaint}
        />
      )}

      {activePage === 'ai_insights' && (
        <AIInsights
          complaints={complaints}
          loading={complaintsLoading}
          error={complaintsError}
          onRefresh={handleRefresh}
          onSelectComplaint={handleSelectComplaint}
          onNavigatePage={(p) => setActivePage(p)}
        />
      )}

      {activePage === 'departments' && <Departments complaints={complaints} />}

      {activePage === 'field_teams' && (
        <FieldTeams complaints={complaints} onSelectComplaint={handleSelectComplaint} />
      )}

      {activePage === 'sla' && (
        <SLA
          complaints={complaints}
          onSelectComplaint={handleSelectComplaint}
        />
      )}

      {activePage === 'copilot' && (
        <Copilot
          complaints={complaints}
          onSelectComplaint={handleSelectComplaint}
        />
      )}

      {activePage === 'settings' && <Settings />}
    </MainLayout>
  );
}

export default App;

import React, { useState } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
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
import { MunicipalAuthScreen } from './components/auth/MunicipalAuthScreen';
import { useAuthContext } from './context/AuthContext';
import { useComplaints } from './hooks/useComplaints';
import { useAnalytics } from './hooks/useAnalytics';
import { useAIInsights } from './hooks/useAIInsights';
import { departmentService } from './services/departmentService';
import { Department } from './types/department';
import { ComplaintStatus } from './types/complaint';
import { Button } from './components/ui/Button';
import { isComplaintInZone } from './lib/zoneFilter';

const ALLOWED_MUNICIPAL_ROLES = ['officer', 'dept_admin', 'municipal_admin', 'super_admin'];

export function App() {
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuthContext();
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
    const officerName = user?.fullName || 'Executive Duty Officer';
    await updateStatus(id, nextStatus, officerName, notes, proofUrl);
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-sm font-bold tracking-wide uppercase">CivicResolve Municipal Command</div>
        <div className="text-xs text-slate-400 mt-1">Verifying secure credentials & RLS authorization...</div>
      </div>
    );
  }

  // 2. Unauthenticated Gate
  if (!isAuthenticated || !user) {
    return <MunicipalAuthScreen />;
  }

  // 3. Citizen Unauthorized Screen
  if (!ALLOWED_MUNICIPAL_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-slate-800 p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Access Restricted: Citizen Account</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your current account (<span className="font-mono text-blue-400">{user.email}</span>) has the role <strong className="text-amber-300">citizen</strong>.
            The Municipal Command Center is strictly restricted to verified municipal officers and administrators under PostgreSQL Row Level Security.
          </p>
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-semibold gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Switch Account</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isMunicipalAdmin = user.role === 'municipal_admin' || user.role === 'super_admin';
  const isZoneAdmin = user.role === 'officer' || user.role === 'dept_admin';

  // Zone 2 / Field Admin sees scoped complaints; Municipal Admin sees all city-wide complaints
  const visibleComplaints = complaints.filter((c) => {
    if (isMunicipalAdmin) return true;
    return isComplaintInZone(c, user.ward || 'Zone 2');
  });

  const selectedComplaint = visibleComplaints.find((c) => c.id === selectedComplaintId) || complaints.find((c) => c.id === selectedComplaintId) || null;

  return (
    <MainLayout
      activePage={activePage}
      onSelectPage={(page) => {
        // Enforce role boundary: Only Municipal Admin can access system-wide configuration
        if (!isMunicipalAdmin && (page === 'departments' || page === 'settings')) {
          setActivePage('dashboard');
          return;
        }
        if (page !== 'complaint_details') {
          setSelectedComplaintId(null);
        }
        setActivePage(page);
      }}
      complaints={visibleComplaints}
      onSelectComplaint={handleSelectComplaint}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      {activePage === 'dashboard' && (
        <Dashboard
          complaints={visibleComplaints}
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
          complaints={visibleComplaints}
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
          allComplaints={visibleComplaints}
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
          complaints={visibleComplaints}
          onSelectComplaint={handleSelectComplaint}
          loading={complaintsLoading}
          error={complaintsError}
          onRefresh={handleRefresh}
        />
      )}

      {activePage === 'analytics' && (
        <Analytics
          complaints={visibleComplaints}
          loading={complaintsLoading}
          error={complaintsError}
          onRefresh={handleRefresh}
          onSelectComplaint={handleSelectComplaint}
        />
      )}

      {activePage === 'ai_insights' && (
        <AIInsights
          complaints={visibleComplaints}
          loading={complaintsLoading}
          error={complaintsError}
          onRefresh={handleRefresh}
          onSelectComplaint={handleSelectComplaint}
          onNavigatePage={(p) => setActivePage(p)}
        />
      )}

      {activePage === 'departments' && isMunicipalAdmin && <Departments complaints={visibleComplaints} />}

      {activePage === 'field_teams' && (
        <FieldTeams complaints={visibleComplaints} onSelectComplaint={handleSelectComplaint} />
      )}

      {activePage === 'sla' && (
        <SLA
          complaints={visibleComplaints}
          onSelectComplaint={handleSelectComplaint}
        />
      )}

      {activePage === 'copilot' && (
        <Copilot
          complaints={visibleComplaints}
          onSelectComplaint={handleSelectComplaint}
        />
      )}

      {activePage === 'settings' && isMunicipalAdmin && <Settings />}
    </MainLayout>
  );
}

export default App;

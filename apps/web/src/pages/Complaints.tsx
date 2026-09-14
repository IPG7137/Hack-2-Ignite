import React from 'react';
import { ComplaintTable } from '../components/complaints/ComplaintTable';
import { ComplaintFilters } from '../components/complaints/ComplaintFilters';
import { Complaint, ComplaintStatus } from '../types/complaint';
import { ComplaintFilterParams } from '../services/api.interface';
import { Button } from '../components/ui/Button';
import { Download, PlusCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ComplaintsProps {
  complaints: Complaint[];
  filters: ComplaintFilterParams;
  onFilterChange: (filters: ComplaintFilterParams) => void;
  onSelectComplaint: (id: string) => void;
  onAdvanceStatus?: (id: string, nextStatus: ComplaintStatus) => void;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
}

export const Complaints: React.FC<ComplaintsProps> = ({
  complaints,
  filters,
  onFilterChange,
  onSelectComplaint,
  onAdvanceStatus,
  onRefresh,
  loading = false,
  error = null,
}) => {
  const { user } = useAuth();
  const isMunicipalAdmin = user?.role === 'municipal_admin' || user?.role === 'super_admin';

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#D9E2EC]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
            <span>
              {isMunicipalAdmin
                ? 'Municipal Grievance Inventory & Triage'
                : 'Zone 2 Grievance Queue & Operational Triage'}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-semibold">
              {complaints.length} INCIDENTS
            </span>
          </h2>
          <p className="text-xs text-[#526581]">
            {isMunicipalAdmin
              ? 'City-wide intake queue with 7-step lifecycle enforcement and SLA adherence tracking.'
              : 'Zone 2 operational grievance intake with on-site dispatch and resolution verification.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 text-xs bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 text-[#526581] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = [
                'ID,Title,Category,Status,Priority,Ward,Address,Created',
                ...complaints.map((c) =>
                  `"${c.id}","${c.title}","${c.categoryLabel}","${c.status}","${c.priority}","${c.location.ward}","${c.location.address}","${c.createdAt}"`
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `CivicResolve_Complaints_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}
            className="h-8 text-xs bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#526581]" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ComplaintFilters
        filters={filters}
        onChange={onFilterChange}
        onReset={() =>
          onFilterChange({
            category: 'all',
            status: 'all',
            priority: 'all',
            ward: 'all',
            search: '',
            isOverdueOnly: false,
          })
        }
      />

      {/* Table */}
      <ComplaintTable
        complaints={complaints}
        onSelectComplaint={onSelectComplaint}
        onAdvanceStatus={onAdvanceStatus}
        loading={loading}
        error={error}
        onRetry={onRefresh}
      />
    </div>
  );
};

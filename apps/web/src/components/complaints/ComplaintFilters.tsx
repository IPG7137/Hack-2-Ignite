import React from 'react';
import { Search, X, Clock } from 'lucide-react';
import { ComplaintFilterParams } from '../../services/api.interface';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { IncidentCategory, ComplaintPriority, ComplaintStatus } from '../../types/complaint';

interface ComplaintFiltersProps {
  filters: ComplaintFilterParams;
  onChange: (filters: ComplaintFilterParams) => void;
  onReset?: () => void;
}

export const ComplaintFilters: React.FC<ComplaintFiltersProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  return (
    <div className="p-3.5 bg-white border border-[#D9E2EC] rounded-lg shadow-sm space-y-3">
      {/* Row 1: Search & Overdue Toggle */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="w-full sm:max-w-md">
          <Input
            icon={<Search className="w-3.5 h-3.5 text-[#718096]" />}
            placeholder="Search by ID (#CR-2026-101), street, landmark, or keyword..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="h-8 text-xs bg-white border-[#D9E2EC] text-[#172B4D]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => onChange({ ...filters, isOverdueOnly: !filters.isOverdueOnly })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors ${
              filters.isOverdueOnly
                ? 'bg-red-50 border-red-200 text-red-700 font-bold'
                : 'bg-white border-[#D9E2EC] text-[#526581] hover:text-[#172B4D] hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3 h-3 text-[#D92D20]" />
            <span>Overdue SLA Only</span>
          </button>

          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 text-[11px] text-[#526581] hover:text-[#172B4D]"
            >
              <X className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Category, Priority, Status, Ward, Sort */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-[#E8EEF5] text-xs">
        {/* Category */}
        <div>
          <label className="text-[10px] font-mono text-[#526581] uppercase font-bold block mb-1">
            Category
          </label>
          <select
            value={filters.category || 'all'}
            onChange={(e) => onChange({ ...filters, category: e.target.value as IncidentCategory | 'all' })}
            className="w-full h-8 rounded border border-[#D9E2EC] bg-white text-[#172B4D] px-2 text-xs focus:outline-none focus:border-[#1769D2]"
          >
            <option value="all">All Categories</option>
            <option value="roads">Roads & Pavements</option>
            <option value="drainage">Stormwater Drainage</option>
            <option value="waste_management">Waste Management</option>
            <option value="streetlights">Street Lighting</option>
            <option value="water_sewage">Water Supply</option>
            <option value="public_safety">Public Safety Hazard</option>
            <option value="parks">Parks & Greens</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-[10px] font-mono text-[#526581] uppercase font-bold block mb-1">
            Priority Level
          </label>
          <select
            value={filters.priority || 'all'}
            onChange={(e) => onChange({ ...filters, priority: e.target.value as ComplaintPriority | 'all' })}
            className="w-full h-8 rounded border border-[#D9E2EC] bg-white text-[#172B4D] px-2 text-xs focus:outline-none focus:border-[#1769D2]"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent / Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[10px] font-mono text-[#526581] uppercase font-bold block mb-1">
            Lifecycle Status
          </label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => onChange({ ...filters, status: e.target.value as ComplaintStatus | 'all' })}
            className="w-full h-8 rounded border border-[#D9E2EC] bg-white text-[#172B4D] px-2 text-xs focus:outline-none focus:border-[#1769D2]"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">1. Submitted</option>
            <option value="under_review">2. Under Review</option>
            <option value="assigned">3. Assigned</option>
            <option value="in_progress">4. In Progress</option>
            <option value="resolution_submitted">5. Resolution Submitted</option>
            <option value="verified">6. Verified</option>
            <option value="closed">7. Closed</option>
          </select>
        </div>

        {/* Ward */}
        <div>
          <label className="text-[10px] font-mono text-[#526581] uppercase font-bold block mb-1">
            Municipal Ward
          </label>
          <select
            value={filters.ward || 'all'}
            onChange={(e) => onChange({ ...filters, ward: e.target.value })}
            className="w-full h-8 rounded border border-[#D9E2EC] bg-white text-[#172B4D] px-2 text-xs focus:outline-none focus:border-[#1769D2]"
          >
            <option value="all">All Wards / Zones</option>
            <option value="Ward 01">Ward 01 / Zone A</option>
            <option value="Ward 02">Ward 02 / Zone B</option>
            <option value="Ward 03">Ward 03 / Zone C</option>
            <option value="Ward 04">Ward 04 / Zone D</option>
            <option value="Ward 05">Ward 05 / Zone E</option>
            <option value="Ward 06">Ward 06 / Zone F</option>
            <option value="Ward 07">Ward 07 / Zone G</option>
            <option value="Ward 08">Ward 08 / Zone H</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-mono text-[#526581] uppercase font-bold block mb-1">
            Sort Order
          </label>
          <select
            value={filters.sortBy || 'priority'}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value as any })}
            className="w-full h-8 rounded border border-[#D9E2EC] bg-white text-[#172B4D] px-2 text-xs focus:outline-none focus:border-[#1769D2]"
          >
            <option value="priority">Priority (Severity)</option>
            <option value="createdAt">Date (Newest)</option>
            <option value="slaDeadline">SLA (Most Urgent)</option>
            <option value="upvotes">Citizen Upvotes</option>
          </select>
        </div>
      </div>
    </div>
  );
};

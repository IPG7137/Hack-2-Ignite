import React, { useEffect, useState } from 'react';
import { Building2, Users, AlertCircle, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Department, WardInfo } from '../types/department';
import { departmentService } from '../services/departmentService';

export const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [wards, setWards] = useState<WardInfo[]>([]);

  useEffect(() => {
    async function load() {
      const [deptRes, wardRes] = await Promise.all([
        departmentService.getDepartments(),
        departmentService.getWards(),
      ]);
      setDepartments(deptRes);
      setWards(wardRes);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-[#D9E2EC]">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#1769D2]" />
          <span>Municipal Departments & Zonal Ward Allocation</span>
        </h2>
        <p className="text-xs text-[#526581]">
          Supervisory roster, active incident allocations, and jurisdictional ward coverage.
        </p>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Card key={dept.id} className="p-4 space-y-3 border-[#D9E2EC] bg-white shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-bold">
                  {dept.code}
                </span>
                <span className="text-[11px] font-mono font-bold text-[#16803C] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#16803C]" />
                  {dept.slaCompliancePercentage}% SLA
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#172B4D] mt-2">{dept.name}</h3>
              <p className="text-[11px] text-[#526581] mt-0.5">HOD: {dept.headOfDepartment}</p>

              <div className="mt-3 pt-3 border-t border-[#E8EEF5] space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#526581]">Active Personnel:</span>
                  <span className="text-[#172B4D] font-medium">{dept.activeStaffCount} Engineers & Staff</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#526581]">Open Incidents:</span>
                  <span className="text-[#1769D2] font-bold">{dept.openIncidentsCount}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#526581]">Overdue Breaches:</span>
                  <span className={dept.overdueCount > 0 ? 'text-[#D92D20] font-bold' : 'text-[#718096]'}>
                    {dept.overdueCount}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#526581]">Avg Resolution:</span>
                  <span className="text-[#172B4D] font-medium">{dept.averageResolutionHours} Hours</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8EEF5] text-[11px] text-[#526581] space-y-1">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-[#718096]" />
                <span>{dept.contactPhone}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3 h-3 text-[#718096]" />
                <span className="truncate">{dept.contactEmail}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Wards Matrix */}
      <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm mt-6 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
          Zonal Administrative Ward Inventory
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wards.map((ward) => (
            <div key={ward.wardNumber} className="p-3 rounded bg-[#F8FAFC] border border-[#E8EEF5] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#172B4D]">Ward {ward.wardNumber} - {ward.name}</span>
                <span className="font-mono text-[10px] text-[#526581] font-semibold">{ward.zone}</span>
              </div>
              <div className="text-[11px] text-[#526581]">Councillor: {ward.councillorName}</div>
              <div className="flex items-center justify-between font-mono text-[11px] pt-1 text-[#172B4D]">
                <span>Active Grievances: {ward.activeComplaints}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${
                    ward.riskIndex === 'critical'
                      ? 'text-[#D92D20] bg-red-50 border-red-200'
                      : ward.riskIndex === 'high'
                      ? 'text-[#EA580C] bg-amber-50 border-amber-200'
                      : 'text-[#16803C] bg-emerald-50 border-emerald-200'
                  }`}
                >
                  {ward.riskIndex} Risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

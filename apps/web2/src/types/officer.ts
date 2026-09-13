export interface FieldTeam {
  id: string;
  name: string;
  departmentId: string;
  leadOfficer: string;
  contactNumber: string;
  currentZone: string;
  status: 'idle' | 'en_route' | 'on_site' | 'remediation_active' | 'off_duty';
  assignedComplaintId?: string;
  assignedComplaintTitle?: string;
  vehicleRegNumber: string;
  equippedFor: string[];
  resolvedThisWeek: number;
}

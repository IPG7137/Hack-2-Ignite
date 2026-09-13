export interface Department {
  id: string;
  name: string;
  code: string;
  headOfDepartment: string;
  contactEmail: string;
  contactPhone: string;
  activeStaffCount: number;
  openIncidentsCount: number;
  overdueCount: number;
  slaCompliancePercentage: number;
  averageResolutionHours: number;
  categoriesHandled: string[];
  wardsAssigned: string[];
}

export interface WardInfo {
  wardNumber: string;
  name: string;
  zone: string;
  councillorName: string;
  populationEstimate: number;
  activeComplaints: number;
  riskIndex: 'low' | 'medium' | 'high' | 'critical';
}

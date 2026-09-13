import {
  Complaint,
  ComplaintStatus,
  ComplaintPriority,
  IncidentCategory,
  IncidentLocation,
  ReporterInfo,
  OfficerAssignment,
  StatusHistoryItem,
} from '../types/complaint';

// Category mapping from database values (produced by mobile) to web2 IncidentCategory
export const DATABASE_CATEGORY_MAP: Record<
  string,
  { key: IncidentCategory; label: string; department: string }
> = {
  potholes_roads: {
    key: 'roads',
    label: 'Roads & Potholes',
    department: 'Roads & Infrastructure',
  },
  roads: {
    key: 'roads',
    label: 'Roads & Potholes',
    department: 'Roads & Infrastructure',
  },
  water_drainage: {
    key: 'water_sewage',
    label: 'Water Supply & Leaks',
    department: 'Water Works Dept',
  },
  water_supply: {
    key: 'water_sewage',
    label: 'Water Supply & Leaks',
    department: 'Water Works Dept',
  },
  drainage_sewage: {
    key: 'drainage',
    label: 'Drainage & Sewage',
    department: 'Sewerage & Drainage',
  },
  drainage: {
    key: 'drainage',
    label: 'Drainage & Sewage',
    department: 'Sewerage & Drainage',
  },
  electricity_streetlights: {
    key: 'streetlights',
    label: 'Electricity & Streetlights',
    department: 'Electrical Engineering',
  },
  streetlights: {
    key: 'streetlights',
    label: 'Electricity & Streetlights',
    department: 'Electrical Engineering',
  },
  lighting: {
    key: 'streetlights',
    label: 'Street Lighting',
    department: 'Electrical Engineering',
  },
  waste_management: {
    key: 'waste_management',
    label: 'Garbage & Sanitation',
    department: 'Public Health & Sanitation',
  },
  cleanliness: {
    key: 'waste_management',
    label: 'Cleanliness & Sanitation',
    department: 'Public Health & Sanitation',
  },
  safety_hazard: {
    key: 'public_safety',
    label: 'Public Safety Hazards',
    department: 'Disaster Management',
  },
  public_safety: {
    key: 'public_safety',
    label: 'Public Safety Hazards',
    department: 'Disaster Management',
  },
  parks_trees: {
    key: 'parks',
    label: 'Parks & Fallen Trees',
    department: 'Horticulture Dept',
  },
  parks: {
    key: 'parks',
    label: 'Parks & Urban Greens',
    department: 'Horticulture Dept',
  },
  illegal_encroachment: {
    key: 'public_safety',
    label: 'Illegal Encroachment',
    department: 'Encroachment Control',
  },
  other: {
    key: 'roads',
    label: 'Other Grievance',
    department: 'General Municipal Administration',
  },
};

/**
 * Normalizes database status strings to web2 ComplaintStatus
 */
export function normalizeStatus(rawStatus?: string): ComplaintStatus {
  if (!rawStatus) return 'submitted';
  const s = rawStatus.toLowerCase().trim();
  switch (s) {
    case 'submitted':
      return 'submitted';
    case 'under_review':
    case 'review':
      return 'under_review';
    case 'assigned':
      return 'assigned';
    case 'in_progress':
    case 'progress':
      return 'in_progress';
    case 'resolution_submitted':
      return 'resolution_submitted';
    case 'resolved':
      return 'resolved';
    case 'verified':
      return 'verified';
    case 'closed':
      return 'closed';
    case 'rejected':
      return 'rejected';
    default:
      return 'submitted';
  }
}

/**
 * Normalizes database priority strings to web2 ComplaintPriority
 */
export function normalizePriority(rawPriority?: string): ComplaintPriority {
  if (!rawPriority) return 'medium';
  const p = rawPriority.toLowerCase().trim();
  switch (p) {
    case 'critical':
    case 'urgent':
      return 'urgent';
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    case 'medium':
    default:
      return 'medium';
  }
}

/**
 * Calculates SLA metrics based on creation timestamp and priority
 */
export function calculateSLA(
  createdAt: string,
  priority: ComplaintPriority
): Complaint['sla'] {
  const targetHours =
    priority === 'urgent' ? 12 : priority === 'high' ? 24 : priority === 'medium' ? 48 : 72;
  const createdDate = new Date(createdAt);
  const deadlineDate = new Date(createdDate.getTime() + targetHours * 60 * 60 * 1000);
  const now = new Date();
  const msRemaining = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Math.round(msRemaining / (1000 * 60 * 60)));
  const isOverdue = msRemaining < 0;

  let slaStatus: 'on_track' | 'warning' | 'breached' = 'on_track';
  if (isOverdue) {
    slaStatus = 'breached';
  } else if (hoursRemaining < 6) {
    slaStatus = 'warning';
  }

  return {
    targetHours,
    hoursRemaining,
    slaStatus,
    deadline: deadlineDate.toISOString(),
    isOverdue,
  };
}

/**
 * Converts a raw Supabase public.reports row into a web2 Complaint object
 */
export function mapSupabaseRowToComplaint(
  row: Record<string, any>,
  statusHistoryRows?: Record<string, any>[]
): Complaint {
  const dbId = typeof row.id === 'number' ? row.id : parseInt(String(row.id), 10) || 1;
  const formattedId = `CR-${dbId}`;

  // 1. Coordinates unpacking
  let lat = NaN;
  let lng = NaN;

  if (row.latitude != null && row.longitude != null) {
    const parsedLat = parseFloat(row.latitude);
    const parsedLng = parseFloat(row.longitude);
    if (
      !isNaN(parsedLat) &&
      !isNaN(parsedLng) &&
      parsedLat >= -90 &&
      parsedLat <= 90 &&
      parsedLng >= -180 &&
      parsedLng <= 180
    ) {
      lat = parsedLat;
      lng = parsedLng;
    }
  }

  if (isNaN(lat) || isNaN(lng)) {
    if (row.coordinates && typeof row.coordinates === 'object') {
      const cLat = row.coordinates.lat ?? row.coordinates.latitude;
      const cLng = row.coordinates.lng ?? row.coordinates.longitude;
      if (cLat != null && cLng != null) {
        const parsedLat = parseFloat(cLat);
        const parsedLng = parseFloat(cLng);
        if (
          !isNaN(parsedLat) &&
          !isNaN(parsedLng) &&
          parsedLat >= -90 &&
          parsedLat <= 90 &&
          parsedLng >= -180 &&
          parsedLng <= 180
        ) {
          lat = parsedLat;
          lng = parsedLng;
        }
      }
    }
  }

  // 2. Category mapping
  const rawCat = (row.category || 'other').toString().toLowerCase();
  const catConfig = DATABASE_CATEGORY_MAP[rawCat] || {
    key: 'roads' as IncidentCategory,
    label: row.category || 'General Grievance',
    department: 'Municipal Operations',
  };

  // 3. Location object
  const locationStr = row.location || 'Municipal Area';
  const location: IncidentLocation = {
    address: locationStr,
    landmark: locationStr.split(',')[0] || locationStr,
    ward: row.ward || '',
    zone: row.zone || '',
    latitude: lat,
    longitude: lng,
  };

  // 4. Status & Priority
  const status = normalizeStatus(row.status);
  const priority = normalizePriority(row.priority);
  const createdAt = row.created_at || new Date().toISOString();
  const updatedAt = row.updated_at || createdAt;

  // 5. Evidence parsing
  const rawImages = Array.isArray(row.image_urls) ? row.image_urls : [];
  const beforeImages: string[] = [];
  for (const img of rawImages) {
    if (typeof img === 'string' && img.length > 0) {
      beforeImages.push(img);
    }
  }

  const afterImages: string[] = [];
  if (row.resolution_image_url) {
    afterImages.push(row.resolution_image_url);
  }

  // 6. Reporter info
  const reporter: ReporterInfo = {
    name: row.user_id ? String(row.user_id).split('@')[0] : 'Citizen User',
    phone: row.contact_number || '+91 98765 43210',
    aadharMasked: 'XXXX-XXXX-4892',
    verifiedCitizen: true,
  };

  // 7. Assignment info
  let assignment: OfficerAssignment | undefined;
  if (row.assigned_to || row.assigned_officer_id) {
    assignment = {
      officerId: row.assigned_officer_id || 'OFF-MUNICIPAL',
      officerName: row.assigned_to || 'Assigned Field Officer',
      departmentId: 'DEP-GEN',
      departmentName: catConfig.department,
      contractorName: undefined,
      assignedAt: updatedAt,
    };
  }

  // 8. Status History Mapping
  const statusHistory: StatusHistoryItem[] = [];
  if (Array.isArray(statusHistoryRows) && statusHistoryRows.length > 0) {
    for (const h of statusHistoryRows) {
      statusHistory.push({
        id: `SH-${h.id || Date.now()}`,
        fromStatus: h.old_status ? normalizeStatus(h.old_status) : undefined,
        toStatus: normalizeStatus(h.new_status || h.status),
        changedBy: h.changed_by || 'Officer',
        role: (h.role as any) || 'officer',
        timestamp: h.created_at || new Date().toISOString(),
        notes: h.notes || undefined,
        proofImageUrl: h.proof_image_url || undefined,
      });
    }
  } else {
    // Default initial submission history item
    statusHistory.push({
      id: `SH-INIT-${dbId}`,
      toStatus: status,
      changedBy: reporter.name,
      role: 'citizen',
      timestamp: createdAt,
      notes: 'Initial citizen report registered via CivicResolve.',
    });
  }

  // 9. Admin Notes Parsing
  const adminNotes: Complaint['adminNotes'] = [];
  if (row.admin_notes && typeof row.admin_notes === 'string' && row.admin_notes.trim()) {
    const lines = row.admin_notes.split('\n').filter((l: string) => l.trim().length > 0);
    lines.forEach((line: string, idx: number) => {
      const match = line.match(/^\[(.*?) - (.*?)\]:\s*(.*)$/);
      if (match) {
        adminNotes.push({
          id: `AN-DB-${dbId}-${idx}`,
          author: match[2],
          text: match[3],
          createdAt: match[1],
          isInternal: true,
        });
      } else {
        adminNotes.push({
          id: `AN-DB-${dbId}-${idx}`,
          author: 'Command Center',
          text: line,
          createdAt: updatedAt,
          isInternal: true,
        });
      }
    });
  }

  // 10. Citizen Feedback
  let citizenFeedback: Complaint['citizenFeedback'] = undefined;
  if (row.citizen_feedback || row.rating) {
    citizenFeedback = {
      rating: row.rating || 5,
      comment: row.citizen_feedback || 'Resolved satisfactorily.',
      satisfied: (row.rating || 5) >= 3,
    };
  }

  return {
    id: formattedId,
    dbId,
    title: row.title || catConfig.label,
    description: row.description || '',
    category: catConfig.key,
    categoryLabel: catConfig.label,
    rawCategory: row.category || undefined,
    location,
    status,
    rawStatus: row.status || undefined,
    priority,
    reporter,
    assignment,
    evidence: {
      before: beforeImages,
      after: afterImages.length > 0 ? afterImages : undefined,
    },
    statusHistory,
    adminNotes,
    sla: calculateSLA(createdAt, priority),
    upvotesCount: 1,
    isDuplicateCluster: !!row.potential_duplicate,
    clusterGroupId: row.parent_report_id ? `CLUSTER-${row.parent_report_id}` : undefined,
    createdAt,
    updatedAt,
    resolvedAt: row.completion_date || undefined,
    closedAt: status === 'closed' ? updatedAt : undefined,
    citizenFeedback,
  };
}

/**
 * Validates whether a complaint has valid, non-fallback geographic coordinates
 */
export function hasValidCoordinates(complaint: Complaint): boolean {
  const { latitude, longitude } = complaint.location;
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

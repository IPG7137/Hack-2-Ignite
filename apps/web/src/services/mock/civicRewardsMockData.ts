import {
  CitizenCivicProfile,
  CivicContribution,
  DistrictRecognitionCycle,
  DistrictEngagementStats,
} from '../../types/civicRewards';
import { MAHARASHTRA_DISTRICTS } from '../../data/maharashtraDistricts';

/**
 * CIVICRESOLVE — District-Isolated Civic Rewards Mock Datasets
 *
 * Provides realistic, strictly isolated citizen champion datasets for each Maharashtra district.
 * Zero cross-district bleed.
 */

// ============================================================================
// 1. SOLAPUR DISTRICT
// ============================================================================
export const SOLAPUR_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-SOL-01',
    userId: 'USER-SOL-01',
    districtId: 'solapur',
    municipalCorporationId: 'smc',
    displayName: 'Mahesh B.',
    civicScore: 1250,
    verifiedReportsCount: 42,
    verifiedResolutionsCount: 18,
    helpfulEvidenceCount: 35,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-10T08:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'PROF-SOL-02',
    userId: 'USER-SOL-02',
    districtId: 'solapur',
    municipalCorporationId: 'smc',
    displayName: 'Amit J.',
    civicScore: 1080,
    verifiedReportsCount: 36,
    verifiedResolutionsCount: 14,
    helpfulEvidenceCount: 28,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-15T09:30:00Z',
    updatedAt: '2026-09-18T14:20:00Z',
  },
  {
    id: 'PROF-SOL-03',
    userId: 'USER-SOL-03',
    districtId: 'solapur',
    municipalCorporationId: 'smc',
    displayName: 'Girish K.',
    civicScore: 920,
    verifiedReportsCount: 31,
    verifiedResolutionsCount: 12,
    helpfulEvidenceCount: 24,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-01T11:00:00Z',
    updatedAt: '2026-09-15T16:00:00Z',
  },
  {
    id: 'PROF-SOL-04',
    userId: 'USER-SOL-04',
    districtId: 'solapur',
    municipalCorporationId: 'smc',
    displayName: 'Sunita R.',
    civicScore: 870,
    verifiedReportsCount: 28,
    verifiedResolutionsCount: 15,
    helpfulEvidenceCount: 22,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-10T10:15:00Z',
    updatedAt: '2026-09-14T11:45:00Z',
  },
  {
    id: 'PROF-SOL-05',
    userId: 'USER-SOL-05',
    districtId: 'solapur',
    municipalCorporationId: 'smc',
    displayName: 'Vinayak S.',
    civicScore: 810,
    verifiedReportsCount: 26,
    verifiedResolutionsCount: 11,
    helpfulEvidenceCount: 20,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-20T14:00:00Z',
    updatedAt: '2026-09-12T09:30:00Z',
  },
  {
    id: 'PROF-SOL-06',
    userId: 'USER-SOL-06',
    districtId: 'solapur',
    municipalCorporationId: 'smc',
    displayName: 'Pravin D.',
    civicScore: 680,
    verifiedReportsCount: 22,
    verifiedResolutionsCount: 9,
    helpfulEvidenceCount: 18,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-08-01T08:45:00Z',
    updatedAt: '2026-09-10T12:00:00Z',
  },
  {
    id: 'PROF-SOL-07',
    userId: 'USER-SOL-07',
    districtId: 'solapur',
    municipalCorporationId: 'smc',
    displayName: 'Rekha M.',
    civicScore: 420,
    verifiedReportsCount: 14,
    verifiedResolutionsCount: 6,
    helpfulEvidenceCount: 12,
    badgeLevel: 'contributor',
    isFlagged: false,
    createdAt: '2026-08-15T15:00:00Z',
    updatedAt: '2026-09-08T10:00:00Z',
  },
  {
    id: 'PROF-SOL-08',
    userId: 'USER-SOL-08',
    districtId: 'solapur',
    municipalCorporationId: 'smc',
    displayName: 'Santosh L.',
    civicScore: 190,
    verifiedReportsCount: 7,
    verifiedResolutionsCount: 2,
    helpfulEvidenceCount: 5,
    badgeLevel: 'starter',
    isFlagged: false,
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-05T11:00:00Z',
  },
];

export const SOLAPUR_CONTRIBUTIONS: CivicContribution[] = [
  {
    id: 'CONTRIB-SOL-01',
    citizenProfileId: 'PROF-SOL-01',
    userId: 'USER-SOL-01',
    districtId: 'solapur',
    complaintId: 'CR-SOL-103',
    contributionType: 'verified_report',
    points: 10,
    description: 'Verified genuine report on commercial waste encroachment at Navi Peth Market',
    verificationStatus: 'verified',
    createdAt: '2026-09-12T11:35:00Z',
  },
  {
    id: 'CONTRIB-SOL-02',
    citizenProfileId: 'PROF-SOL-01',
    userId: 'USER-SOL-01',
    districtId: 'solapur',
    complaintId: 'CR-SOL-103',
    contributionType: 'accurate_location',
    points: 5,
    description: 'High accuracy GPS coordinate verification (within 10m)',
    verificationStatus: 'verified',
    createdAt: '2026-09-12T11:35:00Z',
  },
  {
    id: 'CONTRIB-SOL-03',
    citizenProfileId: 'PROF-SOL-01',
    userId: 'USER-SOL-01',
    districtId: 'solapur',
    complaintId: 'CR-SOL-103',
    contributionType: 'useful_evidence',
    points: 5,
    description: 'Clear photographic evidence of blocked pedestrian path',
    verificationStatus: 'verified',
    createdAt: '2026-09-12T11:35:00Z',
  },
  {
    id: 'CONTRIB-SOL-04',
    citizenProfileId: 'PROF-SOL-01',
    userId: 'USER-SOL-01',
    districtId: 'solapur',
    complaintId: 'CR-SOL-105',
    contributionType: 'resolution_verification',
    points: 10,
    description: 'Verified successful on-site slab replacement & safety fencing at Sadar Bazar Road',
    verificationStatus: 'verified',
    createdAt: '2026-09-14T11:00:00Z',
  },
];

// ============================================================================
// 2. PUNE DISTRICT
// ============================================================================
export const PUNE_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-PUN-01',
    userId: 'USER-PUN-01',
    districtId: 'pune',
    municipalCorporationId: 'pmc',
    displayName: 'Siddharth J.',
    civicScore: 1420,
    verifiedReportsCount: 48,
    verifiedResolutionsCount: 22,
    helpfulEvidenceCount: 41,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-09-22T11:00:00Z',
  },
  {
    id: 'PROF-PUN-02',
    userId: 'USER-PUN-02',
    districtId: 'pune',
    municipalCorporationId: 'pmc',
    displayName: 'Ananya K.',
    civicScore: 1190,
    verifiedReportsCount: 39,
    verifiedResolutionsCount: 17,
    helpfulEvidenceCount: 33,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-05T09:00:00Z',
    updatedAt: '2026-09-20T16:00:00Z',
  },
  {
    id: 'PROF-PUN-03',
    userId: 'USER-PUN-03',
    districtId: 'pune',
    municipalCorporationId: 'pmc',
    displayName: 'Sachin P.',
    civicScore: 980,
    verifiedReportsCount: 33,
    verifiedResolutionsCount: 14,
    helpfulEvidenceCount: 27,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-06-25T10:00:00Z',
    updatedAt: '2026-09-18T12:00:00Z',
  },
  {
    id: 'PROF-PUN-04',
    userId: 'USER-PUN-04',
    districtId: 'pune',
    municipalCorporationId: 'pcmc',
    displayName: 'Dr. Rohini D.',
    civicScore: 860,
    verifiedReportsCount: 27,
    verifiedResolutionsCount: 13,
    helpfulEvidenceCount: 22,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-12T14:30:00Z',
    updatedAt: '2026-09-15T09:15:00Z',
  },
  {
    id: 'PROF-PUN-05',
    userId: 'USER-PUN-05',
    districtId: 'pune',
    municipalCorporationId: 'pmc',
    displayName: 'Vikram T.',
    civicScore: 740,
    verifiedReportsCount: 24,
    verifiedResolutionsCount: 10,
    helpfulEvidenceCount: 19,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-28T16:00:00Z',
    updatedAt: '2026-09-10T14:00:00Z',
  },
];

// ============================================================================
// 3. NASHIK DISTRICT
// ============================================================================
export const NASHIK_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-NSK-01',
    userId: 'USER-NSK-01',
    districtId: 'nashik',
    municipalCorporationId: 'nmc',
    displayName: 'Pooja N.',
    civicScore: 1120,
    verifiedReportsCount: 37,
    verifiedResolutionsCount: 16,
    helpfulEvidenceCount: 30,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-18T09:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
  },
  {
    id: 'PROF-NSK-02',
    userId: 'USER-NSK-02',
    districtId: 'nashik',
    municipalCorporationId: 'nmc',
    displayName: 'Rajesh K.',
    civicScore: 940,
    verifiedReportsCount: 30,
    verifiedResolutionsCount: 13,
    helpfulEvidenceCount: 25,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-02T11:30:00Z',
    updatedAt: '2026-09-17T15:00:00Z',
  },
  {
    id: 'PROF-NSK-03',
    userId: 'USER-NSK-03',
    districtId: 'nashik',
    municipalCorporationId: 'nmc',
    displayName: 'Mandar T.',
    civicScore: 780,
    verifiedReportsCount: 25,
    verifiedResolutionsCount: 11,
    helpfulEvidenceCount: 20,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-19T14:00:00Z',
    updatedAt: '2026-09-14T09:30:00Z',
  },
];

// ============================================================================
// 4. CHHATRAPATI SAMBHAJINAGAR DISTRICT
// ============================================================================
export const CSN_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-CSN-01',
    userId: 'USER-CSN-01',
    districtId: 'chhatrapati_sambhajinagar',
    municipalCorporationId: 'csmc',
    displayName: 'Syed I.',
    civicScore: 1310,
    verifiedReportsCount: 44,
    verifiedResolutionsCount: 19,
    helpfulEvidenceCount: 36,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-08T08:30:00Z',
    updatedAt: '2026-09-22T14:00:00Z',
  },
  {
    id: 'PROF-CSN-02',
    userId: 'USER-CSN-02',
    districtId: 'chhatrapati_sambhajinagar',
    municipalCorporationId: 'csmc',
    displayName: 'Dr. Fatima A.',
    civicScore: 1040,
    verifiedReportsCount: 34,
    verifiedResolutionsCount: 15,
    helpfulEvidenceCount: 27,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-22T10:00:00Z',
    updatedAt: '2026-09-19T11:15:00Z',
  },
  {
    id: 'PROF-CSN-03',
    userId: 'USER-CSN-03',
    districtId: 'chhatrapati_sambhajinagar',
    municipalCorporationId: 'csmc',
    displayName: 'Ajay D.',
    civicScore: 890,
    verifiedReportsCount: 29,
    verifiedResolutionsCount: 12,
    helpfulEvidenceCount: 23,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-08T13:00:00Z',
    updatedAt: '2026-09-16T16:00:00Z',
  },
  {
    id: 'PROF-CSN-04',
    userId: 'USER-CSN-04',
    districtId: 'chhatrapati_sambhajinagar',
    municipalCorporationId: 'csmc',
    displayName: 'Meera B.',
    civicScore: 710,
    verifiedReportsCount: 23,
    verifiedResolutionsCount: 9,
    helpfulEvidenceCount: 18,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-25T15:30:00Z',
    updatedAt: '2026-09-12T10:45:00Z',
  },
];

// ============================================================================
// 5. MUMBAI DISTRICT
// ============================================================================
export const MUMBAI_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-MUM-01',
    userId: 'USER-MUM-01',
    districtId: 'mumbai',
    municipalCorporationId: 'bmc',
    displayName: 'Kunal M.',
    civicScore: 1560,
    verifiedReportsCount: 52,
    verifiedResolutionsCount: 24,
    helpfulEvidenceCount: 45,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-05-15T08:00:00Z',
    updatedAt: '2026-09-23T09:00:00Z',
  },
  {
    id: 'PROF-MUM-02',
    userId: 'USER-MUM-02',
    districtId: 'mumbai',
    municipalCorporationId: 'bmc',
    displayName: 'Farhan M.',
    civicScore: 1280,
    verifiedReportsCount: 41,
    verifiedResolutionsCount: 18,
    helpfulEvidenceCount: 35,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-09-20T17:00:00Z',
  },
];

// ============================================================================
// 6. NAGPUR DISTRICT
// ============================================================================
export const NAGPUR_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-NGP-01',
    userId: 'USER-NGP-01',
    districtId: 'nagpur',
    municipalCorporationId: 'nmc_nagpur',
    displayName: 'Prashant G.',
    civicScore: 1180,
    verifiedReportsCount: 38,
    verifiedResolutionsCount: 17,
    helpfulEvidenceCount: 32,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-12T09:00:00Z',
    updatedAt: '2026-09-21T11:00:00Z',
  },
  {
    id: 'PROF-NGP-02',
    userId: 'USER-NGP-02',
    districtId: 'nagpur',
    municipalCorporationId: 'nmc_nagpur',
    displayName: 'Swati D.',
    civicScore: 890,
    verifiedReportsCount: 28,
    verifiedResolutionsCount: 12,
    helpfulEvidenceCount: 22,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-05T13:00:00Z',
    updatedAt: '2026-09-16T14:30:00Z',
  },
];

// ============================================================================
// 7. THANE DISTRICT
// ============================================================================
export const THANE_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-THN-01',
    userId: 'USER-THN-01',
    districtId: 'thane',
    municipalCorporationId: 'tmc',
    displayName: 'Aditya S.',
    civicScore: 1240,
    verifiedReportsCount: 40,
    verifiedResolutionsCount: 18,
    helpfulEvidenceCount: 34,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-10T09:30:00Z',
    updatedAt: '2026-09-20T15:00:00Z',
  },
  {
    id: 'PROF-THN-02',
    userId: 'USER-THN-02',
    districtId: 'thane',
    municipalCorporationId: 'tmc',
    displayName: 'Ruchira P.',
    civicScore: 910,
    verifiedReportsCount: 29,
    verifiedResolutionsCount: 13,
    helpfulEvidenceCount: 23,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-04T11:00:00Z',
    updatedAt: '2026-09-17T12:00:00Z',
  },
];

// ============================================================================
// 8. KOLHAPUR DISTRICT
// ============================================================================
export const KOLHAPUR_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-KLP-01',
    userId: 'USER-KLP-01',
    districtId: 'kolhapur',
    municipalCorporationId: 'kmc',
    displayName: 'Digvijay P.',
    civicScore: 1050,
    verifiedReportsCount: 34,
    verifiedResolutionsCount: 15,
    helpfulEvidenceCount: 28,
    badgeLevel: 'leader',
    isFlagged: false,
    createdAt: '2026-06-20T08:00:00Z',
    updatedAt: '2026-09-19T16:00:00Z',
  },
  {
    id: 'PROF-KLP-02',
    userId: 'USER-KLP-02',
    districtId: 'kolhapur',
    municipalCorporationId: 'kmc',
    displayName: 'Pallavi C.',
    civicScore: 840,
    verifiedReportsCount: 27,
    verifiedResolutionsCount: 11,
    helpfulEvidenceCount: 21,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-14T10:30:00Z',
    updatedAt: '2026-09-15T11:00:00Z',
  },
];

// ============================================================================
// 9. AMRAVATI DISTRICT
// ============================================================================
export const AMRAVATI_PROFILES: CitizenCivicProfile[] = [
  {
    id: 'PROF-AMR-01',
    userId: 'USER-AMR-01',
    districtId: 'amravati',
    municipalCorporationId: 'amc',
    displayName: 'Mangesh T.',
    civicScore: 990,
    verifiedReportsCount: 32,
    verifiedResolutionsCount: 14,
    helpfulEvidenceCount: 26,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-06-28T09:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
  },
  {
    id: 'PROF-AMR-02',
    userId: 'USER-AMR-02',
    districtId: 'amravati',
    municipalCorporationId: 'amc',
    displayName: 'Snehal W.',
    civicScore: 760,
    verifiedReportsCount: 24,
    verifiedResolutionsCount: 10,
    helpfulEvidenceCount: 19,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-07-22T14:00:00Z',
    updatedAt: '2026-09-13T13:00:00Z',
  },
];

// ============================================================================
// DISTRICT PROFILES LOOKUP MAP
// ============================================================================
export const DISTRICT_CIVIC_PROFILES_MAP: Record<string, CitizenCivicProfile[]> = {
  pune: PUNE_PROFILES,
  solapur: SOLAPUR_PROFILES,
  nashik: NASHIK_PROFILES,
  chhatrapati_sambhajinagar: CSN_PROFILES,
  csn: CSN_PROFILES,
  mumbai: MUMBAI_PROFILES,
  nagpur: NAGPUR_PROFILES,
  thane: THANE_PROFILES,
  kolhapur: KOLHAPUR_PROFILES,
  amravati: AMRAVATI_PROFILES,
};

// ============================================================================
// 26 JAN & 15 AUG RECOGNITION CYCLES (District-Wise)
// ============================================================================
export const DISTRICT_RECOGNITION_CYCLES: DistrictRecognitionCycle[] = MAHARASHTRA_DISTRICTS.flatMap((d) => [
  {
    id: `REC-${d.id.toUpperCase()}-REP-2027`,
    districtId: d.id,
    districtName: d.name,
    eventName: `Republic Day Civic Champions 2027`,
    eventDate: '2027-01-26',
    eligibleRankLimit: 10,
    rewardType: 'District Collector Citation & Civic Honor Certificate',
    status: 'proposed',
  },
  {
    id: `REC-${d.id.toUpperCase()}-IND-2026`,
    districtId: d.id,
    districtName: d.name,
    eventName: `Independence Day Civic Champions 2026`,
    eventDate: '2026-08-15',
    eligibleRankLimit: 10,
    rewardType: 'Municipal Commissioner Commendation & Civic Merit Badge',
    status: 'approved',
    announcedAt: '2026-08-15T09:00:00Z',
  },
]);

/**
 * Retrieve isolated citizen profiles for a specific district.
 */
export function getMockCivicProfilesForDistrict(districtId: string): CitizenCivicProfile[] {
  const key = (districtId || '').toLowerCase().trim();
  const profiles = DISTRICT_CIVIC_PROFILES_MAP[key];
  if (profiles && profiles.length > 0) {
    return profiles.map((p) => ({ ...p }));
  }
  return [];
}

/**
 * Retrieve isolated contributions audit log for a citizen profile.
 */
export function getMockContributionsForCitizen(profileId: string): CivicContribution[] {
  const contributions: CivicContribution[] = [
    ...SOLAPUR_CONTRIBUTIONS,
    {
      id: `CONTRIB-${profileId}-1`,
      citizenProfileId: profileId,
      userId: 'USER-DEFAULT',
      districtId: 'solapur',
      contributionType: 'verified_report',
      points: 10,
      description: 'Verified genuine road pothole report on arterial hospital corridor',
      verificationStatus: 'verified',
      createdAt: '2026-09-15T08:00:00Z',
    },
    {
      id: `CONTRIB-${profileId}-2`,
      citizenProfileId: profileId,
      userId: 'USER-DEFAULT',
      districtId: 'solapur',
      contributionType: 'accurate_location',
      points: 5,
      description: 'Accurate GIS latitude/longitude coordinates confirmed with municipal ward map',
      verificationStatus: 'verified',
      createdAt: '2026-09-15T08:00:00Z',
    },
    {
      id: `CONTRIB-${profileId}-3`,
      citizenProfileId: profileId,
      userId: 'USER-DEFAULT',
      districtId: 'solapur',
      contributionType: 'useful_evidence',
      points: 5,
      description: 'High quality geotagged before-repair photographic evidence submitted',
      verificationStatus: 'verified',
      createdAt: '2026-09-15T08:00:00Z',
    },
    {
      id: `CONTRIB-${profileId}-4`,
      citizenProfileId: profileId,
      userId: 'USER-DEFAULT',
      districtId: 'solapur',
      contributionType: 'resolution_verification',
      points: 10,
      description: 'On-site post-completion audit verification photo confirmed work completed',
      verificationStatus: 'verified',
      createdAt: '2026-09-18T10:30:00Z',
    },
  ];
  return contributions;
}

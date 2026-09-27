import { Complaint } from '../../types/complaint';

/**
 * CIVICRESOLVE — District-Specific Mock Datasets
 *
 * Provides isolated, realistic complaint datasets for Maharashtra municipal corporations:
 * - Pune (PMC)
 * - Solapur (SMC)
 * - Nashik (NMC)
 * - Chhatrapati Sambhajinagar (CSMC)
 * - Mumbai (BMC)
 * - Nagpur (NMC Nagpur)
 * - Thane (TMC)
 * - Kolhapur (KMC)
 * - Amravati (AMC)
 *
 * ZERO hardcoded cross-district bleed: Each district has its own landmarks, wards, coordinates, and issues.
 */

export const PUNE_COMPLAINTS: Complaint[] = [
  {
    id: "CR-PUN-101",
    dbId: 201,
    title: "Deep Pothole & Caved Asphalt on Fergusson College Road",
    description: "Massive asphalt crater near Goodluck Chowk. Causes severe congestion during morning college peak and hazardous to two-wheelers.",
    category: "roads",
    categoryLabel: "Roads & Infrastructure",
    location: {
      address: "FC Road, Near Goodluck Chowk, Deccan Gymkhana",
      landmark: "Opposite Goodluck Cafe",
      ward: "Ward 14 - Deccan Gymkhana / Model Colony",
      zone: "Zone 3 (Ghole Road)",
      latitude: 18.5246,
      longitude: 73.8415,
    },
    status: "in_progress",
    priority: "urgent",
    reporter: {
      name: "Siddharth Joshi",
      phone: "+91 98220 11223",
      aadharMasked: "XXXX-XXXX-3341",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-PUN-01",
      officerName: "Sunil Kadam",
      departmentId: "DEP-ROADS-PMC",
      departmentName: "PMC Road Maintenance Dept",
      contractorName: "Pune Infrastructure Ltd",
      assignedAt: "2026-09-15T08:30:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [
      {
        id: "SH-PUN-1",
        toStatus: "submitted",
        changedBy: "Siddharth Joshi",
        role: "citizen",
        timestamp: "2026-09-15T07:10:00Z",
        notes: "Logged via Citizen App with geo-tag",
      },
      {
        id: "SH-PUN-2",
        fromStatus: "submitted",
        toStatus: "in_progress",
        changedBy: "PMC Command Center",
        role: "system",
        timestamp: "2026-09-15T08:30:00Z",
        notes: "Emergency asphalt patching unit dispatched",
      }
    ],
    adminNotes: [
      {
        id: "AN-PUN-1",
        author: "Sunil Kadam (AE)",
        text: "Traffic diverted through FC lane 2 during repair work.",
        createdAt: "2026-09-15T09:00:00Z",
        isInternal: true,
      }
    ],
    aiClassification: {
      detectedCategory: "roads",
      suggestedPriority: "urgent",
      confidenceScore: 0.95,
      hazardKeywords: ["college peak", "crater", "two-wheeler risk"],
      summary: "Critical arterial pothole disrupting FC Road transit.",
      clusterAnomalyDetected: true,
      duplicateDistanceMeters: 20,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 4,
      slaStatus: "warning",
      deadline: "2026-09-16T08:30:00Z",
      isOverdue: false,
    },
    upvotesCount: 34,
    isDuplicateCluster: true,
    clusterGroupId: "CLUSTER-PUN-01",
    createdAt: "2026-09-15T07:10:00Z",
    updatedAt: "2026-09-15T08:30:00Z",
  },
  {
    id: "CR-PUN-102",
    dbId: 202,
    title: "Major Water Main Pipe Burst Flooding Paud Road",
    description: "High-pressure potable water feeder ruptured beneath footpath in Kothrud. Drinking water flooding residential basement ramps.",
    category: "water_sewage",
    categoryLabel: "Water Supply & Distribution",
    location: {
      address: "Paud Road, Near MIT World Peace University",
      landmark: "Near Vanaz Metro Station",
      ward: "Ward 11 - Kothrud / Bavdhan",
      zone: "Zone 2 (Kothrud)",
      latitude: 18.5074,
      longitude: 73.8077,
    },
    status: "assigned",
    priority: "urgent",
    reporter: {
      name: "Radhika Kulkarni",
      phone: "+91 97640 44556",
      aadharMasked: "XXXX-XXXX-8821",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-PUN-02",
      officerName: "Anand More",
      departmentId: "DEP-WATER-PMC",
      departmentName: "PMC Water Works Department",
      contractorName: "Kothrud Jal Seva Works",
      assignedAt: "2026-09-15T09:15:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [
      {
        id: "SH-PUN-3",
        toStatus: "submitted",
        changedBy: "Radhika Kulkarni",
        role: "citizen",
        timestamp: "2026-09-15T08:45:00Z",
      },
      {
        id: "SH-PUN-4",
        fromStatus: "submitted",
        toStatus: "assigned",
        changedBy: "Control Desk",
        role: "system",
        timestamp: "2026-09-15T09:15:00Z",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "water_sewage",
      suggestedPriority: "urgent",
      confidenceScore: 0.98,
      hazardKeywords: ["drinking water", "rupture", "basement flooding"],
      summary: "300mm water pipe burst causing significant urban runoff.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 8,
      slaStatus: "on_track",
      deadline: "2026-09-16T12:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 19,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T08:45:00Z",
    updatedAt: "2026-09-15T09:15:00Z",
  },
  {
    id: "CR-PUN-103",
    dbId: 203,
    title: "Overflowing Garbage Compactor Bin & Stray Animals",
    description: "Solid waste uncollected for 4 days outside Shivajinagar railway station exit. Foul smell and stray dogs causing pedestrian safety risk.",
    category: "waste_management",
    categoryLabel: "Solid Waste Management",
    location: {
      address: "Old Pune-Mumbai Highway, Near Shivajinagar ST Stand",
      landmark: "Shivajinagar Railway Gate 2",
      ward: "Ward 07 - Shivajinagar",
      zone: "Zone 1 (Central Pune)",
      latitude: 18.5308,
      longitude: 73.8527,
    },
    status: "submitted",
    priority: "medium",
    reporter: {
      name: "Manoj Bapat",
      phone: "+91 94220 98765",
      aadharMasked: "XXXX-XXXX-1190",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [
      {
        id: "SH-PUN-5",
        toStatus: "submitted",
        changedBy: "Manoj Bapat",
        role: "citizen",
        timestamp: "2026-09-15T10:00:00Z",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "waste_management",
      suggestedPriority: "medium",
      confidenceScore: 0.91,
      hazardKeywords: ["solid waste", "stray dogs", "station exit"],
      summary: "Uncollected municipal waste near transit hub.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 24,
      hoursRemaining: 21,
      slaStatus: "on_track",
      deadline: "2026-09-16T10:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 12,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T10:00:00Z",
    updatedAt: "2026-09-15T10:00:00Z",
  },
  {
    id: "CR-PUN-104",
    dbId: 204,
    title: "Streetlights Blackout on Katraj Ghat Descent",
    description: "8 consecutive LED poles dark along Satara road near Katraj lake bypass. Multiple hairpin turns without lighting.",
    category: "streetlights",
    categoryLabel: "Electrical & Street Lighting",
    location: {
      address: "Pune-Satara Road, Near Katraj Snake Park",
      landmark: "Opposite Katraj Dairy Outlet",
      ward: "Ward 39 - Katraj / Dhankawadi",
      zone: "Zone 5 (Sahakarnagar)",
      latitude: 18.4575,
      longitude: 73.8677,
    },
    status: "in_progress",
    priority: "high",
    reporter: {
      name: "Sneha Patil",
      phone: "+91 91580 33441",
      aadharMasked: "XXXX-XXXX-6677",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-PUN-03",
      officerName: "Vikas Jagtap",
      departmentId: "DEP-ELEC-PMC",
      departmentName: "Electrical Engineering Cell",
      contractorName: "Maharashtra Power Grid Maintenance",
      assignedAt: "2026-09-14T20:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [
      {
        id: "SH-PUN-6",
        toStatus: "submitted",
        changedBy: "Sneha Patil",
        role: "citizen",
        timestamp: "2026-09-14T19:30:00Z",
      },
      {
        id: "SH-PUN-7",
        fromStatus: "submitted",
        toStatus: "in_progress",
        changedBy: "Vikas Jagtap",
        role: "officer",
        timestamp: "2026-09-14T20:00:00Z",
        notes: "Cable fault detected between pole 14 and 22",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "streetlights",
      suggestedPriority: "high",
      confidenceScore: 0.93,
      hazardKeywords: ["blackout", "hairpin curve", "accident hazard"],
      summary: "Dark corridor on major highway feeder section.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 24,
      hoursRemaining: 5,
      slaStatus: "warning",
      deadline: "2026-09-15T19:30:00Z",
      isOverdue: false,
    },
    upvotesCount: 22,
    isDuplicateCluster: false,
    createdAt: "2026-09-14T19:30:00Z",
    updatedAt: "2026-09-14T20:00:00Z",
  },
  {
    id: "CR-PUN-105",
    dbId: 205,
    title: "Choked Stormwater Conduit Overflowing into Jedhe Square",
    description: "Sewer and drainage line backflowing onto transit plaza at Swargate. Substantial pedestrian footfall impacted.",
    category: "drainage",
    categoryLabel: "Drainage & Sewerage",
    location: {
      address: "Jedhe Chowk, Swargate Bus Terminal Corridor",
      landmark: "Swargate Flyover Base",
      ward: "Ward 18 - Swargate / Parvati",
      zone: "Zone 4 (Bhavani Peth)",
      latitude: 18.5018,
      longitude: 73.8636,
    },
    status: "resolution_submitted",
    priority: "high",
    reporter: {
      name: "Vijay Ghate",
      phone: "+91 98900 77112",
      aadharMasked: "XXXX-XXXX-4523",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-PUN-04",
      officerName: "Ramesh Thorat",
      departmentId: "DEP-DRAIN-PMC",
      departmentName: "PMC Drainage Department",
      contractorName: "Swargate Suction Services",
      assignedAt: "2026-09-14T11:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
      after: [
        "https://images.unsplash.com/photo-1584463699039-b3a1a6b09337?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [
      {
        id: "SH-PUN-8",
        toStatus: "submitted",
        changedBy: "Vijay Ghate",
        role: "citizen",
        timestamp: "2026-09-14T10:15:00Z",
      },
      {
        id: "SH-PUN-9",
        fromStatus: "submitted",
        toStatus: "resolution_submitted",
        changedBy: "Ramesh Thorat",
        role: "officer",
        timestamp: "2026-09-15T09:30:00Z",
        notes: "Suction desilting jet vehicle deployed. Block cleared.",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "drainage",
      suggestedPriority: "high",
      confidenceScore: 0.94,
      hazardKeywords: ["backflow", "transit plaza", "sanitation risk"],
      summary: "Severe stormwater conduit block at high density intersection.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 24,
      hoursRemaining: 1,
      slaStatus: "warning",
      deadline: "2026-09-15T10:15:00Z",
      isOverdue: false,
    },
    upvotesCount: 27,
    isDuplicateCluster: false,
    createdAt: "2026-09-14T10:15:00Z",
    updatedAt: "2026-09-15T09:30:00Z",
  }
];

export const SOLAPUR_COMPLAINTS: Complaint[] = [
  {
    id: "CR-SOL-101",
    dbId: 101,
    title: "Deep Pothole & Caved Asphalt on Saat Rasta Square",
    description: "Dangerous crater-type pothole roughly 1.5m diameter right at the junction turn. Caused two motorcycle skids during morning peak transit.",
    category: "roads",
    categoryLabel: "Roads & Infrastructure",
    location: {
      address: "Saat Rasta Square, Near Old Employment Chowk",
      landmark: "Opposite Solapur Head Post Office",
      ward: "Ward 02 - Saat Rasta / Civil Lines",
      zone: "Zone 2 (Saat Rasta)",
      latitude: 17.6685,
      longitude: 75.9042,
    },
    status: "in_progress",
    priority: "urgent",
    reporter: {
      name: "Rohit Deshmukh",
      phone: "+91 98230 45812",
      aadharMasked: "XXXX-XXXX-4819",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-301",
      officerName: "Rajesh Shinde",
      departmentId: "DEP-ROADS-SMC",
      departmentName: "SMC Roads & Infrastructure",
      contractorName: "Solapur Municipal Roadways Infra",
      assignedAt: "2026-09-12T08:30:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [
      {
        id: "SH-1",
        toStatus: "submitted",
        changedBy: "Rohit Deshmukh",
        role: "citizen",
        timestamp: "2026-09-12T07:15:00Z",
        notes: "Grievance submitted via Citizen Mobile App with GPS tag",
      },
      {
        id: "SH-2",
        fromStatus: "submitted",
        toStatus: "in_progress",
        changedBy: "Command Triage Desk",
        role: "system",
        timestamp: "2026-09-12T08:30:00Z",
        notes: "AI Multimodal model classified as Urgent Severity",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "roads",
      suggestedPriority: "urgent",
      confidenceScore: 0.96,
      hazardKeywords: ["motorcycle skid", "crater", "peak transit"],
      summary: "High-risk pothole obstructing critical junction.",
      clusterAnomalyDetected: true,
      duplicateDistanceMeters: 45,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 0,
      slaStatus: "breached",
      deadline: "2026-09-12T19:15:00Z",
      isOverdue: true,
    },
    upvotesCount: 28,
    isDuplicateCluster: true,
    clusterGroupId: "CLUSTER-SR-01",
    createdAt: "2026-09-12T07:15:00Z",
    updatedAt: "2026-09-12T09:45:00Z",
  },
  {
    id: "CR-SOL-102",
    dbId: 102,
    title: "Major Main Water Pipeline Rupture Flooding Sub-Road",
    description: "400mm cast-iron supply conduit fractured beneath pavement. High-pressure drinking water gushing onto market road, threatening basements.",
    category: "water_sewage",
    categoryLabel: "Water Works Dept",
    location: {
      address: "Hotgi Road, Near Market Yard Junction",
      landmark: "Near Solapur Agriculture Produce Market Committee",
      ward: "Ward 03 - Hotgi Road / Jule Solapur",
      zone: "Zone 3 (Hotgi Road)",
      latitude: 17.6455,
      longitude: 75.9182,
    },
    status: "in_progress",
    priority: "medium",
    reporter: {
      name: "Pooja Hegde",
      phone: "+91 97654 32190",
      aadharMasked: "XXXX-XXXX-9921",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-104",
      officerName: "Anil Kulkarni",
      departmentId: "DEP-WATER-SMC",
      departmentName: "SMC Water Works Dept",
      contractorName: "Solapur Jal Seva Works",
      assignedAt: "2026-09-12T09:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 48,
      hoursRemaining: 0,
      slaStatus: "breached",
      deadline: "2026-09-14T09:00:00Z",
      isOverdue: true,
    },
    upvotesCount: 14,
    isDuplicateCluster: false,
    createdAt: "2026-09-12T09:00:00Z",
    updatedAt: "2026-09-12T10:00:00Z",
  },
  {
    id: "CR-SOL-103",
    dbId: 103,
    title: "Overflowing Commercial Garbage & Street Encroachment",
    description: "Over 3 tonnes of unsegregated packaging waste dumped across pedestrian walkway in central bazaar area.",
    category: "waste_management",
    categoryLabel: "Garbage & Sanitation",
    location: {
      address: "Navi Peth Market Central Lane",
      landmark: "Near Siddheshwar Temple North Gate",
      ward: "Ward 01 - Navi Peth / Old City",
      zone: "Zone 1 (Central)",
      latitude: 17.6742,
      longitude: 75.9015,
    },
    status: "in_progress",
    priority: "medium",
    reporter: {
      name: "Mahesh Birajdar",
      phone: "+91 99211 44552",
      aadharMasked: "XXXX-XXXX-1032",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 48,
      hoursRemaining: 0,
      slaStatus: "breached",
      deadline: "2026-09-14T11:30:00Z",
      isOverdue: true,
    },
    upvotesCount: 9,
    isDuplicateCluster: false,
    createdAt: "2026-09-12T11:30:00Z",
    updatedAt: "2026-09-12T11:30:00Z",
  },
  {
    id: "CR-SOL-104",
    dbId: 104,
    title: "Vijapur Road High Mast Floodlight Total Failure",
    description: "Entire junction illumination failure across 6-lane bypass. Multiple close collisions reported.",
    category: "streetlights",
    categoryLabel: "Electricity & Streetlights",
    location: {
      address: "Vijapur Road, Outer Ring Junction",
      landmark: "Near New Shivaji College",
      ward: "Ward 04 - Vijapur Road",
      zone: "Zone 4 (South)",
      latitude: 17.6321,
      longitude: 75.8894,
    },
    status: "resolution_submitted",
    priority: "medium",
    reporter: {
      name: "Amit Jadhav",
      phone: "+91 94233 88102",
      aadharMasked: "XXXX-XXXX-7788",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 48,
      hoursRemaining: 0,
      slaStatus: "breached",
      deadline: "2026-09-14T14:00:00Z",
      isOverdue: true,
    },
    upvotesCount: 16,
    isDuplicateCluster: false,
    createdAt: "2026-09-12T14:00:00Z",
    updatedAt: "2026-09-13T10:00:00Z",
  },
  {
    id: "CR-SOL-105",
    dbId: 105,
    title: "Broken Open Storm Drain Slab on Sadar Bazar Road",
    description: "Reinforced concrete drain slab collapsed into 2m deep canal. Uncovered hole right in front of government school entrance.",
    category: "drainage",
    categoryLabel: "Drainage & Sewerage",
    location: {
      address: "Sadar Bazar Cantonment Line, Near Camp School",
      landmark: "Opposite Solapur Camp Dispensary",
      ward: "Ward 02 - Saat Rasta / Sadar Bazar",
      zone: "Zone 2 (Saat Rasta)",
      latitude: 17.6612,
      longitude: 75.9148,
    },
    status: "closed",
    priority: "low",
    reporter: {
      name: "Girish Kote",
      phone: "+91 98811 23456",
      aadharMasked: "XXXX-XXXX-5511",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 72,
      hoursRemaining: 15,
      slaStatus: "on_track",
      deadline: "2026-09-15T16:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 5,
    isDuplicateCluster: false,
    createdAt: "2026-09-12T16:00:00Z",
    updatedAt: "2026-09-14T11:00:00Z",
  }
];

export const NASHIK_COMPLAINTS: Complaint[] = [
  {
    id: "CR-NSK-101",
    dbId: 301,
    title: "Severe Road Surface Subsidence at CBS Circle",
    description: "Deep continuous rutting and pavement depression around Central Bus Stand rotary. City buses scraping undercarriage.",
    category: "roads",
    categoryLabel: "Roads & Infrastructure",
    location: {
      address: "CBS Circle, Trimbak Road",
      landmark: "Opposite Nashik Central Bus Station",
      ward: "Ward 08 - CBS / Sharanpur",
      zone: "Zone 1 (Nashik West)",
      latitude: 19.9981,
      longitude: 73.7852,
    },
    status: "in_progress",
    priority: "urgent",
    reporter: {
      name: "Kishor Sonawane",
      phone: "+91 98229 66110",
      aadharMasked: "XXXX-XXXX-9102",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-NSK-01",
      officerName: "Pravin Bagul",
      departmentId: "DEP-ROADS-NMC",
      departmentName: "NMC Public Works Department",
      contractorName: "Nashik Infrastructure Developers",
      assignedAt: "2026-09-15T07:45:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [
      {
        id: "SH-NSK-1",
        toStatus: "submitted",
        changedBy: "Kishor Sonawane",
        role: "citizen",
        timestamp: "2026-09-15T06:30:00Z",
      },
      {
        id: "SH-NSK-2",
        fromStatus: "submitted",
        toStatus: "in_progress",
        changedBy: "NMC Triage Desk",
        role: "system",
        timestamp: "2026-09-15T07:45:00Z",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "roads",
      suggestedPriority: "urgent",
      confidenceScore: 0.97,
      hazardKeywords: ["bus scraping", "depression", "rotary bottleneck"],
      summary: "Major arterial subsidence disrupting state transport operations.",
      clusterAnomalyDetected: true,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 5,
      slaStatus: "warning",
      deadline: "2026-09-15T18:30:00Z",
      isOverdue: false,
    },
    upvotesCount: 41,
    isDuplicateCluster: true,
    clusterGroupId: "CLUSTER-NSK-01",
    createdAt: "2026-09-15T06:30:00Z",
    updatedAt: "2026-09-15T07:45:00Z",
  },
  {
    id: "CR-NSK-102",
    dbId: 302,
    title: "Raw Sewage Discharge Leak into Godavari Ghat",
    description: "Broken underground sewerage connector discharging untreated effluent near Ramkund heritage pilgrimage site.",
    category: "water_sewage",
    categoryLabel: "Water Works Dept",
    location: {
      address: "Panchavati Ghat, Near Ramkund",
      landmark: "Near Naroshankar Temple Steps",
      ward: "Ward 04 - Panchavati / Ramkund",
      zone: "Zone 3 (Panchavati)",
      latitude: 20.0063,
      longitude: 73.7915,
    },
    status: "assigned",
    priority: "urgent",
    reporter: {
      name: "Devendra Joshi",
      phone: "+91 94222 34188",
      aadharMasked: "XXXX-XXXX-4421",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-NSK-02",
      officerName: "Hemant Patil",
      departmentId: "DEP-DRAIN-NMC",
      departmentName: "Godavari River Conservation Cell",
      contractorName: "Panchavati Environmental Services",
      assignedAt: "2026-09-15T08:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "water_sewage",
      suggestedPriority: "urgent",
      confidenceScore: 0.99,
      hazardKeywords: ["pilgrimage", "effluent", "river contamination"],
      summary: "High sensitivity heritage zone sewage leak.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 6,
      slaStatus: "warning",
      deadline: "2026-09-15T19:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 52,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T07:00:00Z",
    updatedAt: "2026-09-15T08:00:00Z",
  },
  {
    id: "CR-NSK-103",
    dbId: 303,
    title: "Unauthorized Construction Debris Dumping on Dindori Road",
    description: "Tractor trailers dumping rubble and plaster bags along the service lane near Meri Colony entrance.",
    category: "waste_management",
    categoryLabel: "Garbage & Sanitation",
    location: {
      address: "Dindori Road, Near MERI Campus Entrance",
      landmark: "Opposite Maharashtra Engineering Research Institute",
      ward: "Ward 12 - Mhasrul / Meri",
      zone: "Zone 4 (Panchavati North)",
      latitude: 20.0412,
      longitude: 73.8123,
    },
    status: "submitted",
    priority: "medium",
    reporter: {
      name: "Tanvi Khairnar",
      phone: "+91 98810 55412",
      aadharMasked: "XXXX-XXXX-6701",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "waste_management",
      suggestedPriority: "medium",
      confidenceScore: 0.89,
      hazardKeywords: ["debris", "service lane", "unauthorized dumping"],
      summary: "Construction waste encroachment on public roadway.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 48,
      hoursRemaining: 42,
      slaStatus: "on_track",
      deadline: "2026-09-17T09:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 11,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T09:00:00Z",
    updatedAt: "2026-09-15T09:00:00Z",
  },
  {
    id: "CR-NSK-104",
    dbId: 304,
    title: "Expansion Joint Failure on Nashik Road Railway Flyover",
    description: "Metal expansion plates misaligned by 4 inches creating severe tyre rupture risk for vehicles crossing tracks.",
    category: "roads",
    categoryLabel: "Roads & Infrastructure",
    location: {
      address: "Nashik Road Station Flyover, Sinnar Phata",
      landmark: "Above Nashik Road Central Railway Tracks",
      ward: "Ward 22 - Nashik Road Station",
      zone: "Zone 6 (Nashik Road)",
      latitude: 19.9572,
      longitude: 73.8341,
    },
    status: "in_progress",
    priority: "urgent",
    reporter: {
      name: "Ajay Gaikwad",
      phone: "+91 97631 88920",
      aadharMasked: "XXXX-XXXX-2244",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-NSK-03",
      officerName: "Sanjay Shinde",
      departmentId: "DEP-BRIDGES-NMC",
      departmentName: "NMC Bridge & Flyover Cell",
      contractorName: "Maharashtra State Bridge Infra",
      assignedAt: "2026-09-14T16:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 12,
      hoursRemaining: 2,
      slaStatus: "warning",
      deadline: "2026-09-15T04:00:00Z",
      isOverdue: true,
    },
    upvotesCount: 38,
    isDuplicateCluster: false,
    createdAt: "2026-09-14T15:30:00Z",
    updatedAt: "2026-09-14T16:00:00Z",
  }
];

export const CSN_COMPLAINTS: Complaint[] = [
  {
    id: "CR-CSN-101",
    dbId: 401,
    title: "Arterial Road Pothole Obstructing Ambulance Route to Govt Hospital",
    description: "Deep ditch at Gul Mandi market turn blocking emergency vehicles en route to Ghati Government Medical College.",
    category: "roads",
    categoryLabel: "Roads & Infrastructure",
    location: {
      address: "Gul Mandi Market Road, Near City Chowk",
      landmark: "Opposite Old Cloth Market Entrance",
      ward: "Ward 06 - Gul Mandi / City Chowk",
      zone: "Zone 1 (Old City)",
      latitude: 19.8821,
      longitude: 75.3289,
    },
    status: "in_progress",
    priority: "urgent",
    reporter: {
      name: "Syed Imran",
      phone: "+91 98902 44331",
      aadharMasked: "XXXX-XXXX-9901",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-CSN-01",
      officerName: "Abdul Rahim",
      departmentId: "DEP-ROADS-CSMC",
      departmentName: "CSMC Engineering Works",
      contractorName: "Marathwada Highway Construction",
      assignedAt: "2026-09-15T08:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "roads",
      suggestedPriority: "urgent",
      confidenceScore: 0.98,
      hazardKeywords: ["ambulance route", "hospital delay", "deep crater"],
      summary: "Emergency route compromised by asphalt collapse.",
      clusterAnomalyDetected: true,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 5,
      slaStatus: "warning",
      deadline: "2026-09-15T19:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 46,
    isDuplicateCluster: true,
    clusterGroupId: "CLUSTER-CSN-01",
    createdAt: "2026-09-15T07:00:00Z",
    updatedAt: "2026-09-15T08:00:00Z",
  },
  {
    id: "CR-CSN-102",
    dbId: 402,
    title: "Raw Sewage Overflow at Kham River Causeway",
    description: "Stormwater and sewer junction overflowing over pedestrian causeway near Barapulla Gate. High bacterial contamination risk.",
    category: "drainage",
    categoryLabel: "Drainage & Sewerage",
    location: {
      address: "Barapulla Gate Road, Kham River Bridge",
      landmark: "Near Ancient Barapulla Gate",
      ward: "Ward 03 - Kham River Corridor",
      zone: "Zone 2 (West)",
      latitude: 19.8912,
      longitude: 75.3175,
    },
    status: "assigned",
    priority: "high",
    reporter: {
      name: "Prakash Shinde",
      phone: "+91 94237 88123",
      aadharMasked: "XXXX-XXXX-1234",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-CSN-02",
      officerName: "Mahesh Gavali",
      departmentId: "DEP-DRAIN-CSMC",
      departmentName: "CSMC Drainage Cell",
      contractorName: "Sambhajinagar Sanitation Team",
      assignedAt: "2026-09-15T08:45:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 24,
      hoursRemaining: 18,
      slaStatus: "on_track",
      deadline: "2026-09-16T08:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 29,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T08:00:00Z",
    updatedAt: "2026-09-15T08:45:00Z",
  },
  {
    id: "CR-CSN-103",
    dbId: 403,
    title: "Heritage Buffer Zone Garbage Dumping near Bibi Ka Maqbara",
    description: "Illegal commercial waste and plastic packaging accumulating within 200m prohibited ASI monument buffer perimeter.",
    category: "waste_management",
    categoryLabel: "Garbage & Sanitation",
    location: {
      address: "Bibi Ka Maqbara Approach Road, Begumpura",
      landmark: "Near ASI East Ticket Counter",
      ward: "Ward 09 - Begumpura / Heritage Zone",
      zone: "Zone 3 (North)",
      latitude: 19.9014,
      longitude: 75.3202,
    },
    status: "submitted",
    priority: "medium",
    reporter: {
      name: "Asma Khan",
      phone: "+91 98234 56789",
      aadharMasked: "XXXX-XXXX-7654",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 48,
      hoursRemaining: 40,
      slaStatus: "on_track",
      deadline: "2026-09-17T07:30:00Z",
      isOverdue: false,
    },
    upvotesCount: 31,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T07:30:00Z",
    updatedAt: "2026-09-15T07:30:00Z",
  },
  {
    id: "CR-CSN-104",
    dbId: 404,
    title: "Complete Streetlights Blackout on Paithan Road Highway Link",
    description: "12 streetlight poles off from Railway station bridge to Mahanagar bank. Heavy commercial freight moving in darkness.",
    category: "streetlights",
    categoryLabel: "Electricity & Streetlights",
    location: {
      address: "Paithan Road, Near Railway Station South Overbridge",
      landmark: "Opposite Mahanagar Co-op Bank",
      ward: "Ward 15 - Paithan Road / Station",
      zone: "Zone 4 (South)",
      latitude: 19.8550,
      longitude: 75.3188,
    },
    status: "in_progress",
    priority: "high",
    reporter: {
      name: "Dnyaneshwar Kale",
      phone: "+91 91588 99120",
      aadharMasked: "XXXX-XXXX-3388",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-CSN-03",
      officerName: "Satish More",
      departmentId: "DEP-ELEC-CSMC",
      departmentName: "CSMC Electrical Department",
      contractorName: "Marathwada Power infra",
      assignedAt: "2026-09-14T21:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 24,
      hoursRemaining: 6,
      slaStatus: "warning",
      deadline: "2026-09-15T20:30:00Z",
      isOverdue: false,
    },
    upvotesCount: 23,
    isDuplicateCluster: false,
    createdAt: "2026-09-14T20:30:00Z",
    updatedAt: "2026-09-14T21:00:00Z",
  }
];

export const MUMBAI_COMPLAINTS: Complaint[] = [
  {
    id: "CR-MUM-101",
    dbId: 501,
    title: "Monsoon Waterlogging & Catchment Clog at Dadar TT Circle",
    description: "Stormwater drain blocked by plastic packaging causing 1.5 ft water pooling across Dadar Tram Terminus junction.",
    category: "drainage",
    categoryLabel: "Drainage & Stormwater",
    location: {
      address: "Dadar TT Circle, Dr. Babasaheb Ambedkar Road",
      landmark: "Near Khodadad Circle / Pritam Hotel",
      ward: "Ward F/North - Dadar / Matunga",
      zone: "Zone 2 (South Central)",
      latitude: 19.0178,
      longitude: 72.8478,
    },
    status: "in_progress",
    priority: "urgent",
    reporter: {
      name: "Kunal Mehta",
      phone: "+91 98200 44551",
      aadharMasked: "XXXX-XXXX-6712",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-BMC-01",
      officerName: "Pramod Sawant",
      departmentId: "DEP-SWD-BMC",
      departmentName: "BMC Storm Water Drains",
      contractorName: "Mumbai Monsoon Dewatering Team",
      assignedAt: "2026-09-15T08:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 12,
      hoursRemaining: 4,
      slaStatus: "warning",
      deadline: "2026-09-15T18:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 65,
    isDuplicateCluster: true,
    clusterGroupId: "CLUSTER-MUM-01",
    createdAt: "2026-09-15T06:00:00Z",
    updatedAt: "2026-09-15T08:00:00Z",
  },
  {
    id: "CR-MUM-102",
    dbId: 502,
    title: "Dangerous Surface Potholes on Western Express Highway Bandra Flyover",
    description: "Twin potholes on fast lane approaching Kalanagar junction. Severe hazard for south-bound airport traffic.",
    category: "roads",
    categoryLabel: "Roads & Infrastructure",
    location: {
      address: "Western Express Highway, Kalanagar Flyover Southbound",
      landmark: "Near Bandra Kurla Complex Entry",
      ward: "Ward H/East - Bandra East",
      zone: "Zone 3 (Western Suburbs)",
      latitude: 19.0596,
      longitude: 72.8465,
    },
    status: "assigned",
    priority: "urgent",
    reporter: {
      name: "Farhan Merchant",
      phone: "+91 98190 77665",
      aadharMasked: "XXXX-XXXX-3321",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-BMC-02",
      officerName: "Ashok Salvi",
      departmentId: "DEP-ROADS-BMC",
      departmentName: "BMC Roads Department",
      contractorName: "MMRDA Express Patching Unit",
      assignedAt: "2026-09-15T09:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 12,
      hoursRemaining: 7,
      slaStatus: "on_track",
      deadline: "2026-09-15T20:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 48,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T08:00:00Z",
    updatedAt: "2026-09-15T09:00:00Z",
  }
];

export const NAGPUR_COMPLAINTS: Complaint[] = [
  {
    id: "CR-NGP-101",
    dbId: 601,
    title: "Commercial Solid Waste Backlog at Sitabuldi Main Road",
    description: "Massive pile of wholesale packaging refuse blocking pedestrian market arcade outside Sitabuldi metro station.",
    category: "waste_management",
    categoryLabel: "Solid Waste Management",
    location: {
      address: "Sitabuldi Main Road, Near Variety Square",
      landmark: "Opposite Sitabuldi Interchange Metro Gate 1",
      ward: "Ward 18 - Sitabuldi / Dhantoli",
      zone: "Zone 2 (Dharampeth)",
      latitude: 21.1466,
      longitude: 79.0821,
    },
    status: "in_progress",
    priority: "high",
    reporter: {
      name: "Chetan Agrawal",
      phone: "+91 98231 66778",
      aadharMasked: "XXXX-XXXX-4490",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-NGP-01",
      officerName: "Nitin Bawankule",
      departmentId: "DEP-SWM-NMC-NGP",
      departmentName: "NMC Solid Waste Dept",
      contractorName: "Nagpur Clean City Operators",
      assignedAt: "2026-09-15T08:15:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 24,
      hoursRemaining: 16,
      slaStatus: "on_track",
      deadline: "2026-09-16T07:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 37,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T07:00:00Z",
    updatedAt: "2026-09-15T08:15:00Z",
  },
  {
    id: "CR-NGP-102",
    dbId: 602,
    title: "Stormwater Pipe Rupture Near Wardha Road Metro Pillar 114",
    description: "Excavation damage to underground culvert causing gravel and soil erosion beneath Wardha road tarmac.",
    category: "drainage",
    categoryLabel: "Drainage & Sewerage",
    location: {
      address: "Wardha Road, Near Ajni Square",
      landmark: "Metro Pillar 114, Opposite Airport Flyover Ramp",
      ward: "Ward 31 - Ajni / Somalwada",
      zone: "Zone 5 (Nehru Nagar)",
      latitude: 21.1189,
      longitude: 79.0745,
    },
    status: "assigned",
    priority: "urgent",
    reporter: {
      name: "Pratiksha Raut",
      phone: "+91 94228 11990",
      aadharMasked: "XXXX-XXXX-8823",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-NGP-02",
      officerName: "Sanjay Dhote",
      departmentId: "DEP-DRAIN-NMC-NGP",
      departmentName: "NMC Drainage Cell",
      contractorName: "Nagpur Urban Infra Projects",
      assignedAt: "2026-09-15T09:30:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 12,
      hoursRemaining: 9,
      slaStatus: "on_track",
      deadline: "2026-09-15T21:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 25,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T09:00:00Z",
    updatedAt: "2026-09-15T09:30:00Z",
  }
];

export const THANE_COMPLAINTS: Complaint[] = [
  {
    id: "CR-THN-101",
    dbId: 701,
    title: "Craters & Rutted Surface on Ghodbunder Road Service Lane",
    description: "Multiple severe potholes near Manpada junction after water supply pipeline trenching was poorly backfilled.",
    category: "roads",
    categoryLabel: "Roads & Infrastructure",
    location: {
      address: "Ghodbunder Road, Manpada Service Road",
      landmark: "Near Cinemax Wonder Mall",
      ward: "Ward 04 - Manpada / Kapurbawdi",
      zone: "Zone 2 (Majiwada-Manpada)",
      latitude: 19.2183,
      longitude: 72.9781,
    },
    status: "in_progress",
    priority: "high",
    reporter: {
      name: "Sandeep Varma",
      phone: "+91 98205 12345",
      aadharMasked: "XXXX-XXXX-7721",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 24,
      hoursRemaining: 12,
      slaStatus: "on_track",
      deadline: "2026-09-16T08:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 28,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T08:00:00Z",
    updatedAt: "2026-09-15T09:00:00Z",
  }
];

export const KOLHAPUR_COMPLAINTS: Complaint[] = [
  {
    id: "CR-KOL-101",
    dbId: 801,
    title: "Water Inundation & Potholes on Rankala Lake Promenade Approach",
    description: "Stormwater chamber backed up near Rankala Lake northern entrance, submerging tourist walking track.",
    category: "drainage",
    categoryLabel: "Drainage & Sewerage",
    location: {
      address: "Rankala Lake Northern Ghat Road",
      landmark: "Opposite Shalini Palace Entrance",
      ward: "Ward 05 - Rankala / Shivaji Peth",
      zone: "Zone 1 (Bhavani Mandap)",
      latitude: 16.7050,
      longitude: 74.2433,
    },
    status: "in_progress",
    priority: "high",
    reporter: {
      name: "Suresh Patil",
      phone: "+91 94220 88214",
      aadharMasked: "XXXX-XXXX-9912",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 24,
      hoursRemaining: 14,
      slaStatus: "on_track",
      deadline: "2026-09-16T10:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 22,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T10:00:00Z",
    updatedAt: "2026-09-15T11:00:00Z",
  }
];

export const AMRAVATI_COMPLAINTS: Complaint[] = [
  {
    id: "CR-AMR-101",
    dbId: 901,
    title: "Major Water Logging at Rajkamal Chowk Traffic Signal",
    description: "Blocked culvert causing continuous water accumulation at heart of city transit intersection.",
    category: "drainage",
    categoryLabel: "Drainage & Sewerage",
    location: {
      address: "Rajkamal Chowk, Badnera Road",
      landmark: "Opposite Rajkamal Talkies",
      ward: "Ward 07 - Rajkamal / Camp",
      zone: "Zone 2 (Central Amravati)",
      latitude: 20.9374,
      longitude: 77.7796,
    },
    status: "in_progress",
    priority: "high",
    reporter: {
      name: "Gajanan Deshmukh",
      phone: "+91 98812 77334",
      aadharMasked: "XXXX-XXXX-5544",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80"
      ],
    },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 24,
      hoursRemaining: 15,
      slaStatus: "on_track",
      deadline: "2026-09-16T11:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 19,
    isDuplicateCluster: false,
    createdAt: "2026-09-15T11:00:00Z",
    updatedAt: "2026-09-15T12:00:00Z",
  }
];

/**
 * Corporation ID to complaint dataset lookup map.
 * Normalized to lowercase keys.
 */
export const CORPORATION_COMPLAINTS_MAP: Record<string, Complaint[]> = {
  pmc: PUNE_COMPLAINTS,
  pcmc: PUNE_COMPLAINTS,
  smc: SOLAPUR_COMPLAINTS,
  nmc: NASHIK_COMPLAINTS,
  mmc: NASHIK_COMPLAINTS,
  csmc: CSN_COMPLAINTS,
  bmc: MUMBAI_COMPLAINTS,
  nmc_nagpur: NAGPUR_COMPLAINTS,
  tmc: THANE_COMPLAINTS,
  nmmc: THANE_COMPLAINTS,
  kdmc: THANE_COMPLAINTS,
  kmc: KOLHAPUR_COMPLAINTS,
  amc: AMRAVATI_COMPLAINTS,
};

/**
 * District ID to complaint dataset lookup map.
 * Normalized to lowercase keys.
 */
export const DISTRICT_COMPLAINTS_MAP: Record<string, Complaint[]> = {
  pune: PUNE_COMPLAINTS,
  solapur: SOLAPUR_COMPLAINTS,
  nashik: NASHIK_COMPLAINTS,
  chhatrapati_sambhajinagar: CSN_COMPLAINTS,
  csn: CSN_COMPLAINTS,
  mumbai: MUMBAI_COMPLAINTS,
  nagpur: NAGPUR_COMPLAINTS,
  thane: THANE_COMPLAINTS,
  kolhapur: KOLHAPUR_COMPLAINTS,
  amravati: AMRAVATI_COMPLAINTS,
};

/**
 * Retrieve isolated mock complaints for a specific municipal corporation.
 */
export function getMockComplaintsForCorporation(corporationId: string): Complaint[] {
  const key = (corporationId || '').toLowerCase().trim();
  const complaints = CORPORATION_COMPLAINTS_MAP[key];
  if (complaints && complaints.length > 0) {
    return complaints.map((c) => ({ ...c }));
  }
  return [];
}

/**
 * Retrieve isolated mock complaints for a specific district.
 */
export function getMockComplaintsForDistrict(districtId: string): Complaint[] {
  const key = (districtId || '').toLowerCase().trim();
  const complaints = DISTRICT_COMPLAINTS_MAP[key];
  if (complaints && complaints.length > 0) {
    return complaints.map((c) => ({ ...c }));
  }
  return [];
}

/**
 * Retrieve all complaints across all districts (for state administration overview).
 */
export function getAllStateComplaints(): Complaint[] {
  return [
    ...PUNE_COMPLAINTS,
    ...SOLAPUR_COMPLAINTS,
    ...NASHIK_COMPLAINTS,
    ...CSN_COMPLAINTS,
    ...MUMBAI_COMPLAINTS,
    ...NAGPUR_COMPLAINTS,
    ...THANE_COMPLAINTS,
    ...KOLHAPUR_COMPLAINTS,
    ...AMRAVATI_COMPLAINTS,
  ].map((c) => ({ ...c }));
}

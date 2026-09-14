import { Complaint } from '../../types/complaint';

export const INITIAL_MOCK_COMPLAINTS: Complaint[] = [
  {
    id: "CR-2026-101",
    dbId: 101,
    title: "Deep Pothole & Caved Asphalt on Arterial Junction",
    description: "Dangerous crater-type pothole roughly 1.5m diameter right at the junction turn. Caused two motorcycle skids during morning peak transit.",
    category: "roads",
    categoryLabel: "Roads & Pavements",
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
      departmentId: "DEP-ROADS",
      departmentName: "Roads & Infrastructure",
      contractorName: "Solapur Municipal Roadways Infra",
      assignedAt: "2026-09-12T08:30:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1578983449339-b9d997235a94?auto=format&fit=crop&w=800&q=80"
      ],
      after: [
        "https://images.unsplash.com/photo-1584463699039-b3a1a6b09337?auto=format&fit=crop&w=800&q=80"
      ]
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
        toStatus: "under_review",
        changedBy: "Command Triage Desk",
        role: "system",
        timestamp: "2026-09-12T07:20:00Z",
        notes: "AI Multimodal model classified as Urgent Severity due to arterial traffic density.",
      },
      {
        id: "SH-3",
        fromStatus: "under_review",
        toStatus: "assigned",
        changedBy: "Executive Engineer K. V. Patil",
        role: "officer",
        timestamp: "2026-09-12T08:30:00Z",
        notes: "Dispatched Quick Patch Unit #4 under Solapur Road Infra.",
      },
      {
        id: "SH-4",
        fromStatus: "assigned",
        toStatus: "in_progress",
        changedBy: "Rajesh Shinde",
        role: "contractor",
        timestamp: "2026-09-12T09:45:00Z",
        notes: "Bitumen cold-mix and vibratory roller deployed on site. Barricades active.",
      }
    ],
    adminNotes: [
      {
        id: "AN-1",
        author: "K. V. Patil (EE)",
        text: "Traffic police notified to redirect heavy vehicles via Civil Lines road during curing.",
        createdAt: "2026-09-12T08:45:00Z",
        isInternal: true,
      }
    ],
    aiClassification: {
      detectedCategory: "roads",
      suggestedPriority: "urgent",
      confidenceScore: 0.96,
      hazardKeywords: ["motorcycle skid", "crater", "peak transit", "accident risk"],
      summary: "High-risk pothole obstructing critical junction. Urgent bitumen laying required.",
      clusterAnomalyDetected: true,
      duplicateDistanceMeters: 45,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 3,
      slaStatus: "warning",
      deadline: "2026-09-13T03:30:00Z",
      isOverdue: false,
    },
    upvotesCount: 28,
    isDuplicateCluster: true,
    clusterGroupId: "CLUSTER-SR-01",
    createdAt: "2026-09-12T07:15:00Z",
    updatedAt: "2026-09-12T09:45:00Z",
  },
  {
    id: "CR-2026-102",
    dbId: 102,
    title: "Major Main Water Pipeline Rupture Flooding Sub-Road",
    description: "400mm cast-iron supply conduit fractured beneath pavement. High-pressure drinking water gushing onto market road, threatening basements.",
    category: "water_sewage",
    categoryLabel: "Water Supply Pipeline",
    location: {
      address: "Hotgi Road, Near Market Yard Junction",
      landmark: "Near Solapur Agriculture Produce Market Committee",
      ward: "Ward 03 - Hotgi Road / Jule Solapur",
      zone: "Zone 3 (Hotgi Road)",
      latitude: 17.6455,
      longitude: 75.9182,
    },
    status: "assigned",
    priority: "urgent",
    reporter: {
      name: "Pooja Hegde",
      phone: "+91 97654 32190",
      aadharMasked: "XXXX-XXXX-9921",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-104",
      officerName: "Anil Kulkarni",
      departmentId: "DEP-WATER",
      departmentName: "Water Works Dept",
      contractorName: "Solapur Jal Seva Works",
      assignedAt: "2026-09-12T22:10:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-5",
        toStatus: "submitted",
        changedBy: "Pooja Hegde",
        role: "citizen",
        timestamp: "2026-09-12T21:40:00Z",
        notes: "Urgent leak reported with geotagged photo",
      },
      {
        id: "SH-6",
        fromStatus: "submitted",
        toStatus: "under_review",
        changedBy: "Night Emergency Desk",
        role: "system",
        timestamp: "2026-09-12T21:45:00Z",
        notes: "Auto-escalated to Category Urgent: Potable water wastage > 50,000L/hr",
      },
      {
        id: "SH-7",
        fromStatus: "under_review",
        toStatus: "assigned",
        changedBy: "Duty Officer M. R. Joshi",
        role: "officer",
        timestamp: "2026-09-12T22:10:00Z",
        notes: "Emergency valve isolation crew alerted to shut Sluice Valve #8.",
      }
    ],
    adminNotes: [
      {
        id: "AN-2",
        author: "M. R. Joshi",
        text: "Sluice valve 8 shut down at 22:45. Excavation backhoe reaching site at 01:30.",
        createdAt: "2026-09-12T23:00:00Z",
        isInternal: true,
      }
    ],
    aiClassification: {
      detectedCategory: "water_sewage",
      suggestedPriority: "urgent",
      confidenceScore: 0.98,
      hazardKeywords: ["burst pipe", "flooding basements", "high-pressure drinking water"],
      summary: "Catastrophic pipeline rupture. Sluice valve isolation and clamp welding needed immediately.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 8,
      hoursRemaining: -2,
      slaStatus: "breached",
      deadline: "2026-09-13T01:40:00Z",
      isOverdue: true,
    },
    upvotesCount: 42,
    isDuplicateCluster: false,
    createdAt: "2026-09-12T21:40:00Z",
    updatedAt: "2026-09-12T23:00:00Z",
  },
  {
    id: "CR-2026-103",
    dbId: 103,
    title: "Overflowing Community Garbage Dumpsite Spilling on Walkway",
    description: "Two 1100-liter dumper bins unemptied for 4 days. Waste strewn across pedestrian footpath with stray dog menace.",
    category: "waste_management",
    categoryLabel: "Public Health & Sanitation",
    location: {
      address: "Near Ganpati Chowk, Navi Peth",
      landmark: "Adjacent to Solapur Municipal Primary School #12",
      ward: "Ward 01 - Sadar Bazar / Navi Peth",
      zone: "Zone 1 (Sadar Bazar)",
      latitude: 17.6762,
      longitude: 75.9084,
    },
    status: "submitted",
    priority: "high",
    reporter: {
      name: "Sunil Joshi",
      phone: "+91 94220 11984",
      aadharMasked: "XXXX-XXXX-3382",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-8",
        toStatus: "submitted",
        changedBy: "Sunil Joshi",
        role: "citizen",
        timestamp: "2026-09-12T23:15:00Z",
        notes: "Submitted via citizen mobile app with photos.",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "waste_management",
      suggestedPriority: "high",
      confidenceScore: 0.92,
      hazardKeywords: ["school proximity", "stray animals", "4 days accumulation", "biohazard"],
      summary: "Severe solid waste overflow near school zone. Scheduled for priority compactor sweep.",
      clusterAnomalyDetected: true,
      duplicateDistanceMeters: 80,
    },
    sla: {
      targetHours: 24,
      hoursRemaining: 18,
      slaStatus: "on_track",
      deadline: "2026-09-13T23:15:00Z",
      isOverdue: false,
    },
    upvotesCount: 15,
    isDuplicateCluster: true,
    clusterGroupId: "CLUSTER-NP-02",
    createdAt: "2026-09-12T23:15:00Z",
    updatedAt: "2026-09-12T23:15:00Z",
  },
  {
    id: "CR-2026-104",
    dbId: 104,
    title: "10 High-Mast Sodium Streetlights Extinguished Along Ring Road",
    description: "Total blackout along 800m stretch of Ring Road bypass from Flyover pillar 18 to 28. Heavy vehicle corridor in pitch darkness.",
    category: "streetlights",
    categoryLabel: "Street Lighting & Grid",
    location: {
      address: "Vijapur Road Bypass Stretch, Near Jule Solapur",
      landmark: "Pillars 18 to 28",
      ward: "Ward 05 - Vijapur Road / Jule Solapur",
      zone: "Zone 3 (Vijapur Road)",
      latitude: 17.6425,
      longitude: 75.8828,
    },
    status: "under_review",
    priority: "urgent",
    reporter: {
      name: "Dr. Arvind Gupte",
      phone: "+91 99224 88301",
      aadharMasked: "XXXX-XXXX-7104",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-9",
        toStatus: "submitted",
        changedBy: "Dr. Arvind Gupte",
        role: "citizen",
        timestamp: "2026-09-12T22:30:00Z",
        notes: "Blackout corridor reported.",
      },
      {
        id: "SH-10",
        fromStatus: "submitted",
        toStatus: "under_review",
        changedBy: "SCADA Grid Auto-Ingest",
        role: "system",
        timestamp: "2026-09-12T22:32:00Z",
        notes: "Correlated with Feeder Panel #14 tripping event.",
      }
    ],
    adminNotes: [
      {
        id: "AN-3",
        author: "Chief Electrical Inspector",
        text: "Transformer MCB tripped due to suspected moisture ingress in feeder junction box 4.",
        createdAt: "2026-09-12T23:10:00Z",
        isInternal: true,
      }
    ],
    aiClassification: {
      detectedCategory: "streetlights",
      suggestedPriority: "urgent",
      confidenceScore: 0.94,
      hazardKeywords: ["blackout", "flyover", "heavy vehicle accident zone", "pitch dark"],
      summary: "High-speed corridor lighting failure. Severe risk of fatal head-on collision.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 5,
      slaStatus: "warning",
      deadline: "2026-09-13T10:30:00Z",
      isOverdue: false,
    },
    upvotesCount: 34,
    isDuplicateCluster: false,
    createdAt: "2026-09-12T22:30:00Z",
    updatedAt: "2026-09-12T23:10:00Z",
  },
  {
    id: "CR-2026-105",
    dbId: 105,
    title: "Open Stormwater Drain Sump Without Safety Grating",
    description: "Heavy concrete storm drain manhole slab displaced during monsoon desilting and left open. 2m deep pit exposed on school walkway.",
    category: "drainage",
    categoryLabel: "Stormwater Drainage",
    location: {
      address: "Sadar Bazar Main Road, Near Modi Khana",
      landmark: "Opposite Balshikshan Kendra",
      ward: "Ward 01 - Sadar Bazar / Navi Peth",
      zone: "Zone 1 (Sadar Bazar)",
      latitude: 17.6724,
      longitude: 75.9125,
    },
    status: "resolution_submitted",
    priority: "urgent",
    reporter: {
      name: "Meera Chitale",
      phone: "+91 98812 77091",
      aadharMasked: "XXXX-XXXX-1148",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-202",
      officerName: "Sanjay Thorat",
      departmentId: "DEP-DRAIN",
      departmentName: "Sewerage & Drainage",
      contractorName: "Maharashtra Precast & Drainage Ltd",
      assignedAt: "2026-09-11T10:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80"
      ],
      after: [
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-11",
        toStatus: "submitted",
        changedBy: "Meera Chitale",
        role: "citizen",
        timestamp: "2026-09-11T09:15:00Z",
      },
      {
        id: "SH-12",
        fromStatus: "submitted",
        toStatus: "under_review",
        changedBy: "Control Room",
        role: "system",
        timestamp: "2026-09-11T09:20:00Z",
      },
      {
        id: "SH-13",
        fromStatus: "under_review",
        toStatus: "assigned",
        changedBy: "Ward Officer",
        role: "officer",
        timestamp: "2026-09-11T10:00:00Z",
      },
      {
        id: "SH-14",
        fromStatus: "assigned",
        toStatus: "in_progress",
        changedBy: "Sanjay Thorat",
        role: "contractor",
        timestamp: "2026-09-11T11:30:00Z",
      },
      {
        id: "SH-15",
        fromStatus: "in_progress",
        toStatus: "resolution_submitted",
        changedBy: "Sanjay Thorat",
        role: "contractor",
        timestamp: "2026-09-12T16:00:00Z",
        notes: "Reinforced ductile iron heavy-duty grating installed with concrete collar curing.",
        proofImageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80"
      }
    ],
    adminNotes: [
      {
        id: "AN-4",
        author: "Sanjay Thorat",
        text: "Cover installed and tested for 20-ton vehicular axle rating. Awaiting citizen verification.",
        createdAt: "2026-09-12T16:15:00Z",
        isInternal: false,
      }
    ],
    aiClassification: {
      detectedCategory: "drainage",
      suggestedPriority: "urgent",
      confidenceScore: 0.99,
      hazardKeywords: ["open manhole", "children risk", "2m deep", "fatality hazard"],
      summary: "Life-threatening open drain cavity. Remediation proof submitted for officer signoff.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 24,
      hoursRemaining: 8,
      slaStatus: "on_track",
      deadline: "2026-09-12T18:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 51,
    isDuplicateCluster: false,
    createdAt: "2026-09-11T09:15:00Z",
    updatedAt: "2026-09-12T16:15:00Z",
  },
  {
    id: "CR-2026-106",
    dbId: 106,
    title: "Overgrown Tree Branches Obstructing Traffic Signal & Sightline",
    description: "Dense banyan canopy drooping over 3-phase traffic signal. Drivers cannot see red signal at blind curve.",
    category: "parks",
    categoryLabel: "Parks & Urban Greens",
    location: {
      address: "Civil Lines Circle Roundabout, Collector Office Road",
      landmark: "Near Solapur District Collectorate Gate",
      ward: "Ward 02 - Saat Rasta / Civil Lines",
      zone: "Zone 2 (Civil Lines)",
      latitude: 17.6650,
      longitude: 75.9015,
    },
    status: "verified",
    priority: "medium",
    reporter: {
      name: "Vikram Jadhav",
      phone: "+91 97631 55210",
      aadharMasked: "XXXX-XXXX-8820",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-501",
      officerName: "Hemant Gaikwad",
      departmentId: "DEP-PARKS",
      departmentName: "Horticulture Dept",
      assignedAt: "2026-09-10T11:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"
      ],
      after: [
        "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-16",
        toStatus: "submitted",
        changedBy: "Vikram Jadhav",
        role: "citizen",
        timestamp: "2026-09-10T08:00:00Z",
      },
      {
        id: "SH-17",
        fromStatus: "submitted",
        toStatus: "under_review",
        changedBy: "Command Desk",
        role: "system",
        timestamp: "2026-09-10T09:00:00Z",
      },
      {
        id: "SH-18",
        fromStatus: "under_review",
        toStatus: "assigned",
        changedBy: "Garden Supdt",
        role: "officer",
        timestamp: "2026-09-10T11:00:00Z",
      },
      {
        id: "SH-19",
        fromStatus: "assigned",
        toStatus: "in_progress",
        changedBy: "Tree Pruning Squad",
        role: "contractor",
        timestamp: "2026-09-11T07:00:00Z",
      },
      {
        id: "SH-20",
        fromStatus: "in_progress",
        toStatus: "resolution_submitted",
        changedBy: "Hemant Gaikwad",
        role: "officer",
        timestamp: "2026-09-11T12:00:00Z",
      },
      {
        id: "SH-21",
        fromStatus: "resolution_submitted",
        toStatus: "verified",
        changedBy: "Vikram Jadhav",
        role: "citizen",
        timestamp: "2026-09-12T14:30:00Z",
        notes: "Citizen approved resolution photos. Rated 5/5 stars.",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "parks",
      suggestedPriority: "medium",
      confidenceScore: 0.91,
      hazardKeywords: ["signal obscured", "blind curve", "traffic signal"],
      summary: "Tree canopy obstruction cleared. Citizen verified satisfactory resolution.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 48,
      hoursRemaining: 18,
      slaStatus: "on_track",
      deadline: "2026-09-12T08:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 12,
    isDuplicateCluster: false,
    createdAt: "2026-09-10T08:00:00Z",
    updatedAt: "2026-09-12T14:30:00Z",
    resolvedAt: "2026-09-11T12:00:00Z",
    citizenFeedback: {
      rating: 5,
      comment: "Prompt pruning! Signals are clearly visible now.",
      satisfied: true,
    }
  },
  {
    id: "CR-2026-107",
    dbId: 107,
    title: "Cracked Gas Odor Near Storm Drain Inlet",
    description: "Strong noxious methane/chemical vapor venting through curb inlet. Residents feeling nausea in neighboring apartment complex.",
    category: "public_safety",
    categoryLabel: "Public Safety Hazard",
    location: {
      address: "Akkalkot Road, Lane 7, MIDC Area",
      landmark: "Outside Udyog Bhavan Complex",
      ward: "Ward 04 - Akkalkot Road / MIDC",
      zone: "Zone 4 (Akkalkot Road)",
      latitude: 17.6521,
      longitude: 75.9354,
    },
    status: "in_progress",
    priority: "urgent",
    reporter: {
      name: "Dr. Sandeep Kulkarni",
      phone: "+91 98900 23411",
      aadharMasked: "XXXX-XXXX-9023",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-404",
      officerName: "DCP Fire & Hazard Squad",
      departmentId: "DEP-HAZARD",
      departmentName: "Disaster Management",
      assignedAt: "2026-09-12T23:50:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-22",
        toStatus: "submitted",
        changedBy: "Dr. Sandeep Kulkarni",
        role: "citizen",
        timestamp: "2026-09-12T23:35:00Z",
      },
      {
        id: "SH-23",
        fromStatus: "submitted",
        toStatus: "under_review",
        changedBy: "Emergency Dispatch Bot",
        role: "system",
        timestamp: "2026-09-12T23:36:00Z",
      },
      {
        id: "SH-24",
        fromStatus: "under_review",
        toStatus: "assigned",
        changedBy: "Command Duty Chief",
        role: "officer",
        timestamp: "2026-09-12T23:50:00Z",
      },
      {
        id: "SH-25",
        fromStatus: "assigned",
        toStatus: "in_progress",
        changedBy: "Fire Station #2 Hazmat Team",
        role: "officer",
        timestamp: "2026-09-13T00:10:00Z",
        notes: "Hazmat crew deployed with multi-gas detector. Gas pipeline engineers alerted.",
      }
    ],
    adminNotes: [
      {
        id: "AN-5",
        author: "Chief Fire Officer",
        text: "Methane level 420ppm detected. Water flushing underway while gas engineers inspect underground main.",
        createdAt: "2026-09-13T00:25:00Z",
        isInternal: true,
      }
    ],
    aiClassification: {
      detectedCategory: "public_safety",
      suggestedPriority: "urgent",
      confidenceScore: 0.99,
      hazardKeywords: ["gas odor", "nausea", "methane", "chemical", "explosion hazard"],
      summary: "Critical toxic vapor escape. Multi-agency Hazmat response activated.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 6,
      hoursRemaining: 4,
      slaStatus: "warning",
      deadline: "2026-09-13T05:35:00Z",
      isOverdue: false,
    },
    upvotesCount: 67,
    isDuplicateCluster: false,
    createdAt: "2026-09-12T23:35:00Z",
    updatedAt: "2026-09-13T00:25:00Z",
  },
  {
    id: "CR-2026-108",
    dbId: 108,
    title: "Illegal Construction Debris Dumped on Lake Perimeter",
    description: "Over 8 truckloads of reinforced concrete rubble and masonry illegally unloaded near lake green belt overnight.",
    category: "waste_management",
    categoryLabel: "Public Health & Sanitation",
    location: {
      address: "Siddheshwar Lake Perimeter Approach",
      landmark: "Near Siddheshwar Temple Ghat",
      ward: "Ward 07 - Siddheshwar Peth",
      zone: "Zone 1 (Siddheshwar)",
      latitude: 17.6780,
      longitude: 75.9020,
    },
    status: "submitted",
    priority: "high",
    reporter: {
      name: "Anand Shelar (Green Solapur Forum)",
      phone: "+91 94235 66781",
      aadharMasked: "XXXX-XXXX-4412",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-26",
        toStatus: "submitted",
        changedBy: "Anand Shelar",
        role: "citizen",
        timestamp: "2026-09-12T20:15:00Z",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "waste_management",
      suggestedPriority: "high",
      confidenceScore: 0.95,
      hazardKeywords: ["lake perimeter", "debris", "floodplain encroachment", "environmental crime"],
      summary: "Massive illegal C&D waste dumping on lake buffer zone. NGT guidelines violation.",
      clusterAnomalyDetected: true,
      duplicateDistanceMeters: 120,
    },
    sla: {
      targetHours: 24,
      hoursRemaining: 15,
      slaStatus: "on_track",
      deadline: "2026-09-13T20:15:00Z",
      isOverdue: false,
    },
    upvotesCount: 39,
    isDuplicateCluster: true,
    clusterGroupId: "CLUSTER-SL-01",
    createdAt: "2026-09-12T20:15:00Z",
    updatedAt: "2026-09-12T20:15:00Z",
  },
  {
    id: "CR-2026-109",
    dbId: 109,
    title: "Cracked Water Hydrant Flooding Commercial Ramp",
    description: "Municipal fire booster hydrant struck by reversing commercial van. Steady cascade flooding car ramp of commercial complex.",
    category: "water_sewage",
    categoryLabel: "Water Supply Pipeline",
    location: {
      address: "Station Road, Opposite City Central Complex",
      landmark: "Near Solapur Railway Station Gate 2",
      ward: "Ward 06 - Railway Station / Budhwar Peth",
      zone: "Zone 1 (Station Area)",
      latitude: 17.6692,
      longitude: 75.9158,
    },
    status: "closed",
    priority: "high",
    reporter: {
      name: "Girish Ranade",
      phone: "+91 98221 44556",
      aadharMasked: "XXXX-XXXX-6512",
      verifiedCitizen: true,
    },
    assignment: {
      officerId: "OFF-102",
      officerName: "Pravin Kulkarni",
      departmentId: "DEP-WATER",
      departmentName: "Water Works Dept",
      assignedAt: "2026-09-09T08:00:00Z",
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80"
      ],
      after: [
        "https://images.unsplash.com/photo-1584463699039-b3a1a6b09337?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-27",
        toStatus: "submitted",
        changedBy: "Girish Ranade",
        role: "citizen",
        timestamp: "2026-09-09T07:30:00Z",
      },
      {
        id: "SH-28",
        fromStatus: "submitted",
        toStatus: "under_review",
        changedBy: "Officer",
        role: "officer",
        timestamp: "2026-09-09T07:45:00Z",
      },
      {
        id: "SH-29",
        fromStatus: "under_review",
        toStatus: "assigned",
        changedBy: "Officer",
        role: "officer",
        timestamp: "2026-09-09T08:00:00Z",
      },
      {
        id: "SH-30",
        fromStatus: "assigned",
        toStatus: "in_progress",
        changedBy: "Contractor",
        role: "contractor",
        timestamp: "2026-09-09T09:00:00Z",
      },
      {
        id: "SH-31",
        fromStatus: "in_progress",
        toStatus: "resolution_submitted",
        changedBy: "Contractor",
        role: "contractor",
        timestamp: "2026-09-09T13:00:00Z",
      },
      {
        id: "SH-32",
        fromStatus: "resolution_submitted",
        toStatus: "verified",
        changedBy: "Citizen",
        role: "citizen",
        timestamp: "2026-09-09T15:00:00Z",
      },
      {
        id: "SH-33",
        fromStatus: "verified",
        toStatus: "closed",
        changedBy: "System SLA Engine",
        role: "system",
        timestamp: "2026-09-09T16:00:00Z",
        notes: "Audit closed. Citizen credit points 50 rewarded to user wallet.",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "water_sewage",
      suggestedPriority: "high",
      confidenceScore: 0.94,
      hazardKeywords: ["hydrant damage", "basement flooding", "water loss"],
      summary: "Hydrant flange replaced. Flow tested and restored.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 24,
      hoursRemaining: 0,
      slaStatus: "on_track",
      deadline: "2026-09-10T07:30:00Z",
      isOverdue: false,
    },
    upvotesCount: 19,
    isDuplicateCluster: false,
    createdAt: "2026-09-09T07:30:00Z",
    updatedAt: "2026-09-09T16:00:00Z",
    resolvedAt: "2026-09-09T13:00:00Z",
    closedAt: "2026-09-09T16:00:00Z",
    citizenFeedback: {
      rating: 5,
      comment: "Super quick repair by water team within 6 hours!",
      satisfied: true,
    }
  },
  {
    id: "CR-2026-110",
    dbId: 110,
    title: "Broken Foot-Over-Bridge Tread Plate Causing Pedestrian Hazard",
    description: "Perforated metal tread plate corroded through on central pedestrian staircase. Foot can slip through gap directly over roadway.",
    category: "roads",
    categoryLabel: "Roads & Pavements",
    location: {
      address: "Solapur Bus Terminal Pedestrian Skywalk Staircase #3",
      landmark: "Near Solapur Central Bus Stand",
      ward: "Ward 06 - Railway Station / Budhwar Peth",
      zone: "Zone 1 (Station Area)",
      latitude: 17.6710,
      longitude: 75.9140,
    },
    status: "under_review",
    priority: "urgent",
    reporter: {
      name: "Tanvi Deshpande",
      phone: "+91 91580 99443",
      aadharMasked: "XXXX-XXXX-2190",
      verifiedCitizen: true,
    },
    evidence: {
      before: [
        "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      ]
    },
    statusHistory: [
      {
        id: "SH-34",
        toStatus: "submitted",
        changedBy: "Tanvi Deshpande",
        role: "citizen",
        timestamp: "2026-09-12T19:00:00Z",
      },
      {
        id: "SH-35",
        fromStatus: "submitted",
        toStatus: "under_review",
        changedBy: "Night Triage",
        role: "officer",
        timestamp: "2026-09-12T19:15:00Z",
        notes: "Structural engineering division alerted for emergency welded plate replacement.",
      }
    ],
    adminNotes: [],
    aiClassification: {
      detectedCategory: "roads",
      suggestedPriority: "urgent",
      confidenceScore: 0.97,
      hazardKeywords: ["footbridge", "staircase", "fall from height", "corrosion"],
      summary: "Critical pedestrian safety defect on high-traffic transit hub. Weld crew required tonight.",
      clusterAnomalyDetected: false,
    },
    sla: {
      targetHours: 12,
      hoursRemaining: 2,
      slaStatus: "warning",
      deadline: "2026-09-13T07:00:00Z",
      isOverdue: false,
    },
    upvotesCount: 47,
    isDuplicateCluster: false,
    createdAt: "2026-09-12T19:00:00Z",
    updatedAt: "2026-09-12T19:15:00Z",
  }
];

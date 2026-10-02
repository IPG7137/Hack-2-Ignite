# 🏛️ CivicResolve — Smart Municipal Complaint & Resolution Intelligence Platform

[![Live Command Center](https://img.shields.io/badge/🌐_Live_Deployment-CivicResolve_Command_Center-00C7B7?style=for-the-badge&logo=vercel&logoColor=white)](https://civicresolve2.vercel.app/)
[![Flutter Mobile Tests](https://img.shields.io/badge/Flutter_Tests-132%2F132_Passing-brightgreen?style=for-the-badge&logo=flutter&logoColor=white)](#-testing--verification-scorecard)
[![Web Suite Tests](https://img.shields.io/badge/Web_Tests-813%2F813_Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](#-testing--verification-scorecard)
[![Dart Analyzer](https://img.shields.io/badge/Dart_Analyzer-0_Issues-brightgreen?style=for-the-badge&logo=dart&logoColor=white)](#-testing--verification-scorecard)
[![PostgreSQL PostGIS](https://img.shields.io/badge/PostgreSQL-PostGIS_%26_RLS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 📌 Problem Statement

Municipal grievance redressal across urban local bodies (ULBs) is hindered by high rates of unverified photo evidence, duplicate complaint spikes, subjective priority assignment, opaque resolution cycles, and the absence of citizen verification before closing work orders. Traditional complaint portals log isolated tickets without spatial intelligence, forcing municipal engineers to manually triage thousands of submissions while citizens face silent ticket closures without proof of remediation.

---

## ⚡ What CivicResolve Actually Does

CivicResolve is a closed-loop municipal intelligence platform uniting **citizens**, **ward engineers**, **contractors**, and **state administrators** into a single verified lifecycle:

1. **Citizen Intake**: Citizens register dynamically, capture geotagged civic grievances with live camera evidence, and receive real-time AI visual evidence validation.
2. **Server-Proxied Vision Validation**: Google Gemini Vision runs securely inside a Supabase Edge Function to evaluate whether photos visually depict the claimed category, keeping API secrets strictly off client devices.
3. **Deterministic Civic Intelligence**: Decoupled deterministic engines execute duplicate suppression (200m spatial clustering), calculate statutory SLAs and 3B multi-factor hazard priority scores, detect emerging incident clusters, and identify localized hotspots.
4. **Municipal Operations**: Field contractors receive prioritized work orders with GIS routing, execute remediation, and submit timestamped "After" photo evidence.
5. **Citizen-Driven Verification**: Grievances are **never** closed automatically upon officer upload; the reporting citizen reviews before-and-after proof to verify and close or reopen with recorded feedback.

---

## 🏗️ Core Architecture

```text
                       CITIZEN MOBILE APPLICATION (Flutter)
                                       │
                                       ▼
                       Authentication / Citizen Identity
                     (Dynamic Signup • District/Ward Scoped)
                                       │
                                       ▼
                              Complaint Creation
                      (Category • Geolocation • Description)
                                       │
                                       ▼
                         Image Validation Pipeline
               ┌───────────────────────┴───────────────────────┐
               │ Level 1: Byte & Size Sanity Check             │
               │ Level 2: Gemini Vision via Secure Edge Proxy  │
               │ Level 3: Conservative Local Decision Policy   │
               └───────────────────────┬───────────────────────┘
                                       │
                       MATCH (Verified Proof +10 pts)
                       MISMATCH (Category Mismatch — blocked)
                       UNCERTAIN / TIMEOUT (Pending Staff Review)
                                       │
                                       ▼
                              Complaint Submission
                                       │
                                       ▼
                    DETERMINISTIC CIVIC INTELLIGENCE ENGINES
               ┌───────────────────────────────────────────────┐
               │ 1. Similarity & Duplicate Intelligence (200m) │
               │ 2. Multi-Factor 3B Priority & Statutory SLA   │
               │ 3. Spatial Hotspot & Emerging Problem Engine  │
               │ 4. Root-Cause Incident Grouping Engine        │
               │ 5. Before/After Resolution Verification       │
               └───────────────────────┬───────────────────────┘
                                       │
                                       ▼
                       MUNICIPAL COMMAND CENTER (React 18)
                      (State & Ward Dashboards • GIS Maps)
                                       │
                                       ▼
                           Officer Work Execution
                       (Field Navigation • After Photo)
                                       │
                                       ▼
                          Citizen Resolution Audit
                        (Review Remediation Evidence)
                                       │
                       ┌───────────────┴───────────────┐
                       ▼                               ▼
               Citizen Verified                 Reopen Grievance
              (Work Order Closed)             (Dispatched for Rework)
```

---

## 📱 Mobile Application Overview

The mobile application (`apps/mobile/`) is a cross-platform Flutter client engineered for citizens and field officers:

- **Dynamic Citizen Registration**: Verified citizen onboarding capturing name, phone, email, password, municipal district, and ward.
- **Session Persistence**: Automated session rehydration via Supabase Auth and secure SharedPreferences.
- **Fresh-Account Zero State**: New citizens start in the 🌱 `Civic Starter` tier (Score `0`, Reports `0`, Community Rating `0.0`).
- **Scoped Grievance Stream**: Authenticated strictly to the citizen's `user.id`; citizens only see their own active and historical reports.
- **Civic Issue Creation**: 8 standardized civic categories (Potholes, Waste Management, Water Supply, Streetlights, Drainage, Public Safety, Parks & Trees, Encroachment).
- **3-Level Image Validation**: Multi-stage evidence verification with visual badges (🟢 Verified Proof, 🟡 Pending Review, 🔴 Category Mismatch).
- **Live Lifecycle Stepper**: 7-stage real-time progress tracking from submission through assignment, remediation, and verification.
- **Civic Recognition & Nursery Saplings**: Earn verified Green Credits for photo-verified reports and redeem them for local municipal saplings.
- **Resolution Verification**: Citizens inspect contractor resolution photos directly on their device before closing complaints.

---

## 🔐 Dynamic Citizen Authentication & Identity

The mobile authentication layer (`AuthService` and `LoginPage`) enforces the following security and governance rules:

- **Public Citizen Registration**: Public sign-ups automatically receive `role: 'citizen'`.
- **Privilege Escalation Immunity**: Self-assignment of administrative roles (`officer`, `dept_admin`, `municipal_admin`, `super_admin`) is strictly rejected.
- **Administrative Portal Isolation**: Administrative email accounts are barred from logging into the mobile citizen interface and directed to the Web Command Center.
- **Dynamic Field Capture**: Captures Full Name, 10-digit Phone Number, Email, Password, District (e.g. Solapur), and Ward (e.g. Ward 4).
- **Development / Judge Quick-Fill**: In debug mode, a single tap generates a unique dynamic citizen (`Judge Demo User {timestamp}`) for instant zero-state demonstration.
- **Clean Logout Sanitization**: `logout()` completely flushes in-memory credentials, cached roles, and session tokens.
- **Aadhaar Simulation**: Aadhaar/OTP inputs in UI simulate standard citizen verification with deterministic validation rules and do not make live external UIDAI server calls.

---

## 👁️ 3-Level Image Validation Architecture

CivicResolve implements a conservative, fail-safe 3-level image validation pipeline before complaints are submitted:

```text
Photo Captured
     │
     ▼
[Level 1: Byte Sanity Check]
  ├── Size < 100 bytes / Corrupt → REJECT (Cannot Submit)
  └── Format Valid (JPEG/PNG, >= 100 bytes) → Proceed to Level 2
     │
     ▼
[Level 2: Secure Server-Side Gemini Vision Evaluation]
  ├── Transmitted via HTTPS to Supabase Edge Function ('ai-triage')
  ├── Gemini Vision analyzes evidence against selected category
  └── Returns JSON: category_match ("yes" | "no" | "uncertain"), confidence, reasoning
     │
     ▼
[Level 3: Conservative Local Decision Policy]
  ├── MATCH ("yes" + confidence >= 0.70) ──> 🟢 ACCEPT ("Verified Proof" • +10 Score)
  ├── MISMATCH ("no" + confidence >= 0.70) ─> 🔴 REJECT ("Category Mismatch" • Blocks Submission)
  ├── UNCERTAIN ("uncertain" / conf < 0.70) > 🟡 REVIEW ("Pending Review" • Allowed to Submit)
  └── ERROR / TIMEOUT / SERVER OFFLINE ────> 🟡 REVIEW ("Pending Review" • Fails Safely)
```

### Critical Architectural Boundary:
**Google Gemini Vision is strictly an evidence perception advisory layer.** Gemini does **NOT**:
- Calculate complaint hazard priority.
- Set or alter statutory SLAs.
- Route tickets to municipal departments.
- Group duplicate complaints.
- Alter the complaint lifecycle state.

---

## 🛡️ AI Security Architecture

```text
[Mobile Client] ──(HTTPS + Bearer JWT)──> [Supabase Edge Function: ai-triage] ──(Server Secret)──> [Google Gemini API]
  (Zero API Keys)                            (PII Masking • Schema Validation)                     (Vision Analysis)
```

1. **Zero Client-Side Secrets**: `GEMINI_API_KEY` is **never** bundled inside Flutter source code, APK assets, or client environment files.
2. **Authenticated Edge Proxy**: Requests to `supabase/functions/ai-triage/index.ts` require a verified Supabase Auth Bearer JWT.
3. **Automated PII Masking**: Citizen phone numbers, Aadhaar sequences, and email addresses in complaint text are automatically redacted server-side before reaching Gemini.
4. **Structured Output Enforcement**: Gemini responses are validated against strict JSON schemas before returning to mobile.

---

## 🧠 Deterministic Civic Intelligence Engines

CivicResolve decouples all governance and municipal decision-making into 5 deterministic engines:

| Engine | Purpose | Inputs | Output | Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **1. Similarity & Duplicate Engine** (`similarity_engine.dart`) | Suppresses duplicate submissions within a 200-meter radius | GPS Coordinates, Category ID, Description text | Duplicate cluster ID, distance in meters, similarity score (0.0–1.0) | **100% Deterministic** (Haversine geospatial distance + Jaccard token similarity) |
| **2. Priority & SLA Engine** (`priority_engine.dart`) | Assigns statutory resolution deadlines (24h to 7 days) and 3B hazard scores | Category severity base, citizen upvotes, repeat reports, weather hazard flags | Priority (`Critical`, `High`, `Medium`, `Low`), Statutory SLA window in hours | **100% Deterministic** (Weighted multi-factor matrix) |
| **3. Emerging Problem Engine** (`emerging_problem_engine.dart`) | Detects sudden localized grievance spikes across ward zones | Time-series report stream, ward boundaries, category frequencies | Emerging anomaly flag, velocity coefficient, hotspot alert | **100% Deterministic** (Time-decay rolling window analysis) |
| **4. Incident Grouping Engine** (`incident_grouping_engine.dart`) | Clusters related complaints sharing a single infrastructure root cause | Spatial cluster, timestamp window, common municipal asset | Parent Incident Container ID, child report linkages | **100% Deterministic** (Graph-based spatial-temporal linkage) |
| **5. Resolution Verification Engine** (`resolution_verification_engine.dart`) | Audits contractor remediation proof before citizen review | "Before" photo, "After" photo, contractor timestamp, GPS fix | Verification verdict, similarity differential score | **Deterministic Rules** + Optional visual feature audit |

---

## 🔄 7-Stage Complaint Lifecycle

CivicResolve enforces a strict 7-stage state machine:

```text
1. SUBMITTED       ──> Initial citizen filing with validated photo evidence.
2. UNDER REVIEW    ──> Municipal automated triage & department classification.
3. ASSIGNED        ──> Allocated to Zonal Junior Engineer & Field Contractor.
4. IN PROGRESS     ──> Field crew on site; remediation actively underway.
5. RESOLVED        ──> Contractor uploads remediation "After" photo evidence.
6. CITIZEN AUDIT   ──> Citizen inspects resolution proof (Accept / Reject).
7. CLOSED / REOPEN ──> Closed if accepted; automatically Reopened if rejected.
```

---

## 🔐 Platform Security & Access Control

- **Role-Based Access Control (RBAC)**: Strict separation between `citizen`, `officer`, `dept_admin`, `municipal_admin`, and `state_admin`.
- **Database Row Level Security (RLS)**: PostgreSQL policies enforce that citizens only query rows matching their authenticated `auth.uid()`.
- **Statewide & District Isolation**: Municipal admins are isolated to their designated District/Corporation; State Admins have statewide aggregate visibility.
- **Client Privilege Immunity**: Role assignments are validated server-side; client manipulation cannot elevate permissions.
- **Server Secret Isolation**: Supabase Service Role and Gemini API keys reside exclusively in secure server environments.

---

## 🧰 Technology Stack

### Mobile Client (`apps/mobile/`)
- **Framework**: Flutter 3.x / Dart 3.x
- **State & Storage**: SharedPreferences, Supabase Flutter SDK
- **Camera & Media**: `image_picker`, `image_validation_service`
- **Mapping**: Leaflet / OpenStreetMap / OpenTopoMap
- **Testing**: Flutter Test Suite (132 unit & widget tests)

### Web Command Center (`apps/web/`)
- **Framework**: React 18.3, TypeScript 5.5, Vite 6.x
- **Styling**: Vanilla CSS tokens & TailwindCSS utilities
- **GIS Mapping**: MapLibre GL, OpenStreetMap, Esri World Imagery, OpenTopoMap
- **Icons**: Lucide React
- **Testing**: Vitest / TSX Test Runner (813 unit & component tests)

### Backend & Database (`supabase/`)
- **Database**: PostgreSQL 15 with PostGIS spatial extensions
- **Authentication**: Supabase Auth (JWT with role claims)
- **Serverless Compute**: Supabase Edge Functions (Deno / TypeScript)
- **AI Perception**: Google Gemini 1.5 Vision API

---

## 🧪 Testing & Verification Scorecard

```text
======================================================================
CIVICRESOLVE SYSTEM VERIFICATION RESULTS
======================================================================
📱 Mobile Test Suite:        132 / 132 PASSED (100%)
📱 Dart Analyzer:            0 Issues / 0 Warnings / 0 Lints
🌐 Web Test Suite:           813 / 813 PASSED (100%)
🛡️ Dynamic Citizen Auth:     7 Dedicated Unit & Widget Tests PASSED
🔍 Image Validation:         9 Dedicated Edge & Adapter Tests PASSED
======================================================================
```

### To Run Tests Locally:

```bash
# Run all mobile tests and analysis
cd apps/mobile
flutter test
flutter analyze

# Run all web tests
cd ../web
npm run test:all
```

---

## 📂 Repository Structure

```text
CivicResolve/
├── apps/
│   ├── mobile/                          # Flutter Mobile Client (Citizen & Officer)
│   │   ├── lib/
│   │   │   ├── auth_service.dart        # Dynamic citizen registration & session management
│   │   │   ├── login_page.dart          # Sign In & Citizen Registration UI
│   │   │   ├── profile_page.dart        # Dynamic profile, Green Credits & reports count
│   │   │   ├── dashboard_screen.dart    # Onboarding banner, quick actions & report list
│   │   │   ├── confirmation_screen.dart # Step 3 review, image validation card & success view
│   │   │   ├── image_validation_service.dart # 3-level validation & Gemini Vision adapter
│   │   │   ├── priority_engine.dart     # Deterministic 3B hazard priority scoring
│   │   │   ├── similarity_engine.dart   # 200m duplicate discovery & spatial grouping
│   │   │   ├── emerging_problem_engine.dart # Anomaly velocity & hotspot detection
│   │   │   ├── incident_grouping_engine.dart # Infrastructure root-cause clustering
│   │   │   └── resolution_verification_engine.dart # Before/after remediation audit
│   │   ├── test/
│   │   │   ├── dynamic_citizen_auth_test.dart # Dynamic auth & fresh account tests
│   │   │   ├── credit_system_test.dart        # Green credits & nursery vouchers
│   │   │   ├── app_preferences_test.dart      # Role & session preference storage
│   │   │   └── widget_test.dart               # 120+ mobile unit and widget tests
│   │   └── README.md                    # Mobile internal developer guide
│   └── web/                             # React 18 / TypeScript Web Command Center
│       ├── src/
│       │   ├── components/map/CommandMap.tsx # GIS command map & live layers
│       │   ├── components/copilot/      # Municipal AI Copilot drawer
│       │   └── services/runAllTests.ts  # Web verification test runner
│       └── vercel.json                  # Production deployment & CSP headers
├── supabase/
│   ├── functions/
│   │   └── ai-triage/index.ts           # Server-side Gemini Vision & triage Edge Function
│   └── migrations/                      # PostgreSQL schemas, PostGIS & RLS policies
├── docs/
│   ├── IMPLEMENTATION_STATUS.md         # Verified feature inventory (Implemented vs Planned)
│   └── MOBILE_ARCHITECTURE.md           # Mobile architecture deep-dive
└── README.md                            # Main project overview (this file)
```

---

## 🎯 Concise Judge Demonstration Flow

Follow this 5-minute live demonstration flow to experience the entire closed-loop architecture:

```text
1. FRESH CITIZEN REGISTRATION
   • Open Mobile App → Tap "New Citizen Sign Up" (or use Quick-Fill in debug mode)
   • Register: Vikram Patil • Ward 4, Solapur
   • See immediate zero-state: 🌱 Civic Starter • Score 0 • 0 Reports Submitted

2. CIVIC COMPLAINT FILING WITH EVIDENCE VALIDATION
   • Tap "+ Report a Problem" → Select "Potholes & Road Damage"
   • Add photo:
     - If real pothole: 🟢 "Verified Proof" (+10 Civic Score awarded)
     - If selfie/food:  🔴 "Category Mismatch" (Submission blocked)
     - If unclear road: 🟡 "Pending Staff Review" (Allowed to submit for manual review)

3. SUBMISSION & DETERMINISTIC INTELLIGENCE
   • Submit complaint → Instant Complaint Reference `#CR-...` assigned
   • Deterministic Priority Engine calculates 3B hazard level and statutory SLA
   • 200m spatial proximity check suppresses duplicates

4. MUNICIPAL TRIAGE & RESOLUTION
   • Grievance visible on Web GIS Command Map
   • Field contractor navigates to site, performs repair, and uploads "After" photo

5. CITIZEN RESOLUTION AUDIT
   • Citizen receives push alert: "Remediation Evidence Uploaded"
   • Citizen inspects Before vs After photo evidence
   • Citizen taps "Verify & Close" → Complaint officially closed & credits credited!
```

---

## ⚖️ Key Architectural Principles

1. **AI is Perception, Not Policy**: Gemini Vision assists visual verification; deterministic code calculates priority, SLA, duplicate grouping, and routing.
2. **Fail-Safe by Default**: Model timeouts, parse errors, or low confidence always fail safely to `Pending Staff Review`—never false rejections or silent failures.
3. **No Client Privilege Escalation**: Public registration strictly assigns `role: 'citizen'`.
4. **Strict Complaint Ownership**: Grievance streams are authenticated to `user.id`.
5. **No Blind Ticket Closures**: Work orders are not closed solely because an officer uploads a photo; citizen verification is required.
6. **Decoupled Client Architecture**: `apps/web/` and `apps/mobile/` operate independently on shared Supabase contracts.

---

## 🔮 Implementation Status & Roadmap

| Subsystem | Status | Description |
| :--- | :---: | :--- |
| **Dynamic Citizen Auth & Zero-State** | ✅ IMPLEMENTED | Dynamic registration, role protection, fresh account profile (Score 0, Reports 0) |
| **3-Level Image Validation Pipeline** | ✅ IMPLEMENTED | Level 1 byte sanity, Level 2 server Gemini Vision proxy, Level 3 conservative policy |
| **Server-Side Edge Function Proxy** | ✅ IMPLEMENTED | Deno edge function (`ai-triage`) with JWT auth, PII scrubbing, zero client secrets |
| **5 Deterministic Intelligence Engines** | ✅ IMPLEMENTED | Duplicates (200m), 3B Priority & SLA, Hotspots, Incident Grouping, Before/After Audit |
| **GIS Command Map & Basemaps** | ✅ IMPLEMENTED | High-reliability keyless tiles (OSM, Esri World Street, Esri Satellite, Carto) |
| **Grounded Municipal Copilot** | ✅ IMPLEMENTED | Shift briefings & tactical triage query support with database grounding |
| **Citizen Verification Action Box** | ✅ IMPLEMENTED | Before/After remediation review modal with Accept/Reopen controls |
| **Nursery Sapling Green Credits** | ✅ IMPLEMENTED | Points accumulation for verified reports with digital redemption vouchers |
| **UIDAI Direct Aadhaar API Integration** | 🔵 PLANNED | Production direct UIDAI gateway integration (currently simulated via deterministic engine) |
| **Offline Vector Map Tile Packs** | 🔵 PLANNED | Downloadable offline MBTiles for rural areas with zero mobile data connectivity |

*See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for the complete verified inventory.*

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

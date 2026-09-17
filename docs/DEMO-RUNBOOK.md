# 🎬 CivicResolve 2.0 — Golden Demo Runbook & Script

> **Product Story**: A Citizen reports a civic grievance $\rightarrow$ AI understands & normalizes it $\rightarrow$ 3A connects duplicates $\rightarrow$ 3B prioritizes risks $\rightarrow$ 3C detects emerging hotspots $\rightarrow$ 3D groups potential incidents $\rightarrow$ Admin launches Joint Action $\rightarrow$ Field Officer resolves it $\rightarrow$ 3E verifies resolution evidence $\rightarrow$ Leadership receives grounded commissioner intelligence.

---

## 🧭 Golden Path Overview

| Step | Stage | Screen / Route | Action | Expected Visual & Intelligence Signal |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **INTAKE (Report)** | `/complaints` | Open Complaints Queue | 8 Live grievances rendered with canonical 7-stage status, SLA timers, and priority badges. |
| **2** | **UNDERSTAND & 3B** | `/complaints` $\rightarrow$ `#CR-3` | Click `#CR-3` (Water Main Burst) | Phase 3B Priority Scorecard (**98 Critical**) displaying multi-signal breakdown (Safety 25%, Severity 30%, Clusters 20%, SLA 15%). |
| **3** | **3A CONNECT** | `#CR-3` Dossier | Inspect Related Complaints Panel | Phase 3A Similarity Engine flags matching grievances within 200m spatial radius and text overlap. |
| **4** | **3C DETECT** | `/map` (GIS Live Map) | Inspect 500m Hotspot Layer | Spatio-temporal concentration zones displayed with pulsing radar indicators, centroid GPS, and traceable contributing complaints. |
| **5** | **3D POTENTIAL INCIDENT** | `/map` $\rightarrow$ Hotspot Inspector | Click Hotspot $\rightarrow$ View Connected Reports | 3D grouping isolates systemic root cause (preserving strict *"Potential Incident"* labeling). |
| **6** | **JOINT ACTION** | Hotspot Inspector | Click `⚡ Initiate Joint Action` | Modal opens with pre-grouped work package; assign Department & Officer atomically. |
| **7** | **DISPATCH & RESOLVE** | `#CR-3` Dossier | Advance Status $\rightarrow$ `In Progress` | Status Stepper advances through statutory lifecycle with real-time audit history log. |
| **8** | **3E VERIFY & CLOSE** | `#CR-6` Dossier | Inspect Resolution Verification Card | Phase 3E Engine displays Before/After Photo Inspector, GPS geofence validation, and 5-star citizen satisfaction score (**95% Confidence**). |
| **9** | **COPILOT & BRIEFING** | `/copilot` | Click `📋 Generate Municipal Briefing` | Live KPI cards + 6-Section Executive Briefing formatted in clean typography (Workload, Critical 3B Cases, SLA Health, 3C Hotspots, 3D Work Packages, Directives). |
| **10**| **RBAC / CITIZEN GATE** | Auth Gateway | Sign Out $\rightarrow$ Authenticate as `Citizen` | Municipal Command Gate strictly restricts citizen account with *"Access Restricted"* security shield. |

---

## 🎙️ Click-by-Click Recording Sequence

### **0:00 – 0:30 | Introduction & Municipal Command Overview**
- **Screen**: `/` (Municipal Command Dashboard)
- **Action**: Log in as `Municipal Admin`. Pan across live KPI counters and Solapur city telemetry.
- **Talk Track**: 
  > *"Welcome to CivicResolve 2.0 — an AI-powered municipal operating system that transforms isolated citizen grievances into grounded, proactive municipal actions."*
- **What Judge Should Notice**: Clean executive UI, 0 mock fallback alerts, live Supabase telemetry.

---

### **0:30 – 1:15 | Intake, Understanding & 3B Smart Priority**
- **Screen**: `/complaints` $\rightarrow$ Click `#CR-3`
- **Action**: Open `#CR-3` (*Active High-Pressure Water Main Burst near Civil Hospital*).
- **Talk Track**: 
  > *"When a grievance is reported, our automated triage normalizes the location, category, and severity. Instead of first-come-first-served, CivicResolve's Phase 3B Smart Priority Engine evaluates 5 mathematical signals — elevating this water main rupture to a 98/100 Critical priority due to immediate public safety risk and transit corridor disruption."*
- **What Judge Should Notice**: Phase 3B Priority Scorecard with exact driver breakdown; canonical 7-stage status stepper.

---

### **1:15 – 1:50 | 3A Similarity & 3C Emerging Hotspots**
- **Screen**: `#CR-3` Dossier $\rightarrow$ Navigate to `/map` (GIS Live Map)
- **Action**: Highlight Phase 3A Related Complaints Panel (showing nearby leak reports). Then switch to `/map` and click the Station Road 500m Hotspot badge.
- **Talk Track**: 
  > *"Phase 3A immediately detects related complaints within a 200-meter radius. Simultaneously, our Phase 3C Emerging Problem Engine aggregates spatial-temporal intake velocity, surfacing localized 500-meter surge zones on the GIS map before they escalate into civic emergencies."*
- **What Judge Should Notice**: GIS map with pulsing rings, GPS centroid inspection, and traceable list of contributing complaints.

---

### **1:50 – 2:35 | 3D Potential Incidents & Joint Action Orchestration**
- **Screen**: GIS Hotspot Inspector $\rightarrow$ Click `⚡ Initiate Joint Action Work Order`
- **Action**: Open Joint Action Modal, review the consolidated multi-complaint work package, and assign Water Works Dept.
- **Talk Track**: 
  > *"Rather than dispatching multiple officers to duplicate tickets, Phase 3D groups connected reports into a Potential Incident. With one click, the municipal administrator converts this intelligence into a Joint Action work package, synchronizing field dispatch across all linked reports."*
- **What Judge Should Notice**: Atomic work package consolidation; preservation of *"Potential Incident"* terminology.

---

### **2:35 – 3:15 | 3E Resolution Verification & Statutory Closure**
- **Screen**: `/complaints` $\rightarrow$ Open `#CR-6` (*Streetlight Cluster Replacement*)
- **Action**: Scroll to the Phase 3E Resolution Verification Card. Toggle the Before/After photo inspector.
- **Talk Track**: 
  > *"Closing a grievance requires proof. CivicResolve's Phase 3E Resolution Verification Engine validates that the repair photograph was taken within the 100-meter GPS geofence, verifies temporal validity, and incorporates citizen feedback sentiment. Only verified evidence qualifies for formal statutory closure."*
- **What Judge Should Notice**: Before/After image comparison, geofence confirmation badge, 5-star citizen feedback rating, 95% verification confidence score.

---

### **3:15 – 4:00 | Grounded Copilot & Commissioner Briefing**
- **Screen**: `/copilot` $\rightarrow$ Click `📋 Commissioner Briefing`
- **Action**: Click `Generate Municipal Briefing`. Show the 6 rendered sections. Ask a prompt chip in `💬 Interactive Chat`.
- **Talk Track**: 
  > *"Finally, leadership needs situational awareness without AI hallucination. CivicResolve's Copilot synthesizes live 3A through 3E telemetry into a grounded 6-section Municipal Briefing. Every metric, priority escalation, and hotspot centroid originates strictly from verified database records with 100% deterministic mathematical fallback."*
- **What Judge Should Notice**: Formatted Markdown typography (H3 headings, bold metrics, bullet lists), clickable `#CR-3` citation pills, zero hallucinated statistics.

---

### **4:00 – 4:15 | RBAC & Security Boundary**
- **Screen**: Top Right `Sign Out` $\rightarrow$ Click `Citizen` $\rightarrow$ `Authenticate Session`
- **Action**: Demonstrate that the citizen account is strictly denied access to municipal command operations with the Access Restricted security screen.
- **Talk Track**: 
  > *"All intelligence and telemetry are protected by PostgreSQL Row Level Security, ensuring citizen privacy while providing city leadership with authoritative decision support."*
- **What Judge Should Notice**: Immediate RBAC gate enforcement with PII protection.

---

## 🛡️ Backup & Resilience Plan

| Component | Potential Issue | Automated / Deterministic Fallback Behavior |
| :--- | :--- | :--- |
| **Gemini LLM** | Network timeout / API quota error | `CopilotService` automatically generates the canonical 6-section briefing using the deterministic 3A–3E mathematical engine with identical metrics. |
| **GIS Map Canvas** | WebGL context loss or slow tile loading | The Hotspot Inspector and Complaints Queue provide full tabular and coordinate listings with GPS centroids. |
| **Realtime Sync** | WebSocket reconnect delay | Click `Refresh` button in top header to instantly poll live Supabase state. |
| **Role Gate** | Accidental citizen login during demo | Click `Sign Out & Switch Account` and select `Municipal Admin` demo button for instant 1-click credential autofill. |

---

*← Back to [AI Intelligence Guide](AI-INTELLIGENCE.md)*

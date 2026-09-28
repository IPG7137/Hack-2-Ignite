# 🏛️ CivicResolve — Final Manual Smoke Test Runbook

> **Target Audience:** Hackathon Presenters, QA, and Evaluators  
> **Purpose:** Physical device and interactive browser execution checklist for live demonstration.  
> **Distinction Note:** Automated tests (`runAllTests.ts` and `flutter test`) verify business logic, state transitions, and calculations. This document covers **physical device hardware APIs, browser permissions, and real-time interaction**.

---

## 📋 Legend
- `[AUTOMATED]` — Covered by automated test suites (TypeScript / Flutter).
- `[MANUAL]` — Requires physical mouse click, touch gesture, or hardware permission in browser/device.

---

## 1. 👥 Citizen Experience & Report Intake Flow

| Step | Action | Expected Behavior | Verification Type |
|---|---|---|---|
| **1.1** | **Registration** | Fill in Name, Email, Password, Ward in Citizen Registration modal. | Clean signup without error banner; user assigned `citizen` role. | `[MANUAL]` |
| **1.2** | **Profile Baseline** | Navigate to `/rewards` or check citizen banner. | Clean 0-state: Civic Score = 0, Verified Reports = 0, Starter Badge, no fake certificates. | `[MANUAL]` |
| **1.3** | **GPS Permission** | Click "Detect Location" in Report Modal. | Browser prompts for Geolocation (`navigator.geolocation`); fills Ward and Latitude/Longitude accurately. | `[MANUAL]` |
| **1.4** | **Camera / Photo Evidence** | Select photo upload or camera capture. | Photo preview renders with loading indicator; file size validated. | `[MANUAL]` |
| **1.5** | **3A Duplicate Advisory** | Enter an issue near an existing grievance. | Non-blocking advisory modal appears: *"This may be related to an existing issue"*; allows "Support Existing" or "Submit Anyway". | `[MANUAL]` |
| **1.6** | **Submit Report** | Click "Submit Grievance". | Button disables (preventing double click); generates ticket ID (e.g. `CR-2026-XXXX`); creates notification. | `[MANUAL]` |
| **1.7** | **Citizen Tracking** | Navigate to `/complaints` or tracking drawer. | Complaint appears with status `SUBMITTED`; SLA countdown active. | `[MANUAL]` |

---

## 2. 🏢 Duty Officer Experience (Municipal HQ)

| Step | Action | Expected Behavior | Verification Type |
|---|---|---|---|
| **2.1** | **Officer Login** | Sign in through Municipal HQ Portal with officer credentials. | Officer navigation loads; citizen private PII sanitized; district/ward isolated. | `[MANUAL]` |
| **2.2** | **Queue Inspection** | Open Ward Grievance Queue in `/complaints`. | Newly created citizen report appears in queue with 3B calculated priority. | `[MANUAL]` |
| **2.3** | **Dossier & Assignment** | Open complaint details and assign field response team. | Status advances to `ASSIGNED`; audit history records officer name and timestamp. | `[MANUAL]` |
| **2.4** | **Work Execution** | Transition status to `IN_PROGRESS`. | Status updates in realtime; citizen receives in-app status notification. | `[MANUAL]` |
| **2.5** | **Submit Resolution** | Upload remediation "After" photo and completion notes. | Status advances to `CITIZEN_VERIFICATION` / `RESOLUTION_SUBMITTED` (officer cannot force-close without verification). | `[MANUAL]` |

---

## 3. 🔄 Citizen Verification & Dispute Loops

### Path A: Verification & Positive Feedback (Happy Path)
| Step | Action | Expected Behavior | Verification Type |
|---|---|---|---|
| **3.1A** | **Notification Alert** | Citizen checks notification bell / `/alerts`. | Unread badge reflects `Citizen Verification Required`; clicking deep-links to resolution evidence. | `[MANUAL]` |
| **3.2A** | **Inspect Evidence** | Citizen inspects Before vs After photo comparison. | Both images render clearly with location verification tag. | `[MANUAL]` |
| **3.3A** | **Confirm & Rate** | Citizen selects 5 stars and clicks "Confirm Resolution". | Status transitions to `CLOSED`; citizen receives **+10 Quality Points** (deduplicated against double reward). | `[MANUAL]` |

### Path B: Dispute / Rework Loop (Failure / Quality Control Path)
| Step | Action | Expected Behavior | Verification Type |
|---|---|---|---|
| **3.1B** | **Dispute Resolution** | Citizen selects "Issue Persists / Unsatisfactory" with reason (e.g. *Incomplete cleanup*). | System enforces mandatory structured reason and optional proof photo. | `[MANUAL]` |
| **3.2B** | **Reopen Transition** | Citizen submits dispute. | Complaint state transitions to `REOPENED`; reopen counter increments; returns to officer queue for re-dispatch. | `[MANUAL]` |

---

## 4. 🏛️ Municipal Admin Command Center & Intelligence

| Step | Action | Expected Behavior | Verification Type |
|---|---|---|---|
| **4.1** | **Command Center KPIs** | Sign in as Municipal Admin and view `/`. | KPIs (Active, SLA Overdue, Hotspots, Incidents) reflect live database values without hardcoded numbers. | `[MANUAL]` |
| **4.2** | **3C Emerging Hotspots** | Switch Radar tab to "Emerging Hotspots". | Detects spatial-temporal clusters with severity ranking and recommended interventions. | `[MANUAL]` |
| **4.3** | **3D Composite Incidents** | Switch Radar tab to "Composite Incidents". | Shows grouped incidents (e.g. Water Pipeline Burst + Road Cave-in) with Joint Action dispatch triggers. | `[MANUAL]` |
| **4.4** | **GIS Interactive Map** | Navigate to `/gis`. | Ward polygons, category filters, and marker popups operate smoothly; fly-to zooms on selection. | `[MANUAL]` |
| **4.5** | **AI Copilot / Briefing** | Open Copilot drawer and run Executive Commissioner Briefing. | Generates grounded summary with live ward citations; deterministic fallback functions when API rate-limited. | `[MANUAL]` |

---

## 5. 📱 Mobile & Hardware API Checklist

| Item | Description | Device / Environment | Status |
|---|---|---|---|
| **Camera Access** | Native camera capture for report evidence and resolution proof. | Android Chrome / Safari / Flutter APK | `[MANUAL]` |
| **Geolocation GPS** | High-precision GPS lookup for latitude/longitude tagging. | Physical Smartphone (Android / iOS) | `[MANUAL]` |
| **Responsive Drawer** | Hamburger menu, sidebar collapse, modal backdrops on mobile viewport (390px width). | Chrome DevTools / Mobile Device | `[MANUAL]` |
| **Slow Network Mode** | Fast 3G throttling test in DevTools Network tab. | Browser DevTools | `[MANUAL]` |
| **Offline / Realtime Recovery** | Network toggle test; UI maintains cached state and resumes realtime sync upon reconnect. | Browser DevTools | `[MANUAL]` |
| **Role Isolation Security** | Attempting to navigate to `/briefing` or `/admin` with `citizen` session correctly redirects or restricts access. | Web Browser | `[MANUAL]` |

---

## 6. 🧪 Summary of Automated Verification
Before running physical manual tests, ensure the automated verification pipeline is passing:
- Web Services & Unit Tests: `npx tsx apps/web/src/services/runAllTests.ts` (779+ tests passing)
- Flutter Mobile Suite: `flutter test` (116 tests passing)
- Flutter Analyzer: `flutter analyze` (0 issues)
- Web Production Build: `npm run build` (0 TypeScript / Vite errors)

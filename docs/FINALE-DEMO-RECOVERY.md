# 🚨 CivicResolve 2.0 — Finale Demo Recovery & Resiliency Runbook

> **Operational Guideline for Pune Grand Finale**: This document specifies instant, battle-tested recovery actions for edge cases, API outages, or unexpected state conditions during a live 5-minute judge demonstration.

---

## ⚡ 1. Rapid Failure-Mode Decision Matrix

| Scenario / Failure Point | Visible Symptom | Immediate Demonstrator Action | Behind-The-Scenes Resiliency Mechanism |
| :--- | :--- | :--- | :--- |
| **Gemini AI Timeout / Quota Exhaustion** | Copilot shows standard response or advisory note | Click `📋 Generate Municipal Briefing`. Point to the 6 rendered sections and say: *"Our core intelligence (3A–3E) is 100% deterministic mathematical code; Gemini provides natural language summarization on top."* | `CopilotService` automatically falls back to deterministic rule engine that parses live complaint data into structured 6-section briefing. |
| **MapLibre WebGL Tile Loading Delay** | Map canvas blank or slow on projector network | Click the **Hotspots** or **Incidents** tab in the Dashboard radar card, or click any complaint in `/complaints` to inspect GPS coordinates directly. | The system maintains dual spatial representation: interactive MapLibre canvas + tabular GPS coordinate inspector with centroid telemetry. |
| **No Active Hotspots Detected** | Radar card shows *"No emerging problems detected"* | Explain to judges: *"Our 3C engine requires $\ge 2$ complaints within 500m radius to trigger an alert. Right now complaints are distributed across disparate wards."* | Clean empty state renders with standard green checkmark rather than fabricating fake spatial surge clusters. |
| **Zero Citizen Feedback Recorded** | Satisfaction card shows `N/A / Pending` | Explain to judges: *"This district has newly resolved tickets awaiting on-site citizen audits. CivicResolve never hallucinates satisfaction metrics until genuine citizen verification occurs."* | Truthful mathematical evaluation returns 0 / pending indicators rather than hardcoded fallbacks. |
| **Zero Civic Recognition Certificates** | Tier counts show `0 Contributors, 0 Supporters, 0 Champions` | Navigate to `/civic-champions`, select the active occasion (**Gandhi Jayanti 2026**), and click `Evaluate Eligibility` to demonstrate the live evaluation engine. | Recognition ledger computes directly from verified audit records without artificial seed offsets. |
| **Accidental Citizen Login** | Screen displays *"Access Restricted: Citizen Account"* | Click the red/amber `Sign Out & Switch Account` button. On the Municipal Gateway, click `Municipal Admin (Solapur)` for instant 1-click credential autofill. | Explicit security boundary demonstrates working PostgreSQL Row Level Security (RLS) enforcement to the judges. |
| **Network Hiccup / Realtime Stream Interruption** | Newly submitted complaint not immediately visible | Click the `↻ Refresh` button in the top header or press `F5` / `Ctrl+R`. | Local memory cache + Supabase REST synchronization instantly polls the latest database state. |
| **Accidental Browser Tab Close / Refresh** | User lands back on authentication screen | Click `Quick Demo Login: Municipal Admin` and click `Authenticate Session`. You will be returned to the Solapur Municipal Command Center in < 2 seconds. | Local session state persists auth tokens; quick demo autofill buttons bypass manual credential typing. |

---

## 🎙️ 2. Core Golden Demo Talking Points (Under Judge Scrutiny)

### 1. Differentiating Officer Resolution from Citizen Verification (3E)
- **Judge Query**: *"How do you prevent contractors from marking fake resolutions?"*
- **Answer**: 
  > *"In CivicResolve, an officer clicking 'Resolved' only moves the status to 'Resolution Submitted' with photographic proof and geofencing. The ticket only reaches statutory closure when the citizen physically audits the site or provides 5-star confirmation. If unsatisfied, the citizen reopens the ticket with a structured dispute reason."*

### 2. Explainable 3B Priority Score
- **Judge Query**: *"Why is water main rupture higher priority than a blocked road?"*
- **Answer**: 
  > *"Our Phase 3B Priority Engine combines 5 weighted signals: Public Safety Impact (30%), Hazard Keywords (25%), Cluster Velocity (20%), Citizen Upvotes (15%), and SLA Expiry (10%). A water rupture next to a hospital triggers maximum safety and infrastructure scores."*

### 3. Non-Competitive Civic Recognition & Social Forestry
- **Judge Query**: *"Is this gamification encouraging spam reporting?"*
- **Answer**: 
  > *"No. CivicResolve rejects raw volume gaming. Recognition milestones (Contributor, Supporter, Champion) require verified quality actions—such as confirmed reports and on-site resolution sign-offs. Furthermore, merit is rewarded with statutory occasion certificates and indigenous sapling vouchers (Social Forestry Nursery pickup), not monetary speculative tokens."*

---

## 🛡️ 3. Safe Presentation Terminology

| ❌ Unsafe / Overstated Claim | ✅ Safe, Authoritative Presentation Terminology |
| :--- | :--- |
| *"Our AI 100% automatically resolves complaints."* | *"Our deterministic AI pipeline triages, deduplicates, prioritizes, and clusters grievances for human officer adjudication."* |
| *"This is an official Government of India certificate."* | *"CivicResolve generates verifiable digital merit citations for statutory occasions like Gandhi Jayanti, verifiable via QR code."* |
| *"Our system integrates directly into all government nurseries."* | *"The platform provides a municipal social forestry voucher workflow enabling physical in-person sapling collection at local municipal nurseries."* |
| *"Gemini makes all operational decisions."* | *"All operational clustering, priority scoring, and SLA calculations are 100% deterministic TypeScript algorithms; Gemini is used solely for natural language summarization and executive briefing synthesis."* |

---

## 🚀 4. Final Sanity Verification Checklist Before Stage Presentation

- [ ] Web production build verified (`npm run build` exits 0).
- [ ] Local server running on `localhost:5173` or deployed URL ready in pinned tab.
- [ ] Browser zoom set to 90% or 100% for crisp 1080p projector display.
- [ ] DevTools Console closed to avoid visual clutter.
- [ ] Audio / video permissions granted for camera/photo upload demonstration.
- [ ] Backup mobile device connected to local WiFi with Flutter app launched.

# 🏛️ CivicResolve — Municipal Operations Command Center (`web`)

An enterprise-grade, high-density **Municipal Operations Command Center** for CivicResolve built with React 18, TypeScript, Vite, Tailwind CSS, MapLibre GL, and Recharts.

---

## 📌 Key Capabilities

- **Situational Awareness Dashboard**: Live KPI metrics answering *What is happening*, *Where is it happening*, *What is urgent*, and *Why is it urgent*.
- **Tactical Priority Queue**: Instant triage with root-cause hazard indicators and one-click field crew assignment.
- **GIS Incident Matrix (MapLibre GL)**: Geospatial mapping with priority color-coding and **200m duplicate suppression buffer rings**.
- **7-Stage Linear Workflow**:
  ```
  Submitted ➔ Under Review ➔ Assigned ➔ In Progress ➔ Resolution Submitted ➔ Verified ➔ Closed
  ```
- **Photographic Audit Inspector**: Side-by-side verification of original citizen complaint proof vs contractor remediation proof.
- **AI Municipal Copilot**: Grounded RAG assistant citing active complaint ticket IDs (`#CR-2026-101`) to synthesize shift handover reports and cluster advisories.
- **SLA Escalation Matrix**: Statutory compliance countdowns and automated contractor penalty tiers.

---

## 🛠️ Architecture & Clean Separation

```
Pages ➔ Components ➔ Hooks ➔ Services ➔ Supabase API + PostGIS + RLS
```

Components do not communicate directly with the database. The `IComplaintService` interface allows switching from Phase 1 in-memory mock data to Phase 2 live Supabase PostgreSQL calls with zero component rewrites.

---

## 🚀 Running Locally

```bash
cd apps/web
npm install
npm run dev
```

Command center will be available at `http://localhost:3002`.

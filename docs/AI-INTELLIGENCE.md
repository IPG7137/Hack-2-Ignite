# 🧠 CivicResolve — AI & Intelligence System

> Technical documentation for CivicResolve's hybrid deterministic intelligence engines (3A–3E) and Grounded AI Copilot.

---

## Architecture: Deterministic First, Generative Second

CivicResolve strictly adheres to a **Reliable Municipal Intelligence** design philosophy:
1. **Deterministic Core (3A–3E)**: All critical governance decisions (duplicate detection, SLA prioritization, clustering, spatial hotspots) run on provably bounded mathematical algorithms that never hallucinate.
2. **Grounded AI Layer**: Large Language Models (e.g., Google Gemini 1.5 Flash) operate on strictly grounded, filtered structured data payloads with explicit grounding security guardrails.

---

## 3A–3E Intelligence Engines

```mermaid
flowchart LR
    subgraph Intake
        C[New Complaint]
    end
    
    subgraph "Phase 3 Engines"
        C --> 3A[3A: Similarity Engine]
        3A --> 3B[3B: Incident Grouping]
        C --> 3C[3C: Priority Engine]
        3B --> 3E[3E: Emerging Patterns]
        Resolved[Resolution Event] --> 3D[3D: Verification Engine]
    end

    subgraph Operations
        3C --> Queue[Dispatch Priority Queue]
        3B --> Cluster[Incident Map Cluster]
        3E --> Hotspots[Hotspot Alerts & Anomalies]
        3D --> Audit[Audited Resolution]
    end
```

---

### 3A. Semantic & Spatial Similarity Engine (`similarityEngine.ts`)
- **Spatial Distance**: Haversine formula calculation with configurable radius thresholds (e.g., 50m–200m).
- **Textual Similarity**: Token-level Jaccard similarity and character-level n-gram overlap with Solapur-localized stop-word filtering.
- **Combined Score**: Weighted blend of semantic relevance ($W_{text} = 0.5$) and geographical proximity ($W_{geo} = 0.5$).
- **Use Case**: Instantly flags matching active grievances to prevent redundant dispatches.

---

### 3B. Incident Grouping & Deduplication Engine (`incidentGroupingEngine.ts`)
- **Graph Clustering**: Groups isolated citizen submissions into unified "Root Incident" entities.
- **Parent-Child Hierarchy**: Elevates the earliest or most detailed submission to Parent status while linking subsequent reports as Child subscribers.
- **Broadcast Redressal**: Resolving the Parent incident automatically notifies all linked citizens without requiring manual duplication work by field officers.

---

### 3D Potential Incident → Joint Action Operational Workflow (`incidentGroupingEngine.ts`)
```mermaid
flowchart TD
    A[3D Potential Incident Detection] -->|Algorithmic Clustering| B[Human Review in Command Center]
    B -->|Admin Approves & Configures| C[Create Joint Action]
    C -->|Atomic DB Transaction| D[Coordinated Work Package Created]
    D -->|Batch Assignment| E[Department & Officer Dispatched]
    E -->|Normal Complaint Lifecycle| F[Field Work & Proof Upload]
    F -->|Geofenced & Temporal Validation| G[3E Resolution Verification]
```

- **Detection**: 3D identifies potential relationships using spatial radius, temporal clustering, and category alignment.
- **Human Review**: Municipal administrators explicitly review potential incidents (preserving "Potential" terminology until confirmed).
- **Joint Action**: One-click coordinated operational work package creation (`incident_clusters` & `incident_cluster_reports`).
- **Data Integrity**: Preserves individual complaint records without duplication while establishing relational linkages.
- **Normal Lifecycle**: Advances pending complaints to `assigned` status; full resolution requires standard field evidence and 3E verification.

---

### 3C. Dynamic Priority Scoring Engine (`priorityEngine.ts`)
Calculates real-time priority scores ($0.0 - 100.0$) using a multi-factor formula:

$$P = w_{sev} \cdot S_{base} + w_{sla} \cdot S_{sla} + w_{pop} \cdot S_{pop} + w_{rep} \cdot S_{repeat}$$

- **Base Severity ($S_{base}$)**: Category hazard rating (e.g., Open Manhole = 95, Pothole = 60, Streetlight = 40).
- **SLA Breach Velocity ($S_{sla}$)**: Exponential escalation as time approaches statutory deadlines.
- **Population Density ($S_{pop}$)**: Multiplier based on ward population and transit corridor classification.
- **Recurrence Factor ($S_{repeat}$)**: Escalation boost if the location has experienced recurring failures within 30 days.

---

### 3D. Resolution Verification Engine (`resolutionVerificationEngine.ts`)
- **GPS Geofence Validation**: Validates that the officer's resolution photograph was taken within 100m of the original incident coordinates.
- **Temporal Verification**: Timestamp audit ensuring resolution proof cannot predate the dispatch timestamp.
- **Citizen Feedback Loop**: 72-hour citizen confirmation window. If the citizen disputes the resolution with counter-evidence, the grievance automatically re-opens at escalated priority.

---

### 3E. Emerging Problem & Pattern Detection Engine (`emergingProblemEngine.ts`)
- **Spike Detection**: Statistical z-score anomaly detection across temporal complaint volume per ward.
- **Spatial Hotspotting**: Identifies geographic clusters where complaint velocity exceeds baseline thresholds by $>2.5\sigma$.
- **Infrastructure Decay Warnings**: Highlights chronic failure nodes (e.g., repeated water pipe bursts on the same road segment).

---

## Grounded AI Copilot (`copilotService.ts`)

```mermaid
sequenceDiagram
    participant Admin as Municipal Admin
    participant Guard as Grounding Security Guard
    participant Engine as Aggregator & RLS Filter
    participant LLM as Gemini 1.5 Flash

    Admin->>Guard: "Summarize Ward 4 water supply issues"
    Guard->>Guard: Sanitize & Validate Prompt
    Guard->>Engine: Fetch Ward 4 Filtered Records
    Engine-->>Guard: Structured Grounding Context (JSON)
    Guard->>LLM: Prompt + Strict Grounding Payload
    LLM-->>Guard: Contextualized Response
    Guard->>Guard: Verify Response against Context
    Guard-->>Admin: Audited, Accurate Intelligence Summary
```

- **Zero Hallucination Guarantee**: If the underlying query yields no records or fails authorization, the Copilot explicitly states data absence rather than extrapolating.
- **Role-Aware Scoping**: The Copilot context payload is filtered according to the caller's authorized scope (e.g., Zone Admins only receive insights for their designated zone).

---

*← Back to [README](../README.md)*

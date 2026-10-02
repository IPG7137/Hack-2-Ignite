# 🏛️ CivicResolve Mobile Client Architecture

> Technical deep-dive for developers, system architects, and hackathon judges inspecting the Flutter mobile application subsystems, security boundaries, and deterministic civic logic.

---

## 1. High-Level Subsystem Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       CIVICRESOLVE FLUTTER CLIENT                       │
├────────────────────────────┬────────────────────────────┬───────────────┤
│    Presentation Layer      │     Intelligence Layer     │ Service Layer │
├────────────────────────────┼────────────────────────────┼───────────────┤
│ • LoginPage (Auth & Reg)   │ • Priority Engine          │ • AuthService │
│ • DashboardScreen          │ • Similarity Engine (200m) │ • Supabase DB │
│ • CategorySelectionScreen  │ • Emerging Problem Engine  │ • AppPrefs    │
│ • CreateReportScreen       │ • Incident Grouping Engine │ • NotifService│
│ • ConfirmationScreen       │ • Resolution Verification  │ • ImageValSvc │
│ • TrackReportsScreen       │ • 3-Level Image Pipeline   │ • CreditSvc   │
│ • Profile & PlantShopPage  │   (Gemini Vision Proxy)    │ • OfflineQueue│
└────────────────────────────┴────────────────────────────┴───────────────┘
                                     │
                                     ▼ (HTTPS + Bearer JWT)
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE BACKEND INFRASTRUCTURE                  │
├─────────────────────────────────────────────┬───────────────────────────┤
│ Supabase Edge Functions (Deno / TypeScript) │ PostgreSQL 15 + PostGIS   │
│ • 'ai-triage' (Gemini Vision Server Proxy)  │ • Row Level Security (RLS)│
│ • PII Masking & Schema Validation           │ • Realtime Change Streams │
└─────────────────────────────────────────────┴───────────────────────────┘
```

---

## 2. Dynamic Citizen Identity & Authentication

### Security Guarantees
1. **Public Signup Boundary**:
   - `AuthService.register(...)` strictly assigns `role: 'citizen'`.
   - Privilege escalation attacks (attempting to pass `role: 'super_admin'` or `'officer'`) are hardcoded to `'citizen'`.
2. **Administrative Isolation**:
   - Administrative email addresses (`*@civicresolve.gov` or accounts with `role != 'citizen'`) are barred from the mobile citizen portal and directed to the Web Command Center.
3. **Session Persistence & Clean Flush**:
   - Tokens and profile attributes are persisted across app restarts via `AppPreferences` and Supabase Auth.
   - `AuthService.logout()` explicitly clears all memory properties, cached user models, and stored roles.

---

## 3. 3-Level Photographic Evidence Pipeline

```text
                     [Citizen Takes / Uploads Photo]
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: Byte & Size Sanity Check (Local Client)                      │
│ • Validates byte array integrity and length >= 100 bytes              │
│ • Catches corrupt / 0-byte camera streams immediately                  │
│ • Decision: FAIL -> REJECT (Blocks submission)                        │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │ PASS
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: Server-Side Gemini Vision Evaluation (Supabase Edge Function) │
│ • Base64 payload transmitted over HTTPS with Bearer Auth              │
│ • 'ai-triage' Edge Function masks PII and invokes Google Gemini Vision│
│ • Returns: category_match ("yes"|"no"|"uncertain"), confidence, reason│
│ • Zero Gemini API keys bundled on client                              │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ LEVEL 3: Conservative Local Decision Policy (Local Client)            │
│ • MATCH ("yes" + conf >= 0.70)   ──> 🟢 Verified Proof (+10 Score)    │
│ • MISMATCH ("no" + conf >= 0.70) ──> 🔴 Category Mismatch (Blocked)   │
│ • UNCERTAIN / LOW CONFIDENCE     ──> 🟡 Pending Staff Review (Allowed)│
│ • TIMEOUT / SERVER ERROR         ──> 🟡 Pending Staff Review (Allowed)│
└───────────────────────────────────────────────────────────────────────┘
```

### Pluggable Classifier Architecture
The pipeline implements the `ImageClassifierAdapter` abstract interface. This decouples the UI from the backend model, allowing future on-device ML models (TFLite, ONNX, PyTorch Mobile) to be plugged in without refactoring UI screens:

```dart
abstract class ImageClassifierAdapter {
  Future<ClassifierPrediction> predictCategory(
    Uint8List imageBytes, {
    String? imagePath,
    String? description,
    String? selectedCategoryId,
  });
}
```

---

## 4. Deterministic Civic Intelligence Subsystems

| Engine | Core Algorithm | Deterministic Contract |
| :--- | :--- | :--- |
| **`PriorityEngine`** | Multi-factor weighted hazard matrix: `Score = (BaseCategoryWeight * 0.4) + (Upvotes * 0.2) + (RepeatMultiplier * 0.2) + (WeatherHazard * 0.2)` | Always outputs deterministic priority (`Critical`, `High`, `Medium`, `Low`) and statutory SLA in hours. |
| **`SimilarityEngine`** | Spatial proximity via Haversine distance formula + Word token Jaccard similarity. | Identifies duplicate grievances within a strict 200m spatial radius. |
| **`EmergingProblemEngine`** | Time-decay rolling window calculation of category incident velocity per ward. | Triggers municipal hotspot alerts when velocity exceeds historical baselines. |
| **`IncidentGroupingEngine`** | Spatial-temporal graph clustering linking multiple complaints to a single infrastructure asset. | Consolidates individual complaints under a parent Incident Container. |
| **`ResolutionVerificationEngine`** | Structural pixel differential + contractor timestamp & GPS verification. | Audits "After" remediation proof before presenting to the citizen for final closure. |

---

## 5. Offline Queue & Network Resilience

1. **Network Interruption Handling**:
   - `OfflineSyncService` caches grievance submissions in local SQLite/SharedPreferences if offline.
   - Background sync triggers automatically when network connectivity is restored.
2. **Fail-Safe AI Degradation**:
   - If Supabase Edge Functions or Gemini Vision are unreachable, `RemoteGeminiVisionClassifierAdapter` gracefully returns `isDefinitive: false`.
   - Level 3 policy catches this and routes the submission to `🟡 Pending Staff Review`, ensuring citizens are **never blocked** from filing critical emergencies due to third-party AI downtime.

---

## 6. Verification & Test Architecture

The mobile codebase enforces 100% test passing and zero analyzer warnings before deployment:

```bash
cd apps/mobile
flutter test        # 132/132 unit & widget tests
flutter analyze     # 0 lints, 0 warnings, 0 errors
```

# 📱 CivicResolve Mobile Application

> High-performance cross-platform Flutter client for citizen grievance intake, AI photographic validation, real-time lifecycle tracking, and field officer remediation.

[![Flutter Tests](https://img.shields.io/badge/Flutter_Tests-132%2F132_Passed-brightgreen?style=for-the-badge&logo=flutter&logoColor=white)](test/)
[![Dart Analyzer](https://img.shields.io/badge/Dart_Analyzer-0_Issues-brightgreen?style=for-the-badge&logo=dart&logoColor=white)](lib/)
[![Supabase Flutter](https://img.shields.io/badge/Supabase-Auth_%26_Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

---

## 🏛️ Application Overview

The CivicResolve Mobile Application serves two distinct municipal user roles:

1. **Urban Citizens (`role: 'citizen'`)**:
   - Dynamic registration and profile management (district/ward scoped).
   - Instant zero-state onboarding in the 🌱 **Civic Starter** tier.
   - Geotagged civic issue reporting across 8 standardized categories.
   - Real-time 3-level photographic evidence verification before submission.
   - 7-stage live progress tracking with map-based issue locations.
   - Citizen verification of contractor remediation photos before closing tickets.
   - Green Credits accumulation and municipal tree nursery sapling voucher redemption.

2. **Field Contractors & Duty Officers (`role: 'contractor'` / `'officer'`)**:
   - Field work queue with priority ranking and statutory SLA timers.
   - Turn-by-turn navigation to incident GPS coordinates.
   - Photographic remediation proof upload ("After" photo evidence).

---

## 🧭 Application Architecture & Navigation

```text
                                [LoginPage]
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         [Citizen Portal]                   [Field Officer Portal]
                │                                     │
                ▼                                     ▼
       [DashboardScreen]                     [OfficerQueueScreen]
  ┌─────────────┼─────────────┐                       │
  ▼             ▼             ▼                       ▼
[Category]  [TrackReports] [Profile]              [FieldRemediation]
  │             │             │                       │
  ▼             ▼             ▼                       ▼
[CreateReport] [ReportDetail][PlantShop]          [UploadAfterProof]
  │             │
  ▼             ▼
[Confirmation] [CitizenAuditAction]
```

---

## 🔐 Dynamic Citizen Authentication & Zero-State Experience

- **Registration Flow** (`auth_service.dart` + `login_page.dart`):
  - Public registration captures: Full Legal Name, 10-digit Phone, Email, Password, District, and Ward.
  - Public sign-ups strictly assign `role: 'citizen'`, preventing privilege escalation.
  - Administrative accounts are prevented from logging into the mobile citizen interface.
- **Truthful Zero-State Initial State** (`profile_page.dart` + `dashboard_screen.dart`):
  - Tier: 🌱 `Civic Starter`
  - Total Civic Score / Green Credits: `0`
  - Reports Submitted: `0` (queried from authenticated `userId`)
  - Grievance Stream: Clean empty state with onboarding CTA `[+ Report a Problem]`.
- **Session Rehydration**:
  - Automatically loads cached credentials upon app launch via Supabase Auth + SharedPreferences.
  - `logout()` completely flushes cached tokens, roles, and profile attributes.

---

## 👁️ 3-Level Image Validation & Gemini Vision Pipeline

Evidence photos pass through a 3-level pipeline (`image_validation_service.dart`):

1. **Level 1: Byte Sanity Check**
   - Verifies file integrity, MIME type (JPEG/PNG), and byte size (>= 100 bytes).
2. **Level 2: Secure Server-Side Gemini Vision Evaluation**
   - Transmits base64 image bytes to Supabase Edge Function (`ai-triage`).
   - Evaluates image relevance against selected category.
   - **Zero Gemini API keys exist inside Flutter source or APK assets.**
3. **Level 3: Conservative Local Decision Policy**
   - `MATCH` (Confidence >= 70%): 🟢 **Verified Proof** (+10 score bonus).
   - `MISMATCH` (Confidence >= 70%): 🔴 **Category Mismatch** (Blocks submission until replaced).
   - `UNCERTAIN` / `TIMEOUT` / `OFFLINE`: 🟡 **Pending Staff Review** (Permits submission, flagged for manual engineer audit).

---

## 🧠 Deterministic Civic Intelligence Engines

All municipal triage, routing, and priority logic is decoupled into pure Dart deterministic engines:

- **`priority_engine.dart`**: Multi-factor 3B hazard assessment (Base Category Weight + Upvotes + Repeat Multiplier + Monsoon Hazard) -> Output: `Critical`, `High`, `Medium`, `Low` + Statutory SLA (24h to 168h).
- **`similarity_engine.dart`**: Haversine 200m spatial clustering and token overlap detection for duplicate suppression.
- **`emerging_problem_engine.dart`**: Time-decay rolling window analysis for localized grievance spikes.
- **`incident_grouping_engine.dart`**: Spatial-temporal graph clustering linking multiple complaints to a single infrastructure root cause.
- **`resolution_verification_engine.dart`**: Pre-audit comparing "Before" vs "After" photos before presenting to citizens.

---

## 🧪 Testing & Quality Assurance

The mobile test suite contains **132 automated tests** across unit, engine, and widget layers:

```bash
# Run all Flutter tests
flutter test

# Run static Dart analyzer (0 issues enforced)
flutter analyze
```

### Test Suite Structure:
- `test/dynamic_citizen_auth_test.dart`: Dynamic registration, zero-state, role protection, session persistence, and UI mode toggle.
- `test/credit_system_test.dart`: Green credits accumulation, transactions, and sapling redemption vouchers.
- `test/app_preferences_test.dart`: SharedPreferences role storage, onboarding flags, and profile cache.
- `test/widget_test.dart`: 120+ tests covering 3-level image validation, Gemini fallback, priority engine, similarity clustering, and report steppers.

---

## ⚙️ Running Locally

### Prerequisites
- Flutter SDK (>= 3.2.0)
- Dart SDK (>= 3.2.0)
- Android Studio / Xcode / VS Code with Flutter Extension

### Setup Instructions

1. **Install Dependencies**:
   ```bash
   cd apps/mobile
   flutter pub get
   ```

2. **Configure Supabase (if connecting to custom instance)**:
   Ensure `main.dart` points to your Supabase URL and Anon Key.

3. **Launch on Connected Device / Emulator**:
   ```bash
   # Run in Debug Mode
   flutter run

   # Build Production Release APK
   flutter build apk --release
   ```

---

## 🛡️ Security & Privacy Notice

- **No Secrets in Client**: Never hardcode API keys (Gemini, Supabase Service Role) into Dart code.
- **PII Protection**: Citizen Aadhaar and contact numbers are masked before external logging.
- **Row Level Security**: All database queries are filtered by `auth.uid()`.

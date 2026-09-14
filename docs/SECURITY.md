# 🛡️ CivicResolve — Security & Authorization Architecture

> Security model, Row Level Security (RLS) enforcement, AI grounding guardrails, and compliance design for CivicResolve.

---

## Security Philosophy: Zero Trust at the Database Layer

In CivicResolve, **security is enforced in PostgreSQL via Row Level Security (RLS), not through client-side checks or application-tier gatekeepers.** Even if an adversary modifies frontend JavaScript or intercepts network calls, database-level security policies prevent unauthorized read, write, or mutation operations.

---

## 1. Row Level Security (RLS) Policy Matrix

| Table | Operation | `citizen` | `officer` | `dept_admin` | `municipal_admin` |
|:------|:---------:|:---------:|:---------:|:------------:|:-----------------:|
| `complaints` | **SELECT** | Own complaints only | Assigned department / zone | Own department / zone | All city complaints |
| `complaints` | **INSERT** | Yes (own user_id) | No | No | Yes |
| `complaints` | **UPDATE** | Feedback / Rating only | Status & Evidence only | Assignment & Priority | Full management |
| `complaints` | **DELETE** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked (Audit retain) |
| `profiles` | **SELECT** | Own profile | Own + Team | Zone officers | All municipal staff |
| `profiles` | **UPDATE** | Own profile | Own profile | Own profile | Administrative update |

---

## 2. Immutability & Anti-Tampering Triggers

CivicResolve implements PostgreSQL database triggers to guarantee audit integrity:

- **Citizen Tampering Prevention**: A `BEFORE UPDATE` trigger rejects attempts by citizens to alter grievance category, GPS coordinates, or submission timestamps after the initial insert.
- **Officer Proof Geofencing**: Officers can only transition a complaint to `RESOLVED` if valid resolution evidence (photograph URI + timestamp) is supplied.
- **Audit Logging**: Status transitions are logged to an append-only timeline table with immutable timestamps (`created_at = NOW()`).

---

## 3. AI Copilot Grounding Guardrails (`groundingSecurityGuard.ts`)

To protect municipal operations from prompt injection, data leaks, and hallucinations:

```
┌──────────────────────────────────────────────────────────┐
│                   User Copilot Query                     │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│              Grounding Security Guard                    │
│  - Prompt sanitization & injection pattern detection     │
│  - Role-based scoping (Zone / Department isolation)      │
│  - Strict JSON payload construction                      │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│                     LLM Execution                        │
│  - Strict system prompt with anti-hallucination bounds   │
│  - Fallback to deterministic summary if service fails    │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│             Post-Execution Output Validation             │
└──────────────────────────────────────────────────────────┘
```

1. **Role-Scoped Payloads**: The LLM is only provided records the authenticated user is authorized to view via their active RLS context.
2. **Injection Detection**: Input prompts containing system delimiter overrides, jailbreak phrases, or administrative bypass patterns are rejected.
3. **Structured Fallbacks**: If external AI services are unavailable or timeout, the system gracefully falls back to deterministic TypeScript/Dart analytics engines without breaking the UI.

---

## 4. Key Management & Secrets

- **`VITE_SUPABASE_ANON_KEY`**: Publicly readable key restricted entirely by PostgreSQL RLS policies. Safe for client-side inclusion.
- **`SUPABASE_SERVICE_ROLE_KEY`**: **Strictly forbidden** from web bundles, mobile APKs, and version control. Only used for backend maintenance scripts.
- **API Secret Storage**: All runtime API credentials (e.g., Gemini API keys) are injected via environment variables and excluded from git via `.gitignore`.

---

## 5. Security Test Suite

CivicResolve includes automated regression tests covering security policies:

- **`rlsSecurity.test.ts`**: Verifies cross-tenant isolation and role-specific query restrictions across 30+ scenarios.
- **`groundingSecurity.test.ts`**: Tests anti-injection guardrails, malicious payload sanitization, and deterministic fallbacks.
- **`aiAuthorization.test.ts`**: Confirms that department-level admins cannot access city-wide AI analytics out-of-scope.

---

*← Back to [README](../README.md)*

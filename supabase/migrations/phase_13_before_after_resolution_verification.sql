-- ==============================================================================
-- CIVICRESOLVE — Phase 13: Feature 5 — Before/After Resolution Verification
-- Authoritative Schema for Evidence-Based Resolution, GPS Audits & Citizen Sign-Off
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ------------------------------------------------------------------------------
-- 1. Resolution Attempts Table (Preserves Multi-Attempt History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resolution_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'submitted_awaiting_verification'
        CHECK (status IN ('submitted_awaiting_verification', 'verified_resolved', 'rejected_reopened')),
    resolved_by TEXT NOT NULL,
    resolved_by_role TEXT NOT NULL DEFAULT 'officer'
        CHECK (resolved_by_role IN ('officer', 'contractor', 'admin', 'system')),
    resolution_note TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_from_origin_meters DOUBLE PRECISION,
    location_verified BOOLEAN DEFAULT FALSE,
    before_evidence_urls JSONB DEFAULT '[]'::jsonb,
    after_evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    captured_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ai_review JSONB,
    district_id TEXT NOT NULL,
    organization_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Resolution Evidence Table (Detailed Photographic & Media Assets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resolution_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolution_attempt_id UUID REFERENCES public.resolution_attempts(id) ON DELETE CASCADE,
    complaint_id TEXT NOT NULL,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('before', 'after', 'reopen_proof')),
    file_url TEXT NOT NULL,
    file_hash TEXT,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    captured_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by TEXT NOT NULL,
    district_id TEXT NOT NULL,
    organization_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. Citizen Verifications Table (Audit Record of Citizen Sign-Off / Reopening)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.citizen_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolution_attempt_id UUID REFERENCES public.resolution_attempts(id) ON DELETE CASCADE,
    complaint_id TEXT NOT NULL,
    verified_by TEXT NOT NULL,
    satisfied BOOLEAN NOT NULL,
    reopen_reason TEXT CHECK (reopen_reason IN (
        'issue_still_exists',
        'partial_resolution',
        'wrong_location',
        'poor_quality_work',
        'evidence_does_not_show_issue',
        'other'
    )),
    citizen_comment TEXT,
    verification_photo_url TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    district_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. Resolution Audit Events Table (Immutable Audit Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resolution_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id TEXT NOT NULL,
    resolution_attempt_id UUID,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('citizen', 'officer', 'contractor', 'admin', 'system')),
    action TEXT NOT NULL CHECK (action IN (
        'COMPLAINT_CREATED',
        'RESOLUTION_SUBMITTED',
        'CITIZEN_VERIFIED_RESOLVED',
        'CITIZEN_REJECTED_REOPENED',
        'EVIDENCE_UPLOADED',
        'AI_EVIDENCE_ASSESSED',
        'LOCATION_VERIFIED'
    )),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    district_id TEXT NOT NULL,
    organization_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. Indexes for High-Performance Queries & District Isolation
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_resolution_attempts_complaint_id ON public.resolution_attempts (complaint_id);
CREATE INDEX IF NOT EXISTS idx_resolution_attempts_district_id ON public.resolution_attempts (district_id);
CREATE INDEX IF NOT EXISTS idx_resolution_attempts_status ON public.resolution_attempts (status);

CREATE INDEX IF NOT EXISTS idx_resolution_evidence_complaint_id ON public.resolution_evidence (complaint_id);
CREATE INDEX IF NOT EXISTS idx_resolution_evidence_attempt_id ON public.resolution_evidence (resolution_attempt_id);
CREATE INDEX IF NOT EXISTS idx_resolution_evidence_district_id ON public.resolution_evidence (district_id);

CREATE INDEX IF NOT EXISTS idx_citizen_verifications_complaint_id ON public.citizen_verifications (complaint_id);
CREATE INDEX IF NOT EXISTS idx_citizen_verifications_attempt_id ON public.citizen_verifications (resolution_attempt_id);
CREATE INDEX IF NOT EXISTS idx_citizen_verifications_district_id ON public.citizen_verifications (district_id);

CREATE INDEX IF NOT EXISTS idx_resolution_audit_complaint_id ON public.resolution_audit_events (complaint_id);
CREATE INDEX IF NOT EXISTS idx_resolution_audit_district_id ON public.resolution_audit_events (district_id);

-- ------------------------------------------------------------------------------
-- 6. Row-Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.resolution_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_audit_events ENABLE ROW LEVEL SECURITY;

-- Resolution Attempts Policies
CREATE POLICY "Allow district officers to select their district resolution attempts"
    ON public.resolution_attempts FOR SELECT
    USING (
        auth.jwt() ->> 'district_id' = district_id OR
        auth.jwt() ->> 'role' = 'state_admin' OR
        auth.jwt() ->> 'role' = 'super_admin'
    );

CREATE POLICY "Allow authenticated municipal officers to insert resolution attempts"
    ON public.resolution_attempts FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'district_id' = district_id OR
        auth.jwt() ->> 'role' = 'state_admin'
    );

-- Citizen Verifications Policies
CREATE POLICY "Allow district users to view citizen verifications"
    ON public.citizen_verifications FOR SELECT
    USING (
        auth.jwt() ->> 'district_id' = district_id OR
        auth.jwt() ->> 'role' = 'state_admin'
    );

CREATE POLICY "Allow citizens to submit verification for their complaints"
    ON public.citizen_verifications FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Audit Events Policies (Read-Only to non-admins, Insert only)
CREATE POLICY "Allow district officers to view audit events"
    ON public.resolution_audit_events FOR SELECT
    USING (
        auth.jwt() ->> 'district_id' = district_id OR
        auth.jwt() ->> 'role' = 'state_admin'
    );

CREATE POLICY "Allow system and authenticated actors to insert audit events"
    ON public.resolution_audit_events FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL OR
        auth.jwt() ->> 'role' = 'service_role'
    );

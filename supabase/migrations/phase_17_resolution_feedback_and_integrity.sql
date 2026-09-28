-- ==============================================================================
-- CIVICRESOLVE — Phase 17: Citizen Feedback & Resolution Integrity System
-- Authoritative Schema for Post-Resolution Citizen Feedback, Deterministic Integrity Flags,
-- and Human-in-the-Loop Municipal Review Auditing
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Resolution Feedback Table (Citizen Post-Resolution Sign-off & Rating)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resolution_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id TEXT NOT NULL,
    resolution_attempt_id UUID REFERENCES public.resolution_attempts(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    satisfied BOOLEAN NOT NULL DEFAULT TRUE,
    comment TEXT,
    reopen_reason TEXT CHECK (reopen_reason IS NULL OR reopen_reason IN (
        'issue_still_exists',
        'partial_resolution',
        'wrong_location',
        'poor_quality_work',
        'evidence_does_not_show_issue',
        'other'
    )),
    verification_photo_url TEXT,
    district_id TEXT NOT NULL,
    organization_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast complaint & district retrieval
CREATE INDEX IF NOT EXISTS idx_resolution_feedback_complaint_id ON public.resolution_feedback (complaint_id);
CREATE INDEX IF NOT EXISTS idx_resolution_feedback_user_id ON public.resolution_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_resolution_feedback_attempt_id ON public.resolution_feedback (resolution_attempt_id);
CREATE INDEX IF NOT EXISTS idx_resolution_feedback_district_id ON public.resolution_feedback (district_id);
CREATE INDEX IF NOT EXISTS idx_resolution_feedback_created_at ON public.resolution_feedback (created_at DESC);

-- Unique index to prevent duplicate feedback in the same resolution attempt cycle
CREATE UNIQUE INDEX IF NOT EXISTS uq_resolution_feedback_attempt_user 
    ON public.resolution_feedback (complaint_id, resolution_attempt_id, user_id)
    WHERE resolution_attempt_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. Feedback Integrity Flags Table (Internal Municipal Review Queue)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback_integrity_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES public.resolution_feedback(id) ON DELETE CASCADE,
    complaint_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    district_id TEXT NOT NULL,
    flag_type TEXT NOT NULL CHECK (flag_type IN (
        'HIGH_VOLUME_BURST',
        'RAPID_SUBMISSION_BURST',
        'EXTREME_RATING_PATTERN',
        'CONTRADICTION_ANOMALY',
        'SUSPICIOUS_FREQUENCY'
    )),
    risk_score INTEGER NOT NULL DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'elevated')),
    reasons TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'dismissed', 'confirmed')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_integrity_complaint_id ON public.feedback_integrity_flags (complaint_id);
CREATE INDEX IF NOT EXISTS idx_feedback_integrity_district_id ON public.feedback_integrity_flags (district_id);
CREATE INDEX IF NOT EXISTS idx_feedback_integrity_status ON public.feedback_integrity_flags (status);
CREATE INDEX IF NOT EXISTS idx_feedback_integrity_user_id ON public.feedback_integrity_flags (user_id);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.resolution_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_integrity_flags ENABLE ROW LEVEL SECURITY;

-- Resolution Feedback RLS
CREATE POLICY "Allow users to view own feedback and district officers to view all in district"
    ON public.resolution_feedback FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        auth.jwt() ->> 'district_id' = district_id OR
        auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin')
    );

CREATE POLICY "Allow authenticated citizens to submit feedback"
    ON public.resolution_feedback FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (auth.uid()::text = user_id OR auth.jwt() ->> 'role' = 'service_role')
    );

-- Feedback Integrity Flags RLS (STRICTLY Municipal Staff & Admins Only)
CREATE POLICY "Allow municipal staff to view integrity flags in their district"
    ON public.feedback_integrity_flags FOR SELECT
    USING (
        (auth.jwt() ->> 'district_id' = district_id AND auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin')) OR
        auth.jwt() ->> 'role' IN ('state_admin', 'super_admin')
    );

CREATE POLICY "Allow municipal staff and system to manage integrity flags"
    ON public.feedback_integrity_flags FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin', 'service_role')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin', 'service_role')
    );

-- ------------------------------------------------------------------------------
-- 4. Authoritative RPC: Submit Resolution Feedback with Lifecycle Sync
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_resolution_feedback(
    p_complaint_id TEXT,
    p_resolution_attempt_id UUID,
    p_user_id TEXT,
    p_rating INTEGER,
    p_satisfied BOOLEAN,
    p_comment TEXT DEFAULT NULL,
    p_reopen_reason TEXT DEFAULT NULL,
    p_verification_photo_url TEXT DEFAULT NULL,
    p_district_id TEXT DEFAULT 'pune'
)
RETURNS JSONB AS $$
DECLARE
    v_feedback_id UUID;
    v_report_record RECORD;
    v_flag_id UUID := NULL;
    v_recent_count INTEGER;
    v_result JSONB;
BEGIN
    -- 1. Validate rating
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5 stars';
    END IF;

    -- 2. Insert feedback record
    INSERT INTO public.resolution_feedback (
        complaint_id,
        resolution_attempt_id,
        user_id,
        rating,
        satisfied,
        comment,
        reopen_reason,
        verification_photo_url,
        district_id
    ) VALUES (
        p_complaint_id,
        p_resolution_attempt_id,
        p_user_id,
        p_rating,
        p_satisfied,
        p_comment,
        p_reopen_reason,
        p_verification_photo_url,
        p_district_id
    ) RETURNING id INTO v_feedback_id;

    -- 3. Deterministic Heuristic: Check rapid submission burst (>= 5 submissions in past 10 minutes)
    SELECT COUNT(*) INTO v_recent_count
    FROM public.resolution_feedback
    WHERE user_id = p_user_id
      AND created_at >= (NOW() - INTERVAL '10 minutes');

    IF v_recent_count >= 5 THEN
        INSERT INTO public.feedback_integrity_flags (
            feedback_id,
            complaint_id,
            user_id,
            district_id,
            flag_type,
            risk_score,
            risk_level,
            reasons,
            status
        ) VALUES (
            v_feedback_id,
            p_complaint_id,
            p_user_id,
            p_district_id,
            'HIGH_VOLUME_BURST',
            75,
            'elevated',
            ARRAY['High feedback submission volume (' || v_recent_count || ' in 10 minutes)'],
            'open'
        ) RETURNING id INTO v_flag_id;
    END IF;

    -- 4. Update Report lifecycle status
    IF p_satisfied THEN
        UPDATE public.reports
        SET 
            status = 'closed',
            citizen_verification_status = 'verified',
            citizen_feedback = COALESCE(p_comment, 'Citizen verified resolution on-site.'),
            rating = p_rating,
            completion_date = NOW(),
            updated_at = NOW()
        WHERE id::text = p_complaint_id OR id::text = REPLACE(p_complaint_id, 'CR-2026-', '');
    ELSE
        UPDATE public.reports
        SET 
            status = 'progress',
            citizen_verification_status = 'reopened',
            reopen_reason = COALESCE(p_reopen_reason, p_comment, 'Citizen reported issue is still unresolved.'),
            reopen_count = COALESCE(reopen_count, 0) + 1,
            verification_photo_url = p_verification_photo_url,
            rating = p_rating,
            updated_at = NOW()
        WHERE id::text = p_complaint_id OR id::text = REPLACE(p_complaint_id, 'CR-2026-', '');
    END IF;

    -- 5. Audit Event
    INSERT INTO public.resolution_audit_events (
        complaint_id,
        resolution_attempt_id,
        actor_id,
        actor_role,
        action,
        details,
        district_id
    ) VALUES (
        p_complaint_id,
        p_resolution_attempt_id,
        p_user_id,
        'citizen',
        CASE WHEN p_satisfied THEN 'CITIZEN_VERIFIED_RESOLVED' ELSE 'CITIZEN_REJECTED_REOPENED' END,
        jsonb_build_object(
            'feedback_id', v_feedback_id,
            'rating', p_rating,
            'satisfied', p_satisfied,
            'reopen_reason', p_reopen_reason,
            'integrity_flagged', (v_flag_id IS NOT NULL)
        ),
        p_district_id
    );

    v_result := jsonb_build_object(
        'success', true,
        'feedback_id', v_feedback_id,
        'flag_id', v_flag_id,
        'new_status', CASE WHEN p_satisfied THEN 'closed' ELSE 'reopened' END
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5. Authoritative RPC: Review Integrity Flag (Authorized Municipal Reviewer)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_feedback_integrity_flag(
    p_flag_id UUID,
    p_reviewer_id TEXT,
    p_decision TEXT,
    p_review_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_flag RECORD;
BEGIN
    IF p_decision NOT IN ('dismissed', 'confirmed', 'under_review') THEN
        RAISE EXCEPTION 'Invalid review decision. Must be dismissed, confirmed, or under_review';
    END IF;

    SELECT * INTO v_flag FROM public.feedback_integrity_flags WHERE id = p_flag_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feedback integrity flag not found';
    END IF;

    UPDATE public.feedback_integrity_flags
    SET 
        status = p_decision,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        review_notes = p_review_notes,
        updated_at = NOW()
    WHERE id = p_flag_id;

    -- Record in audit ledger
    INSERT INTO public.resolution_audit_events (
        complaint_id,
        actor_id,
        actor_role,
        action,
        details,
        district_id
    ) VALUES (
        v_flag.complaint_id,
        p_reviewer_id,
        'officer',
        'AI_EVIDENCE_ASSESSED',
        jsonb_build_object(
            'audit_type', 'INTEGRITY_FLAG_REVIEW',
            'flag_id', p_flag_id,
            'previous_status', v_flag.status,
            'new_status', p_decision,
            'notes', p_review_notes
        ),
        v_flag.district_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'flag_id', p_flag_id,
        'status', p_decision,
        'reviewed_by', p_reviewer_id,
        'reviewed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. Authoritative RPC: Operational Metrics for District Feedback
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_resolution_feedback_metrics(
    p_district_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_total_feedbacks BIGINT := 0;
    v_avg_rating NUMERIC := 0.0;
    v_resolved_count BIGINT := 0;
    v_reopened_count BIGINT := 0;
    v_pending_flags BIGINT := 0;
    v_metrics JSONB;
BEGIN
    SELECT 
        COUNT(*),
        COALESCE(AVG(rating), 0),
        COUNT(*) FILTER (WHERE satisfied = TRUE),
        COUNT(*) FILTER (WHERE satisfied = FALSE)
    INTO 
        v_total_feedbacks,
        v_avg_rating,
        v_resolved_count,
        v_reopened_count
    FROM public.resolution_feedback
    WHERE p_district_id IS NULL OR district_id = p_district_id;

    SELECT COUNT(*)
    INTO v_pending_flags
    FROM public.feedback_integrity_flags
    WHERE status = 'open'
      AND (p_district_id IS NULL OR district_id = p_district_id);

    v_metrics := jsonb_build_object(
        'total_feedbacks', v_total_feedbacks,
        'average_rating', ROUND(v_avg_rating, 2),
        'resolved_percentage', CASE WHEN v_total_feedbacks > 0 THEN ROUND((v_resolved_count::numeric / v_total_feedbacks::numeric) * 100, 1) ELSE 0 END,
        'reopen_count', v_reopened_count,
        'pending_integrity_reviews', v_pending_flags
    );

    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT ALL ON public.resolution_feedback TO authenticated, anon;
GRANT ALL ON public.feedback_integrity_flags TO authenticated, anon;

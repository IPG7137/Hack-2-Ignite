-- ==============================================================================
-- CIVICRESOLVE — Phase 18: Civic Recognition, Digital Certificates & Nursery Redemption
-- Authoritative Schema for Verified Civic Contribution Recognition, Occasion Citations
-- (2 Oct Gandhi Jayanti / 26 Jan Republic Day / 15 Aug Independence Day), and
-- Government Nursery Plant Voucher Redemption Workflows
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Civic Digital Certificates Table (Official Municipal Recognition)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.civic_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    district_id TEXT NOT NULL,
    occasion_id TEXT NOT NULL, -- e.g. 'gandhi_jayanti_2026', 'republic_day_2027', 'independence_day_2027'
    occasion_name TEXT NOT NULL, -- e.g. 'Gandhi Jayanti Civic Recognition', 'Republic Day Civic Champions'
    recognition_tier TEXT NOT NULL CHECK (recognition_tier IN ('civic_contributor', 'civic_supporter', 'civic_champion')),
    certificate_number TEXT UNIQUE NOT NULL, -- e.g. 'CR-GJ-2026-PUNE-8901'
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contribution_summary JSONB NOT NULL DEFAULT '{}'::jsonb, -- { verifiedReports: 3, verifiedResolutions: 2, helpfulSupports: 5, civicScore: 120 }
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_civic_certificates_user_id ON public.civic_certificates (user_id);
CREATE INDEX IF NOT EXISTS idx_civic_certificates_district_id ON public.civic_certificates (district_id);
CREATE INDEX IF NOT EXISTS idx_civic_certificates_number ON public.civic_certificates (certificate_number);
CREATE INDEX IF NOT EXISTS idx_civic_certificates_occasion ON public.civic_certificates (occasion_id);

-- ------------------------------------------------------------------------------
-- 2. Civic Plant & Sapling Redemptions Table (Government Nursery Workflow)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.civic_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    district_id TEXT NOT NULL,
    certificate_id UUID REFERENCES public.civic_certificates(id) ON DELETE SET NULL,
    reward_type TEXT NOT NULL DEFAULT 'GOVERNMENT_NURSERY_SAPLING',
    item_title TEXT NOT NULL, -- e.g. 'Indigenous Neem / Peepal Nursery Sapling Voucher'
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('available', 'requested', 'approved', 'redeemed', 'cancelled')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    nursery_location TEXT NOT NULL DEFAULT 'Government Social Forestry Division Nursery',
    redemption_code TEXT UNIQUE NOT NULL, -- e.g. 'PLANT-PUNE-7789'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_civic_redemptions_user_id ON public.civic_redemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_civic_redemptions_district_id ON public.civic_redemptions (district_id);
CREATE INDEX IF NOT EXISTS idx_civic_redemptions_status ON public.civic_redemptions (status);
CREATE INDEX IF NOT EXISTS idx_civic_redemptions_code ON public.civic_redemptions (redemption_code);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.civic_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_redemptions ENABLE ROW LEVEL SECURITY;

-- Civic Certificates Policies
CREATE POLICY "Allow citizens to view own certificates"
    ON public.civic_certificates FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        auth.jwt() ->> 'district_id' = district_id OR
        auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin')
    );

CREATE POLICY "Allow system and authorized staff to insert certificates"
    ON public.civic_certificates FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin', 'service_role')
    );

-- Civic Redemptions Policies
CREATE POLICY "Allow citizens to view own redemptions and district staff to view district redemptions"
    ON public.civic_redemptions FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        auth.jwt() ->> 'district_id' = district_id OR
        auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin')
    );

CREATE POLICY "Allow citizens to insert redemption requests"
    ON public.civic_redemptions FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND auth.uid()::text = user_id
    );

CREATE POLICY "Allow authorized staff to update redemptions"
    ON public.civic_redemptions FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin', 'service_role')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin', 'service_role')
    );

-- ------------------------------------------------------------------------------
-- 4. Authoritative RPC: Public Certificate Verification (Zero PII Exposure)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_civic_certificate(
    p_certificate_number TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_cert RECORD;
    v_profile RECORD;
BEGIN
    SELECT * INTO v_cert 
    FROM public.civic_certificates 
    WHERE certificate_number = p_certificate_number;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'message', 'Certificate number not found in Maharashtra Municipal Records.'
        );
    END IF;

    IF v_cert.is_revoked THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'is_revoked', true,
            'revocation_reason', v_cert.revocation_reason,
            'message', 'This certificate was revoked by municipal administration.'
        );
    END IF;

    SELECT display_name INTO v_profile
    FROM public.citizen_civic_profiles
    WHERE user_id = v_cert.user_id;

    RETURN jsonb_build_object(
        'is_valid', true,
        'certificate_number', v_cert.certificate_number,
        'occasion_name', v_cert.occasion_name,
        'recognition_tier', v_cert.recognition_tier,
        'recipient_display_name', COALESCE(v_profile.display_name, 'Verified Citizen Contributor'),
        'district_id', v_cert.district_id,
        'issued_at', v_cert.issued_at,
        'contribution_summary', v_cert.contribution_summary
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5. Authoritative RPC: Request Plant Redemption
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_plant_redemption(
    p_user_id TEXT,
    p_district_id TEXT,
    p_certificate_id UUID,
    p_item_title TEXT DEFAULT 'Indigenous Neem / Peepal Nursery Sapling Voucher',
    p_nursery_location TEXT DEFAULT 'Government Social Forestry Nursery'
)
RETURNS JSONB AS $$
DECLARE
    v_code TEXT;
    v_redemption_id UUID;
    v_existing_count INTEGER;
BEGIN
    -- Check if active redemption already exists for this certificate
    IF p_certificate_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_existing_count
        FROM public.civic_redemptions
        WHERE certificate_id = p_certificate_id
          AND status IN ('requested', 'approved', 'redeemed');

        IF v_existing_count > 0 THEN
            RAISE EXCEPTION 'A redemption voucher has already been issued for this recognition certificate.';
        END IF;
    END IF;

    -- Generate unique voucher code
    v_code := 'PLANT-' || UPPER(p_district_id) || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    INSERT INTO public.civic_redemptions (
        user_id,
        district_id,
        certificate_id,
        item_title,
        status,
        nursery_location,
        redemption_code
    ) VALUES (
        p_user_id,
        p_district_id,
        p_certificate_id,
        p_item_title,
        'requested',
        p_nursery_location,
        v_code
    ) RETURNING id INTO v_redemption_id;

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'redemption_code', v_code,
        'status', 'requested',
        'message', 'Plant redemption voucher requested. Awaiting municipal nursery dispatch approval.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. Authoritative RPC: Adjudicate Plant Redemption (Staff / Nursery Officer)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjudicate_plant_redemption(
    p_redemption_id UUID,
    p_reviewer_id TEXT,
    p_decision TEXT, -- 'approved' | 'redeemed' | 'cancelled'
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_record RECORD;
BEGIN
    IF p_decision NOT IN ('approved', 'redeemed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid decision. Must be approved, redeemed, or cancelled.';
    END IF;

    SELECT * INTO v_record FROM public.civic_redemptions WHERE id = p_redemption_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Redemption record not found.';
    END IF;

    UPDATE public.civic_redemptions
    SET 
        status = p_decision,
        approved_by = p_reviewer_id,
        approved_at = CASE WHEN p_decision = 'approved' THEN NOW() ELSE approved_at END,
        redeemed_at = CASE WHEN p_decision = 'redeemed' THEN NOW() ELSE redeemed_at END,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_redemption_id;

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', p_redemption_id,
        'status', p_decision,
        'adjudicated_by', p_reviewer_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT ALL ON public.civic_certificates TO authenticated, anon;
GRANT ALL ON public.civic_redemptions TO authenticated, anon;

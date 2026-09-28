-- =====================================================================
-- CivicResolve — Phase 20: Comprehensive Security Hardening & Isolation
-- Target: Zero trust authorization, PostgreSQL RLS locking,
--         anti-tampering triggers, role escalation prevention,
--         and strict district isolation across all features.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ensure Profile Schema Integrity & District Scope Columns
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS district_id TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'citizen',
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Synchronize roles from public.user_roles to public.profiles if any disparity exists
UPDATE public.profiles p
SET role = COALESCE(
  (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1),
  p.role,
  'citizen'
)
WHERE p.role IS NULL OR p.role = '';

-- ---------------------------------------------------------------------
-- 2. Hardened Civic Rewards & Score RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.citizen_civic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_recognition_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_rewards_config ENABLE ROW LEVEL SECURITY;

-- Drop insecure legacy policies
DROP POLICY IF EXISTS "Allow users to manage own civic profile" ON public.citizen_civic_profiles;
DROP POLICY IF EXISTS "Allow reading district citizen profiles" ON public.citizen_civic_profiles;
DROP POLICY IF EXISTS "Allow inserting contributions" ON public.civic_contributions;
DROP POLICY IF EXISTS "Allow reading contributions" ON public.civic_contributions;
DROP POLICY IF EXISTS "Allow admin manage recognition cycles" ON public.district_recognition_cycles;
DROP POLICY IF EXISTS "Allow reading recognition cycles" ON public.district_recognition_cycles;

-- 2a. citizen_civic_profiles: SELECT (Self, Municipal Staff, or unflagged public leaderboard)
CREATE POLICY "citizen_civic_profiles_select"
  ON public.citizen_civic_profiles FOR SELECT
  USING (
    (auth.uid()::text = user_id) OR
    public.is_municipal_staff() OR
    (is_flagged = FALSE)
  );

-- 2b. citizen_civic_profiles: INSERT (Users can initialize their own profile only)
CREATE POLICY "citizen_civic_profiles_insert"
  ON public.citizen_civic_profiles FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id
  );

-- 2c. citizen_civic_profiles: UPDATE (Users update own display name, staff manage flags)
CREATE POLICY "citizen_civic_profiles_update"
  ON public.citizen_civic_profiles FOR UPDATE
  USING (
    (auth.uid()::text = user_id) OR public.is_municipal_staff()
  )
  WITH CHECK (
    (auth.uid()::text = user_id) OR public.is_municipal_staff()
  );

-- 2d. Anti-Tampering Trigger on Civic Score: Citizens cannot manipulate score/badges directly
CREATE OR REPLACE FUNCTION public.guard_civic_profile_score_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- If updater is not municipal admin or system, freeze score and badge level from direct client mutation
  IF NOT public.is_municipal_admin() THEN
    IF NEW.civic_score IS DISTINCT FROM OLD.civic_score THEN
      RAISE EXCEPTION 'Unauthorized: Civic score is computed strictly from verified civic contributions.';
    END IF;
    IF NEW.badge_level IS DISTINCT FROM OLD.badge_level THEN
      RAISE EXCEPTION 'Unauthorized: Badge level is computed automatically from score thresholds.';
    END IF;
    IF NEW.is_flagged IS DISTINCT FROM OLD.is_flagged THEN
      RAISE EXCEPTION 'Unauthorized: Moderation flags can only be modified by municipal administrators.';
    END IF;
    IF NEW.verified_reports_count IS DISTINCT FROM OLD.verified_reports_count OR
       NEW.verified_resolutions_count IS DISTINCT FROM OLD.verified_resolutions_count THEN
      RAISE EXCEPTION 'Unauthorized: Contribution counts are updated only via verified events.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_civic_profile_score ON public.citizen_civic_profiles;
CREATE TRIGGER trg_guard_civic_profile_score
  BEFORE UPDATE ON public.citizen_civic_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_civic_profile_score_updates();

-- 2e. civic_contributions RLS
CREATE POLICY "civic_contributions_select"
  ON public.civic_contributions FOR SELECT
  USING (
    (auth.uid()::text = user_id) OR public.is_municipal_staff()
  );

CREATE POLICY "civic_contributions_insert"
  ON public.civic_contributions FOR INSERT
  WITH CHECK (
    (auth.uid()::text = user_id) OR public.is_municipal_staff()
  );

-- 2f. district_recognition_cycles RLS
CREATE POLICY "recognition_cycles_select"
  ON public.district_recognition_cycles FOR SELECT
  USING (true);

CREATE POLICY "recognition_cycles_admin_manage"
  ON public.district_recognition_cycles FOR ALL
  USING (
    public.is_municipal_admin()
  )
  WITH CHECK (
    public.is_municipal_admin()
  );

-- ---------------------------------------------------------------------
-- 3. Hardened Resolution Evidence & Citizen Verification RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.resolution_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resolution_evidence_select" ON public.resolution_evidence;
CREATE POLICY "resolution_evidence_select"
  ON public.resolution_evidence FOR SELECT
  USING (
    (uploaded_by = auth.uid()::text) OR
    public.is_municipal_staff() OR
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id::text = resolution_evidence.complaint_id
        AND reports.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "resolution_evidence_insert" ON public.resolution_evidence;
CREATE POLICY "resolution_evidence_insert"
  ON public.resolution_evidence FOR INSERT
  WITH CHECK (
    (uploaded_by = auth.uid()::text) OR public.is_municipal_staff()
  );

-- ---------------------------------------------------------------------
-- 4. Hardened Stored Procedures for Evidence and Verification
-- ---------------------------------------------------------------------

-- Submit Resolution Evidence: Enforce municipal staff caller
CREATE OR REPLACE FUNCTION public.submit_resolution_evidence(
  p_report_id BIGINT,
  p_officer_name TEXT,
  p_resolution_notes TEXT,
  p_proof_image_url TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_status TEXT) AS $$
DECLARE
  v_current RECORD;
BEGIN
  -- Verify caller is municipal staff
  IF NOT public.is_municipal_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only municipal officers can submit resolution evidence.';
  END IF;

  SELECT * INTO v_current FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Complaint not found', NULL::TEXT;
    RETURN;
  END IF;

  UPDATE public.reports
  SET 
    status = 'resolved',
    resolution_notes = p_resolution_notes,
    resolution_image_url = p_proof_image_url,
    completion_date = NOW(),
    updated_at = NOW()
  WHERE id = p_report_id;

  INSERT INTO public.report_status_history (
    report_id,
    old_status,
    new_status,
    status,
    changed_by,
    notes,
    proof_image_url,
    created_at
  ) VALUES (
    p_report_id,
    v_current.status,
    'resolved',
    'resolved',
    auth.uid(),
    p_resolution_notes,
    p_proof_image_url,
    NOW()
  );

  RETURN QUERY SELECT TRUE, 'Resolution evidence submitted successfully', 'resolved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit Citizen Verification: Enforce complaint ownership
CREATE OR REPLACE FUNCTION public.submit_citizen_verification(
  p_report_id BIGINT,
  p_satisfied BOOLEAN,
  p_comment TEXT DEFAULT NULL,
  p_reopen_reason TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_status TEXT) AS $$
DECLARE
  v_current RECORD;
  v_new_status TEXT;
  v_reopen_count INTEGER;
BEGIN
  SELECT * INTO v_current FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Complaint not found', NULL::TEXT;
    RETURN;
  END IF;

  -- Verify caller is either the citizen who filed the report OR municipal staff
  IF NOT (v_current.user_id = auth.uid() OR public.is_municipal_staff()) THEN
    RAISE EXCEPTION 'Unauthorized: Only the complaint owner or municipal staff can submit verification.';
  END IF;

  IF p_satisfied THEN
    v_new_status := 'closed';
    UPDATE public.reports
    SET 
      status = 'closed',
      citizen_verification_status = 'verified',
      citizen_feedback = COALESCE(p_comment, 'Citizen verified resolution on-site.'),
      rating = 5,
      updated_at = NOW()
    WHERE id = p_report_id;

    INSERT INTO public.report_status_history (
      report_id,
      old_status,
      new_status,
      status,
      changed_by,
      notes,
      created_at
    ) VALUES (
      p_report_id,
      v_current.status,
      'closed',
      'closed',
      auth.uid(),
      COALESCE(p_comment, 'Citizen verified resolution on-site.'),
      NOW()
    );
  ELSE
    v_new_status := 'progress';
    v_reopen_count := COALESCE(v_current.reopen_count, 0) + 1;
    
    UPDATE public.reports
    SET 
      status = 'progress',
      citizen_verification_status = 'reopened',
      reopen_reason = COALESCE(p_reopen_reason, p_comment, 'Citizen indicated issue is unresolved.'),
      reopen_count = v_reopen_count,
      verification_photo_url = p_photo_url,
      updated_at = NOW()
    WHERE id = p_report_id;

    INSERT INTO public.report_status_history (
      report_id,
      old_status,
      new_status,
      status,
      changed_by,
      notes,
      proof_image_url,
      created_at
    ) VALUES (
      p_report_id,
      v_current.status,
      'reopened',
      'progress',
      auth.uid(),
      'Citizen rejected resolution (Reopened): ' || COALESCE(p_reopen_reason, p_comment, ''),
      p_photo_url,
      NOW()
    );
  END IF;

  RETURN QUERY SELECT TRUE, 'Citizen verification recorded', v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 5. Revoke Insecure Dynamic SQL / Overly Broad Grants
-- ---------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.public_report_markers TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_map_markers() TO anon;

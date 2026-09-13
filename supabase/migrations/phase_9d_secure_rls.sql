-- =====================================================================
-- CivicResolve — Phase 9D Migration: Secure PostgreSQL RLS & Authorization
-- Date: 2026-09-14
-- Target: Enforce real database-backed authorization via PostgreSQL RLS
-- =====================================================================

-- =====================================================================
-- 1. SECURE DATABASE-SIDE AUTHORIZATION HELPER FUNCTIONS
-- =====================================================================

-- 1a. Helper: Check if auth.uid() holds a specific canonical role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = required_role
  );
$$;

-- 1b. Helper: Check if auth.uid() is any municipal staff / administration role
CREATE OR REPLACE FUNCTION public.is_municipal_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('officer', 'dept_admin', 'municipal_admin', 'super_admin')
  );
$$;

-- 1c. Helper: Check if auth.uid() is municipal administrator or super admin
CREATE OR REPLACE FUNCTION public.is_municipal_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('municipal_admin', 'super_admin')
  );
$$;

-- 1d. Restrict function execution: Revoke from public, grant to authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_municipal_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_municipal_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_municipal_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_municipal_admin() TO authenticated;

-- =====================================================================
-- 2. SAFE PUBLIC MAP PROJECTION & RPC (ZERO CITIZEN PII)
-- =====================================================================

-- 2a. Secure view for public proximity & live map markers (excludes all PII)
CREATE OR REPLACE VIEW public.public_report_markers AS
SELECT
  id,
  category,
  status,
  priority,
  latitude,
  longitude,
  created_at
FROM public.reports
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2b. Public RPC function for nearby complaint map markers
CREATE OR REPLACE FUNCTION public.get_public_map_markers()
RETURNS TABLE (
  id BIGINT,
  category TEXT,
  status TEXT,
  priority TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    r.id,
    r.category,
    r.status,
    r.priority,
    r.latitude,
    r.longitude,
    r.created_at
  FROM public.reports r
  WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL;
$$;

-- 2c. Grant public map view and RPC to anon and authenticated
GRANT SELECT ON public.public_report_markers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_map_markers() TO anon, authenticated;

-- =====================================================================
-- 3. ROW LEVEL SECURITY ON public.reports
-- =====================================================================

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3a. SELECT: Citizens read own reports; Municipal staff read operational reports
DROP POLICY IF EXISTS "reports_select_policy" ON public.reports;
CREATE POLICY "reports_select_policy"
ON public.reports
FOR SELECT
USING (
  (auth.uid() = user_id) OR (public.is_municipal_staff())
);

-- 3b. INSERT: Authenticated users insert their own reports; Staff can submit operational reports
DROP POLICY IF EXISTS "reports_insert_policy" ON public.reports;
CREATE POLICY "reports_insert_policy"
ON public.reports
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) OR (public.is_municipal_staff())
);

-- 3c. UPDATE: Citizens can update own report (guarded by trigger below); Staff can update
DROP POLICY IF EXISTS "reports_update_policy" ON public.reports;
CREATE POLICY "reports_update_policy"
ON public.reports
FOR UPDATE
USING (
  (auth.uid() = user_id) OR (public.is_municipal_staff())
)
WITH CHECK (
  (auth.uid() = user_id) OR (public.is_municipal_staff())
);

-- 3d. DELETE: Only Municipal Admins or Super Admins can delete reports
DROP POLICY IF EXISTS "reports_delete_policy" ON public.reports;
CREATE POLICY "reports_delete_policy"
ON public.reports
FOR DELETE
USING (
  public.is_municipal_admin()
);

-- =====================================================================
-- 4. CITIZEN UPDATE GUARD TRIGGER (ANTI-TAMPERING)
-- Enforces that citizens cannot modify status, priority, or officer assignments
-- =====================================================================

CREATE OR REPLACE FUNCTION public.guard_citizen_report_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- If updater is a citizen (not municipal staff), prevent tampering with administrative and core complaint columns
  IF NOT public.is_municipal_staff() THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: Citizens cannot modify complaint status.';
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      RAISE EXCEPTION 'Unauthorized: Citizens cannot modify complaint priority.';
    END IF;
    IF NEW.assigned_officer_id IS DISTINCT FROM OLD.assigned_officer_id OR
       NEW.assigned_officer_name IS DISTINCT FROM OLD.assigned_officer_name THEN
      RAISE EXCEPTION 'Unauthorized: Citizens cannot modify officer assignments.';
    END IF;
    IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      RAISE EXCEPTION 'Unauthorized: Citizens cannot modify administrative notes.';
    END IF;
    IF NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.category IS DISTINCT FROM OLD.category OR
       NEW.location IS DISTINCT FROM OLD.location OR
       NEW.latitude IS DISTINCT FROM OLD.latitude OR
       NEW.longitude IS DISTINCT FROM OLD.longitude THEN
      RAISE EXCEPTION 'Unauthorized: Complaint content and coordinates are immutable after submission.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_citizen_report_updates ON public.reports;
CREATE TRIGGER trg_guard_citizen_report_updates
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_citizen_report_updates();

-- =====================================================================
-- 5. ROW LEVEL SECURITY ON public.profiles
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5a. SELECT: Users view own profile; Staff view operational profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR (public.is_municipal_staff())
);

-- 5b. INSERT: Users insert own profile; Super admin can provision
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK (
  (auth.uid() = id) OR (public.has_role('super_admin'))
);

-- 5c. UPDATE: Users update own profile; Super admin can manage
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
USING (
  (auth.uid() = id) OR (public.has_role('super_admin'))
)
WITH CHECK (
  (auth.uid() = id) OR (public.has_role('super_admin'))
);

-- 5d. DELETE: Super admin only
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
USING (
  public.has_role('super_admin')
);

-- =====================================================================
-- 6. ROW LEVEL SECURITY ON public.user_roles (HIGHLY RESTRICTED)
-- =====================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6a. SELECT: Users view own role; Municipal admins view roles for governance
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy"
ON public.user_roles
FOR SELECT
USING (
  (auth.uid() = user_id) OR (public.is_municipal_admin())
);

-- 6b. INSERT: Super admin only (or trigger during signup)
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
CREATE POLICY "user_roles_insert_policy"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role('super_admin')
);

-- 6c. UPDATE: Super admin only
DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
CREATE POLICY "user_roles_update_policy"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role('super_admin')
)
WITH CHECK (
  public.has_role('super_admin')
);

-- 6d. DELETE: Super admin only
DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;
CREATE POLICY "user_roles_delete_policy"
ON public.user_roles
FOR DELETE
USING (
  public.has_role('super_admin')
);

-- =====================================================================
-- 7. ROW LEVEL SECURITY ON public.report_status_history
-- =====================================================================

ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;

-- 7a. SELECT: Citizens view history for own reports; Staff view all operational history
DROP POLICY IF EXISTS "status_history_select_policy" ON public.report_status_history;
CREATE POLICY "status_history_select_policy"
ON public.report_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reports
    WHERE reports.id = report_status_history.report_id
      AND reports.user_id = auth.uid()
  ) OR (public.is_municipal_staff())
);

-- 7b. INSERT: Only municipal staff can record official status transitions
DROP POLICY IF EXISTS "status_history_insert_policy" ON public.report_status_history;
CREATE POLICY "status_history_insert_policy"
ON public.report_status_history
FOR INSERT
WITH CHECK (
  public.is_municipal_staff() AND (changed_by = auth.uid())
);

-- =====================================================================
-- 8. ROW LEVEL SECURITY ON public.admin_notes (IF TABLE EXISTS)
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notes') THEN
    EXECUTE 'ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "admin_notes_staff_all" ON public.admin_notes';
    EXECUTE 'CREATE POLICY "admin_notes_staff_all" ON public.admin_notes FOR ALL USING (public.is_municipal_staff()) WITH CHECK (public.is_municipal_staff())';
  END IF;
END $$;

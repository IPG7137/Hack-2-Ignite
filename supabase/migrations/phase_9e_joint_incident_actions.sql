-- =====================================================================
-- CivicResolve — Phase 9E Migration: Potential Incident Joint Actions
-- Date: 2026-09-16
-- Target: Operationalize 3D Potential Incidents into Coordinated Joint Actions
-- =====================================================================

-- =====================================================================
-- 1. INCIDENT CLUSTERS TABLE (Authoritative relationship container)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.incident_clusters (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'potential' 
    CHECK (status IN ('potential', 'acknowledged', 'action_created', 'in_progress', 'resolved', 'verified')),
  confidence_score NUMERIC(5, 2) DEFAULT 0.0,
  explainable_reasons JSONB DEFAULT '[]'::jsonb,
  center_latitude DECIMAL(10, 8),
  center_longitude DECIMAL(11, 8),
  affected_radius_meters NUMERIC(10, 2) DEFAULT 500.0,
  assigned_department TEXT,
  assigned_officer TEXT,
  assigned_officer_id TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  action_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 2. INCIDENT CLUSTER REPORTS JUNCTION TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.incident_cluster_reports (
  id BIGSERIAL PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES public.incident_clusters(id) ON DELETE CASCADE,
  report_id BIGINT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_incident_report UNIQUE (incident_id, report_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_cluster_reports_inc ON public.incident_cluster_reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_cluster_reports_rep ON public.incident_cluster_reports(report_id);

-- =====================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.incident_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_cluster_reports ENABLE ROW LEVEL SECURITY;

-- 3a. SELECT: Municipal staff and authenticated users can view non-confidential clusters
DROP POLICY IF EXISTS "incident_clusters_select_policy" ON public.incident_clusters;
CREATE POLICY "incident_clusters_select_policy"
ON public.incident_clusters
FOR SELECT
USING (
  public.is_municipal_staff() OR auth.role() = 'authenticated'
);

-- 3b. INSERT/UPDATE/DELETE: Strictly municipal staff / administrators
DROP POLICY IF EXISTS "incident_clusters_modify_policy" ON public.incident_clusters;
CREATE POLICY "incident_clusters_modify_policy"
ON public.incident_clusters
FOR ALL
USING (
  public.is_municipal_staff()
)
WITH CHECK (
  public.is_municipal_staff()
);

-- 3c. Junction table SELECT & MODIFY policies
DROP POLICY IF EXISTS "incident_cluster_reports_select_policy" ON public.incident_cluster_reports;
CREATE POLICY "incident_cluster_reports_select_policy"
ON public.incident_cluster_reports
FOR SELECT
USING (
  public.is_municipal_staff() OR auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "incident_cluster_reports_modify_policy" ON public.incident_cluster_reports;
CREATE POLICY "incident_cluster_reports_modify_policy"
ON public.incident_cluster_reports
FOR ALL
USING (
  public.is_municipal_staff()
)
WITH CHECK (
  public.is_municipal_staff()
);

-- =====================================================================
-- 4. ATOMIC RPC FUNCTION: CREATE JOINT INCIDENT ACTION
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_joint_incident_action(
  p_incident_id TEXT,
  p_title TEXT,
  p_summary TEXT,
  p_category TEXT,
  p_report_ids BIGINT[],
  p_assigned_department TEXT,
  p_assigned_officer TEXT,
  p_action_notes TEXT DEFAULT NULL,
  p_confidence_score NUMERIC DEFAULT 85.0,
  p_center_lat DECIMAL DEFAULT NULL,
  p_center_lng DECIMAL DEFAULT NULL,
  p_radius_meters NUMERIC DEFAULT 500.0,
  p_reasons JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_report_id BIGINT;
  v_updated_count INT := 0;
  v_timestamp TIMESTAMPTZ := NOW();
  v_note_text TEXT;
BEGIN
  -- 1. Authorization check: must be verified municipal staff
  IF NOT public.is_municipal_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only verified municipal staff can create joint operational actions.';
  END IF;

  v_user_id := auth.uid();
  
  -- Fetch user display name
  SELECT COALESCE(full_name, email, 'Municipal Officer')
  INTO v_user_name
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_name IS NULL THEN
    v_user_name := 'Executive Duty Officer';
  END IF;

  -- 2. Upsert Incident Cluster Record
  INSERT INTO public.incident_clusters (
    id,
    title,
    summary,
    category,
    status,
    confidence_score,
    explainable_reasons,
    center_latitude,
    center_longitude,
    affected_radius_meters,
    assigned_department,
    assigned_officer,
    created_by,
    created_by_name,
    action_notes,
    created_at,
    updated_at
  )
  VALUES (
    p_incident_id,
    p_title,
    p_summary,
    p_category,
    'action_created',
    p_confidence_score,
    p_reasons,
    p_center_lat,
    p_center_lng,
    p_radius_meters,
    p_assigned_department,
    p_assigned_officer,
    v_user_id,
    v_user_name,
    p_action_notes,
    v_timestamp,
    v_timestamp
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'action_created',
    assigned_department = EXCLUDED.assigned_department,
    assigned_officer = EXCLUDED.assigned_officer,
    action_notes = EXCLUDED.action_notes,
    updated_at = v_timestamp;

  -- 3. Link reports in junction table and batch update report statuses
  FOREACH v_report_id IN ARRAY p_report_ids
  LOOP
    -- Insert junction link (ignoring duplicates)
    INSERT INTO public.incident_cluster_reports (incident_id, report_id, created_at)
    VALUES (p_incident_id, v_report_id, v_timestamp)
    ON CONFLICT (incident_id, report_id) DO NOTHING;

    -- Format audit note
    v_note_text := format(
      '[%s - %s]: Coordinated Joint Action created (#%s). Assigned to %s (%s). Notes: %s',
      to_char(v_timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      v_user_name,
      p_incident_id,
      p_assigned_officer,
      p_assigned_department,
      COALESCE(p_action_notes, 'Coordinated work package dispatch.')
    );

    -- Update report state (advancing under_review/submitted to assigned)
    UPDATE public.reports
    SET
      status = CASE 
        WHEN status IN ('submitted', 'under_review') THEN 'assigned'
        ELSE status
      END,
      assigned_to = p_assigned_officer,
      admin_notes = CASE
        WHEN admin_notes IS NOT NULL AND length(trim(admin_notes)) > 0
        THEN admin_notes || E'\n' || v_note_text
        ELSE v_note_text
      END,
      updated_at = v_timestamp
    WHERE id = v_report_id;

    -- Record status history
    INSERT INTO public.report_status_history (
      report_id,
      status,
      new_status,
      changed_by,
      notes,
      created_at
    )
    VALUES (
      v_report_id,
      'assigned',
      'assigned',
      v_user_id,
      format('Joint Action #%s: Assigned to %s (%s)', p_incident_id, p_assigned_officer, p_assigned_department),
      v_timestamp
    );

    v_updated_count := v_updated_count + 1;
  END LOOP;

  -- 4. Record audit entry in admin_actions
  INSERT INTO public.admin_actions (
    admin_id,
    action_type,
    target_type,
    target_id,
    details,
    created_at
  )
  VALUES (
    v_user_id,
    'CREATE_JOINT_INCIDENT_ACTION',
    'incident_cluster',
    p_incident_id,
    jsonb_build_object(
      'incident_id', p_incident_id,
      'title', p_title,
      'category', p_category,
      'assigned_department', p_assigned_department,
      'assigned_officer', p_assigned_officer,
      'reports_count', v_updated_count,
      'report_ids', p_report_ids
    ),
    v_timestamp
  );

  RETURN jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'status', 'action_created',
    'assigned_department', p_assigned_department,
    'assigned_officer', p_assigned_officer,
    'reports_updated', v_updated_count,
    'created_at', v_timestamp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_joint_incident_action TO authenticated;

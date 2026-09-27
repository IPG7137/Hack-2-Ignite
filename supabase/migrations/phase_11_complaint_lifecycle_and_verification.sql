-- =====================================================================
-- PHASE 11: COMPLAINT LIFECYCLE, RESOLUTION EVIDENCE & CITIZEN VERIFICATION
-- CIVICRESOLVE — GOVERNMENT OF MAHARASHTRA MUNICIPAL OPERATIONS
-- =====================================================================

-- 1. Ensure required lifecycle columns exist on public.reports
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolution_image_url TEXT,
  ADD COLUMN IF NOT EXISTS completion_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS citizen_verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reopen_reason TEXT,
  ADD COLUMN IF NOT EXISTS reopen_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_photo_url TEXT;

-- 2. Audit Trail & Lifecycle Events Table
CREATE TABLE IF NOT EXISTS public.complaint_events (
  id BIGSERIAL PRIMARY KEY,
  complaint_id BIGINT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id),
  actor_name TEXT NOT NULL DEFAULT 'System',
  event_type TEXT NOT NULL, -- e.g. 'submitted', 'assigned', 'in_progress', 'resolution_submitted', 'citizen_verified', 'reopened', 'closed'
  previous_status TEXT,
  new_status TEXT,
  note TEXT,
  proof_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_events_complaint_id ON public.complaint_events(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_events_created_at ON public.complaint_events(created_at DESC);

-- 3. Trigger to mirror report_status_history into complaint_events
CREATE OR REPLACE FUNCTION public.log_complaint_lifecycle_event()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.complaint_events (
      complaint_id,
      actor_name,
      event_type,
      new_status,
      note,
      created_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.reporter_name, 'Citizen User'),
      'complaint_submitted',
      NEW.status,
      'Grievance registered in municipal intake queue.',
      NEW.created_at
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.complaint_events (
      complaint_id,
      actor_name,
      event_type,
      previous_status,
      new_status,
      note,
      proof_image_url,
      created_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.assigned_officer_name, 'Municipal Command'),
      CASE 
        WHEN NEW.status = 'closed' THEN 'complaint_closed'
        WHEN NEW.status = 'resolved' THEN 'resolution_submitted'
        WHEN NEW.citizen_verification_status = 'reopened' THEN 'complaint_reopened'
        ELSE 'status_changed'
      END,
      OLD.status,
      NEW.status,
      COALESCE(NEW.resolution_notes, NEW.admin_notes, 'Status transitioned to ' || NEW.status),
      NEW.resolution_image_url,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_complaint_lifecycle_event ON public.reports;
CREATE TRIGGER trigger_complaint_lifecycle_event
  AFTER INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.log_complaint_lifecycle_event();

-- 4. Atomic Function: Submit Resolution Evidence
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
    p_officer_name,
    p_resolution_notes,
    p_proof_image_url,
    NOW()
  );

  RETURN QUERY SELECT TRUE, 'Resolution evidence submitted successfully', 'resolved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atomic Function: Submit Citizen Verification
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

  IF p_satisfied THEN
    v_new_status := 'closed';
    UPDATE public.reports
    SET 
      status = 'closed',
      citizen_verification_status = 'verified',
      citizen_feedback = COALESCE(p_comment, 'Citizen verified resolution.'),
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
      COALESCE(v_current.reporter_name, 'Citizen'),
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
      COALESCE(v_current.reporter_name, 'Citizen'),
      'Citizen rejected resolution (Reopened): ' || COALESCE(p_reopen_reason, p_comment, ''),
      p_photo_url,
      NOW()
    );
  END IF;

  RETURN QUERY SELECT TRUE, 'Citizen verification recorded', v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable RLS on complaint_events
ALTER TABLE public.complaint_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read complaint events" ON public.complaint_events
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users insert events" ON public.complaint_events
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.complaint_events TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

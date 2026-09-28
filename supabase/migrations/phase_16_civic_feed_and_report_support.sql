-- =====================================================================
-- CivicResolve — Phase 16 Migration: Local Civic Feed & Report Support
-- Date: 2026-09-28
-- Target: Community issue discovery, duplicate-prevention support voting,
--         and server-derived public impact signals (Zero PII Exposure)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create report_supports table
CREATE TABLE IF NOT EXISTS public.report_supports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id BIGINT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_report_user_support UNIQUE (report_id, user_id)
);

-- 2. Indexes for fast aggregation and user-specific lookups
CREATE INDEX IF NOT EXISTS idx_report_supports_report_id ON public.report_supports(report_id);
CREATE INDEX IF NOT EXISTS idx_report_supports_user_id ON public.report_supports(user_id);
CREATE INDEX IF NOT EXISTS idx_report_supports_composite ON public.report_supports(report_id, user_id);

-- 3. Enable RLS
ALTER TABLE public.report_supports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Anyone can view support records/counts (no PII in this table)
DROP POLICY IF EXISTS "Public can view report supports" ON public.report_supports;
CREATE POLICY "Public can view report supports"
ON public.report_supports
FOR SELECT
USING (true);

-- Authenticated users can only insert their own support
DROP POLICY IF EXISTS "Users can insert own support" ON public.report_supports;
CREATE POLICY "Users can insert own support"
ON public.report_supports
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid()::text OR 
    user_id = current_setting('request.jwt.claim.sub', true)
  )
);

-- Users can only delete their own support (unsupport)
DROP POLICY IF EXISTS "Users can delete own support" ON public.report_supports;
CREATE POLICY "Users can delete own support"
ON public.report_supports
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid()::text OR 
    user_id = current_setting('request.jwt.claim.sub', true)
  )
);

-- 5. Atomic RPC: toggle_report_support
-- Safely inserts or deletes a user's support and returns the authoritative count
CREATE OR REPLACE FUNCTION public.toggle_report_support(
  p_report_id BIGINT,
  p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_exists BOOLEAN;
  v_now_supported BOOLEAN;
  v_total_count BIGINT;
BEGIN
  IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
    RAISE EXCEPTION 'User ID is required to support a report';
  END IF;

  -- Check if already supported
  SELECT EXISTS(
    SELECT 1 FROM public.report_supports 
    WHERE report_id = p_report_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Unsupport
    DELETE FROM public.report_supports 
    WHERE report_id = p_report_id AND user_id = p_user_id;
    v_now_supported := false;
  ELSE
    -- Support
    INSERT INTO public.report_supports (report_id, user_id, created_at)
    VALUES (p_report_id, p_user_id, NOW())
    ON CONFLICT (report_id, user_id) DO NOTHING;
    v_now_supported := true;
  END IF;

  -- Authoritative count
  SELECT COUNT(*) INTO v_total_count
  FROM public.report_supports
  WHERE report_id = p_report_id;

  RETURN jsonb_build_object(
    'supported', v_now_supported,
    'total_supports', v_total_count,
    'report_id', p_report_id
  );
END;
$$;

-- 6. RPC: get_civic_feed
-- Returns sanitized public feed with support counts and user status
CREATE OR REPLACE FUNCTION public.get_civic_feed(
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_km DOUBLE PRECISION DEFAULT 25.0,
  p_category TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  description TEXT,
  category TEXT,
  status TEXT,
  priority TEXT,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ,
  image_urls TEXT,
  support_count BIGINT,
  user_has_supported BOOLEAN,
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    r.id,
    r.title,
    r.description,
    r.category,
    r.status,
    r.priority,
    r.location,
    r.latitude,
    r.longitude,
    r.created_at,
    CASE 
      WHEN r.image_urls IS NOT NULL THEN r.image_urls::text 
      ELSE NULL 
    END AS image_urls,
    COALESCE(s.cnt, 0) AS support_count,
    CASE 
      WHEN p_user_id IS NOT NULL AND us.user_id IS NOT NULL THEN true 
      ELSE false 
    END AS user_has_supported,
    CASE 
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL THEN
        (6371000 * acos(
          least(1.0, greatest(-1.0, 
            cos(radians(p_lat)) * cos(radians(r.latitude)) * 
            cos(radians(r.longitude) - radians(p_lng)) + 
            sin(radians(p_lat)) * sin(radians(r.latitude))
          ))
        ))
      ELSE NULL
    END AS distance_meters
  FROM public.reports r
  LEFT JOIN (
    SELECT report_id, COUNT(*) AS cnt 
    FROM public.report_supports 
    GROUP BY report_id
  ) s ON s.report_id = r.id
  LEFT JOIN (
    SELECT report_id, user_id 
    FROM public.report_supports 
    WHERE user_id = p_user_id
  ) us ON us.report_id = r.id
  WHERE (p_category IS NULL OR p_category = 'All' OR r.category ILIKE '%' || p_category || '%')
    AND (
      p_lat IS NULL OR p_lng IS NULL OR r.latitude IS NULL OR r.longitude IS NULL OR
      (6371000 * acos(
        least(1.0, greatest(-1.0, 
          cos(radians(p_lat)) * cos(radians(r.latitude)) * 
          cos(radians(r.longitude) - radians(p_lng)) + 
          sin(radians(p_lat)) * sin(radians(r.latitude))
        ))
      )) <= (p_radius_km * 1000)
    )
  ORDER BY 
    COALESCE(s.cnt, 0) DESC,
    r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

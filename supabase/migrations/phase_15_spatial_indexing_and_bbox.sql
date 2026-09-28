-- =====================================================================
-- CivicResolve — Phase 15 Migration: PostGIS Spatial Indexing & BBox RPC
-- Date: 2026-09-28
-- Target: High-reliability spatial queries, GIST index, and PII-safe public map RPC
-- Compatible with Phases 10 through 14
-- =====================================================================

-- 1. Enable PostGIS extension if available
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add safe generated PostGIS geometry column to public.reports
-- Automatically calculates ST_Point(longitude, latitude) in WGS84 (SRID 4326)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'reports' 
      AND column_name = 'geom'
  ) THEN
    ALTER TABLE public.reports 
    ADD COLUMN geom geometry(Point, 4326) 
    GENERATED ALWAYS AS (
      CASE 
        WHEN latitude IS NOT NULL 
          AND longitude IS NOT NULL 
          AND (latitude != 0 OR longitude != 0)
          AND latitude >= -90 AND latitude <= 90
          AND longitude >= -180 AND longitude <= 180
        THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
        ELSE NULL 
      END
    ) STORED;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- In environments where PostGIS generated columns are restricted, proceed safely
    RAISE NOTICE 'Notice: PostGIS column creation skipped or already present: %', SQLERRM;
END $$;

-- 3. Create high-performance GIST index for spatial queries
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_reports_geom ON public.reports USING GIST (geom);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Notice: GIST index creation skipped: %', SQLERRM;
END $$;

-- 4. Secure Public Map Projection View (Zero Citizen PII)
CREATE OR REPLACE VIEW public.public_report_markers AS
SELECT
  id,
  title,
  category,
  status,
  priority,
  location,
  latitude,
  longitude,
  created_at
FROM public.reports
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
  AND (latitude != 0 OR longitude != 0)
  AND latitude >= -90 AND latitude <= 90
  AND longitude >= -180 AND longitude <= 180;

-- 5. Public RPC Function: get_public_map_markers()
CREATE OR REPLACE FUNCTION public.get_public_map_markers()
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  category TEXT,
  status TEXT,
  priority TEXT,
  location TEXT,
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
    r.title,
    r.category,
    r.status,
    r.priority,
    r.location,
    r.latitude,
    r.longitude,
    r.created_at
  FROM public.reports r
  WHERE r.latitude IS NOT NULL 
    AND r.longitude IS NOT NULL
    AND (r.latitude != 0 OR r.longitude != 0)
    AND r.latitude >= -90 AND r.latitude <= 90
    AND r.longitude >= -180 AND r.longitude <= 180;
$$;

-- 6. Public RPC Function: get_reports_in_bbox() for bounded viewport queries
CREATE OR REPLACE FUNCTION public.get_reports_in_bbox(
  min_lng DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  category TEXT,
  status TEXT,
  priority TEXT,
  location TEXT,
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
    r.title,
    r.category,
    r.status,
    r.priority,
    r.location,
    r.latitude,
    r.longitude,
    r.created_at
  FROM public.reports r
  WHERE r.latitude IS NOT NULL 
    AND r.longitude IS NOT NULL
    AND (r.latitude != 0 OR r.longitude != 0)
    AND r.latitude BETWEEN min_lat AND max_lat
    AND r.longitude BETWEEN min_lng AND max_lng;
$$;

-- 7. Grant Permissions
GRANT SELECT ON public.public_report_markers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_map_markers() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reports_in_bbox(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;

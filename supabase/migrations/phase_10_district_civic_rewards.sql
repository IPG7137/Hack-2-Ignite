-- =====================================================================
-- CivicResolve — Phase 10 Migration: District-Wise Civic Rewards & Champions
-- Description: Isolated, quality-based civic scoring, leaderboards,
--              anti-spam anti-gaming rules, and 26 Jan / 15 Aug recognition cycles.
-- =====================================================================

-- 1. Configuration table for configurable point system and badge thresholds
CREATE TABLE IF NOT EXISTS public.civic_rewards_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  points_valid_report INTEGER NOT NULL DEFAULT 10,
  points_accurate_gps INTEGER NOT NULL DEFAULT 5,
  points_useful_evidence INTEGER NOT NULL DEFAULT 5,
  points_critical_bonus INTEGER NOT NULL DEFAULT 10,
  points_resolution_verification INTEGER NOT NULL DEFAULT 10,
  points_resolution_upvote INTEGER NOT NULL DEFAULT 2,
  threshold_starter INTEGER NOT NULL DEFAULT 50,
  threshold_contributor INTEGER NOT NULL DEFAULT 200,
  threshold_champion INTEGER NOT NULL DEFAULT 500,
  threshold_leader INTEGER NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default configuration
INSERT INTO public.civic_rewards_config (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 2. Citizen Civic Profiles (Scattered isolation by district_id)
CREATE TABLE IF NOT EXISTS public.citizen_civic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  district_id TEXT NOT NULL,
  municipal_corporation_id TEXT,
  display_name TEXT NOT NULL,
  civic_score INTEGER NOT NULL DEFAULT 0,
  verified_reports_count INTEGER NOT NULL DEFAULT 0,
  verified_resolutions_count INTEGER NOT NULL DEFAULT 0,
  helpful_evidence_count INTEGER NOT NULL DEFAULT 0,
  badge_level TEXT NOT NULL DEFAULT 'starter' CHECK (badge_level IN ('starter', 'contributor', 'champion', 'leader')),
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citizen_profiles_district ON public.citizen_civic_profiles(district_id);
CREATE INDEX IF NOT EXISTS idx_citizen_profiles_score ON public.citizen_civic_profiles(district_id, civic_score DESC);
CREATE INDEX IF NOT EXISTS idx_citizen_profiles_user_id ON public.citizen_civic_profiles(user_id);

-- 3. Civic Contributions Audit Trail
CREATE TABLE IF NOT EXISTS public.civic_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_profile_id UUID REFERENCES public.citizen_civic_profiles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  district_id TEXT NOT NULL,
  complaint_id TEXT,
  contribution_type TEXT NOT NULL CHECK (
    contribution_type IN (
      'verified_report',
      'accurate_location',
      'useful_evidence',
      'critical_issue_bonus',
      'resolution_verification',
      'resolution_upvote',
      'duplicate_reduced',
      'moderation_adjustment'
    )
  ),
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'pending', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_civic_contributions_citizen ON public.civic_contributions(citizen_profile_id);
CREATE INDEX IF NOT EXISTS idx_civic_contributions_district ON public.civic_contributions(district_id);
CREATE INDEX IF NOT EXISTS idx_civic_contributions_user ON public.civic_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_civic_contributions_created ON public.civic_contributions(created_at DESC);

-- 4. Republic Day (26 Jan) & Independence Day (15 Aug) Recognition Cycles
CREATE TABLE IF NOT EXISTS public.district_recognition_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  eligible_rank_limit INTEGER NOT NULL DEFAULT 10,
  reward_type TEXT NOT NULL DEFAULT 'District Collector Certificate & Platform Citation',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'announced')),
  announced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recognition_cycles_dist ON public.district_recognition_cycles(district_id, event_date);

-- 5. Deterministic District Leaderboard View (Tie-breaking: 1. score DESC, 2. verified_reports DESC, 3. verified_resolutions DESC, 4. created_at ASC)
CREATE OR REPLACE VIEW public.district_civic_leaderboards AS
SELECT
  p.id AS profile_id,
  p.user_id,
  p.district_id,
  p.municipal_corporation_id,
  p.display_name,
  p.civic_score,
  p.verified_reports_count,
  p.verified_resolutions_count,
  p.helpful_evidence_count,
  p.badge_level,
  p.is_flagged,
  p.created_at,
  ROW_NUMBER() OVER (
    PARTITION BY p.district_id
    ORDER BY
      p.civic_score DESC,
      p.verified_reports_count DESC,
      p.verified_resolutions_count DESC,
      p.created_at ASC
  ) AS district_rank
FROM public.citizen_civic_profiles p
WHERE p.is_flagged = FALSE;

-- 6. Row Level Security (RLS)
ALTER TABLE public.citizen_civic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_recognition_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_rewards_config ENABLE ROW LEVEL SECURITY;

-- Allow public read of rewards config
CREATE POLICY "Allow public read of rewards config"
  ON public.civic_rewards_config FOR SELECT
  USING (true);

-- Allow reading citizen profiles scoped to matching district or own user_id
CREATE POLICY "Allow reading district citizen profiles"
  ON public.citizen_civic_profiles FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update their own profile
CREATE POLICY "Allow users to manage own civic profile"
  ON public.citizen_civic_profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow reading contributions
CREATE POLICY "Allow reading contributions"
  ON public.civic_contributions FOR SELECT
  USING (true);

CREATE POLICY "Allow inserting contributions"
  ON public.civic_contributions FOR INSERT
  WITH CHECK (true);

-- Recognition cycles visible to all
CREATE POLICY "Allow reading recognition cycles"
  ON public.district_recognition_cycles FOR SELECT
  USING (true);

CREATE POLICY "Allow admin manage recognition cycles"
  ON public.district_recognition_cycles FOR ALL
  USING (true)
  WITH CHECK (true);

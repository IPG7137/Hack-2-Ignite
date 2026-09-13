-- =====================================================================
-- CivicResolve — Phase 9C Migration: Profiles & Role Schema Integration
-- Date: 2026-09-14
-- Checkpoint: 187e706 (Additive & Backward-Compatible)
-- =====================================================================

-- 1. Create public.profiles table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  department_id TEXT,
  department_name TEXT,
  ward TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on email and active status for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 2. Create public.user_roles table (Canonical Role Vocabulary)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'officer', 'dept_admin', 'municipal_admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- Index on user_id and role
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 3. Automatic Profile & Default Role Trigger for new Supabase Auth signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_role TEXT;
  v_dept_name TEXT;
  v_ward TEXT;
BEGIN
  -- Extract metadata safely if present
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_phone := NEW.raw_user_meta_data->>'phone_number';
  v_dept_name := NEW.raw_user_meta_data->>'department_name';
  v_ward := NEW.raw_user_meta_data->>'ward';

  -- Default role is strictly 'citizen' for all public self-signups to prevent privilege escalation
  v_role := 'citizen';

  -- 3a. Insert minimal profile
  INSERT INTO public.profiles (id, email, full_name, phone, department_name, ward, is_active)
  VALUES (NEW.id, NEW.email, v_full_name, v_phone, v_dept_name, v_ward, TRUE)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      updated_at = NOW();

  -- 3b. Insert default citizen role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users if not already present
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Safe Idempotent Migration Helper: Map existing auth.users to public.profiles & user_roles
-- Note: Only maps real existing auth.users rows without fabricating IDs or credentials
DO $$
BEGIN
  -- Populate profiles for existing auth.users if not present
  INSERT INTO public.profiles (id, email, full_name, is_active, created_at, updated_at)
  SELECT 
    u.id, 
    u.email, 
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    TRUE,
    u.created_at,
    NOW()
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  ON CONFLICT (id) DO NOTHING;

  -- Populate default citizen role for existing auth.users without role
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'citizen'
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

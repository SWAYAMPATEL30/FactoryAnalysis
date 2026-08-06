-- ============================================================================
-- Migration 002: Auth Profiles & Duplicate Checking
-- Adds email confirmation tracking, unique constraint on email,
-- and secure RPC function for checking email existence.
-- ============================================================================

-- 1. Schema Updates
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- 2. Trigger Updates
-- Overwrite handle_new_user to correctly track email and email_confirmed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_name  TEXT;
  org_slug   TEXT;
BEGIN
  -- Extract name from metadata or email
  user_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create profile (INSERT ON CONFLICT to gracefully handle race conditions)
  INSERT INTO profiles (id, full_name, email, email_confirmed)
  VALUES (NEW.id, user_name, lower(NEW.email), NEW.email_confirmed_at IS NOT NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Generate a unique slug from email prefix + random suffix
  org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'gi'))
              || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create default organization
  INSERT INTO organizations (id, name, slug, owner_id)
  VALUES (gen_random_uuid(), user_name || '''s Factory', org_slug, NEW.id)
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Create zero-credit wallet
  INSERT INTO credit_wallets (organization_id, available_credits, reserved_credits)
  VALUES (new_org_id, 0, 0);

  RETURN NEW;
END;
$$;

-- Trigger for UPDATE to sync email_confirmed_at -> email_confirmed
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET email_confirmed = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 3. RPC Function for Duplicate Checking (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE email = lower(trim(p_email))
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

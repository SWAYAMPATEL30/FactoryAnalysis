-- ============================================================================
-- Migration 001: SaaS Core Schema
-- Factory Video Analysis — Multi-Tenant Foundation
--
-- Creates all tables, indexes, triggers, helper functions, and RLS policies
-- for a multi-tenant SaaS application built on Supabase (PostgreSQL + Auth).
--
-- Run with:  supabase db push
-- Rollback:  see supabase/README.md
-- ============================================================================

-- ============================================================================
-- 0. Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Custom ENUM types
-- ============================================================================
CREATE TYPE org_role          AS ENUM ('owner', 'admin', 'engineer', 'viewer');
CREATE TYPE subscription_status AS ENUM ('inactive', 'active', 'expired', 'cancelled');
CREATE TYPE credit_tx_type    AS ENUM ('purchase', 'reservation', 'charge', 'refund', 'adjustment');
CREATE TYPE payment_status    AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE workstation_status AS ENUM ('active', 'archived');
CREATE TYPE job_status        AS ENUM ('queued', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE job_phase         AS ENUM (
  'queued', 'preprocessing', 'uploading', 'segmenting',
  'classifying', 'finalizing', 'completed', 'failed'
);
CREATE TYPE flag_status       AS ENUM ('pending', 'resolved', 'dismissed');
CREATE TYPE consensus_decision AS ENUM ('accepted', 'review_required', 'rejected');
CREATE TYPE analysis_run_status AS ENUM ('queued', 'processing', 'completed', 'failed');

-- ============================================================================
-- 2. Tables
-- ============================================================================

-- 1. profiles -----------------------------------------------------------
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  avatar_url TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. organizations ------------------------------------------------------
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. organization_members -----------------------------------------------
CREATE TABLE organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'viewer',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

-- 4. subscriptions ------------------------------------------------------
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_code       TEXT NOT NULL,
  status          subscription_status NOT NULL DEFAULT 'inactive',
  test_mode       BOOLEAN NOT NULL DEFAULT false,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  credits_granted INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. credit_wallets -----------------------------------------------------
CREATE TABLE credit_wallets (
  organization_id  UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  available_credits INTEGER NOT NULL DEFAULT 0,
  reserved_credits  INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credits_non_negative CHECK (available_credits >= 0),
  CONSTRAINT reserved_non_negative CHECK (reserved_credits >= 0)
);

-- 6. credit_transactions ------------------------------------------------
CREATE TABLE credit_transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id                 UUID,              -- FK added after video_jobs table
  payment_id             UUID,              -- FK added after dummy_payments table
  transaction_type       credit_tx_type NOT NULL,
  amount                 INTEGER NOT NULL,
  available_balance_after INTEGER NOT NULL,
  reserved_balance_after  INTEGER NOT NULL,
  idempotency_key        TEXT UNIQUE NOT NULL,
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. dummy_payments -----------------------------------------------------
CREATE TABLE dummy_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  package_code    TEXT NOT NULL,
  amount_cents    INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  credits         INTEGER NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now add deferred FK from credit_transactions to dummy_payments
ALTER TABLE credit_transactions
  ADD CONSTRAINT fk_credit_tx_payment
  FOREIGN KEY (payment_id) REFERENCES dummy_payments(id) ON DELETE SET NULL;

-- 8. workstations -------------------------------------------------------
CREATE TABLE workstations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  status          workstation_status NOT NULL DEFAULT 'active',
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

-- 9. video_jobs ---------------------------------------------------------
CREATE TABLE video_jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workstation_id       UUID NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  created_by           UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status               job_status NOT NULL DEFAULT 'queued',
  phase                job_phase NOT NULL DEFAULT 'queued',
  file_name            TEXT,
  mime_type            TEXT DEFAULT 'video/mp4',
  file_size_bytes      BIGINT,
  duration_sec         DOUBLE PRECISION,
  activity_description TEXT NOT NULL DEFAULT '',
  station_no           TEXT DEFAULT '',
  activity_no          TEXT DEFAULT '',
  original_storage_key TEXT,
  blurred_storage_key  TEXT,
  report_storage_key   TEXT,
  json_storage_key     TEXT,
  credit_estimate      INTEGER DEFAULT 0,
  credits_reserved     INTEGER DEFAULT 0,
  credits_charged      INTEGER DEFAULT 0,
  model_name           TEXT,
  prompt_version       TEXT,
  error_message        TEXT,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now add deferred FK from credit_transactions to video_jobs
ALTER TABLE credit_transactions
  ADD CONSTRAINT fk_credit_tx_job
  FOREIGN KEY (job_id) REFERENCES video_jobs(id) ON DELETE SET NULL;

-- 10. video_segments ----------------------------------------------------
CREATE TABLE video_segments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workstation_id       UUID NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  job_id               UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  segment_index        INTEGER NOT NULL,
  t_start_sec          DOUBLE PRECISION NOT NULL,
  t_end_sec            DOUBLE PRECISION NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  human_movement_state TEXT DEFAULT 'MOVE',
  machine_state        TEXT DEFAULT 'IDLE',
  confidence           DOUBLE PRECISION,
  model_version        TEXT,
  prompt_version       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. most_rows ---------------------------------------------------------
-- Mirrors backend/app/models/schemas.py MostRow exactly, plus tenant keys.
CREATE TABLE most_rows (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workstation_id                  UUID NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  job_id                          UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  segment_id                      UUID REFERENCES video_segments(id) ON DELETE SET NULL,
  -- MostRow core fields
  s_no                            INTEGER NOT NULL,
  station_no                      TEXT DEFAULT '',
  activity_no                     TEXT DEFAULT '',
  activity_description            TEXT NOT NULL DEFAULT '',
  data_card                       TEXT NOT NULL,
  param_values                    INTEGER[] NOT NULL DEFAULT '{}',
  most_code                       TEXT NOT NULL DEFAULT '',
  freq                            INTEGER NOT NULL DEFAULT 1,
  tmu                             DOUBLE PRECISION NOT NULL DEFAULT 0,
  elemental_description           TEXT NOT NULL DEFAULT '',
  operator                        INTEGER NOT NULL DEFAULT 1,
  muda_ref                        INTEGER NOT NULL DEFAULT 0,
  total_time_sec                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  online_offline_mode             TEXT NOT NULL DEFAULT 'ONLINE',
  va_sec                          DOUBLE PRECISION NOT NULL DEFAULT 0,
  nvan_sec                        DOUBLE PRECISION NOT NULL DEFAULT 0,
  sva_sec                         DOUBLE PRECISION NOT NULL DEFAULT 0,
  nva_sec                         DOUBLE PRECISION NOT NULL DEFAULT 0,
  category                        TEXT NOT NULL DEFAULT '',
  -- Traceability fields
  source_video_uri                TEXT DEFAULT '',
  t_start_sec                     DOUBLE PRECISION NOT NULL DEFAULT 0,
  t_end_sec                       DOUBLE PRECISION NOT NULL DEFAULT 0,
  segment_model_version           TEXT DEFAULT '',
  segment_prompt_version          TEXT DEFAULT '',
  classification_model_version    TEXT DEFAULT '',
  classification_prompt_version   TEXT DEFAULT '',
  confidence                      DOUBLE PRECISION NOT NULL DEFAULT 0,
  human_corrected                 BOOLEAN NOT NULL DEFAULT false,
  -- Activity detail fields
  activity_movement_details       TEXT DEFAULT '',
  activity_duration_sec           DOUBLE PRECISION NOT NULL DEFAULT 0,
  activity_timeline               TEXT DEFAULT '',
  uppercase_elemental_description TEXT DEFAULT '',
  -- Timestamps
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. review_flags ------------------------------------------------------
CREATE TABLE review_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workstation_id  UUID NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  segment_id      INTEGER NOT NULL,
  reason          TEXT NOT NULL DEFAULT '',
  confidence      DOUBLE PRECISION,
  status          flag_status NOT NULL DEFAULT 'pending',
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. workstation_analysis_runs -----------------------------------------
CREATE TABLE workstation_analysis_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workstation_id    UUID NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status            analysis_run_status NOT NULL DEFAULT 'queued',
  source_job_count  INTEGER NOT NULL DEFAULT 0,
  source_duration_sec DOUBLE PRECISION NOT NULL DEFAULT 0,
  model_name        TEXT,
  prompt_version    TEXT,
  credits_reserved  INTEGER DEFAULT 0,
  credits_charged   INTEGER DEFAULT 0,
  summary           JSONB DEFAULT '{}',
  error_message     TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. workstation_consensus_segments ------------------------------------
CREATE TABLE workstation_consensus_segments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workstation_id         UUID NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  analysis_run_id        UUID NOT NULL REFERENCES workstation_analysis_runs(id) ON DELETE CASCADE,
  job_id                 UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  primary_segment_id     UUID REFERENCES video_segments(id) ON DELETE SET NULL,
  primary_description    TEXT NOT NULL DEFAULT '',
  verifier_description   TEXT NOT NULL DEFAULT '',
  primary_start_sec      DOUBLE PRECISION NOT NULL DEFAULT 0,
  primary_end_sec        DOUBLE PRECISION NOT NULL DEFAULT 0,
  verifier_start_sec     DOUBLE PRECISION NOT NULL DEFAULT 0,
  verifier_end_sec       DOUBLE PRECISION NOT NULL DEFAULT 0,
  temporal_iou           DOUBLE PRECISION NOT NULL DEFAULT 0,
  description_similarity DOUBLE PRECISION NOT NULL DEFAULT 0,
  verifier_confidence    DOUBLE PRECISION NOT NULL DEFAULT 0,
  decision               consensus_decision NOT NULL DEFAULT 'review_required',
  decision_reason        TEXT DEFAULT '',
  final_description      TEXT DEFAULT '',
  final_start_sec        DOUBLE PRECISION NOT NULL DEFAULT 0,
  final_end_sec          DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. audit_logs --------------------------------------------------------
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- organization_members
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- subscriptions
CREATE INDEX idx_subscriptions_org    ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- credit_transactions
CREATE INDEX idx_credit_tx_org     ON credit_transactions(organization_id);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at);
CREATE INDEX idx_credit_tx_job     ON credit_transactions(job_id);

-- dummy_payments
CREATE INDEX idx_payments_org ON dummy_payments(organization_id);

-- workstations
CREATE INDEX idx_workstations_org    ON workstations(organization_id);
CREATE INDEX idx_workstations_status ON workstations(status);

-- video_jobs
CREATE INDEX idx_jobs_org         ON video_jobs(organization_id);
CREATE INDEX idx_jobs_workstation ON video_jobs(workstation_id);
CREATE INDEX idx_jobs_status      ON video_jobs(status);
CREATE INDEX idx_jobs_created     ON video_jobs(created_at);
CREATE INDEX idx_jobs_created_by  ON video_jobs(created_by);

-- video_segments
CREATE INDEX idx_segments_org ON video_segments(organization_id);
CREATE INDEX idx_segments_job ON video_segments(job_id);
CREATE INDEX idx_segments_ws  ON video_segments(workstation_id);

-- most_rows
CREATE INDEX idx_most_rows_org ON most_rows(organization_id);
CREATE INDEX idx_most_rows_job ON most_rows(job_id);
CREATE INDEX idx_most_rows_ws  ON most_rows(workstation_id);

-- review_flags
CREATE INDEX idx_flags_org    ON review_flags(organization_id);
CREATE INDEX idx_flags_job    ON review_flags(job_id);
CREATE INDEX idx_flags_status ON review_flags(status);

-- workstation_analysis_runs
CREATE INDEX idx_analysis_runs_org ON workstation_analysis_runs(organization_id);
CREATE INDEX idx_analysis_runs_ws  ON workstation_analysis_runs(workstation_id);

-- workstation_consensus_segments
CREATE INDEX idx_consensus_org ON workstation_consensus_segments(organization_id);
CREATE INDEX idx_consensus_run ON workstation_consensus_segments(analysis_run_id);

-- audit_logs
CREATE INDEX idx_audit_org     ON audit_logs(organization_id);
CREATE INDEX idx_audit_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_action  ON audit_logs(action);


-- ============================================================================
-- 4. Helper Functions
-- ============================================================================

-- Check if current auth user is a member of given organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$;

-- Check if current auth user has a specific role (or higher) in organization
-- Role hierarchy: owner > admin > engineer > viewer
CREATE OR REPLACE FUNCTION has_org_role(org_id UUID, required_role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND CASE required_role
            WHEN 'viewer'   THEN role IN ('viewer', 'engineer', 'admin', 'owner')
            WHEN 'engineer' THEN role IN ('engineer', 'admin', 'owner')
            WHEN 'admin'    THEN role IN ('admin', 'owner')
            WHEN 'owner'    THEN role = 'owner'
          END
  );
$$;

-- Get the user's role in a given organization (returns NULL if not a member)
CREATE OR REPLACE FUNCTION get_org_role(org_id UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;


-- ============================================================================
-- 5. Triggers
-- ============================================================================

-- 5a. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_workstations
  BEFORE UPDATE ON workstations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_video_jobs
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_most_rows
  BEFORE UPDATE ON most_rows
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_credit_wallets
  BEFORE UPDATE ON credit_wallets
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- 5b. Create profile when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
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

  -- Create profile
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, user_name, NEW.email);

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================================
-- 6. Row Level Security
-- ============================================================================

-- Enable RLS on all tenant tables
ALTER TABLE profiles                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_wallets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dummy_payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstations                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_jobs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_segments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE most_rows                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_flags                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstation_analysis_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstation_consensus_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                    ENABLE ROW LEVEL SECURITY;


-- ---- profiles ---------------------------------------------------------
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());


-- ---- organizations ----------------------------------------------------
CREATE POLICY "Members can read their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (has_org_role(id, 'owner'));


-- ---- organization_members ---------------------------------------------
CREATE POLICY "Members can see fellow members"
  ON organization_members FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'admin'));

CREATE POLICY "Admins can change member roles"
  ON organization_members FOR UPDATE
  USING (has_org_role(organization_id, 'admin'));

CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  USING (has_org_role(organization_id, 'admin'));


-- ---- subscriptions ----------------------------------------------------
CREATE POLICY "Members can read subscriptions"
  ON subscriptions FOR SELECT
  USING (is_org_member(organization_id));

-- Insert/update restricted to backend service role (no user-facing policy)


-- ---- credit_wallets ---------------------------------------------------
CREATE POLICY "Members can read credit balance"
  ON credit_wallets FOR SELECT
  USING (is_org_member(organization_id));

-- Mutations restricted to backend service role only (no user-facing write policy)


-- ---- credit_transactions ----------------------------------------------
CREATE POLICY "Members can read credit transactions"
  ON credit_transactions FOR SELECT
  USING (is_org_member(organization_id));

-- Mutations restricted to backend service role only


-- ---- dummy_payments ---------------------------------------------------
CREATE POLICY "Members can read payments"
  ON dummy_payments FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Members can create payments"
  ON dummy_payments FOR INSERT
  WITH CHECK (is_org_member(organization_id));


-- ---- workstations -----------------------------------------------------
CREATE POLICY "Members can read workstations"
  ON workstations FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Admins can create workstations"
  ON workstations FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'admin'));

CREATE POLICY "Admins can update workstations"
  ON workstations FOR UPDATE
  USING (has_org_role(organization_id, 'admin'));

CREATE POLICY "Admins can delete workstations"
  ON workstations FOR DELETE
  USING (has_org_role(organization_id, 'admin'));


-- ---- video_jobs -------------------------------------------------------
CREATE POLICY "Members can read jobs"
  ON video_jobs FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Engineers can create jobs"
  ON video_jobs FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'engineer'));

CREATE POLICY "Engineers can update own jobs"
  ON video_jobs FOR UPDATE
  USING (has_org_role(organization_id, 'engineer'));


-- ---- video_segments ---------------------------------------------------
CREATE POLICY "Members can read segments"
  ON video_segments FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Engineers can create segments"
  ON video_segments FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'engineer'));


-- ---- most_rows --------------------------------------------------------
CREATE POLICY "Members can read MOST rows"
  ON most_rows FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Engineers can create MOST rows"
  ON most_rows FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'engineer'));

CREATE POLICY "Engineers can update MOST rows"
  ON most_rows FOR UPDATE
  USING (has_org_role(organization_id, 'engineer'));


-- ---- review_flags -----------------------------------------------------
CREATE POLICY "Members can read flags"
  ON review_flags FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Engineers can create flags"
  ON review_flags FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'engineer'));

CREATE POLICY "Engineers can update flags"
  ON review_flags FOR UPDATE
  USING (has_org_role(organization_id, 'engineer'));


-- ---- workstation_analysis_runs ----------------------------------------
CREATE POLICY "Members can read analysis runs"
  ON workstation_analysis_runs FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Engineers can create analysis runs"
  ON workstation_analysis_runs FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'engineer'));

CREATE POLICY "Engineers can update analysis runs"
  ON workstation_analysis_runs FOR UPDATE
  USING (has_org_role(organization_id, 'engineer'));


-- ---- workstation_consensus_segments -----------------------------------
CREATE POLICY "Members can read consensus segments"
  ON workstation_consensus_segments FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Engineers can create consensus segments"
  ON workstation_consensus_segments FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'engineer'));


-- ---- audit_logs -------------------------------------------------------
CREATE POLICY "Members can read audit logs"
  ON audit_logs FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Members can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_org_member(organization_id));


-- ============================================================================
-- Done. Migration 001 complete.
-- ============================================================================

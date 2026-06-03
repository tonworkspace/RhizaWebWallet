-- ============================================================
-- RZC Vanguard Program Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Vanguard Applications Table
DROP TABLE IF EXISTS rzc_vanguard_tasks CASCADE;
DROP TABLE IF EXISTS rzc_vanguard_applications CASCADE;

CREATE TABLE IF NOT EXISTS rzc_vanguard_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES wallet_users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  country text,
  twitter_handle text,
  bio text,
  referral_source text,
  reason text,
  primary_platform text,
  audience_size text,
  monthly_sales text,
  expected_engagement text,
  primary_link text,
  video_link text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- 2. Vanguard Task Submissions Table
CREATE TABLE IF NOT EXISTS rzc_vanguard_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES wallet_users(id) ON DELETE CASCADE,
  task_id text NOT NULL,
  submission_link text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reward_amount numeric(18,6),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Row Level Security
ALTER TABLE rzc_vanguard_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rzc_vanguard_tasks ENABLE ROW LEVEL SECURITY;

-- Vanguard Applications policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vanguard_apps_user_select') THEN
    CREATE POLICY vanguard_apps_user_select ON rzc_vanguard_applications
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vanguard_apps_user_insert') THEN
    CREATE POLICY vanguard_apps_user_insert ON rzc_vanguard_applications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vanguard_apps_user_update') THEN
    CREATE POLICY vanguard_apps_user_update ON rzc_vanguard_applications
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Vanguard Tasks policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vanguard_tasks_user_select') THEN
    CREATE POLICY vanguard_tasks_user_select ON rzc_vanguard_tasks
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vanguard_tasks_user_insert') THEN
    CREATE POLICY vanguard_tasks_user_insert ON rzc_vanguard_tasks
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_vanguard_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vanguard_apps_timestamp ON rzc_vanguard_applications;
CREATE TRIGGER update_vanguard_apps_timestamp BEFORE UPDATE
    ON rzc_vanguard_applications FOR EACH ROW EXECUTE PROCEDURE update_vanguard_timestamp();

SELECT 'Vanguard tables created successfully ✅' AS status;

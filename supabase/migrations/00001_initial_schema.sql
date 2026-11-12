-- Majestic Ops — Initial Schema Migration
-- Phase 1: Core tables (profiles, departments, leaves, holidays, app_settings, audit_log)
-- Phase 2: Task tables (tasks, events, proofs, checklists, milestones, etc.)

-- ═══════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('owner', 'director', 'dept_head', 'staff', 'device', 'ai_system');
CREATE TYPE availability_status AS ENUM ('on_duty', 'on_break', 'with_customer', 'on_leave', 'off_shift');
CREATE TYPE timing_type AS ENUM ('urgent', 'dated', 'long', 'flexible', 'repeating');
CREATE TYPE importance AS ENUM ('normal', 'important');
CREATE TYPE task_status AS ENUM ('draft', 'new', 'seen', 'in_progress', 'blocked', 'submitted', 'sent_back', 'done', 'cancelled');
CREATE TYPE proof_type AS ENUM ('none', 'photo', 'file', 'video', 'number', 'checklist', 'signature', 'link', 'payment_list', 'text_note');
CREATE TYPE assign_target AS ENUM ('person', 'role_in_department', 'department', 'open_pool', 'bulk');
CREATE TYPE event_type AS ENUM ('created', 'delivered', 'seen', 'started', 'paused', 'resumed', 'blocked', 'unblocked', 'submitted', 'approved', 'rejected', 'cancelled', 'reassigned', 'date_changed', 'date_change_requested', 'comment', 'proof_added', 'escalated', 'claimed', 'handed_over', 'milestone_done', 'ai_flagged');
CREATE TYPE alert_level AS ENUM ('critical', 'important', 'insight');
CREATE TYPE notif_channel AS ENUM ('in_app', 'push', 'email');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- ═══════════════════════════════════════════════
-- UTILITY FUNCTIONS
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════

-- Departments
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ml text,
  color text NOT NULL DEFAULT '#7A1F2B',
  head_id uuid,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Profiles (id = auth.users.id)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  full_name_ml text,
  phone text,
  role user_role NOT NULL DEFAULT 'staff',
  department_id uuid REFERENCES departments(id),
  extra_department_ids uuid[] DEFAULT '{}',
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ml')),
  senior_mode boolean NOT NULL DEFAULT false,
  shift_start time DEFAULT '09:00',
  shift_end time DEFAULT '18:00',
  availability availability_status NOT NULL DEFAULT 'on_duty',
  availability_until timestamptz,
  avatar_url text,
  aliases text[] DEFAULT '{}',
  job_title text,
  points int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  pin_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- FK from departments.head_id to profiles
ALTER TABLE departments ADD CONSTRAINT departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES profiles(id);

-- Holidays
CREATE TABLE holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Leaves
CREATE TABLE leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason text,
  approved_by uuid REFERENCES profiles(id),
  status request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- App Settings (single row)
CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL DEFAULT 'Majestic Jewellers',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  working_days int[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  default_shift_start time NOT NULL DEFAULT '09:00',
  default_shift_end time NOT NULL DEFAULT '21:00',
  quiet_hours_behavior text NOT NULL DEFAULT 'hold',
  leaderboard_enabled boolean NOT NULL DEFAULT true,
  directors_see_activity boolean NOT NULL DEFAULT false,
  digest_time time NOT NULL DEFAULT '21:00',
  ai_enabled boolean NOT NULL DEFAULT true,
  voice_enabled boolean NOT NULL DEFAULT true,
  privacy_policy text,
  retention_days int NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit Log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  meta jsonb DEFAULT '{}',
  at timestamptz NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ml text,
  description text,
  department_id uuid REFERENCES departments(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  owner_id uuid REFERENCES profiles(id),
  assign_target assign_target NOT NULL DEFAULT 'person',
  pool_department_id uuid REFERENCES departments(id),
  helpers uuid[] DEFAULT '{}',
  watchers uuid[] DEFAULT '{}',
  timing_type timing_type NOT NULL,
  importance importance NOT NULL DEFAULT 'normal',
  status task_status NOT NULL DEFAULT 'draft',
  due_at timestamptz,
  review_on date,
  snooze_count int NOT NULL DEFAULT 0,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  estimate_minutes int,
  actual_minutes int NOT NULL DEFAULT 0,
  proof_type proof_type NOT NULL DEFAULT 'none',
  proof_rule jsonb,
  requires_approval boolean NOT NULL DEFAULT true,
  approver_id uuid REFERENCES profiles(id),
  report_back_to uuid REFERENCES profiles(id),
  read_aloud boolean NOT NULL DEFAULT false,
  template_id uuid,
  routine_id uuid,
  routine_instance_date date,
  chain_run_id uuid,
  chain_step int,
  parent_task_id uuid REFERENCES tasks(id),
  batch_id uuid,
  escalation_level int NOT NULL DEFAULT 0,
  date_change_count int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'owner' CHECK (source IN ('owner', 'manager', 'staff', 'routine', 'chain', 'ai', 'voice', 'corrective')),
  voice_note_id uuid,
  is_draft boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_date_rule CHECK (
    (timing_type = 'flexible' AND due_at IS NULL AND review_on IS NOT NULL)
    OR (timing_type <> 'flexible' AND due_at IS NOT NULL)
    OR (is_draft = true)
  )
);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_tasks_owner_status ON tasks(owner_id, status);
CREATE INDEX idx_tasks_department_status ON tasks(department_id, status);
CREATE INDEX idx_tasks_due_at ON tasks(due_at);
CREATE INDEX idx_tasks_review_on ON tasks(review_on);
CREATE UNIQUE INDEX idx_tasks_routine_instance ON tasks(routine_id, routine_instance_date) WHERE routine_id IS NOT NULL;

-- Task Events
CREATE TABLE task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  type event_type NOT NULL,
  from_status task_status,
  to_status task_status,
  note text,
  meta jsonb DEFAULT '{}',
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_events_task ON task_events(task_id);

-- Task Checklist Items
CREATE TABLE task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  text text NOT NULL,
  text_ml text,
  requires_photo boolean NOT NULL DEFAULT false,
  done boolean NOT NULL DEFAULT false,
  done_by uuid REFERENCES profiles(id),
  done_at timestamptz,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Milestones
CREATE TABLE milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz,
  owner_id uuid REFERENCES profiles(id),
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  proof_path text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Proofs
CREATE TABLE proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind proof_type NOT NULL,
  storage_path text,
  value_numeric numeric,
  value_text text,
  rows jsonb,
  check_passed boolean,
  check_message text,
  ai_check jsonb,
  submitted_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Date Change Requests
CREATE TABLE date_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES profiles(id),
  old_due_at timestamptz,
  new_due_at timestamptz NOT NULL,
  reason text NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES profiles(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Comments
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  voice_path text,
  mentions uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  task_id uuid REFERENCES tasks(id),
  type text NOT NULL,
  title text NOT NULL,
  title_ml text,
  body text,
  body_ml text,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'reminder', 'alert', 'urgent')),
  action_url text,
  channels notif_channel[] DEFAULT '{in_app}',
  delivered_at timestamptz,
  read_at timestamptz,
  held_until timestamptz,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI Alerts
CREATE TABLE ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level alert_level NOT NULL,
  title text NOT NULL,
  explanation text,
  evidence jsonb DEFAULT '{}',
  suggested_action text,
  suggested_assignee_id uuid REFERENCES profiles(id),
  department_id uuid REFERENCES departments(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'snoozed', 'dismissed')),
  snoozed_until timestamptz,
  source text NOT NULL DEFAULT 'rule' CHECK (source IN ('rule', 'ai')),
  rule_key text,
  dedupe_key text UNIQUE,
  created_for text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Announcements
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  body_ml text,
  audience jsonb DEFAULT '{"type": "all"}',
  requires_ack boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE announcement_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  acked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- EOD Reports
CREATE TABLE eod_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  report_date date NOT NULL,
  completed_summary text,
  blockers text,
  tomorrow_plan text,
  ai_prefill jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_date)
);

-- ═══════════════════════════════════════════════
-- RLS HELPER FUNCTIONS
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_departments()
RETURNS uuid[] AS $$
  SELECT ARRAY(
    SELECT department_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT unnest(extra_department_ids) FROM profiles WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_acks ENABLE ROW LEVEL SECURITY;
ALTER TABLE eod_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone reads; own update; owner manages all
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_update_admin ON profiles FOR UPDATE USING (auth_role() = 'owner');
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth_role() = 'owner' OR auth.uid() = id);

-- Departments: everyone reads; owner manages
CREATE POLICY departments_select ON departments FOR SELECT USING (true);
CREATE POLICY departments_insert ON departments FOR INSERT WITH CHECK (auth_role() = 'owner');
CREATE POLICY departments_update ON departments FOR UPDATE USING (auth_role() = 'owner');
CREATE POLICY departments_delete ON departments FOR DELETE USING (auth_role() = 'owner');

-- Holidays
CREATE POLICY holidays_select ON holidays FOR SELECT USING (true);
CREATE POLICY holidays_insert ON holidays FOR INSERT WITH CHECK (auth_role() = 'owner');
CREATE POLICY holidays_delete ON holidays FOR DELETE USING (auth_role() = 'owner');

-- App Settings
CREATE POLICY app_settings_select ON app_settings FOR SELECT USING (true);
CREATE POLICY app_settings_update ON app_settings FOR UPDATE USING (auth_role() = 'owner');

-- Audit Log
CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (auth_role() = 'owner');
CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (true);

-- Tasks: owner/director see all; others see own/dept tasks
CREATE POLICY tasks_select ON tasks FOR SELECT USING (
  auth_role() IN ('owner', 'director')
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
  OR auth.uid() = ANY(helpers)
  OR auth.uid() = ANY(watchers)
  OR report_back_to = auth.uid()
  OR (auth_role() = 'dept_head' AND department_id = ANY(auth_departments()))
  OR (pool_department_id IS NOT NULL AND pool_department_id = ANY(auth_departments()))
);
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (true);

-- Task Events
CREATE POLICY task_events_select ON task_events FOR SELECT USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_events.task_id));
CREATE POLICY task_events_insert ON task_events FOR INSERT WITH CHECK (true);

-- Notifications
CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (true);

-- Push Subscriptions
CREATE POLICY push_subs_select ON push_subscriptions FOR SELECT USING (user_id = auth.uid() OR auth_role() = 'owner');
CREATE POLICY push_subs_manage ON push_subscriptions FOR ALL USING (user_id = auth.uid());

-- AI Alerts
CREATE POLICY ai_alerts_select ON ai_alerts FOR SELECT USING (auth_role() IN ('owner', 'director') OR (auth_role() = 'dept_head' AND department_id = ANY(auth_departments())));
CREATE POLICY ai_alerts_insert ON ai_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY ai_alerts_update ON ai_alerts FOR UPDATE USING (auth_role() IN ('owner', 'director', 'dept_head'));

-- Announcements
CREATE POLICY announcements_select ON announcements FOR SELECT USING (true);
CREATE POLICY announcements_insert ON announcements FOR INSERT WITH CHECK (auth_role() IN ('owner', 'director', 'dept_head'));

-- Announcement Acks
CREATE POLICY ack_select ON announcement_acks FOR SELECT USING (true);
CREATE POLICY ack_insert ON announcement_acks FOR INSERT WITH CHECK (user_id = auth.uid());

-- EOD Reports
CREATE POLICY eod_select ON eod_reports FOR SELECT USING (user_id = auth.uid() OR auth_role() IN ('owner', 'director', 'dept_head'));
CREATE POLICY eod_insert ON eod_reports FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY eod_update ON eod_reports FOR UPDATE USING (user_id = auth.uid());

-- Remaining tables: follow same pattern
CREATE POLICY checklist_select ON task_checklist_items FOR SELECT USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_checklist_items.task_id));
CREATE POLICY checklist_manage ON task_checklist_items FOR ALL USING (true);

CREATE POLICY milestones_select ON milestones FOR SELECT USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = milestones.task_id));
CREATE POLICY milestones_manage ON milestones FOR ALL USING (true);

CREATE POLICY proofs_select ON proofs FOR SELECT USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = proofs.task_id));
CREATE POLICY proofs_insert ON proofs FOR INSERT WITH CHECK (true);

CREATE POLICY dcr_select ON date_change_requests FOR SELECT USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = date_change_requests.task_id));
CREATE POLICY dcr_manage ON date_change_requests FOR ALL USING (true);

CREATE POLICY comments_select ON comments FOR SELECT USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = comments.task_id));
CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (true);

CREATE POLICY leaves_select ON leaves FOR SELECT USING (
  user_id = auth.uid()
  OR auth_role() IN ('owner', 'director')
  OR (auth_role() = 'dept_head' AND (SELECT department_id FROM profiles WHERE id = leaves.user_id) = ANY(auth_departments()))
);
CREATE POLICY leaves_insert ON leaves FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY leaves_update ON leaves FOR UPDATE USING (auth_role() IN ('owner', 'director') OR (auth_role() = 'dept_head'));


-- Majestic Ops — Phase 2: RPC Functions & Additional Tables
-- Server-side functions for task mutations (SECURITY DEFINER)

-- ═══════════════════════════════════════════════
-- TEMPLATES & ROUTINES & CHAINS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ml text,
  description text,
  department_id uuid REFERENCES departments(id),
  timing_type timing_type NOT NULL DEFAULT 'dated',
  proof_type proof_type NOT NULL DEFAULT 'none',
  proof_rule jsonb,
  importance importance NOT NULL DEFAULT 'normal',
  requires_approval boolean NOT NULL DEFAULT true,
  checklist_items jsonb DEFAULT '[]',
  created_by uuid NOT NULL REFERENCES profiles(id),
  is_global boolean NOT NULL DEFAULT false,
  use_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ml text,
  description text,
  template_id uuid REFERENCES task_templates(id),
  department_id uuid REFERENCES departments(id),
  assignee_id uuid REFERENCES profiles(id),
  assignee_rule text NOT NULL DEFAULT 'fixed' CHECK (assignee_rule IN ('fixed', 'rotate', 'pool')),
  rotate_list uuid[] DEFAULT '{}',
  rotate_index int NOT NULL DEFAULT 0,
  timing_type timing_type NOT NULL DEFAULT 'dated',
  proof_type proof_type NOT NULL DEFAULT 'none',
  importance importance NOT NULL DEFAULT 'normal',
  schedule_cron text NOT NULL DEFAULT '0 9 * * 1-6',
  schedule_description text,
  due_offset_hours int NOT NULL DEFAULT 8,
  skip_holidays boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  compliance_percent numeric NOT NULL DEFAULT 100,
  last_generated_at timestamptz,
  next_run_at timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER routines_updated_at BEFORE UPDATE ON routines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ml text,
  description text,
  steps jsonb NOT NULL DEFAULT '[]',
  created_by uuid NOT NULL REFERENCES profiles(id),
  use_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER chains_updated_at BEFORE UPDATE ON chains FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS chain_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid NOT NULL REFERENCES chains(id),
  current_step int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'cancelled')),
  started_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Activity Sessions (for live board / activity tracking)
CREATE TABLE IF NOT EXISTS activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int,
  is_active boolean NOT NULL DEFAULT true,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  current_page text
);
CREATE INDEX idx_activity_sessions_user ON activity_sessions(user_id, is_active);

-- AI Usage logging
CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  model text NOT NULL DEFAULT 'gemini-2.0-flash',
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  latency_ms int,
  triggered_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reminder rules
CREATE TABLE IF NOT EXISTS reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timing_type timing_type,
  trigger_minutes_before int NOT NULL DEFAULT 60,
  channel notif_channel NOT NULL DEFAULT 'in_app',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI Rules (for Layer 1 rule-based alerts)
CREATE TABLE IF NOT EXISTS ai_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  sql_template text NOT NULL,
  alert_level alert_level NOT NULL DEFAULT 'important',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for new tables
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_select ON task_templates FOR SELECT USING (true);
CREATE POLICY templates_insert ON task_templates FOR INSERT WITH CHECK (true);
CREATE POLICY templates_update ON task_templates FOR UPDATE USING (created_by = auth.uid() OR auth_role() = 'owner');
CREATE POLICY templates_delete ON task_templates FOR DELETE USING (created_by = auth.uid() OR auth_role() = 'owner');

CREATE POLICY routines_select ON routines FOR SELECT USING (true);
CREATE POLICY routines_insert ON routines FOR INSERT WITH CHECK (auth_role() IN ('owner', 'director', 'dept_head'));
CREATE POLICY routines_update ON routines FOR UPDATE USING (auth_role() IN ('owner', 'director', 'dept_head'));
CREATE POLICY routines_delete ON routines FOR DELETE USING (auth_role() = 'owner');

CREATE POLICY chains_select ON chains FOR SELECT USING (true);
CREATE POLICY chains_manage ON chains FOR ALL USING (auth_role() IN ('owner', 'director', 'dept_head'));

CREATE POLICY chain_runs_select ON chain_runs FOR SELECT USING (true);
CREATE POLICY chain_runs_insert ON chain_runs FOR INSERT WITH CHECK (true);

CREATE POLICY activity_select ON activity_sessions FOR SELECT USING (
  user_id = auth.uid() OR auth_role() IN ('owner', 'director', 'dept_head')
);
CREATE POLICY activity_manage ON activity_sessions FOR ALL USING (user_id = auth.uid());

CREATE POLICY ai_usage_select ON ai_usage FOR SELECT USING (auth_role() = 'owner');
CREATE POLICY ai_usage_insert ON ai_usage FOR INSERT WITH CHECK (true);

CREATE POLICY reminder_rules_select ON reminder_rules FOR SELECT USING (true);
CREATE POLICY reminder_rules_manage ON reminder_rules FOR ALL USING (auth_role() = 'owner');

CREATE POLICY ai_rules_select ON ai_rules FOR SELECT USING (auth_role() IN ('owner', 'director'));
CREATE POLICY ai_rules_manage ON ai_rules FOR ALL USING (auth_role() = 'owner');

-- ═══════════════════════════════════════════════
-- RPC FUNCTIONS
-- ═══════════════════════════════════════════════

-- Transition task (validates status machine)
CREATE OR REPLACE FUNCTION transition_task(
  p_task_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task RECORD;
  v_new_status task_status;
  v_actor uuid := auth.uid();
  v_event_type event_type;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Status machine
  CASE p_action
    WHEN 'publish' THEN
      IF v_task.status != 'draft' THEN RAISE EXCEPTION 'Can only publish drafts'; END IF;
      v_new_status := 'new'; v_event_type := 'created';
    WHEN 'open' THEN
      IF v_task.status != 'new' THEN RAISE EXCEPTION 'Can only open new tasks'; END IF;
      v_new_status := 'seen'; v_event_type := 'seen';
    WHEN 'start' THEN
      IF v_task.status NOT IN ('new', 'seen', 'sent_back') THEN RAISE EXCEPTION 'Cannot start from current status'; END IF;
      v_new_status := 'in_progress'; v_event_type := 'started';
    WHEN 'submit' THEN
      IF v_task.status != 'in_progress' THEN RAISE EXCEPTION 'Can only submit in-progress tasks'; END IF;
      v_new_status := 'submitted'; v_event_type := 'submitted';
    WHEN 'approve' THEN
      IF v_task.status != 'submitted' THEN RAISE EXCEPTION 'Can only approve submitted tasks'; END IF;
      v_new_status := 'done'; v_event_type := 'approved';
    WHEN 'reject' THEN
      IF v_task.status != 'submitted' THEN RAISE EXCEPTION 'Can only reject submitted tasks'; END IF;
      v_new_status := 'sent_back'; v_event_type := 'rejected';
    WHEN 'cancel' THEN
      IF v_task.status IN ('done', 'cancelled') THEN RAISE EXCEPTION 'Cannot cancel done/cancelled tasks'; END IF;
      v_new_status := 'cancelled'; v_event_type := 'cancelled';
    WHEN 'block' THEN
      IF v_task.status != 'in_progress' THEN RAISE EXCEPTION 'Can only block in-progress tasks'; END IF;
      v_new_status := 'blocked'; v_event_type := 'blocked';
    WHEN 'unblock' THEN
      IF v_task.status != 'blocked' THEN RAISE EXCEPTION 'Can only unblock blocked tasks'; END IF;
      v_new_status := 'in_progress'; v_event_type := 'unblocked';
    ELSE
      RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  -- Update task
  UPDATE tasks SET
    status = v_new_status,
    started_at = CASE WHEN p_action = 'start' THEN now() ELSE started_at END,
    submitted_at = CASE WHEN p_action = 'submit' THEN now() ELSE submitted_at END,
    completed_at = CASE WHEN p_action = 'approve' THEN now() ELSE completed_at END
  WHERE id = p_task_id;

  -- Write event
  INSERT INTO task_events (task_id, actor_id, type, from_status, to_status, note)
  VALUES (p_task_id, v_actor, v_event_type, v_task.status, v_new_status, p_note);

  -- Create notification for owner/creator
  IF p_action IN ('approve', 'reject', 'submit') THEN
    INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
    VALUES (
      CASE WHEN p_action = 'submit' THEN COALESCE(v_task.approver_id, v_task.created_by) ELSE v_task.owner_id END,
      p_task_id,
      'task_' || p_action,
      v_task.title || ' — ' || p_action || 'd',
      CASE WHEN p_action = 'reject' THEN 'alert' ELSE 'info' END,
      '/tasks?task=' || p_task_id
    );
  END IF;

  RETURN jsonb_build_object('task_id', p_task_id, 'new_status', v_new_status);
END;
$$;

-- Claim pool task (atomic, first wins)
CREATE OR REPLACE FUNCTION claim_pool_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_rows int;
BEGIN
  UPDATE tasks SET
    owner_id = v_actor,
    status = 'seen'
  WHERE id = p_task_id
    AND owner_id IS NULL
    AND pool_department_id IS NOT NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Task already claimed or not a pool task';
  END IF;

  INSERT INTO task_events (task_id, actor_id, type, to_status)
  VALUES (p_task_id, v_actor, 'claimed', 'seen');

  RETURN jsonb_build_object('task_id', p_task_id, 'claimed_by', v_actor);
END;
$$;

-- Reassign task
CREATE OR REPLACE FUNCTION reassign_task(
  p_task_id uuid,
  p_new_owner uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_task RECORD;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;

  -- Only creator, owner-role, or director can reassign
  IF v_task.created_by != v_actor AND auth_role() NOT IN ('owner', 'director') THEN
    RAISE EXCEPTION 'Not authorized to reassign';
  END IF;

  UPDATE tasks SET owner_id = p_new_owner, status = 'new' WHERE id = p_task_id;

  INSERT INTO task_events (task_id, actor_id, type, note, meta)
  VALUES (p_task_id, v_actor, 'reassigned', p_note,
    jsonb_build_object('from', v_task.owner_id, 'to', p_new_owner));

  INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
  VALUES (p_new_owner, p_task_id, 'task_assigned', v_task.title || ' assigned to you', 'info', '/tasks?task=' || p_task_id);

  RETURN jsonb_build_object('task_id', p_task_id, 'new_owner', p_new_owner);
END;
$$;

-- Decide date change request
CREATE OR REPLACE FUNCTION decide_date_change(
  p_request_id uuid,
  p_approved boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_req RECORD;
BEGIN
  SELECT * INTO v_req FROM date_change_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already decided'; END IF;

  UPDATE date_change_requests SET
    status = CASE WHEN p_approved THEN 'approved'::request_status ELSE 'rejected'::request_status END,
    decided_by = v_actor,
    decided_at = now(),
    decision_note = p_note
  WHERE id = p_request_id;

  IF p_approved THEN
    UPDATE tasks SET due_at = v_req.new_due_at WHERE id = v_req.task_id;

    INSERT INTO task_events (task_id, actor_id, type, note, meta)
    VALUES (v_req.task_id, v_actor, 'date_changed', p_note,
      jsonb_build_object('old', v_req.old_due_at, 'new', v_req.new_due_at));
  END IF;

  INSERT INTO notifications (user_id, task_id, type, title, level)
  VALUES (v_req.requested_by, v_req.task_id,
    'date_change_' || CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    'Date change ' || CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    'info');

  RETURN jsonb_build_object('request_id', p_request_id, 'approved', p_approved);
END;
$$;

-- Generate points on task completion
CREATE OR REPLACE FUNCTION update_points_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_points int := 10;
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' AND NEW.owner_id IS NOT NULL THEN
    -- Base 10 points for on-time
    IF NEW.due_at IS NOT NULL AND NEW.completed_at > NEW.due_at THEN
      v_points := 3; -- Late
    END IF;
    IF NEW.importance = 'important' THEN v_points := v_points + 5; END IF;
    IF OLD.owner_id IS NULL THEN v_points := v_points + 3; END IF; -- Pool task bonus

    UPDATE profiles SET points = points + v_points WHERE id = NEW.owner_id;
  END IF;

  IF NEW.status = 'sent_back' AND OLD.status != 'sent_back' AND NEW.owner_id IS NOT NULL THEN
    UPDATE profiles SET points = GREATEST(0, points - 2) WHERE id = NEW.owner_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER task_points_trigger
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_points_on_completion();

-- Start chain step
CREATE OR REPLACE FUNCTION start_chain(p_chain_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_chain RECORD;
  v_step jsonb;
  v_run_id uuid;
  v_task_id uuid;
BEGIN
  SELECT * INTO v_chain FROM chains WHERE id = p_chain_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chain not found'; END IF;

  v_step := v_chain.steps->0;
  IF v_step IS NULL THEN RAISE EXCEPTION 'Chain has no steps'; END IF;

  INSERT INTO chain_runs (chain_id, current_step, started_by) VALUES (p_chain_id, 0, v_actor) RETURNING id INTO v_run_id;

  INSERT INTO tasks (title, timing_type, created_by, owner_id, chain_run_id, chain_step, status, source,
    department_id, proof_type, importance)
  VALUES (
    v_step->>'title', (v_step->>'timing_type')::timing_type, v_actor,
    (v_step->>'assignee_id')::uuid, v_run_id, 0, 'new', 'chain',
    (v_step->>'department_id')::uuid,
    COALESCE((v_step->>'proof_type')::proof_type, 'none'),
    COALESCE((v_step->>'importance')::importance, 'normal')
  ) RETURNING id INTO v_task_id;

  UPDATE chains SET use_count = use_count + 1 WHERE id = p_chain_id;

  RETURN jsonb_build_object('run_id', v_run_id, 'task_id', v_task_id);
END;
$$;

-- Storage bucket for proofs (if not exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', false) ON CONFLICT DO NOTHING;

-- Storage policy
CREATE POLICY proofs_upload ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'proofs' AND auth.uid() IS NOT NULL);
CREATE POLICY proofs_read ON storage.objects FOR SELECT USING (bucket_id = 'proofs' AND auth.uid() IS NOT NULL);

-- Seed AI rules
INSERT INTO ai_rules (rule_key, title, description, sql_template, alert_level) VALUES
('overdue_urgent', 'Urgent task overdue', 'Urgent task past due time', 'SELECT id, title FROM tasks WHERE timing_type = ''urgent'' AND status NOT IN (''done'', ''cancelled'') AND due_at < now()', 'critical'),
('overdue_dated', 'Dated task overdue', 'Dated task past due date', 'SELECT id, title FROM tasks WHERE timing_type = ''dated'' AND status NOT IN (''done'', ''cancelled'') AND due_at < now()', 'important'),
('stuck_in_progress', 'Task stuck in progress', 'Task in progress for > 2 days without update', 'SELECT id, title FROM tasks WHERE status = ''in_progress'' AND updated_at < now() - interval ''2 days''', 'important'),
('unread_24h', 'Unread task > 24h', 'New task not opened in 24 hours', 'SELECT id, title FROM tasks WHERE status = ''new'' AND created_at < now() - interval ''24 hours''', 'important'),
('submitted_no_review', 'Submitted but not reviewed', 'Task submitted but not approved/rejected in 24h', 'SELECT id, title FROM tasks WHERE status = ''submitted'' AND submitted_at < now() - interval ''24 hours''', 'important'),
('repeated_rejections', 'Repeated rejections', 'Task rejected 3+ times', 'SELECT t.id, t.title FROM tasks t WHERE t.status = ''sent_back'' AND (SELECT count(*) FROM task_events WHERE task_id = t.id AND type = ''rejected'') >= 3', 'critical'),
('long_task_at_risk', 'Long task at risk', 'Long task progress behind schedule', 'SELECT id, title FROM tasks WHERE timing_type = ''long'' AND status = ''in_progress'' AND due_at IS NOT NULL AND (EXTRACT(EPOCH FROM (now() - started_at)) / EXTRACT(EPOCH FROM (due_at - started_at))) > 0.85', 'critical'),
('high_workload', 'High workload', 'Team member has 10+ active tasks', 'SELECT p.id, p.full_name, count(*) as task_count FROM profiles p JOIN tasks t ON t.owner_id = p.id WHERE t.status IN (''new'', ''seen'', ''in_progress'') GROUP BY p.id, p.full_name HAVING count(*) >= 10', 'insight')
ON CONFLICT (rule_key) DO NOTHING;

-- Seed reminder rules
INSERT INTO reminder_rules (name, timing_type, trigger_minutes_before, channel) VALUES
('Urgent task reminder', 'urgent', 30, 'push'),
('Dated task due tomorrow', 'dated', 1440, 'in_app'),
('Dated task due in 2h', 'dated', 120, 'push'),
('Flexible review coming', 'flexible', 1440, 'in_app')
ON CONFLICT DO NOTHING;


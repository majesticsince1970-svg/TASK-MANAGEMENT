-- Majestic Ops — Migration 00004: Missing RPC Functions, Helper Functions & Tables
-- All RPCs are SECURITY DEFINER with SET search_path = public

-- ═══════════════════════════════════════════════
-- MISSING TABLES
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  storage_path text NOT NULL,
  duration_s int,
  transcript text,
  language text,
  parsed jsonb,
  readback_text text,
  readback_audio_path text,
  outcome text CHECK (outcome IN ('confirmed', 'changed', 'cancelled')),
  task_id uuid REFERENCES tasks(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date date NOT NULL,
  scope text,
  content_md text,
  content_ml_md text,
  audio_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES ai_alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  verdict text NOT NULL CHECK (verdict IN ('useful', 'not_important')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- RLS ON NEW TABLES
-- ═══════════════════════════════════════════════

ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- voice_notes: user sees own; managers see all
CREATE POLICY voice_notes_select ON voice_notes FOR SELECT USING (
  user_id = auth.uid() OR auth_role() IN ('owner', 'director', 'dept_head')
);
CREATE POLICY voice_notes_insert ON voice_notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY voice_notes_update ON voice_notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY voice_notes_delete ON voice_notes FOR DELETE USING (user_id = auth.uid());

-- ai_digests: managers can read; system inserts
CREATE POLICY ai_digests_select ON ai_digests FOR SELECT USING (
  auth_role() IN ('owner', 'director', 'dept_head')
);
CREATE POLICY ai_digests_insert ON ai_digests FOR INSERT WITH CHECK (true);

-- ai_feedback: user sees own; owner sees all
CREATE POLICY ai_feedback_select ON ai_feedback FOR SELECT USING (
  user_id = auth.uid() OR auth_role() = 'owner'
);
CREATE POLICY ai_feedback_insert ON ai_feedback FOR INSERT WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════

-- can_see_task: true if the caller may view this task
CREATE OR REPLACE FUNCTION can_see_task(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_task RECORD;
  v_role user_role;
  v_depts uuid[];
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN false; END IF;

  v_role := auth_role();
  IF v_role IN ('owner', 'director') THEN RETURN true; END IF;

  -- Direct association
  IF v_task.owner_id = auth.uid()
     OR v_task.created_by = auth.uid()
     OR v_task.report_back_to = auth.uid()
     OR auth.uid() = ANY(v_task.helpers)
     OR auth.uid() = ANY(v_task.watchers) THEN
    RETURN true;
  END IF;

  -- Dept head sees own department tasks
  IF v_role = 'dept_head' THEN
    v_depts := auth_departments();
    IF v_task.department_id = ANY(v_depts) THEN RETURN true; END IF;
  END IF;

  -- Pool tasks visible to eligible department members
  IF v_task.pool_department_id IS NOT NULL THEN
    v_depts := COALESCE(v_depts, auth_departments());
    IF v_task.pool_department_id = ANY(v_depts) THEN RETURN true; END IF;
  END IF;

  RETURN false;
END;
$$;

-- can_manage_task: true if the caller may modify (approve, reject, reassign, change date) this task
CREATE OR REPLACE FUNCTION can_manage_task(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_task RECORD;
  v_role user_role;
  v_depts uuid[];
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN false; END IF;

  v_role := auth_role();

  -- Owner and director can manage any task
  IF v_role IN ('owner', 'director') THEN RETURN true; END IF;

  -- Creator can manage their own tasks
  IF v_task.created_by = auth.uid() THEN RETURN true; END IF;

  -- Dept head can manage tasks in their departments
  IF v_role = 'dept_head' THEN
    v_depts := auth_departments();
    IF v_task.department_id = ANY(v_depts) THEN RETURN true; END IF;
  END IF;

  RETURN false;
END;
$$;

-- ═══════════════════════════════════════════════
-- RPC FUNCTIONS
-- ═══════════════════════════════════════════════

-- 1. create_task(payload jsonb)
-- Validates timing rules (§4.1 golden rule), sets defaults, inserts task + task_event 'created'
CREATE OR REPLACE FUNCTION create_task(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role user_role;
  v_timing timing_type;
  v_due timestamptz;
  v_review date;
  v_importance importance;
  v_status task_status;
  v_task_id uuid;
  v_is_draft boolean;
  v_owner_id uuid;
  v_dept_id uuid;
  v_approver_id uuid;
BEGIN
  -- Check caller is not ai_system (they can only create drafts)
  v_role := auth_role();
  IF v_role = 'device' THEN
    RAISE EXCEPTION 'Devices cannot create tasks';
  END IF;

  v_timing := (payload->>'timing_type')::timing_type;
  v_due := (payload->>'due_at')::timestamptz;
  v_review := (payload->>'review_on')::date;
  v_is_draft := COALESCE((payload->>'is_draft')::boolean, false);
  v_owner_id := (payload->>'owner_id')::uuid;
  v_dept_id := (payload->>'department_id')::uuid;
  v_importance := COALESCE((payload->>'importance')::importance, 'normal');
  v_approver_id := COALESCE((payload->>'approver_id')::uuid, v_actor);

  -- AI system can only create drafts
  IF v_role = 'ai_system' AND NOT v_is_draft THEN
    RAISE EXCEPTION 'AI system can only create draft tasks';
  END IF;

  -- Staff cannot create tasks for others (only self)
  IF v_role = 'staff' AND v_owner_id IS NOT NULL AND v_owner_id != v_actor THEN
    RAISE EXCEPTION 'Staff can only create tasks for themselves';
  END IF;

  -- Validate timing rules (§4.1 golden rule) - skip for drafts
  IF NOT v_is_draft THEN
    IF v_timing = 'flexible' THEN
      IF v_due IS NOT NULL THEN
        RAISE EXCEPTION 'Flexible tasks must not have a due_at';
      END IF;
      IF v_review IS NULL THEN
        v_review := (now() AT TIME ZONE 'Asia/Kolkata')::date + 7;
      END IF;
    ELSE
      IF v_due IS NULL THEN
        -- Set defaults based on timing type
        CASE v_timing
          WHEN 'urgent' THEN
            v_due := now() + interval '1 hour';
          WHEN 'dated' THEN
            IF EXTRACT(HOUR FROM now() AT TIME ZONE 'Asia/Kolkata') < 14 THEN
              v_due := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '18 hours') AT TIME ZONE 'Asia/Kolkata';
            ELSE
              v_due := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day' + interval '11 hours') AT TIME ZONE 'Asia/Kolkata';
            END IF;
          WHEN 'long' THEN
            v_due := now() + interval '30 days';
          WHEN 'repeating' THEN
            RAISE EXCEPTION 'Repeating tasks are created by the routine engine only';
          ELSE
            RAISE EXCEPTION 'Unknown timing type: %', v_timing;
        END CASE;
      END IF;

      -- Validate timing constraints
      IF v_timing = 'urgent' THEN
        IF v_due::date != (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
          RAISE EXCEPTION 'Urgent tasks must be due today (IST)';
        END IF;
        IF v_due > now() + interval '12 hours' THEN
          RAISE EXCEPTION 'Urgent tasks must be due within 12 hours';
        END IF;
      ELSIF v_timing = 'dated' THEN
        IF v_due < now() THEN
          RAISE EXCEPTION 'Dated task due_at must be in the future';
        END IF;
        IF v_due > now() + interval '30 days' THEN
          RAISE EXCEPTION 'Dated task due_at must be within 30 days';
        END IF;
      ELSIF v_timing = 'long' THEN
        IF v_due < now() + interval '7 days' THEN
          RAISE EXCEPTION 'Long task due_at must be at least 7 days ahead';
        END IF;
        IF v_due > now() + interval '92 days' THEN
          RAISE EXCEPTION 'Long task due_at must be within 92 days';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Determine initial status
  IF v_is_draft OR v_role = 'ai_system' THEN
    v_status := 'draft';
  ELSE
    v_status := 'new';
  END IF;

  INSERT INTO tasks (
    title, title_ml, description, department_id, created_by, owner_id,
    assign_target, pool_department_id, helpers, watchers,
    timing_type, importance, status, due_at, review_on,
    proof_type, proof_rule, requires_approval, approver_id,
    report_back_to, read_aloud, template_id, batch_id,
    source, voice_note_id, is_draft, estimate_minutes
  ) VALUES (
    payload->>'title',
    payload->>'title_ml',
    payload->>'description',
    v_dept_id,
    v_actor,
    v_owner_id,
    COALESCE((payload->>'assign_target')::assign_target, 'person'),
    (payload->>'pool_department_id')::uuid,
    COALESCE((SELECT array_agg(x::uuid) FROM jsonb_array_elements_text(payload->'helpers') x), '{}'),
    COALESCE((SELECT array_agg(x::uuid) FROM jsonb_array_elements_text(payload->'watchers') x), '{}'),
    v_timing,
    v_importance,
    v_status,
    v_due,
    v_review,
    COALESCE((payload->>'proof_type')::proof_type, 'none'),
    payload->'proof_rule',
    COALESCE((payload->>'requires_approval')::boolean, true),
    v_approver_id,
    (payload->>'report_back_to')::uuid,
    COALESCE((payload->>'read_aloud')::boolean, false),
    (payload->>'template_id')::uuid,
    (payload->>'batch_id')::uuid,
    COALESCE(payload->>'source', CASE WHEN v_role = 'ai_system' THEN 'ai' ELSE 'owner' END),
    (payload->>'voice_note_id')::uuid,
    COALESCE(v_is_draft, false),
    (payload->>'estimate_minutes')::int
  ) RETURNING id INTO v_task_id;

  -- Write 'created' event
  INSERT INTO task_events (task_id, actor_id, type, to_status, note)
  VALUES (v_task_id, v_actor, 'created', v_status, payload->>'note');

  -- Create checklist items if provided
  IF payload->'checklist_items' IS NOT NULL AND jsonb_array_length(payload->'checklist_items') > 0 THEN
    INSERT INTO task_checklist_items (task_id, position, text, text_ml, requires_photo)
    SELECT v_task_id, (item->>'position')::int, item->>'text', item->>'text_ml',
           COALESCE((item->>'requires_photo')::boolean, false)
    FROM jsonb_array_elements(payload->'checklist_items') AS item;
  END IF;

  -- Create milestones for long tasks if provided
  IF v_timing = 'long' AND payload->'milestones' IS NOT NULL THEN
    INSERT INTO milestones (task_id, title, due_at, owner_id, position)
    SELECT v_task_id, m->>'title', (m->>'due_at')::timestamptz,
           COALESCE((m->>'owner_id')::uuid, v_owner_id), (m->>'position')::int
    FROM jsonb_array_elements(payload->'milestones') AS m;
  END IF;

  -- Notify owner if assigned and not a draft
  IF v_status = 'new' AND v_owner_id IS NOT NULL AND v_owner_id != v_actor THEN
    INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
    VALUES (v_owner_id, v_task_id, 'task_assigned',
            COALESCE(payload->>'title', 'New task') || ' assigned to you',
            CASE WHEN v_timing = 'urgent' THEN 'urgent' ELSE 'info' END,
            '/tasks?task=' || v_task_id);
  END IF;

  RETURN jsonb_build_object('task_id', v_task_id, 'status', v_status);
END;
$$;


-- 2. submit_task(p_task_id uuid, p_proof jsonb)
-- Validates status=in_progress, inserts proof, transitions to submitted (or done if requires_approval=false)
CREATE OR REPLACE FUNCTION submit_task(p_task_id uuid, p_proof jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_task RECORD;
  v_new_status task_status;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.status != 'in_progress' THEN
    RAISE EXCEPTION 'Can only submit in-progress tasks (current: %)', v_task.status;
  END IF;

  -- Only the owner can submit
  IF v_task.owner_id != v_actor THEN
    RAISE EXCEPTION 'Only the task owner can submit';
  END IF;

  -- Insert proof if provided
  IF p_proof IS NOT NULL THEN
    INSERT INTO proofs (task_id, kind, storage_path, value_numeric, value_text, rows, submitted_by)
    VALUES (
      p_task_id,
      COALESCE((p_proof->>'kind')::proof_type, v_task.proof_type),
      p_proof->>'storage_path',
      (p_proof->>'value_numeric')::numeric,
      p_proof->>'value_text',
      p_proof->'rows',
      v_actor
    );

    INSERT INTO task_events (task_id, actor_id, type, note)
    VALUES (p_task_id, v_actor, 'proof_added', 'Proof submitted');
  END IF;

  -- If requires_approval=false, go straight to done
  IF v_task.requires_approval = false THEN
    v_new_status := 'done';
  ELSE
    v_new_status := 'submitted';
  END IF;

  UPDATE tasks SET
    status = v_new_status,
    submitted_at = now(),
    completed_at = CASE WHEN v_new_status = 'done' THEN now() ELSE NULL END
  WHERE id = p_task_id;

  -- Write event
  INSERT INTO task_events (task_id, actor_id, type, from_status, to_status)
  VALUES (p_task_id, v_actor, 'submitted', 'in_progress', v_new_status);

  -- Notify approver (or creator) if going to submitted
  IF v_new_status = 'submitted' THEN
    INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
    VALUES (
      COALESCE(v_task.approver_id, v_task.created_by),
      p_task_id, 'task_submitted',
      v_task.title || ' — submitted for approval',
      'info', '/tasks?task=' || p_task_id
    );
  END IF;

  -- If auto-done (no approval), notify creator
  IF v_new_status = 'done' THEN
    INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
    VALUES (v_task.created_by, p_task_id, 'task_done',
            v_task.title || ' — completed',
            'info', '/tasks?task=' || p_task_id);
  END IF;

  RETURN jsonb_build_object('task_id', p_task_id, 'new_status', v_new_status);
END;
$$;


-- 3. approve_task(p_task_id uuid, p_note text)
-- Validates approver role, transitions to done, awards points, if chain task creates next step
CREATE OR REPLACE FUNCTION approve_task(p_task_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role user_role;
  v_task RECORD;
  v_chain RECORD;
  v_next_step jsonb;
  v_next_task_id uuid;
  v_points int := 10;
BEGIN
  v_role := auth_role();

  -- AI system cannot approve
  IF v_role = 'ai_system' THEN
    RAISE EXCEPTION 'AI system cannot approve tasks';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.status != 'submitted' THEN
    RAISE EXCEPTION 'Can only approve submitted tasks (current: %)', v_task.status;
  END IF;

  -- Validate approver: must be the designated approver, creator, or a manager
  IF NOT can_manage_task(p_task_id) AND v_actor != v_task.approver_id THEN
    RAISE EXCEPTION 'Not authorized to approve this task';
  END IF;

  -- Transition to done
  UPDATE tasks SET
    status = 'done',
    completed_at = now()
  WHERE id = p_task_id;

  INSERT INTO task_events (task_id, actor_id, type, from_status, to_status, note)
  VALUES (p_task_id, v_actor, 'approved', 'submitted', 'done', p_note);

  -- Award points (on-time vs late)
  IF v_task.owner_id IS NOT NULL THEN
    IF v_task.due_at IS NOT NULL AND now() > v_task.due_at THEN
      v_points := 3; -- Late
    END IF;
    IF v_task.importance = 'important' THEN v_points := v_points + 5; END IF;

    UPDATE profiles SET points = points + v_points WHERE id = v_task.owner_id;
  END IF;

  -- Notify owner
  IF v_task.owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
    VALUES (v_task.owner_id, p_task_id, 'task_approved',
            v_task.title || ' — approved',
            'info', '/tasks?task=' || p_task_id);
  END IF;

  -- If this is a chain task, create the next step
  IF v_task.chain_run_id IS NOT NULL THEN
    SELECT * INTO v_chain FROM chain_runs WHERE id = v_task.chain_run_id FOR UPDATE;
    IF FOUND AND v_chain.status = 'running' THEN
      -- Get the chain definition
      DECLARE
        v_chain_def RECORD;
        v_next_step_idx int := v_task.chain_step + 1;
      BEGIN
        SELECT * INTO v_chain_def FROM chains WHERE id = v_chain.chain_id;
        IF FOUND THEN
          v_next_step := v_chain_def.steps->v_next_step_idx;
          IF v_next_step IS NOT NULL THEN
            -- Create next chain step task
            INSERT INTO tasks (
              title, timing_type, created_by, owner_id,
              chain_run_id, chain_step, status, source,
              department_id, proof_type, importance,
              due_at
            ) VALUES (
              v_next_step->>'title',
              COALESCE((v_next_step->>'timing_type')::timing_type, 'dated'),
              v_actor,
              (v_next_step->>'assignee_id')::uuid,
              v_task.chain_run_id,
              v_next_step_idx,
              'new',
              'chain',
              COALESCE((v_next_step->>'department_id')::uuid, v_task.department_id),
              COALESCE((v_next_step->>'proof_type')::proof_type, 'none'),
              COALESCE((v_next_step->>'importance')::importance, 'normal'),
              now() + (COALESCE((v_next_step->>'due_offset_minutes')::int, 480) || ' minutes')::interval
            ) RETURNING id INTO v_next_task_id;

            UPDATE chain_runs SET current_step = v_next_step_idx WHERE id = v_task.chain_run_id;

            INSERT INTO task_events (task_id, actor_id, type, to_status, note)
            VALUES (v_next_task_id, v_actor, 'created', 'new', 'Chain step ' || (v_next_step_idx + 1));
          ELSE
            -- Chain is complete
            UPDATE chain_runs SET status = 'completed' WHERE id = v_task.chain_run_id;
          END IF;
        END IF;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object('task_id', p_task_id, 'new_status', 'done',
    'next_task_id', v_next_task_id);
END;
$$;


-- 4. reject_task(p_task_id uuid, p_reason text)
-- Validates approver role, transitions to sent_back, deducts points
CREATE OR REPLACE FUNCTION reject_task(p_task_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role user_role;
  v_task RECORD;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required when rejecting a task';
  END IF;

  v_role := auth_role();

  -- AI system cannot reject
  IF v_role = 'ai_system' THEN
    RAISE EXCEPTION 'AI system cannot reject tasks';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.status != 'submitted' THEN
    RAISE EXCEPTION 'Can only reject submitted tasks (current: %)', v_task.status;
  END IF;

  -- Validate approver
  IF NOT can_manage_task(p_task_id) AND v_actor != v_task.approver_id THEN
    RAISE EXCEPTION 'Not authorized to reject this task';
  END IF;

  -- Transition to sent_back
  UPDATE tasks SET
    status = 'sent_back',
    submitted_at = NULL
  WHERE id = p_task_id;

  INSERT INTO task_events (task_id, actor_id, type, from_status, to_status, note)
  VALUES (p_task_id, v_actor, 'rejected', 'submitted', 'sent_back', p_reason);

  -- Deduct points from owner
  IF v_task.owner_id IS NOT NULL THEN
    UPDATE profiles SET points = GREATEST(0, points - 2) WHERE id = v_task.owner_id;
  END IF;

  -- Notify owner
  IF v_task.owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, task_id, type, title, body, level, action_url)
    VALUES (v_task.owner_id, p_task_id, 'task_rejected',
            v_task.title || ' — sent back',
            'Reason: ' || p_reason,
            'alert', '/tasks?task=' || p_task_id);
  END IF;

  RETURN jsonb_build_object('task_id', p_task_id, 'new_status', 'sent_back');
END;
$$;


-- 5. request_date_change(p_task_id uuid, p_new_due timestamptz, p_reason text)
-- Inserts date_change_requests row + task_event
CREATE OR REPLACE FUNCTION request_date_change(
  p_task_id uuid,
  p_new_due timestamptz,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_task RECORD;
  v_request_id uuid;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required for date change requests';
  END IF;

  IF p_new_due IS NULL THEN
    RAISE EXCEPTION 'New due date is required';
  END IF;

  IF p_new_due <= now() THEN
    RAISE EXCEPTION 'New due date must be in the future';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.status IN ('done', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot request date change for completed/cancelled tasks';
  END IF;

  IF v_task.due_at IS NULL THEN
    RAISE EXCEPTION 'Cannot request date change for flexible tasks (no due_at)';
  END IF;

  -- Insert date change request
  INSERT INTO date_change_requests (task_id, requested_by, old_due_at, new_due_at, reason)
  VALUES (p_task_id, v_actor, v_task.due_at, p_new_due, p_reason)
  RETURNING id INTO v_request_id;

  -- Log event
  INSERT INTO task_events (task_id, actor_id, type, note, meta)
  VALUES (p_task_id, v_actor, 'date_change_requested', p_reason,
    jsonb_build_object('old_due', v_task.due_at, 'requested_due', p_new_due, 'request_id', v_request_id));

  -- Increment date_change_count
  UPDATE tasks SET date_change_count = date_change_count + 1 WHERE id = p_task_id;

  -- Notify approver / creator
  INSERT INTO notifications (user_id, task_id, type, title, body, level, action_url)
  VALUES (
    COALESCE(v_task.approver_id, v_task.created_by),
    p_task_id, 'date_change_requested',
    v_task.title || ' — date change requested',
    'Reason: ' || p_reason,
    'info', '/approvals'
  );

  RETURN jsonb_build_object('request_id', v_request_id, 'task_id', p_task_id);
END;
$$;


-- 6. change_due_date(p_task_id uuid, p_new_due timestamptz, p_reason text)
-- For managers only, directly update due_at + event
CREATE OR REPLACE FUNCTION change_due_date(
  p_task_id uuid,
  p_new_due timestamptz,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role user_role;
  v_task RECORD;
  v_old_due timestamptz;
BEGIN
  v_role := auth_role();

  -- Only managers (owner, director, dept_head for own dept) can change dates directly
  IF v_role NOT IN ('owner', 'director', 'dept_head') THEN
    RAISE EXCEPTION 'Only managers can directly change due dates';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.status IN ('done', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot change due date for completed/cancelled tasks';
  END IF;

  -- Dept head can only change for own department
  IF v_role = 'dept_head' AND NOT (v_task.department_id = ANY(auth_departments())) THEN
    RAISE EXCEPTION 'Dept heads can only change dates for their own department tasks';
  END IF;

  IF p_new_due IS NULL AND v_task.timing_type != 'flexible' THEN
    RAISE EXCEPTION 'Non-flexible tasks require a due date';
  END IF;

  v_old_due := v_task.due_at;

  UPDATE tasks SET
    due_at = p_new_due,
    date_change_count = date_change_count + 1
  WHERE id = p_task_id;

  INSERT INTO task_events (task_id, actor_id, type, note, meta)
  VALUES (p_task_id, v_actor, 'date_changed', COALESCE(p_reason, 'Due date changed by manager'),
    jsonb_build_object('old_due', v_old_due, 'new_due', p_new_due));

  -- Notify owner
  IF v_task.owner_id IS NOT NULL AND v_task.owner_id != v_actor THEN
    INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
    VALUES (v_task.owner_id, p_task_id, 'date_changed',
            v_task.title || ' — due date changed',
            'info', '/tasks?task=' || p_task_id);
  END IF;

  RETURN jsonb_build_object('task_id', p_task_id, 'old_due', v_old_due, 'new_due', p_new_due);
END;
$$;


-- 7. snooze_flexible(p_task_id uuid, p_days int)
-- Update review_on, increment snooze_count
CREATE OR REPLACE FUNCTION snooze_flexible(p_task_id uuid, p_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_task RECORD;
  v_new_review date;
BEGIN
  IF p_days < 1 OR p_days > 60 THEN
    RAISE EXCEPTION 'Snooze days must be between 1 and 60';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.timing_type != 'flexible' THEN
    RAISE EXCEPTION 'Can only snooze flexible tasks';
  END IF;

  IF v_task.status IN ('done', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot snooze completed/cancelled tasks';
  END IF;

  -- Only the owner or a manager can snooze
  IF v_task.owner_id != v_actor AND NOT can_manage_task(p_task_id) THEN
    RAISE EXCEPTION 'Not authorized to snooze this task';
  END IF;

  v_new_review := (now() AT TIME ZONE 'Asia/Kolkata')::date + p_days;

  UPDATE tasks SET
    review_on = v_new_review,
    snooze_count = snooze_count + 1
  WHERE id = p_task_id;

  INSERT INTO task_events (task_id, actor_id, type, note, meta)
  VALUES (p_task_id, v_actor, 'date_changed',
    'Snoozed for ' || p_days || ' days',
    jsonb_build_object('old_review', v_task.review_on, 'new_review', v_new_review, 'snooze_count', v_task.snooze_count + 1));

  RETURN jsonb_build_object('task_id', p_task_id, 'new_review_on', v_new_review, 'snooze_count', v_task.snooze_count + 1);
END;
$$;


-- 8. handover_tasks(p_from_user uuid, p_mapping jsonb)
-- Reassign multiple tasks, log events
-- p_mapping: [{"task_id": "...", "to_user_id": "..."}, ...]
CREATE OR REPLACE FUNCTION handover_tasks(p_from_user uuid, p_mapping jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role user_role;
  v_item jsonb;
  v_task_id uuid;
  v_to_user uuid;
  v_task RECORD;
  v_count int := 0;
BEGIN
  v_role := auth_role();

  -- Only the user themselves, or a manager, can hand over tasks
  IF p_from_user != v_actor AND v_role NOT IN ('owner', 'director', 'dept_head') THEN
    RAISE EXCEPTION 'Not authorized to hand over tasks for this user';
  END IF;

  IF p_mapping IS NULL OR jsonb_array_length(p_mapping) = 0 THEN
    RAISE EXCEPTION 'Mapping must contain at least one task';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_mapping)
  LOOP
    v_task_id := (v_item->>'task_id')::uuid;
    v_to_user := (v_item->>'to_user_id')::uuid;

    IF v_task_id IS NULL OR v_to_user IS NULL THEN
      RAISE EXCEPTION 'Each mapping entry must have task_id and to_user_id';
    END IF;

    SELECT * INTO v_task FROM tasks WHERE id = v_task_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Task % not found', v_task_id;
    END IF;

    IF v_task.owner_id != p_from_user THEN
      RAISE EXCEPTION 'Task % is not owned by the specified user', v_task_id;
    END IF;

    IF v_task.status IN ('done', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot hand over completed/cancelled task %', v_task_id;
    END IF;

    -- Reassign
    UPDATE tasks SET
      owner_id = v_to_user,
      status = 'new'
    WHERE id = v_task_id;

    -- Log event
    INSERT INTO task_events (task_id, actor_id, type, note, meta)
    VALUES (v_task_id, v_actor, 'handed_over', 'Handed over from ' || p_from_user || ' to ' || v_to_user,
      jsonb_build_object('from', p_from_user, 'to', v_to_user));

    -- Notify new owner
    INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
    VALUES (v_to_user, v_task_id, 'task_assigned',
            v_task.title || ' — handed over to you',
            'info', '/tasks?task=' || v_task_id);

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('handed_over', v_count, 'from_user', p_from_user);
END;
$$;


-- 9. bulk_create_tasks(p_payload jsonb, p_user_ids uuid[])
-- Create one task per user with shared batch_id
CREATE OR REPLACE FUNCTION bulk_create_tasks(p_payload jsonb, p_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role user_role;
  v_batch_id uuid := gen_random_uuid();
  v_user_id uuid;
  v_task_id uuid;
  v_task_ids uuid[] := '{}';
  v_enriched jsonb;
BEGIN
  v_role := auth_role();

  IF v_role NOT IN ('owner', 'director', 'dept_head') THEN
    RAISE EXCEPTION 'Only managers can bulk-create tasks';
  END IF;

  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one user must be specified';
  END IF;

  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Enrich the payload with the user's ID and shared batch_id
    v_enriched := p_payload || jsonb_build_object(
      'owner_id', v_user_id,
      'batch_id', v_batch_id,
      'assign_target', 'bulk'
    );

    -- Reuse create_task for each user
    v_task_id := (create_task(v_enriched)->>'task_id')::uuid;
    v_task_ids := v_task_ids || v_task_id;
  END LOOP;

  RETURN jsonb_build_object('batch_id', v_batch_id, 'task_ids', to_jsonb(v_task_ids), 'count', array_length(v_task_ids, 1));
END;
$$;


-- 10. complete_milestone(p_milestone_id uuid, p_proof_path text)
-- Mark done, check if all milestones done
CREATE OR REPLACE FUNCTION complete_milestone(p_milestone_id uuid, p_proof_path text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_milestone RECORD;
  v_task RECORD;
  v_total int;
  v_done int;
  v_all_done boolean;
BEGIN
  SELECT * INTO v_milestone FROM milestones WHERE id = p_milestone_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  IF v_milestone.done THEN
    RAISE EXCEPTION 'Milestone already completed';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = v_milestone.task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent task not found';
  END IF;

  -- Only the milestone owner, task owner, or a manager can complete
  IF v_milestone.owner_id IS NOT NULL AND v_milestone.owner_id != v_actor
     AND v_task.owner_id != v_actor
     AND NOT can_manage_task(v_milestone.task_id) THEN
    RAISE EXCEPTION 'Not authorized to complete this milestone';
  END IF;

  -- Mark milestone done
  UPDATE milestones SET
    done = true,
    done_at = now(),
    proof_path = COALESCE(p_proof_path, proof_path)
  WHERE id = p_milestone_id;

  -- Log event
  INSERT INTO task_events (task_id, actor_id, type, note, meta)
  VALUES (v_milestone.task_id, v_actor, 'milestone_done', v_milestone.title,
    jsonb_build_object('milestone_id', p_milestone_id, 'proof_path', p_proof_path));

  -- Check if all milestones are done
  SELECT count(*), count(*) FILTER (WHERE done OR id = p_milestone_id)
  INTO v_total, v_done
  FROM milestones WHERE task_id = v_milestone.task_id;

  v_all_done := (v_total = v_done AND v_total > 0);

  RETURN jsonb_build_object(
    'milestone_id', p_milestone_id,
    'task_id', v_milestone.task_id,
    'milestones_done', v_done,
    'milestones_total', v_total,
    'all_milestones_done', v_all_done
  );
END;
$$;


-- 11. set_availability(p_status availability_status, p_until timestamptz)
-- Update profiles.availability
CREATE OR REPLACE FUNCTION set_availability(p_status availability_status, p_until timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old_status availability_status;
BEGIN
  SELECT availability INTO v_old_status FROM profiles WHERE id = v_actor;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  UPDATE profiles SET
    availability = p_status,
    availability_until = p_until
  WHERE id = v_actor;

  -- Log in audit
  INSERT INTO audit_log (actor_id, action, entity, entity_id, meta)
  VALUES (v_actor, 'availability_changed', 'profiles', v_actor,
    jsonb_build_object('from', v_old_status, 'to', p_status, 'until', p_until));

  RETURN jsonb_build_object('user_id', v_actor, 'availability', p_status, 'until', p_until);
END;
$$;


-- 12. mark_seen(p_task_id uuid)
-- If status='new', transition to 'seen', log event
CREATE OR REPLACE FUNCTION mark_seen(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_task RECORD;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Only transition if currently 'new'
  IF v_task.status != 'new' THEN
    -- Not an error; task was already seen or in a later state
    RETURN jsonb_build_object('task_id', p_task_id, 'status', v_task.status, 'changed', false);
  END IF;

  -- Only the owner can mark as seen
  IF v_task.owner_id IS NOT NULL AND v_task.owner_id != v_actor THEN
    RETURN jsonb_build_object('task_id', p_task_id, 'status', v_task.status, 'changed', false);
  END IF;

  UPDATE tasks SET status = 'seen' WHERE id = p_task_id;

  INSERT INTO task_events (task_id, actor_id, type, from_status, to_status)
  VALUES (p_task_id, v_actor, 'seen', 'new', 'seen');

  RETURN jsonb_build_object('task_id', p_task_id, 'status', 'seen', 'changed', true);
END;
$$;


-- 13. ack_announcement(p_announcement_id uuid)
-- Insert announcement_acks row
CREATE OR REPLACE FUNCTION ack_announcement(p_announcement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_ann RECORD;
BEGIN
  SELECT * INTO v_ann FROM announcements WHERE id = p_announcement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Announcement not found';
  END IF;

  IF NOT v_ann.requires_ack THEN
    RAISE EXCEPTION 'This announcement does not require acknowledgement';
  END IF;

  -- Insert ack (unique constraint will prevent duplicates)
  INSERT INTO announcement_acks (announcement_id, user_id)
  VALUES (p_announcement_id, v_actor)
  ON CONFLICT (announcement_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('announcement_id', p_announcement_id, 'user_id', v_actor, 'acked', true);
END;
$$;


-- 14. publish_draft(p_task_id uuid)
-- Transition from draft to new
CREATE OR REPLACE FUNCTION publish_draft(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_task RECORD;
  v_timing timing_type;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.status != 'draft' THEN
    RAISE EXCEPTION 'Can only publish draft tasks (current: %)', v_task.status;
  END IF;

  -- Only the creator or a manager can publish
  IF v_task.created_by != v_actor AND NOT can_manage_task(p_task_id) THEN
    RAISE EXCEPTION 'Not authorized to publish this task';
  END IF;

  -- Re-validate the golden rule before publishing
  v_timing := v_task.timing_type;
  IF v_timing = 'flexible' THEN
    IF v_task.due_at IS NOT NULL THEN
      RAISE EXCEPTION 'Flexible tasks must not have a due_at';
    END IF;
    IF v_task.review_on IS NULL THEN
      -- Set a default review_on
      UPDATE tasks SET review_on = (now() AT TIME ZONE 'Asia/Kolkata')::date + 7 WHERE id = p_task_id;
    END IF;
  ELSE
    IF v_task.due_at IS NULL THEN
      RAISE EXCEPTION 'Non-flexible tasks require a due_at before publishing';
    END IF;
  END IF;

  -- Publish: set status to new, clear is_draft
  UPDATE tasks SET
    status = 'new',
    is_draft = false
  WHERE id = p_task_id;

  INSERT INTO task_events (task_id, actor_id, type, from_status, to_status, note)
  VALUES (p_task_id, v_actor, 'created', 'draft', 'new', 'Published from draft');

  -- Notify owner if assigned
  IF v_task.owner_id IS NOT NULL AND v_task.owner_id != v_actor THEN
    INSERT INTO notifications (user_id, task_id, type, title, level, action_url)
    VALUES (v_task.owner_id, p_task_id, 'task_assigned',
            v_task.title || ' assigned to you',
            CASE WHEN v_timing = 'urgent' THEN 'urgent' ELSE 'info' END,
            '/tasks?task=' || p_task_id);
  END IF;

  RETURN jsonb_build_object('task_id', p_task_id, 'new_status', 'new');
END;
$$;

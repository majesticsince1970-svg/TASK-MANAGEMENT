-- Majestic Ops — Phase 3: Scheduled Jobs (pg_cron + pg_net)
-- Requires pg_cron and pg_net extensions (enabled on Supabase Pro+)

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ═══════════════════════════════════════════════
-- 1. Reminder tick — every 5 minutes
--    Checks reminder_rules against tasks approaching their due date
--    and inserts in-app notifications.
-- ═══════════════════════════════════════════════
SELECT cron.schedule('reminder-tick', '*/5 * * * *', $$
  INSERT INTO notifications (user_id, type, title, body, level, action_url, dedupe_key)
  SELECT
    t.owner_id,
    'reminder',
    'Reminder: ' || t.title,
    'Due in ' || r.trigger_minutes_before || ' minutes',
    CASE WHEN t.timing_type = 'urgent' THEN 'urgent' ELSE 'reminder' END,
    '/tasks?task=' || t.id,
    'reminder_' || t.id || '_' || r.id
  FROM reminder_rules r
  CROSS JOIN LATERAL (
    SELECT * FROM tasks
    WHERE status IN ('new', 'seen', 'in_progress')
      AND due_at IS NOT NULL
      AND owner_id IS NOT NULL
      AND due_at - NOW() <= (r.trigger_minutes_before || ' minutes')::interval
      AND due_at - NOW() > ((r.trigger_minutes_before - 5) || ' minutes')::interval
  ) t
  WHERE r.is_active = true
  ON CONFLICT (dedupe_key) DO NOTHING;
$$);

-- ═══════════════════════════════════════════════
-- 2. Release held tasks — every hour
--    Tasks that were assigned but not acted on for 4 hours
--    get released back to pool (owner cleared, status reset).
-- ═══════════════════════════════════════════════
SELECT cron.schedule('release-held', '0 * * * *', $$
  UPDATE tasks
  SET status = 'new', owner_id = NULL
  WHERE status = 'new'
    AND owner_id IS NOT NULL
    AND updated_at < NOW() - INTERVAL '4 hours';
$$);

-- ═══════════════════════════════════════════════
-- 3. Generate routine tasks — daily at 6 AM IST (00:30 UTC)
--    Creates task instances from active routines for today.
-- ═══════════════════════════════════════════════
SELECT cron.schedule('generate-routines', '30 0 * * *', $$
  INSERT INTO tasks (
    title, title_ml, department_id, created_by, timing_type,
    importance, status, due_at, proof_type, proof_rule,
    requires_approval, routine_id, routine_instance_date,
    source, owner_id
  )
  SELECT
    r.title, r.title_ml, r.department_id, r.created_by, r.timing_type,
    r.importance, 'new',
    CURRENT_DATE + r.due_offset_hours * INTERVAL '1 hour',
    r.proof_type,
    NULL,
    true, r.id, CURRENT_DATE,
    'routine', r.assignee_id
  FROM routines r
  WHERE r.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.routine_id = r.id AND t.routine_instance_date = CURRENT_DATE
    );
$$);

-- ═══════════════════════════════════════════════
-- 4. EOD prefill — daily at 5 PM IST (11:30 UTC)
--    Sends a notification reminding active users to submit EOD.
-- ═══════════════════════════════════════════════
SELECT cron.schedule('eod-prefill', '30 11 * * *', $$
  INSERT INTO notifications (user_id, type, title, body, level, action_url, dedupe_key)
  SELECT
    p.id,
    'eod_reminder',
    'Time to submit your EOD report',
    'Review your completed tasks and submit your end-of-day report.',
    'info',
    '/eod',
    'eod_reminder_' || p.id || '_' || CURRENT_DATE
  FROM profiles p
  WHERE p.is_active = true
    AND p.role NOT IN ('device', 'ai_system')
  ON CONFLICT (dedupe_key) DO NOTHING;
$$);

-- ═══════════════════════════════════════════════
-- 5. AI Analysis — every 45 minutes
--    Calls the ai-analyze edge function via HTTP.
-- ═══════════════════════════════════════════════
SELECT cron.schedule('ai-analyze', '*/45 * * * *', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ai-analyze',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- ═══════════════════════════════════════════════
-- 6. Daily digest — at 6 PM IST (12:30 UTC)
--    Calls the ai-digest edge function via HTTP.
-- ═══════════════════════════════════════════════
SELECT cron.schedule('daily-digest', '30 12 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ai-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- ═══════════════════════════════════════════════
-- Storage bucket for TTS cache
-- ═══════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-cache', 'tts-cache', false)
ON CONFLICT DO NOTHING;

CREATE POLICY tts_cache_read ON storage.objects
  FOR SELECT USING (bucket_id = 'tts-cache');

CREATE POLICY tts_cache_write ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tts-cache');

CREATE POLICY tts_cache_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'tts-cache');

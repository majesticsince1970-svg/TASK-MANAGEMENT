# MAJESTIC OPS — Product & Technical Specification (v2, build-ready)

> **For the Anti-Gravity agent:** This file is the single source of truth for the build. Save it in the repo as `docs/SPEC.md`. Read it fully before planning. When anything in a later chat message conflicts with this file, ask before deviating, then update this file so it stays true. Every page, button and status described here must be **connected end to end**: no dead buttons, no placeholder pages, no mock data in production code paths.

---

## 0. HOW YOU (THE AGENT) MUST WORK

1. **Plan first.** Before writing code, produce an *Implementation Plan* artifact: architecture, folder structure, full database schema (SQL), RLS policy list, route map, component list, Edge Function list, cron jobs, and a checklist per phase (section 17). Ask me any open questions. Wait for my "Go".
2. **Build in phases** (section 17). Never start the next phase until the current phase passes its *Definition of Done*.
3. **Verify in the browser after every phase.** Run the app, click through the acceptance scenarios in section 15 that belong to the phase, and show me a walkthrough with screenshots. List anything unfinished.
4. **Server enforces the rules.** Task status changes, date rules, permissions and approvals are enforced in Postgres (constraints, RLS, `SECURITY DEFINER` RPC functions). The UI only calls them. Never trust the client.
5. **Migrations only.** Every schema change is a numbered SQL migration in `supabase/migrations/`. Keep `supabase/seed.sql` working.
6. **Types are generated** from the database (`supabase gen types typescript`) into `src/types/database.ts`. No `any`.
7. **Secrets** live only in `.env.local`, Vercel env vars and Supabase secrets. Never commit or print keys. The AI key is used only inside Edge Functions, never in the browser.
8. Keep `docs/CHANGELOG.md` updated at the end of each phase.

---

## 1. PRODUCT SUMMARY

**Majestic Ops** is a standalone web application for **Majestic Jewellers**, a 55-year-old gold, diamond and silver jewellery showroom in Tirur, Kerala, India (est. 1970). It lets the owner, directors and department heads **assign tasks to any staff member in any department, with a mandatory date**. Staff get instant alerts and work from a **pinned note** of their next tasks. Work is finished with **proof**, **approved**, and **tracked automatically** through timestamps. An **AI Manager** watches all the data and tells the owner only what needs attention. It also understands **Malayalam voice** commands and can read results aloud.

- **Standalone:** no integration with other software (no Tally, no attendance kiosk, no CCTV, no WhatsApp). Everything needed (users, departments, availability/leave, routines, reports) lives inside this app. The only outside services are Supabase, Vercel, Web Push and the AI API.
- **Users:** about 20–60 staff across Management, Accounts, Social Media & Creative, HR & Administration, Sales Floor, Billing, Stock & Old Gold, and Security & Maintenance.
- **Devices:** shop PCs (Chrome/Edge on Windows), Android and iPhone phones (installable PWA), and a shared counter tablet or office TV.
- **Language:** English + Malayalam UI (toggle per user). Voice in Malayalam, English or mixed "Manglish".
- **Locale:** timezone `Asia/Kolkata`, currency INR (₹, Indian digit grouping: 1,82,300), dates `DD MMM YYYY`, 12-hour time.

---

## 2. TECH STACK & PROJECT SETUP

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript (strict) |
| UI | Tailwind CSS, shadcn/ui (Radix), Lucide icons, Framer Motion (subtle only) |
| Routing | React Router v6 (data routers, lazy routes, route guards by role) |
| Server state | TanStack Query v5 + Supabase Realtime subscriptions that invalidate queries |
| Client state | Zustand (UI state only: pinned-note window, voice session, filters) |
| Forms | react-hook-form + zod (the same zod schemas are used for Edge Function input) |
| Dates | date-fns + date-fns-tz (all display in Asia/Kolkata; store `timestamptz` in UTC) |
| Drag & drop | dnd-kit (board, weekly planner) |
| Charts | Recharts |
| Calendar | a custom month/week grid built with date-fns (no heavy calendar library) |
| i18n | i18next + react-i18next, namespaces `en` and `ml` |
| PWA | vite-plugin-pwa (installable, offline shell, service worker for Web Push) |
| Backend | Supabase: Postgres 15, Auth (email+password, plus a 4-digit PIN quick login on shared devices), Row Level Security, Realtime, Storage, Edge Functions (Deno), `pg_cron` + `pg_net` |
| Push | Web Push with VAPID keys, sent from an Edge Function |
| AI | Google Gemini API, called only from Edge Functions through one `ai/provider.ts` module (model names in env vars so they can be swapped) |
| Speech | Speech-to-text: Gemini audio input (Malayalam `ml-IN`). Text-to-speech: Google Cloud Text-to-Speech, Malayalam `ml-IN` voice. Both behind `speech/provider.ts`. Browser `speechSynthesis` is the fallback only. |
| Hosting | Vercel (frontend). Supabase cloud (backend). |
| Testing | Vitest + React Testing Library (units), Playwright (end-to-end scenarios in section 15) |

**Folder structure (suggested):**
```
src/
  app/            routes, layouts, guards, providers
  features/
    tasks/ routines/ projects/ approvals/ pinned-note/ notifications/
    dashboard/ people/ live-board/ reports/ messages/ ai/ voice/ settings/ auth/
  components/ui/  shadcn components
  components/     shared (TaskCard, StatusBadge, TimingBadge, DueCountdown, PersonAvatar, ProofViewer, EmptyState…)
  lib/            supabase client, query keys, date utils, work-order sort, i18n, push
  types/
supabase/
  migrations/  seed.sql  functions/<name>/index.ts  functions/_shared/
docs/  SPEC.md  CHANGELOG.md
```

**Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` (frontend). Supabase secrets: `GEMINI_API_KEY`, `GEMINI_MODEL_FAST`, `GEMINI_MODEL_SMART`, `GOOGLE_TTS_API_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `APP_BASE_URL`.

---

## 3. ROLES & PERMISSIONS

Every user has exactly one **role** and one primary **department**. They can also belong to extra departments as a helper.

| Capability | owner | director | dept_head | staff | device |
|---|---|---|---|---|---|
| Create task for anyone | ✅ | ✅ | own dept(s) | ❌ | ❌ |
| Request a task from a colleague (peer request, needs the colleague's dept head or owner OK) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create task for self | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve / reject submitted work | ✅ | ✅ | own dept | ❌ | ❌ |
| Change due date directly | ✅ | ✅ | own dept | ❌ (must request) | ❌ |
| Decide date-change requests | ✅ | ✅ | own dept | ❌ | ❌ |
| See all departments' tasks | ✅ | ✅ | own dept(s) | own + watched | assigned location only |
| Live board & activity | ✅ | if `settings.directors_see_activity` | own dept | own only | ❌ |
| AI Inbox | ✅ all | ✅ all | own dept only | ❌ | ❌ |
| Ask AI Manager (chat/voice) | ✅ | ✅ | ✅ (scoped to dept) | ✅ (own tasks, "how do I…") | ❌ |
| Routines, templates | ✅ | view | own dept | ❌ | ❌ |
| Settings, users, departments, rules | ✅ | view | ❌ | ❌ | ❌ |

- **AI system user** (`role = 'ai_system'`, cannot log in): may create *draft* tasks, AI alerts and comments. It may **never** approve, reject, delete, change dates or close tasks. Enforce this in RPCs.
- **Senior mode** (per-user boolean): Malayalam-first, 1.3× text, simplified home with three big buttons (Speak · My updates · Approvals). Intended for the directors.
- Seed users: Owner **Hadi Muhammad**; Directors **Abdul Latif**, **Ahmed** (senior mode on); Accounts head **James Sheary** (Senior Account Manager); Creative staff **Jelisha**, **Adil**; plus about 12 demo staff across the departments.

---

## 4. CORE CONCEPTS (the business rules)

### 4.1 Task timing types — REQUIRED on every task
The first choice when creating a task. It decides date rules, reminders, colour and sorting.

| `timing_type` | Label (EN / ML) | Date rule (enforced by DB check + RPC) | Default | Colour |
|---|---|---|---|---|
| `urgent` | Urgent / അടിയന്തരം | `due_at` required, must be today (IST) and ≤ 12 h from now | now + 1 h | red `#C62828` |
| `dated` | Dated / തീയതിയുള്ളത് | `due_at` required, between now and now + 30 days | today 6 pm or tomorrow 11 am | gold `#B8862B` |
| `long` | Long task / വലിയ ജോലി | `due_at` required, 7 days to 92 days ahead; **≥1 milestone required** (app suggests weekly milestones) | +30 days | maroon `#7A1F2B` |
| `flexible` | Flexible / സമയപരിധിയില്ല | `due_at` must be NULL; `review_on` (date) required, 1–60 days ahead | +7 days | grey `#8A7A72` |
| `repeating` | Repeating / ദിനചര്യ | Created only by the routine engine from a routine; `due_at` comes from the routine's due time | — | purple `#5B3FBF` |

**Golden rule:** no task can exist without either `due_at` or `review_on`. The constraint is `CHECK ((timing_type='flexible' AND due_at IS NULL AND review_on IS NOT NULL) OR (timing_type<>'flexible' AND due_at IS NOT NULL))`.

**Importance** is a separate field: `normal` | `important` (★).

### 4.2 Assignment
- `owner_id`: exactly **one** accountable person (required once assigned).
- Assignment target at creation: a **person**, a **role-in-department** (e.g. "Accounts · dept_head"), a **department** (goes to that department head's queue to pick a person), or **Open pool** (any eligible staff can claim it; first claim wins).
- `helpers[]`: can update and comment. `watchers[]`: get updates only.
- **Availability-aware:** each user has a status: `on_duty` | `on_break` | `with_customer` | `on_leave` | `off_shift`. Leave is recorded in-app (section 9, People). When assigning to someone `on_leave`/`off_shift`, show a warning: *Reassign · Assign anyway (starts when back)*.
- **Workload hint:** in the person picker, show a green/amber/red dot: open tasks due in the next 48 h (green < 5, amber 5–9, red ≥ 10).

### 4.3 Status machine (enforced by `transition_task` RPC)
```
draft ──(publish)──▶ new ──(open)──▶ seen ──(start)──▶ in_progress ──(submit)──▶ submitted ──(approve)──▶ done
                                       │                  │   ▲                     │
                                       │                  ▼   │(resume)             ▼(reject, reason required)
                                       │               blocked (reason + "waiting for" person)   sent_back ──(start)──▶ in_progress
                                       └──────────────(start directly from new also allowed)
any non-final ──(cancel by creator/owner/dept_head, reason required)──▶ cancelled
```
- `new` is set when the task is delivered. `seen` is set automatically the first time the owner opens the task, its alert or its pinned-note row.
- If `requires_approval = false` (allowed only when `proof_type = 'none'`), then `submit` goes straight to `done`.
- **Overdue** is a computed flag, not a status: `due_at < now() AND status NOT IN ('done','cancelled')`.
- Every transition writes a row to `task_events` (actor, from, to, timestamp, note, metadata). This is the automatic tracking: delivered/seen/started/submitted/approved times are computed from events.
- Timer: `in_progress` periods are summed into `actual_minutes`. `blocked` time is excluded.
- On `done` for a task in a **chain**, the next chain step is created automatically (section 4.8).

### 4.4 Proof types
`none` · `photo` (1–5 images, camera-first on mobile) · `file` · `video` · `number` (with optional expected value / tolerance / compare rule) · `checklist` (every step ticked, optional photo per step) · `signature` (canvas) · `link` · `payment_list` (rows: party, amount ₹, due date, notes; or an uploaded Excel/CSV that is parsed into rows) · `text_note`.
Files go to Supabase Storage bucket `proofs/{task_id}/…`, private, served by signed URLs.

### 4.5 Date-change requests
Staff cannot edit `due_at`. They press **"Need more time"**, choose a new date and give a reason. This creates a `date_change_requests` row and notifies the approver. Approve → `due_at` updated, event logged. Reject → reason sent back. Every task keeps `date_change_count`. Reports and the AI use it.

### 4.6 Reminders & escalation (defaults; editable in Settings → Rules)
| Type | On create | Not seen in 5 min | 1 day before | 2 h before | At due | +1 h overdue | +1 day overdue |
|---|---|---|---|---|---|---|---|
| urgent | full-screen alert + sound + push | repeat alert every 15 min until seen | – | – | dept head | owner | – |
| dated | push + in-app | push repeat | assignee | assignee | assignee | dept head | owner via AI Inbox |
| long | push + in-app | push repeat | each milestone like dated + weekly "% done" check-in every Monday 10:00 | | assignee | dept head | owner via AI Inbox |
| flexible | push + in-app | – | – | – | nudge on `review_on` 10:00: *Do now · Set a date · Snooze 7 days* | – | listed in digest after 2 snoozes |
| repeating | push when generated | push repeat | – | 30 min before | assignee | dept head | owner via AI Inbox |

- **Quiet hours:** no alerts outside the user's shift (`shift_start`–`shift_end`), except `urgent`.
- **`with_customer`** status holds back everything except `urgent`. Held items are released when the status changes.
- Escalation never repeats the same level twice for the same task. Store `escalation_level` on the task.

### 4.7 Work order (one sorting function, used everywhere)
`lib/workOrder.ts` sorts open tasks in this order: 1) urgent, 2) overdue (most overdue first), 3) due today (★ important first, then earliest), 4) milestones/dated due this week, 5) later this month, 6) later, 7) flexible (earliest `review_on`). Used by the pinned note, My Day, the voice "what next?" answer and the AI. Write unit tests for it.

### 4.8 Templates, routines, chains, projects
- **Template:** saved task blueprint (title EN/ML, description, timing type + default offset, proof type, checklist steps, default assignee rule, approver rule, importance, watchers). "Use template" opens the create form pre-filled.
- **Routine** (`repeating`): template + schedule (`daily` at time · `weekly` on days · `monthly` on day N or "last Saturday" · `custom cron`), active days, skip holidays (Settings → Holidays), assignee rule, start time and due time. The routine engine creates task instances ahead of time (section 6).
- **Chain:** ordered list of templates (e.g. Reel: Shoot → Edit → Caption approval → Post → Results after 48 h). Starting a chain creates step 1; approving step N creates step N+1 with its own due offset and assignee. Chain progress is shown on each task.
- **Long task / Project:** a `long` task with `milestones` (title, due_at, owner, done flag, optional proof). `% done` = completed milestones ÷ total, or a manual slider set in the weekly check-in. **At risk** when % done < % time elapsed − 15.
- **Corrective action:** a `number` proof that fails its rule (e.g. morning cash ≠ last night's closing ± tolerance), or a rejected checklist step, automatically creates an **urgent fix task** assigned to the approver's choice (default: the dept head), linked to the parent task, plus a Critical AI alert.

### 4.9 Open pool, bulk assign, handover
- **Open pool:** tasks with `owner_id NULL` and `pool_department_id`. Eligible staff see them on the Pick-up board and press *Claim* (atomic RPC; first wins). Points are awarded on done.
- **Bulk assign:** one form → N individual tasks (one per selected person) sharing a `batch_id`. The batch view shows the progress of all copies.
- **Handover:** "Hand over my open tasks" → choose a person or per-task targets → approver confirms → owners change, events logged, watchers told.

### 4.10 Points & scores
On-time done = 10 pts (+5 if important, +3 for pool claims). Late done = 3. `sent_back` = −2. Show a weekly score per person (on-time %, average delay, date changes) and a leaderboard (Settings toggle). No automatic punishment of any kind.

### 4.11 In-app activity (standalone limits)
A web app cannot see other Windows programs. Track only in-app signals: page visibility, focus, and pointer/keyboard activity inside the app while a task timer runs (idle after 3 min without input → pause prompt "Still working on X?"). Store `activity_sessions` aggregated per minute. Show active/idle on the Live board **only** to roles allowed in section 3. Staff can always see their own data. Show the privacy notice at onboarding.

---

## 5. DATABASE (Postgres, schema `public`)

Create enums: `user_role`, `availability_status`, `timing_type`, `importance`, `task_status`, `proof_type`, `assign_target`, `event_type`, `alert_level`, `notif_channel`, `request_status`.

Tables (all with `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at` + trigger):
- **profiles** (`id` = auth.users.id): full_name, full_name_ml, phone, role, department_id, extra_department_ids uuid[], language ('en'|'ml'), senior_mode bool, shift_start time, shift_end time, availability availability_status, availability_until timestamptz, avatar_url, aliases text[] (nicknames and Malayalam spellings for voice matching, e.g. "ജെയിംസ്", "James sir"), job_title, points int, is_active, pin_hash (devices/shared login).
- **departments**: name, name_ml, color, head_id → profiles, sort_order.
- **leaves**: user_id, from_date, to_date, reason, approved_by, status.
- **holidays**: date, name.
- **tasks**: title, title_ml, description, department_id, created_by, owner_id (nullable for pool/draft), assign_target, pool_department_id, helpers uuid[], watchers uuid[], timing_type, importance, status, due_at timestamptz null, review_on date null, snooze_count int, started_at, submitted_at, completed_at, estimate_minutes, actual_minutes, proof_type, proof_rule jsonb (expected/tolerance/compare_to), requires_approval bool, approver_id, report_back_to uuid (person who wants the result read aloud), read_aloud bool, template_id, routine_id, routine_instance_date, chain_run_id, chain_step int, parent_task_id (corrective/sub-tasks), batch_id, escalation_level int, date_change_count int, source ('owner'|'manager'|'staff'|'routine'|'chain'|'ai'|'voice'|'corrective'), voice_note_id, is_draft bool. Constraints from 4.1. Indexes on (owner_id,status), (department_id,status), (due_at), (review_on), (routine_id, routine_instance_date) unique.
- **task_checklist_items**: task_id, position, text, text_ml, requires_photo, done, done_by, done_at, photo_path.
- **milestones**: task_id, title, due_at, owner_id, done, done_at, proof_path, position.
- **task_events**: task_id, actor_id, type (created, delivered, seen, started, paused, resumed, blocked, unblocked, submitted, approved, rejected, cancelled, reassigned, date_changed, date_change_requested, comment, proof_added, escalated, claimed, handed_over, milestone_done, ai_flagged), from_status, to_status, note, meta jsonb, at timestamptz.
- **proofs**: task_id, kind, storage_path, value_numeric, value_text, rows jsonb (payment_list), check_passed bool, check_message, ai_check jsonb, submitted_by.
- **date_change_requests**: task_id, requested_by, old_due_at, new_due_at, reason, status, decided_by, decided_at, decision_note.
- **comments**: task_id, author_id, body, voice_path, mentions uuid[].
- **templates**: name, name_ml, department_id, blueprint jsonb (zod-validated), created_by, is_active.
- **routines**: template_id, schedule jsonb, start_time, due_time, assignee_rule jsonb, skip_holidays, active, next_run_at, last_generated_for date.
- **chains** / **chain_steps** (chain_id, position, template_id, due_offset_minutes, assignee_rule) / **chain_runs** (chain_id, started_by, current_step, status).
- **notifications**: user_id, task_id, type, title, title_ml, body, body_ml, level (info|reminder|alert|urgent), action_url, channels notif_channel[], delivered_at, read_at, held_until (quiet hours / with_customer), dedupe_key unique.
- **push_subscriptions**: user_id, endpoint unique, p256dh, auth, device_label, last_seen_at.
- **reminder_rules** / **escalation_rules**: per timing_type, offsets (minutes) and targets (assignee|dept_head|owner|ai_inbox). Seeded with 4.6 defaults.
- **announcements**: title, body, body_ml, audience (all | department_ids | user_ids), requires_ack, created_by; **announcement_acks** (announcement_id, user_id, acked_at).
- **eod_reports**: user_id, report_date, completed_summary, blockers, tomorrow_plan, ai_prefill jsonb, submitted_at. Unique (user_id, report_date).
- **activity_sessions** (in-app activity only; see 4.11): user_id, task_id, started_at, ended_at, active_seconds, idle_seconds, device.
- **ai_alerts**: level (critical|important|insight), title, explanation, evidence jsonb (task ids, numbers), suggested_action, suggested_assignee_id, department_id, status (open|actioned|snoozed|dismissed), snoozed_until, source ('rule'|'ai'), rule_key, dedupe_key unique, created_for (owner|director|dept_head scope).
- **ai_feedback**: alert_id, user_id, verdict (useful|not_important), note.
- **ai_digests**: digest_date, scope, content_md, content_ml_md, audio_path.
- **ai_usage**: function_name, model, input_tokens, output_tokens, cost_estimate_inr, at.
- **voice_notes**: user_id, storage_path, duration_s, transcript, language, parsed jsonb, readback_text, readback_audio_path, outcome (confirmed|changed|cancelled), task_id.
- **app_settings** (single row): shop name, timezone, working days, default shift, quiet-hours behaviour, leaderboard_enabled, directors_see_activity, digest_time (default 21:00), ai_enabled, voice_enabled, holidays link, privacy policy text, retention days (activity 90).
- **audit_log**: actor_id, action, entity, entity_id, meta, at. Written by triggers for profile/role changes, settings changes, deletions, and "viewed another person's activity".

**RLS:** enable on every table. Policies follow section 3, using helper SQL functions `auth_role()`, `auth_departments()`, `can_see_task(task_id)`, `can_manage_task(task_id)`. Staff see a task only if they are its owner, helper, watcher, creator, report_back_to, or it is in an open pool for their department.

**RPC functions (SECURITY DEFINER, validate everything, write task_events):**
`create_task(payload jsonb)`, `publish_draft(task_id)`, `transition_task(task_id, action, note, meta)`, `submit_task(task_id, proof jsonb)`, `approve_task(task_id, note)`, `reject_task(task_id, reason)`, `request_date_change(task_id, new_due, reason)`, `decide_date_change(request_id, approve bool, note)`, `change_due_date(task_id, new_due, reason)` (managers), `snooze_flexible(task_id, days)`, `claim_pool_task(task_id)`, `reassign_task(task_id, new_owner, note)`, `handover_tasks(from_user, mapping jsonb)`, `bulk_create_tasks(payload, user_ids[])`, `start_chain(chain_id, overrides)`, `complete_milestone(milestone_id, proof)`, `set_availability(status, until)`, `mark_seen(task_id)`, `ack_announcement(id)`, plus read-only analytics functions used by dashboards and the AI (section 7.4).

---

## 6. AUTOMATION ENGINE (pg_cron + Edge Functions)

| Job | Schedule | What it does |
|---|---|---|
| `generate_routines` | every 5 min | For each active routine, create the next instance(s) up to 24 h ahead (idempotent by unique (routine_id, routine_instance_date)), skip holidays/non-working days, resolve the assignee rule (if that person is on leave → dept head's queue + notice). |
| `reminder_tick` | every minute | Find tasks hitting a reminder offset or escalation step (4.6 + rules tables), create `notifications` with a `dedupe_key`, bump `escalation_level`, write `escalated` events. |
| `flexible_nudges` | daily 10:00 IST | Nudge flexible tasks whose `review_on` is today. |
| `long_task_checkins` | Mon 10:00 IST | Ask owners of long tasks for % done; flag at-risk. |
| `release_held` | every minute | Release notifications whose `held_until` has passed or whose user is now `on_duty`. |
| `dispatch_notifications` | DB webhook on insert + every minute sweep | Edge Function `notify`: in-app (Realtime picks it up), Web Push to all of the user's subscriptions; urgent = high-priority push with `requireInteraction`. Removes dead subscriptions on 404/410. |
| `ai_rules` | every 5 min | Layer-1 rule checks (7.2) → `ai_alerts` (dedupe). |
| `ai_analysis` | every 45 min, 10:00–21:00 IST | Edge Function `ai-analyze` (7.3). |
| `daily_digest` | at `app_settings.digest_time` | Edge Function `ai-digest`: digest per owner/director (EN + ML text + ML audio). |
| `eod_prefill` | 19:00 IST | Pre-fill EOD drafts from the day's events. |
| `retention` | daily 03:00 | Delete `activity_sessions` older than the retention days; keep aggregates. |

All time logic uses `Asia/Kolkata`. All jobs are idempotent and safe to re-run.

---

## 7. AI MANAGER

### 7.1 Principles
The AI suggests, explains and reminds. People decide. It never approves, rejects, penalises, deletes, or changes dates or pay. Every AI output is stored, and every alert links to its evidence. Send compact JSON summaries to the model, never raw tables. Log every call in `ai_usage` and show the monthly cost in Settings → AI.

### 7.2 Layer 1 — rules (SQL, instant, free)
Seed rule keys: `urgent_unseen_10m`, `critical_overdue_15m`, `overdue_1d`, `proof_number_mismatch`, `rejected_twice`, `date_changed_3x`, `routine_missed`, `eod_missing`, `long_task_at_risk`, `overload_person` (≥10 tasks due in 48 h), `assigned_to_absent`, `approval_waiting_24h`, `pool_unclaimed_4h`. Each produces an `ai_alerts` row with level, evidence and a suggested action.

### 7.3 Layer 2 — AI analysis (Edge Function `ai-analyze`)
Input: a JSON summary of the last period (per department: counts by status, overdue list, slow tasks, date changes, rejections, workload per person, long-task progress, the last 14 days' trends, recent `ai_feedback` verdicts so it learns what *not* to send). System prompt: "You are the operations manager of a Kerala jewellery showroom…". Return **strict JSON** (validated with zod; retry once on invalid):
```json
{"alerts":[{"level":"critical|important|insight","title":"…","title_ml":"…","explanation":"…","evidence_task_ids":["…"],"suggested_action":"…","suggested_assignee_id":"…|null","department_id":"…|null","dedupe_key":"…"}]}
```
Look for: patterns (the same routine missed on the same weekday), overload/imbalance, drifting close times, slipping long tasks, people who often move dates, and praise-worthy streaks.

### 7.4 Ask the AI Manager (chat + voice)
Edge Function `ai-ask` uses Gemini **function calling** with read-only tools that wrap SQL functions scoped by the caller's role: `get_tasks(filters)`, `get_overdue(dept?)`, `get_person_summary(user, period)`, `get_department_summary(dept, period)`, `get_workload(next_hours)`, `get_routine_compliance(routine?, period)`, `get_eod_status(date)`, `get_long_tasks()`, `search_tasks(text)`. A tool `draft_task(payload)` may create a **draft** for the user to confirm on screen. Answers are in the user's language. Every answer has a speaker button and is auto-read in senior mode. Show cited task chips under each answer.

### 7.5 Deadline intelligence (in the create form)
While creating a task, call `ai-suggest-date` (cheap model) with the task type, assignee history and workload: show "Usually takes James ~3 days; Friday is tight. Suggest Mon 11 am?" with *Use this* / *Keep mine*. Warn about holidays, leave, and an overloaded day.

### 7.6 AI Inbox UI
Cards: level colour, title, why it matters, evidence chips (open task drawer), suggested action, buttons **Do it** (pre-filled create-task or reassign dialog) · **Assign** · **Snooze** (1 h / tomorrow / 1 week) · **Not important** (writes ai_feedback). Filters: level, department, source. A count badge in the sidebar.

---

## 8. MALAYALAM VOICE (Speak → Hear → OK)

**Flow (route `/voice/new` and the global mic button):**
1. Hold-to-talk (pointer down = record; release = stop; max 60 s) using MediaRecorder (webm/opus; fall back to mp4 on iOS). Live waveform.
2. Upload to Storage `voice/{user}/{id}` → Edge Function `voice-to-task`: STT (Gemini audio, Malayalam/English/Manglish) → transcript → LLM parse to the **create_task payload** JSON (title_en, title_ml, owner match, timing_type, due_at/review_on, importance, proof_type, report_back_to = speaker, read_aloud = true when the user asks to hear the result) → server-side validation.
3. **Name matching** only against `profiles` (fuzzy match on English + Malayalam names and nicknames in `profiles.aliases`). More than one match → ask "ഏത് ജെയിംസ്?" with big name buttons. No match → ask again.
4. **Date rule applies.** If no date or type can be inferred, ask by voice and on screen: "എന്നത്തേക്ക് വേണം?" with quick chips (Today · Tomorrow · This week · End of month · No fixed date → flexible + review date).
5. **Read-back:** build one Malayalam sentence, e.g. *"ജെയിംസ് ഷിയറിക്ക് ഈ മാസം കൊടുക്കാനുള്ള പേയ്‌മെന്റുകളുടെ ലിസ്റ്റ് തയ്യാറാക്കാൻ ടാസ്ക് കൊടുക്കട്ടെ? വെള്ളിയാഴ്ച വൈകുന്നേരം 5 മണിക്ക് മുമ്പ്."* → TTS (Edge Function `tts`, cached by text hash in Storage) → autoplay + show it in large text, with a summary card (who, type, date, proof).
6. Buttons: **ശരി · OK** (huge, green) → `create_task` · **മാറ്റുക · Change** (speak a correction; the LLM edits the draft; read back again) · **വേണ്ട · Cancel**. Nothing is ever created without OK. Store everything in `voice_notes`.
7. **Read-out of results:** when a task with `read_aloud = true` is approved or submitted, the `report_back_to` person gets a notification "Result ready: tap to hear". The screen `/tasks/:id/listen` plays the result in Malayalam item by item (for `payment_list`: party, amount in Indian words such as "ഒരു ലക്ഷത്തി എൺപത്തിരണ്ടായിരത്തി മുന്നൂറ് രൂപ", due date), then the total. Buttons: **ശരി · Approve** · **വീണ്ടും കേൾക്കുക · Repeat** · **ചോദിക്കുക · Ask** (voice reply → comment to the owner).
8. Voice also works in Ask AI (7.4) and for quick commands on My Day: "what's next?", "start", "done", "need more time till Monday".

**Test phrases (must pass):**
- "ജെയിംസിനെ കൊണ്ട് ഈ മാസം കൊടുക്കാനുള്ള പേയ്‌മെന്റ്സ് ലിസ്റ്റ് വെള്ളിയാഴ്ചക്കകം ഉണ്ടാക്കാൻ പറയൂ" → dated, James, Fri 17:00, payment_list, read_aloud.
- "Adil, Diwali reel edit cheythu naale vaikunneram upload cheyyu" → dated, Adil, tomorrow 18:00, video.
- "ippo thanne locker-il ninnu bridal set eduthu kondu varan para, Jelisha" → urgent, Jelisha, +30 min.
- "puthiya packaging supplier-ine kandu pidikkanam, samayam undu" → flexible, review in 7 days, asks who.

---

## 9. PAGES, ROUTES & CONNECTIONS

Global layout (desktop): left sidebar (collapsible) + top bar (search ⌘K, global **+ New task**, global 🎤 mic, notification bell with count, availability switcher, language toggle, profile). Mobile: bottom tab bar (Home · Tasks · + · Inbox/Alerts · Me), with a floating mic. Every task title anywhere opens the **Task drawer** (`?task=:id` query param, so the URL is shareable and the back button closes it).

| Route | Page | Who | Contents & connections |
|---|---|---|---|
| `/login`, `/pin` | Login, device PIN | all | Email+password; shared device picks a name + 4-digit PIN. |
| `/onboarding` | First login | all | Language, shift, notification permission, install PWA prompt, read & accept the monitoring/privacy policy (stored). |
| `/` | **Home dashboard** (role-based, 9.1) | all | The pinned note sits at the top, always. |
| `/tasks` | **Tasks** with tabs: My tasks · Assigned by me · Team · Watching · Pick-up board | role-based | Views: **List** (work order) · **Board** (columns by status, drag = allowed transitions only) · **Calendar** (month/week; drag to reschedule → change-due or date-request flow) · **Timeline** (long tasks + milestones). Filters: department, person, type, importance, status, overdue, date range; saved filters. |
| `/tasks/new` | **Create task** (9.2) | per role | Also opens as a dialog from anywhere. "Use template", "Start chain", "Bulk assign" modes. |
| `?task=:id` | **Task drawer / detail** (9.3) | per RLS | Full detail, actions, proof, history, comments. |
| `/tasks/:id/listen` | **Listen to result** | report_back_to | Malayalam read-out + Approve/Repeat/Ask. |
| `/voice/new` | **Voice task** | all except device | Section 8. |
| `/approvals` | **Approvals** | approvers | Tabs: Work to approve (swipe gallery: Approve / Send back with reason) · Date-change requests · Peer requests · Handover requests. |
| `/routines` | Routines list + editor | owner, dept_head | Schedule builder, preview of the next 10 dates, compliance % per routine (link to report). |
| `/templates` | Templates + chains | owner, dept_head | Builder for steps, proof and rules; chain editor (drag order). |
| `/projects` | Long tasks | all (scoped) | Cards with % done vs % time, at-risk badge, milestones timeline, weekly check-in history. |
| `/ai` | **AI Manager**: Inbox · Ask · Digests | owner, director, dept_head | Section 7. |
| `/live` | **Live board** | owner, director*, dept_head | Grid of people: availability, current task + timer, today done/total, overdue count, in-app active/idle (4.11). Auto-refresh via Realtime. Click → person page. |
| `/people` | People list | managers | Search, department filter, workload bar. |
| `/people/:id` | **Person page** | managers, self | Profile, today timeline (from task_events), open tasks, scores, date-change history, leave, EOD history. |
| `/messages` | Announcements | all | Create (managers), "I have read this" acknowledgement with % read; task comments feed with @mentions. |
| `/reports` | Reports | managers | Completion & on-time % by department/person/period, overdue aging, routine compliance heat map (routine × day), date-change stats, workload, points leaderboard, AI cost. CSV + PDF export. |
| `/eod` | End of day | staff | Pre-filled form; managers see submissions + missing list. |
| `/notifications` | Notification centre | all | All alerts; mark read; deep links. |
| `/settings/*` | Settings | owner (others view parts) | Shop · Departments · Users & roles (invite, deactivate, reset PIN, aliases for voice) · Shifts & holidays · Reminder & escalation rules · Proof rules · Points · AI (on/off, models, cost, rule toggles) · Voice (voice choice, speed, senior mode defaults) · Privacy & retention · Devices (shared tablet/TV) · Data export. |
| `/me` | My profile | all | Language, senior mode, notification test, push devices, availability, leave request, my scores. |
| `/tv` | Wall TV mode | owner/device | Full-screen dark Control Room, auto-rotating panels, no interaction needed. |

### 9.1 Home dashboards
- **Owner / Director (Control Room):** Pinned note "Needs me" (approvals, date requests, critical AI alerts) · AI Inbox top 3 · department tiles (done / in progress / overdue bars, click → `/tasks?dept=`) · Next 30 days deadline strip · long tasks at risk · people now (availability counts, click → `/live`) · today's routine compliance ring · Ask AI box with mic. Senior mode = three giant buttons (Speak · My updates · Approvals) + the pinned note.
- **Dept head:** pinned note (own) · team board snapshot · to approve · team availability · routine checklist % · dept AI alerts.
- **Staff (My Day):** pinned note · today's routine checklist by slot (morning / midday / closing) · my week strip · my score · Pick-up board teaser.
- **Device (counter/TV):** shared location board: today's shared checklists, urgent tasks for that location, announcements; tap your name + PIN to act.

### 9.2 Create task form (in this order; only 1–4 required)
1. What (title; AI tidy-up + auto Malayalam translation button) 2. Who (person / role / department / open pool / bulk; availability + workload dots; AI "best person" suggestion) 3. **Timing type** (5 big segmented buttons, colour-coded) 4. **Date** (adapts to type: quick chips Today · Tomorrow · This Sat · End of month · Pick; time chips; flexible → "check again on"; long → final date + auto-suggested milestones editable) 5. Importance 6. Proof type (+ rules for number) 7. Checklist steps 8. Approver (default: creator) + "read result aloud to me" 9. Watchers/helpers 10. Attachments / voice note for instructions 11. Estimate. Footer: AI date suggestion banner (7.5), **Save as template**, **Send**. Validation errors are shown inline in EN/ML.

### 9.3 Task drawer
Header: title, timing badge, importance star, status pill, due countdown (red when overdue), owner avatar. Primary action button changes by state and role: *Start* · *Submit with proof* · *Approve / Send back* · *Claim*. Secondary: *Need more time* · *Blocked* · *Reassign* · *Hand over* · *Cancel* · *Duplicate* · *Save as template*. Sections: instructions (with voice note player), checklist, milestones (long), proof viewer/uploader (camera-first on mobile), chain progress, linked tasks (parent/corrective/batch), comments with @mentions and voice comments, **history timeline** (task_events with timestamps: delivered, seen, started…), time tracked.

---

## 10. PINNED NOTE (signature feature)
- Component `<PinnedNote/>`: the top 5 tasks from the work-order sort for the current user (owner/director variant = "Needs me"). Each row: colour dot, title, countdown/"overdue 40 min", one primary button (Start / Done / Upload / Open). Footer: "Today 3/6 done · +4 more this month". Collapses to a slim tab.
- **Placements:** (a) top of every Home dashboard; (b) a floating draggable widget on every desktop page (remembers its position in localStorage); (c) **"Pop out" button → Document Picture-in-Picture window** (`window.documentPictureInPicture.requestWindow({width: 340, height: 420})`) rendered through a React portal, copying stylesheets, so the note **stays on top of Tally, Excel and other programs** on the shop PC. Feature-detect: hide the button where unsupported (Safari, mobile). Re-open with one click (needs a user gesture). It closes when the main tab closes, so show a banner "Keep this tab open" and offer "Install app" (PWA window) to make that easy.
- Updates live via Realtime. A new urgent task makes the note pulse + play a chime (respect a mute toggle) and, if the tab is hidden, also fires a system notification.

## 11. NOTIFICATIONS & ALERTS
- In-app: toast for info, **full-screen modal for urgent** (sound, cannot be dismissed without *Accept & start* or *Can't now → reason*), and a bell centre. Uses Realtime on `notifications` filtered by user_id.
- Web Push via service worker on desktop and phone (iOS only after Add to Home Screen; the onboarding screen explains this with pictures). Click → deep link to `?task=:id` or the relevant page. Settings → Me → "Send test notification".
- Respect quiet hours, `with_customer`, and dedupe. All notification texts exist in EN + ML.

## 12. DESIGN SYSTEM
- **Brand:** premium jewellery house. Light theme for staff: ivory `#FBF7F1` background, white surfaces, ink `#1E1215`, maroon primary `#7A1F2B`, gold accent `#D4A853` (decorative; use `#8A6420` for gold text). Dark Control Room/TV: `#120A0C` background, `#1E1215` surfaces, gold accent.
- **Semantic colours (same everywhere):** urgent/overdue red, at-risk amber `#C77A1E`, on-time green `#2E7D4F`, AI purple `#5B3FBF`, plus the timing-type colours from 4.1.
- **Type:** Inter (UI), Noto Sans Malayalam (ML text), Cormorant Garamond for the logo wordmark only. Base 15 px; senior mode 1.3×.
- **Components:** TaskCard, TaskRow, StatusPill, TimingBadge, DueCountdown, AvailabilityDot, WorkloadDot, ProofUploader, ProofViewer, PersonPicker, DateQuickPicker, EmptyState (illustrated, with a next action), Skeletons. Touch targets ≥ 44 px. WCAG AA contrast. Keyboard shortcuts on desktop (N new task, / search, J/K move, S start, D done).
- **States:** every list/page has loading skeleton, empty state, error state with retry, and offline banner. Actions queue offline (IndexedDB) and sync when back online, with conflict messages.
- **Microcopy:** short, friendly, bilingual. Never blame staff in UI text.

## 13. SECURITY & PRIVACY
RLS on all tables; Storage policies mirror task visibility; signed URLs (10 min). Rate-limit Edge Functions per user. Validate every Edge Function input with zod. Audit log as in section 5. Monitoring/privacy policy shown at onboarding with recorded acceptance (India DPDP-friendly: disclosed, proportionate, work-only, retention limits, staff can see their own data). No keystroke content, no screenshots.

## 14. SEED DATA (`supabase/seed.sql` + a `scripts/seed-demo.ts`)
8 departments; the users in section 3 (passwords in README for demo only); 60 tasks across all types and statuses (including overdue, sent back, blocked, date-change pending, pool, long with milestones); routines: Accounts 10:00 cash & safe count (number proof vs. last closing), 13:00 vendor & bank entries, 20:00 sales-to-cash & metal ledger; Creative 10:30 gold-rate post (photo), Monday weekly content plan; HR 11:00 attendance anomalies, daily CCTV uptime (photo); Floor opening tray count (checklist + photo per counter), closing stock check; monthly "Payments due this month" on the 1st for James (payment_list, read aloud to owner). Chain: Reel pipeline (Shoot → Edit → Caption approval → Post → Results after 48 h). 10 AI alerts, holidays, announcements.

## 15. END-TO-END ACCEPTANCE SCENARIOS (Playwright + manual walkthrough)
1. **Dated task:** Owner creates "Payments due this month list" for James, dated Fri 17:00, payment_list proof, read aloud ON → James gets an in-app alert + push within 3 s → opens (seen logged) → Start → uploads 5 payment rows → Submit → Owner gets "Result ready" → `/listen` plays it in Malayalam → Approve → done; history shows all timestamps; points awarded.
2. **Urgent:** Director creates an urgent task for Jelisha → full-screen modal + sound on her device → she does not open it → after 5 min repeat + escalation to the dept head at due time → the AI Inbox shows `urgent_unseen_10m`.
3. **Flexible:** a task with review in 7 days → no red state ever → on the review date a nudge appears → Snooze twice → it appears in the digest.
4. **Long task:** "Full stock audit by 30 Dec" with 4 weekly milestones → Monday check-in → % done below % time → at-risk badge + AI alert.
5. **Routine + corrective:** 10:00 cash count is auto-generated → staff enter a number ₹4,200 below the last closing → proof check fails → an urgent fix task is auto-created + a critical AI alert.
6. **Date change:** staff press "Need more time" → approver approves from `/approvals` → due updated, `date_change_count` = 1, event logged.
7. **Chain:** start the Reel chain → approve "Edit" → "Caption approval" is auto-created for the owner with its due offset.
8. **Pool + bulk + handover:** bulk task to 5 floor staff → batch progress view; a pool task claimed by the first person; handover of 3 tasks before leave.
9. **Pinned note:** on a desktop, pop out to Picture-in-Picture → create an urgent task for that user from another browser → the PiP note pulses and updates without a refresh.
10. **Voice:** the four test phrases in section 8 produce correct drafts, with read-back audio, and OK creates them; "Change" correctly edits the date.
11. **Ask AI:** "ഇന്ന് ആരൊക്കെ EOD സബ്മിറ്റ് ചെയ്തില്ല?" → correct names (from data), spoken answer, task chips.
12. **Permissions:** a staff user cannot open another department's task by URL; a dept head cannot approve outside their department; the AI system user cannot approve (RPC rejects).

## 16. NON-FUNCTIONAL
- Performance: first load < 2.5 s on 4G (code-split routes); lists virtualised beyond 100 rows; realtime channel per user plus one per department.
- Reliability: all cron jobs idempotent; Edge Functions retry with backoff; dead push subscriptions cleaned.
- Testing: unit tests for workOrder, date rules, status machine, proof checks; Playwright for section 15.
- Docs: README (setup Supabase project, run migrations, set secrets, generate VAPID keys, deploy Edge Functions, cron setup, Vercel deploy), `docs/USER_GUIDE.md` (short, EN + ML) and `docs/ADMIN_GUIDE.md`.

## 17. PHASES & DEFINITION OF DONE
| Phase | Scope | Done when |
|---|---|---|
| **0 · Plan** | Implementation plan, questions, repo scaffold, Supabase + Vercel connected, CI (lint, typecheck, test) | Plan approved, `npm run dev` shows the login page, a Vercel preview URL works |
| **1 · Foundation** | Auth, PIN devices, onboarding, profiles, departments, roles, RLS helpers, layout (sidebar/topbar/mobile tabs), design system, i18n EN/ML, settings (shop, departments, users), seed | Every role logs in and sees the correct navigation; RLS tests pass |
| **2 · Task core** | Schema + RPCs for tasks/events/proofs/checklists/date requests; create form; task drawer; My tasks / Assigned by me / Team (list, board, calendar); proof upload; approvals page; date-change flow; history timeline | Scenarios 1 (without voice/listen), 6 and 12 pass |
| **3 · Alerts & pinned note** | Notifications table, Realtime, full-screen urgent modal, Web Push + service worker, reminder/escalation engine (cron), quiet hours, with_customer, pinned note (home, floating, Picture-in-Picture), availability + leave | Scenarios 2, 9 pass; push works on Chrome desktop and Android; iOS instructions shown |
| **4 · Workflows** | Templates, routines engine, chains, long tasks + milestones + check-ins, corrective actions, open pool, bulk, handover, holidays | Scenarios 3, 4, 5, 7, 8 pass |
| **5 · Dashboards & reports** | Role home dashboards, live board, people pages, in-app activity, announcements with acks, EOD, reports + exports, points/leaderboard, TV mode | All dashboards use real data; reports match the seed data |
| **6 · AI Manager & voice** | AI rules, ai-analyze, AI Inbox, digest (EN/ML + audio), Ask AI with tools, deadline intelligence, voice-to-task, TTS read-back, listen page, senior mode, ai_usage | Scenarios 10, 11 pass; daily AI cost shown |
| **7 · Hardening & launch** | Offline queue, accessibility pass, performance, Playwright suite green, docs, production deploy, backup notes | All 12 scenarios pass on production |

## 18. OUT OF SCOPE (v1)
Integrations with any other software; OS-level PC monitoring outside the browser; payroll; customer-facing features; native app-store apps.

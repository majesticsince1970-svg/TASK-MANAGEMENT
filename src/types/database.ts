// Database types - will be auto-generated from Supabase schema
// For now, hand-written types matching our schema

export type UserRole = 'owner' | 'director' | 'dept_head' | 'staff' | 'device' | 'ai_system';
export type AvailabilityStatus = 'on_duty' | 'on_break' | 'with_customer' | 'on_leave' | 'off_shift';
export type TimingType = 'urgent' | 'dated' | 'long' | 'flexible' | 'repeating';
export type Importance = 'normal' | 'important';
export type TaskStatus = 'draft' | 'new' | 'seen' | 'in_progress' | 'blocked' | 'submitted' | 'sent_back' | 'done' | 'cancelled';
export type ProofType = 'none' | 'photo' | 'file' | 'video' | 'number' | 'checklist' | 'signature' | 'link' | 'payment_list' | 'text_note';
export type AssignTarget = 'person' | 'role_in_department' | 'department' | 'open_pool' | 'bulk';
export type EventType = 'created' | 'delivered' | 'seen' | 'started' | 'paused' | 'resumed' | 'blocked' | 'unblocked' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'reassigned' | 'date_changed' | 'date_change_requested' | 'comment' | 'proof_added' | 'escalated' | 'claimed' | 'handed_over' | 'milestone_done' | 'ai_flagged';
export type AlertLevel = 'critical' | 'important' | 'insight';
export type NotifChannel = 'in_app' | 'push' | 'email';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  full_name_ml: string | null;
  phone: string | null;
  role: UserRole;
  department_id: string | null;
  extra_department_ids: string[];
  language: 'en' | 'ml';
  senior_mode: boolean;
  shift_start: string | null;
  shift_end: string | null;
  availability: AvailabilityStatus;
  availability_until: string | null;
  avatar_url: string | null;
  aliases: string[];
  job_title: string | null;
  points: number;
  is_active: boolean;
  pin_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  name_ml: string | null;
  color: string;
  head_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  title_ml: string | null;
  description: string | null;
  department_id: string | null;
  created_by: string;
  owner_id: string | null;
  assign_target: AssignTarget;
  pool_department_id: string | null;
  helpers: string[];
  watchers: string[];
  timing_type: TimingType;
  importance: Importance;
  status: TaskStatus;
  due_at: string | null;
  review_on: string | null;
  snooze_count: number;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  estimate_minutes: number | null;
  actual_minutes: number;
  proof_type: ProofType;
  proof_rule: Record<string, unknown> | null;
  requires_approval: boolean;
  approver_id: string | null;
  report_back_to: string | null;
  read_aloud: boolean;
  template_id: string | null;
  routine_id: string | null;
  routine_instance_date: string | null;
  chain_run_id: string | null;
  chain_step: number | null;
  parent_task_id: string | null;
  batch_id: string | null;
  escalation_level: number;
  date_change_count: number;
  source: 'owner' | 'manager' | 'staff' | 'routine' | 'chain' | 'ai' | 'voice' | 'corrective';
  voice_note_id: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  created_at: string;
}

export interface Leave {
  id: string;
  user_id: string;
  from_date: string;
  to_date: string;
  reason: string | null;
  approved_by: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface AppSettings {
  id: string;
  shop_name: string;
  timezone: string;
  working_days: number[];
  default_shift_start: string;
  default_shift_end: string;
  quiet_hours_behavior: string;
  leaderboard_enabled: boolean;
  directors_see_activity: boolean;
  digest_time: string;
  ai_enabled: boolean;
  voice_enabled: boolean;
  privacy_policy: string | null;
  retention_days: number;
  created_at: string;
  updated_at: string;
}

/* ─── New interfaces from migration 00001 ─── */

export interface TaskEvent {
  id: string;
  task_id: string;
  actor_id: string | null;
  type: EventType;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  note: string | null;
  meta: Record<string, unknown>;
  at: string;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  position: number;
  text: string;
  text_ml: string | null;
  requires_photo: boolean;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  photo_path: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  task_id: string;
  title: string;
  due_at: string | null;
  owner_id: string | null;
  done: boolean;
  done_at: string | null;
  proof_path: string | null;
  position: number;
  created_at: string;
}

export interface ProofData {
  id: string;
  task_id: string;
  kind: ProofType;
  storage_path: string | null;
  value_numeric: number | null;
  value_text: string | null;
  rows: unknown[] | null;
  check_passed: boolean | null;
  check_message: string | null;
  ai_check: Record<string, unknown> | null;
  submitted_by: string | null;
  created_at: string;
}

export interface DateChangeRequest {
  id: string;
  task_id: string;
  requested_by: string;
  old_due_at: string | null;
  new_due_at: string;
  reason: string;
  status: RequestStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  voice_path: string | null;
  mentions: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  task_id: string | null;
  type: string;
  title: string;
  title_ml: string | null;
  body: string | null;
  body_ml: string | null;
  level: 'info' | 'reminder' | 'alert' | 'urgent';
  action_url: string | null;
  channels: NotifChannel[];
  delivered_at: string | null;
  read_at: string | null;
  held_until: string | null;
  dedupe_key: string | null;
  created_at: string;
}

export interface AIAlert {
  id: string;
  level: AlertLevel;
  title: string;
  explanation: string | null;
  evidence: Record<string, unknown>;
  suggested_action: string | null;
  suggested_assignee_id: string | null;
  department_id: string | null;
  status: 'open' | 'actioned' | 'snoozed' | 'dismissed';
  snoozed_until: string | null;
  source: 'rule' | 'ai';
  rule_key: string | null;
  dedupe_key: string | null;
  created_for: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  body_ml: string | null;
  audience: Record<string, unknown>;
  requires_ack: boolean;
  created_by: string;
  created_at: string;
}

export interface AnnouncementAck {
  id: string;
  announcement_id: string;
  user_id: string;
  acked_at: string;
}

export interface EodReport {
  id: string;
  user_id: string;
  report_date: string;
  completed_summary: string | null;
  blockers: string | null;
  tomorrow_plan: string | null;
  ai_prefill: Record<string, unknown> | null;
  submitted_at: string | null;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown>;
  at: string;
}

/* ─── New interfaces from migration 00002 ─── */

export interface TaskTemplate {
  id: string;
  title: string;
  title_ml: string | null;
  description: string | null;
  department_id: string | null;
  timing_type: TimingType;
  proof_type: ProofType;
  proof_rule: Record<string, unknown> | null;
  importance: Importance;
  requires_approval: boolean;
  checklist_items: unknown[];
  created_by: string;
  is_global: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  title: string;
  title_ml: string | null;
  description: string | null;
  template_id: string | null;
  department_id: string | null;
  assignee_id: string | null;
  assignee_rule: 'fixed' | 'rotate' | 'pool';
  rotate_list: string[];
  rotate_index: number;
  timing_type: TimingType;
  proof_type: ProofType;
  importance: Importance;
  schedule_cron: string;
  schedule_description: string | null;
  due_offset_hours: number;
  skip_holidays: boolean;
  is_active: boolean;
  compliance_percent: number;
  last_generated_at: string | null;
  next_run_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChainStep {
  title: string;
  timing_type: TimingType;
  assignee_id: string | null;
  department_id: string | null;
  proof_type: ProofType;
  importance: Importance;
}

export interface Chain {
  id: string;
  title: string;
  title_ml: string | null;
  description: string | null;
  steps: ChainStep[];
  created_by: string;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChainRun {
  id: string;
  chain_id: string;
  current_step: number;
  status: 'running' | 'completed' | 'cancelled';
  started_by: string;
  created_at: string;
}

export interface ActivitySession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  last_heartbeat_at: string;
  current_page: string | null;
}

export interface AIUsage {
  id: string;
  function_name: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number | null;
  triggered_by: string | null;
  created_at: string;
}

export interface ReminderRule {
  id: string;
  name: string;
  timing_type: TimingType | null;
  trigger_minutes_before: number;
  channel: NotifChannel;
  is_active: boolean;
  created_at: string;
}

export interface AIRule {
  id: string;
  rule_key: string;
  title: string;
  description: string | null;
  sql_template: string;
  alert_level: AlertLevel;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
}

// Supabase generated types placeholder
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string; role: UserRole };
        Update: Partial<Profile>;
      };
      departments: {
        Row: Department;
        Insert: Partial<Department> & { name: string; color: string };
        Update: Partial<Department>;
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & { title: string; timing_type: TimingType; created_by: string };
        Update: Partial<Task>;
      };
      holidays: {
        Row: Holiday;
        Insert: Partial<Holiday> & { date: string; name: string };
        Update: Partial<Holiday>;
      };
      leaves: {
        Row: Leave;
        Insert: Partial<Leave> & { user_id: string; from_date: string; to_date: string };
        Update: Partial<Leave>;
      };
      app_settings: {
        Row: AppSettings;
        Insert: Partial<AppSettings>;
        Update: Partial<AppSettings>;
      };
      task_events: {
        Row: TaskEvent;
        Insert: Partial<TaskEvent> & { task_id: string; type: EventType };
        Update: Partial<TaskEvent>;
      };
      task_checklist_items: {
        Row: TaskChecklistItem;
        Insert: Partial<TaskChecklistItem> & { task_id: string; text: string };
        Update: Partial<TaskChecklistItem>;
      };
      milestones: {
        Row: Milestone;
        Insert: Partial<Milestone> & { task_id: string; title: string };
        Update: Partial<Milestone>;
      };
      proofs: {
        Row: ProofData;
        Insert: Partial<ProofData> & { task_id: string; kind: ProofType };
        Update: Partial<ProofData>;
      };
      date_change_requests: {
        Row: DateChangeRequest;
        Insert: Partial<DateChangeRequest> & { task_id: string; requested_by: string; new_due_at: string; reason: string };
        Update: Partial<DateChangeRequest>;
      };
      comments: {
        Row: Comment;
        Insert: Partial<Comment> & { task_id: string; author_id: string; body: string };
        Update: Partial<Comment>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; type: string; title: string };
        Update: Partial<Notification>;
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: Partial<PushSubscription> & { user_id: string; endpoint: string; p256dh: string; auth: string };
        Update: Partial<PushSubscription>;
      };
      ai_alerts: {
        Row: AIAlert;
        Insert: Partial<AIAlert> & { level: AlertLevel; title: string };
        Update: Partial<AIAlert>;
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & { title: string; body: string; created_by: string };
        Update: Partial<Announcement>;
      };
      announcement_acks: {
        Row: AnnouncementAck;
        Insert: Partial<AnnouncementAck> & { announcement_id: string; user_id: string };
        Update: Partial<AnnouncementAck>;
      };
      eod_reports: {
        Row: EodReport;
        Insert: Partial<EodReport> & { user_id: string; report_date: string };
        Update: Partial<EodReport>;
      };
      audit_log: {
        Row: AuditLogEntry;
        Insert: Partial<AuditLogEntry> & { action: string; entity: string };
        Update: Partial<AuditLogEntry>;
      };
      task_templates: {
        Row: TaskTemplate;
        Insert: Partial<TaskTemplate> & { title: string; created_by: string };
        Update: Partial<TaskTemplate>;
      };
      routines: {
        Row: Routine;
        Insert: Partial<Routine> & { title: string; created_by: string };
        Update: Partial<Routine>;
      };
      chains: {
        Row: Chain;
        Insert: Partial<Chain> & { title: string; created_by: string };
        Update: Partial<Chain>;
      };
      chain_runs: {
        Row: ChainRun;
        Insert: Partial<ChainRun> & { chain_id: string; started_by: string };
        Update: Partial<ChainRun>;
      };
      activity_sessions: {
        Row: ActivitySession;
        Insert: Partial<ActivitySession> & { user_id: string };
        Update: Partial<ActivitySession>;
      };
      ai_usage: {
        Row: AIUsage;
        Insert: Partial<AIUsage> & { function_name: string };
        Update: Partial<AIUsage>;
      };
      reminder_rules: {
        Row: ReminderRule;
        Insert: Partial<ReminderRule> & { name: string };
        Update: Partial<ReminderRule>;
      };
      ai_rules: {
        Row: AIRule;
        Insert: Partial<AIRule> & { rule_key: string; title: string; sql_template: string };
        Update: Partial<AIRule>;
      };
    };
    Functions: Record<string, unknown>;
    Enums: {
      user_role: UserRole;
      availability_status: AvailabilityStatus;
      timing_type: TimingType;
      importance: Importance;
      task_status: TaskStatus;
      proof_type: ProofType;
      assign_target: AssignTarget;
      event_type: EventType;
      alert_level: AlertLevel;
      notif_channel: NotifChannel;
      request_status: RequestStatus;
    };
  };
}

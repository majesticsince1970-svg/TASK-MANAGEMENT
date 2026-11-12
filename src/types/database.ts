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


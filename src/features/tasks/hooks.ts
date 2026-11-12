import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/lib/auth';
import type {
  Task,
  TaskStatus,
  TimingType,
  ProofType,
  Importance,
  AvailabilityStatus,
} from '@/types/database';

/* ═══════════════════════════════════════════════════════════
   QUERY HOOKS (unchanged)
   ═══════════════════════════════════════════════════════════ */

/* ─── Fetch tasks ─── */

interface TaskFilters {
  [key: string]: unknown;
  tab?: 'my' | 'assigned' | 'team' | 'watching' | 'pickup';
  status?: TaskStatus[];
  timing_type?: TimingType[];
  department_id?: string;
  assignee?: string;
  overdue?: boolean;
  search?: string;
}

export function useTasks(filters: TaskFilters = {}) {
  const { profile } = useAuth();
  const userId = profile?.id;

  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: async () => {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });

      if (filters.tab === 'my' && userId) {
        query = query.eq('owner_id', userId);
      } else if (filters.tab === 'assigned' && userId) {
        query = query.eq('created_by', userId).neq('owner_id', userId);
      } else if (filters.tab === 'team' && profile?.department_id) {
        query = query.eq('department_id', profile.department_id);
      } else if (filters.tab === 'pickup') {
        query = query.is('owner_id', null).not('pool_department_id', 'is', null);
      }

      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters.timing_type?.length) {
        query = query.in('timing_type', filters.timing_type);
      }

      if (filters.department_id) {
        query = query.eq('department_id', filters.department_id);
      }

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.assignee) {
        query = query.eq('owner_id', filters.assignee);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!userId,
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.task(taskId || ''),
    queryFn: async () => {
      if (!taskId) return null;
      const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (error) throw error;
      return data as Task;
    },
    enabled: !!taskId,
  });
}

/* ═══════════════════════════════════════════════════════════
   MUTATION HOOKS — rewritten to call Supabase RPCs
   ═══════════════════════════════════════════════════════════ */

/* ─── Create task ─── */

interface CreateTaskInput {
  title: string;
  title_ml?: string;
  description?: string;
  department_id?: string;
  owner_id?: string;
  timing_type: TimingType;
  importance?: Importance;
  due_at?: string;
  review_on?: string;
  proof_type?: ProofType;
  requires_approval?: boolean;
  approver_id?: string;
  read_aloud?: boolean;
  helpers?: string[];
  watchers?: string[];
  source?: string;
  checklist_items?: { text: string; text_ml?: string; requires_photo?: boolean }[];
  milestones?: { title: string; due_at?: string; owner_id?: string }[];
  is_draft?: boolean;
  estimate_minutes?: number;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase.rpc('create_task', {
        payload: {
          ...input,
          created_by: profile!.id,
          importance: input.importance || 'normal',
          proof_type: input.proof_type || 'none',
          source: input.source || 'owner',
          is_draft: input.is_draft ?? !input.owner_id,
        },
      });

      if (error) throw error;
      const res = data as { task_id: string; status: string };
      return { ...res, id: res.task_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

/* ─── Transition task (status change) ─── */

interface TransitionInput {
  taskId: string;
  action:
    | 'publish'
    | 'open'
    | 'start'
    | 'submit'
    | 'approve'
    | 'reject'
    | 'cancel'
    | 'block'
    | 'unblock'
    | 'resume';
  note?: string;
  reason?: string;
}

export function useTransitionTask() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, action, note, reason }: TransitionInput) => {
      let result: { task_id: string; new_status?: string };

      switch (action) {
        case 'approve': {
          const { data, error } = await supabase.rpc('approve_task', {
            p_task_id: taskId,
            p_note: note || null,
          });
          if (error) throw error;
          result = data as { task_id: string; new_status: string; next_task_id: string | null };
          break;
        }
        case 'reject': {
          if (!reason) throw new Error('Reason is required for rejection');
          const { data, error } = await supabase.rpc('reject_task', {
            p_task_id: taskId,
            p_reason: reason,
          });
          if (error) throw error;
          result = data as { task_id: string; new_status: string };
          break;
        }
        case 'submit': {
          const { data, error } = await supabase.rpc('submit_task', {
            p_task_id: taskId,
            p_proof: null,
          });
          if (error) throw error;
          result = data as { task_id: string; new_status: string };
          break;
        }
        case 'publish': {
          const { data, error } = await supabase.rpc('publish_draft', {
            p_task_id: taskId,
          });
          if (error) throw error;
          result = data as { task_id: string; new_status: string };
          break;
        }
        case 'open': {
          const { data, error } = await supabase.rpc('mark_seen', {
            p_task_id: taskId,
          });
          if (error) throw error;
          result = data as { task_id: string; status: string; changed: boolean };
          break;
        }
        case 'start':
        case 'block':
        case 'unblock':
        case 'cancel':
        case 'resume': {
          const rpcAction = action === 'resume' ? 'unblock' : action;
          const { data, error } = await supabase.rpc('transition_task', {
            p_task_id: taskId,
            p_action: rpcAction,
            p_actor_id: profile!.id,
            p_note: note || reason || null,
          });
          if (error) throw error;
          result = data as { task_id: string; new_status: string };
          break;
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return { taskId, newStatus: result.new_status ?? '' };
    },
    onSuccess: ({ taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

/* ─── Submit proof ─── */

interface SubmitProofInput {
  taskId: string;
  kind: ProofType;
  value_numeric?: number;
  value_text?: string;
  rows?: unknown[];
  files?: File[];
}

export function useSubmitProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, kind, value_numeric, value_text, rows, files }: SubmitProofInput) => {
      let storagePath: string | undefined;

      // Upload files first (if any)
      if (files?.length) {
        for (const file of files) {
          const path = `proofs/${taskId}/${Date.now()}_${file.name}`;
          const { error } = await supabase.storage.from('proofs').upload(path, file);
          if (error) throw error;
          storagePath = path;
        }
      }

      // Call RPC — handles proof insert + status transition + notifications
      const { data, error } = await supabase.rpc('submit_task', {
        p_task_id: taskId,
        p_proof: {
          kind,
          storage_path: storagePath ?? null,
          value_numeric: value_numeric ?? null,
          value_text: value_text ?? null,
          rows: rows ?? null,
        },
      });
      if (error) throw error;
      return data as { task_id: string; new_status: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* ─── Date change request ─── */

export function useRequestDateChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, newDueAt, reason }: { taskId: string; newDueAt: string; reason: string }) => {
      const { data, error } = await supabase.rpc('request_date_change', {
        p_task_id: taskId,
        p_new_due: newDueAt,
        p_reason: reason,
      });
      if (error) throw error;
      return data as { request_id: string; task_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['date-change-requests'] });
    },
  });
}

/* ─── Claim pool task ─── */

export function useClaimTask() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase.rpc('claim_pool_task', {
        p_task_id: taskId,
        p_actor_id: profile!.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   NEW HOOKS — wrappers for newly-available RPCs
   ═══════════════════════════════════════════════════════════ */

/* ─── Snooze flexible task ─── */

export function useSnoozeFlexible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, days }: { taskId: string; days: number }) => {
      const { data, error } = await supabase.rpc('snooze_flexible', {
        p_task_id: taskId,
        p_days: days,
      });
      if (error) throw error;
      return data as { task_id: string; new_review_on: string; snooze_count: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(result.task_id) });
    },
  });
}

/* ─── Change due date (manager) ─── */

export function useChangeDueDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, newDue, reason }: { taskId: string; newDue: string; reason: string }) => {
      const { data, error } = await supabase.rpc('change_due_date', {
        p_task_id: taskId,
        p_new_due: newDue,
        p_reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* ─── Handover tasks ─── */

export function useHandoverTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fromUser,
      mapping,
    }: {
      fromUser: string;
      mapping: { task_id: string; to_user_id: string }[];
    }) => {
      const { data, error } = await supabase.rpc('handover_tasks', {
        p_from_user: fromUser,
        p_mapping: mapping,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* ─── Bulk create tasks ─── */

export function useBulkCreateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      userIds,
    }: {
      payload: Record<string, unknown>;
      userIds: string[];
    }) => {
      const { data, error } = await supabase.rpc('bulk_create_tasks', {
        p_payload: payload,
        p_user_ids: userIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* ─── Complete milestone ─── */

export function useCompleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      milestoneId,
      proofPath,
    }: {
      milestoneId: string;
      proofPath?: string;
    }) => {
      const { data, error } = await supabase.rpc('complete_milestone', {
        p_milestone_id: milestoneId,
        p_proof_path: proofPath ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* ─── Set availability ─── */

export function useSetAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      status,
      until,
    }: {
      status: AvailabilityStatus;
      until?: string;
    }) => {
      const { data, error } = await supabase.rpc('set_availability', {
        p_status: status,
        p_until: until ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/* ─── Acknowledge announcement ─── */

export function useAckAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { data, error } = await supabase.rpc('ack_announcement', {
        p_announcement_id: announcementId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

/* ─── Publish draft ─── */

export function usePublishDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase.rpc('publish_draft', {
        p_task_id: taskId,
      });
      if (error) throw error;
      return data as { task_id: string; new_status: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(result.task_id) });
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   QUERY HOOKS (unchanged)
   ═══════════════════════════════════════════════════════════ */

/* ─── Task events (history) ─── */

export function useTaskEvents(taskId: string) {
  return useQuery({
    queryKey: queryKeys.taskEvents(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_events')
        .select('*')
        .eq('task_id', taskId)
        .order('at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

/* ─── Comments ─── */

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: queryKeys.taskComments(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles!author_id(full_name, avatar_url)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, body, mentions }: { taskId: string; body: string; mentions?: string[] }) => {
      const { error } = await supabase.from('comments').insert({
        task_id: taskId,
        author_id: profile!.id,
        body,
        mentions: mentions || [],
      });
      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskComments(taskId) });
    },
  });
}

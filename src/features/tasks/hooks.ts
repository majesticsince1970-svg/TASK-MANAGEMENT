import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/lib/auth';
import type { Task, TaskStatus, TimingType, ProofType, Importance } from '@/types/database';

/* ─── Fetch tasks ─── */

interface TaskFilters {
  tab?: 'my' | 'assigned' | 'team' | 'watching' | 'pickup';
  status?: TaskStatus[];
  timing_type?: TimingType[];
  department_id?: string;
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
  proof_rule?: Record<string, unknown>;
  requires_approval?: boolean;
  approver_id?: string;
  report_back_to?: string;
  read_aloud?: boolean;
  checklist_items?: { text: string; text_ml?: string; requires_photo?: boolean }[];
  helpers?: string[];
  watchers?: string[];
  source?: string;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase.from('tasks').insert({
        ...input,
        created_by: profile!.id,
        status: input.owner_id ? 'new' : 'draft',
        is_draft: !input.owner_id,
        importance: input.importance || 'normal',
        proof_type: input.proof_type || 'none',
        source: input.source || 'owner',
      }).select().single();

      if (error) throw error;

      // Create task event
      await supabase.from('task_events').insert({
        task_id: data.id,
        actor_id: profile!.id,
        type: 'created',
        to_status: input.owner_id ? 'new' : 'draft',
      });

      // Create checklist items if any
      if (input.checklist_items?.length) {
        await supabase.from('task_checklist_items').insert(
          input.checklist_items.map((item, i) => ({
            task_id: data.id,
            position: i,
            text: item.text,
            text_ml: item.text_ml,
            requires_photo: item.requires_photo || false,
          }))
        );
      }

      return data as Task;
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
  action: 'publish' | 'open' | 'start' | 'submit' | 'approve' | 'reject' | 'cancel' | 'block' | 'unblock' | 'resume';
  note?: string;
  reason?: string;
}

const TRANSITION_MAP: Record<string, { from: TaskStatus[]; to: TaskStatus }> = {
  publish: { from: ['draft'], to: 'new' },
  open: { from: ['new'], to: 'seen' },
  start: { from: ['new', 'seen', 'sent_back'], to: 'in_progress' },
  submit: { from: ['in_progress'], to: 'submitted' },
  approve: { from: ['submitted'], to: 'done' },
  reject: { from: ['submitted'], to: 'sent_back' },
  cancel: { from: ['draft', 'new', 'seen', 'in_progress', 'blocked', 'submitted', 'sent_back'], to: 'cancelled' },
  block: { from: ['in_progress'], to: 'blocked' },
  unblock: { from: ['blocked'], to: 'in_progress' },
  resume: { from: ['blocked'], to: 'in_progress' },
};

export function useTransitionTask() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, action, note, reason }: TransitionInput) => {
      const transition = TRANSITION_MAP[action];
      if (!transition) throw new Error(`Unknown action: ${action}`);

      // Get current task
      const { data: task, error: fetchErr } = await supabase
        .from('tasks').select('status').eq('id', taskId).single();
      if (fetchErr) throw fetchErr;

      if (!transition.from.includes(task.status as TaskStatus)) {
        throw new Error(`Cannot ${action} a task in status ${task.status}`);
      }

      // Update task
      const updates: Record<string, unknown> = { status: transition.to };
      if (action === 'start') updates.started_at = new Date().toISOString();
      if (action === 'submit') updates.submitted_at = new Date().toISOString();
      if (action === 'approve') updates.completed_at = new Date().toISOString();

      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;

      // Write event
      await supabase.from('task_events').insert({
        task_id: taskId,
        actor_id: profile!.id,
        type: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'cancel' ? 'cancelled' : action === 'submit' ? 'submitted' : 'started',
        from_status: task.status,
        to_status: transition.to,
        note: note || reason,
      });

      return { taskId, newStatus: transition.to };
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
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, kind, value_numeric, value_text, rows, files }: SubmitProofInput) => {
      let storagePath: string | undefined;

      // Upload files if any
      if (files?.length) {
        for (const file of files) {
          const path = `proofs/${taskId}/${Date.now()}_${file.name}`;
          const { error } = await supabase.storage.from('proofs').upload(path, file);
          if (error) throw error;
          storagePath = path;
        }
      }

      // Insert proof record
      const { error } = await supabase.from('proofs').insert({
        task_id: taskId,
        kind,
        storage_path: storagePath,
        value_numeric,
        value_text,
        rows: rows ? JSON.parse(JSON.stringify(rows)) : null,
        submitted_by: profile!.id,
      });
      if (error) throw error;

      // Transition to submitted
      await supabase.from('tasks').update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }).eq('id', taskId);

      await supabase.from('task_events').insert({
        task_id: taskId,
        actor_id: profile!.id,
        type: 'submitted',
        to_status: 'submitted',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* ─── Date change request ─── */

export function useRequestDateChange() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, newDueAt, reason }: { taskId: string; newDueAt: string; reason: string }) => {
      const { data: task } = await supabase.from('tasks').select('due_at').eq('id', taskId).single();

      const { error } = await supabase.from('date_change_requests').insert({
        task_id: taskId,
        requested_by: profile!.id,
        old_due_at: task?.due_at,
        new_due_at: newDueAt,
        reason,
      });
      if (error) throw error;

      await supabase.from('task_events').insert({
        task_id: taskId,
        actor_id: profile!.id,
        type: 'date_change_requested',
        note: reason,
      });

      await supabase.from('tasks').update({
        date_change_count: (task as any)?.date_change_count + 1 || 1,
      }).eq('id', taskId);
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
      // Atomic claim — first one wins
      const { error } = await supabase
        .from('tasks')
        .update({ owner_id: profile!.id, status: 'seen' })
        .eq('id', taskId)
        .is('owner_id', null);
      if (error) throw error;

      await supabase.from('task_events').insert({
        task_id: taskId,
        actor_id: profile!.id,
        type: 'claimed',
        to_status: 'seen',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

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

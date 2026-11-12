import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/lib/auth';

/* ─── Notifications ─── */

export function useNotifications() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications(profile?.id || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });
}

export function useUnreadCount() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: queryKeys.unreadCount(profile?.id || ''),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .is('read_at', null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000, // poll every 30s as backup
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', profile!.id)
        .is('read_at', null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

/* ─── Announcements ─── */

export function useAnnouncements() {
  return useQuery({
    queryKey: queryKeys.announcements(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, acks:announcement_acks(user_id, acked_at)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAckAnnouncement() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      await supabase.from('announcement_acks').insert({
        announcement_id: announcementId,
        user_id: profile!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

/* ─── EOD Reports ─── */

export function useEodReport(date: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: queryKeys.eodReport(profile?.id || '', date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eod_reports')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('report_date', date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });
}

export function useSaveEod() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ date, summary, blockers, plan }: { date: string; summary: string; blockers: string; plan: string }) => {
      const { error } = await supabase.from('eod_reports').upsert({
        user_id: profile!.id,
        report_date: date,
        completed_summary: summary,
        blockers,
        tomorrow_plan: plan,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'user_id,report_date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eod'] });
    },
  });
}

/* ─── Availability ─── */

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  const { profile, setProfile } = useAuth();
  return useMutation({
    mutationFn: async ({ availability, until }: { availability: string; until?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ availability, availability_until: until || null })
        .eq('id', profile!.id);
      if (error) throw error;
    },
    onSuccess: (_, { availability }) => {
      if (profile) {
        setProfile({ ...profile, availability: availability as any });
      }
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

/* ─── Leaves ─── */

export function useLeaves() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: queryKeys.leaves(profile?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .order('from_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });
}

export function useRequestLeave() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ fromDate, toDate, reason }: { fromDate: string; toDate: string; reason: string }) => {
      const { error } = await supabase.from('leaves').insert({
        user_id: profile!.id,
        from_date: fromDate,
        to_date: toDate,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

/* ─── App Settings ─── */

export function useAppSettings() {
  return useQuery({
    queryKey: queryKeys.appSettings(),
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data: existing } = await supabase.from('app_settings').select('id').single();
      if (!existing) throw new Error('No settings row');
      const { error } = await supabase.from('app_settings').update(updates).eq('id', existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
}

/* ─── Activity Sessions ─── */

export function useStartActivity() {
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (page: string) => {
      const { data, error } = await supabase.from('activity_sessions').insert({
        user_id: profile!.id,
        current_page: page,
      }).select().single();
      if (error) throw error;
      return data;
    },
  });
}

export function useHeartbeat() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await supabase.from('activity_sessions').update({
        last_heartbeat_at: new Date().toISOString(),
      }).eq('id', sessionId);
    },
  });
}

/* ─── People ─── */

export function usePeople(filters?: { departmentId?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.people(filters),
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').eq('is_active', true).order('full_name');
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId);
      if (filters?.search) query = query.ilike('full_name', `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

/* ─── Holidays ─── */

export function useHolidays() {
  return useQuery({
    queryKey: queryKeys.holidays(),
    queryFn: async () => {
      const { data, error } = await supabase.from('holidays').select('*').order('date');
      if (error) throw error;
      return data || [];
    },
  });
}

/* ─── Departments ─── */

export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments(),
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });
}

/* ─── Templates ─── */

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates(),
    queryFn: async () => {
      const { data, error } = await supabase.from('task_templates').select('*').order('use_count', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { title: string; timing_type: string; proof_type: string; importance: string; description?: string; checklist_items?: unknown[] }) => {
      const { error } = await supabase.from('task_templates').insert({
        ...input,
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/* ─── Routines ─── */

export function useRoutines() {
  return useQuery({
    queryKey: queryKeys.routines(),
    queryFn: async () => {
      const { data, error } = await supabase.from('routines').select('*').order('title');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { error } = await supabase.from('routines').insert({
        ...input,
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

/* ─── Chains ─── */

export function useChains() {
  return useQuery({
    queryKey: queryKeys.chains(),
    queryFn: async () => {
      const { data, error } = await supabase.from('chains').select('*').order('title');
      if (error) throw error;
      return data || [];
    },
  });
}

/* ─── AI Alerts ─── */

export function useAiAlerts(scope?: string) {
  return useQuery({
    queryKey: queryKeys.aiAlerts(scope),
    queryFn: async () => {
      let query = supabase.from('ai_alerts').select('*').order('created_at', { ascending: false });
      if (scope === 'open') query = query.eq('status', 'open');
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useActionAiAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ alertId, action }: { alertId: string; action: 'actioned' | 'snoozed' | 'dismissed' }) => {
      const updates: Record<string, unknown> = { status: action };
      if (action === 'snoozed') {
        updates.snoozed_until = new Date(Date.now() + 3600000 * 24).toISOString();
      }
      await supabase.from('ai_alerts').update(updates).eq('id', alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
    },
  });
}

/* ─── Dashboard Stats ─── */

export function useDashboardStats() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['dashboard-stats', profile?.id],
    queryFn: async () => {
      const userId = profile!.id;
      const [active, overdue, submitted, done] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('owner_id', userId).in('status', ['new', 'seen', 'in_progress']),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('owner_id', userId).not('status', 'in', '(done,cancelled)').lt('due_at', new Date().toISOString()),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('status', 'submitted'),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('owner_id', userId).eq('status', 'done'),
      ]);
      return {
        active: active.count || 0,
        overdue: overdue.count || 0,
        submitted: submitted.count || 0,
        done: done.count || 0,
      };
    },
    enabled: !!profile?.id,
  });
}

/* ─── Leaderboard ─── */

export function useLeaderboard() {
  return useQuery({
    queryKey: queryKeys.leaderboard(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, points, department_id')
        .eq('is_active', true)
        .order('points', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });
}


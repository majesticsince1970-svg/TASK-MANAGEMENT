import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

/**
 * Subscribe to Supabase Realtime for tasks & notifications.
 * Invalidates TanStack Query caches on changes.
 */
export function useRealtimeInvalidation() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task-events'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task-comments'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);
}


import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Clock, TrendingUp, Activity } from 'lucide-react';
import { usePeople } from '@/lib/hooks';
import { useTasks } from '@/features/tasks/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile, Task, TaskEvent } from '@/types/database';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch all people and find the current person
  const { data: people = [], isLoading: loadingPeople } = usePeople();
  const person = people.find((p: Profile) => p.id === id) ?? null;

  // Fetch tasks assigned to this person
  const { data: tasks = [], isLoading: loadingTasks } = useTasks({ assignee: id });

  // Fetch today's task events for this person
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: todayEvents = [] } = useQuery({
    queryKey: ['person-timeline', id, todayStr],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('task_events')
        .select('*, task:tasks!task_id(title)')
        .eq('actor_id', id!)
        .gte('at', startOfDay.toISOString())
        .order('at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const completedCount = tasks.filter((t: Task) => t.status === 'done').length;
  const openCount = tasks.filter((t: Task) => !['done', 'cancelled'].includes(t.status)).length;
  const points = person?.points ?? 0;
  const dateChangeCount = tasks.reduce((sum: number, t: Task) => sum + (t.date_change_count || 0), 0);

  // On-time rate: completed tasks where completed_at <= due_at
  const completedTasks = tasks.filter((t: Task) => t.status === 'done');
  const onTimeTasks = completedTasks.filter(
    (t: Task) => !t.due_at || !t.completed_at || new Date(t.completed_at) <= new Date(t.due_at)
  );
  const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeTasks.length / completedTasks.length) * 100) : 100;

  function formatEventTime(isoStr: string) {
    return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function formatEventLabel(ev: any) {
    const taskTitle = ev.task?.title || 'Task';
    const typeLabels: Record<string, string> = {
      created: `Created: ${taskTitle}`,
      seen: `Opened: ${taskTitle}`,
      started: `Started: ${taskTitle}`,
      submitted: `Submitted: ${taskTitle}`,
      approved: `Approved: ${taskTitle}`,
      rejected: `Sent back: ${taskTitle}`,
      claimed: `Claimed: ${taskTitle}`,
      blocked: `Blocked: ${taskTitle}`,
      unblocked: `Unblocked: ${taskTitle}`,
      cancelled: `Cancelled: ${taskTitle}`,
      comment: `Commented on: ${taskTitle}`,
      proof_added: `Added proof: ${taskTitle}`,
    };
    return typeLabels[ev.type] || `${ev.type}: ${taskTitle}`;
  }

  if (loadingPeople || loadingTasks) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-3 border-[var(--color-maroon)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--color-ink)]/60 hover:text-[var(--color-ink)]">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-center text-[var(--color-ink)]/50">Person not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--color-ink)]/60 hover:text-[var(--color-ink)]">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-xl border border-[#E5DDD3] p-6">
        <div className="flex items-center gap-4 mb-6">
          {person.avatar_url ? (
            <img src={person.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xl font-bold text-[var(--color-maroon)]">
              {getInitials(person.full_name)}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{person.full_name}</h2>
            <p className="text-sm text-[var(--color-ink)]/50">
              {person.job_title || person.role}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-[var(--color-success)]">{onTimeRate}%</p>
            <p className="text-xs text-[var(--color-ink)]/40">On-time rate</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: CheckCircle2, label: 'Completed', value: String(completedCount), color: 'var(--color-success)' },
            { icon: Clock, label: 'Open', value: String(openCount), color: 'var(--color-warning)' },
            { icon: TrendingUp, label: 'Points', value: String(points), color: 'var(--color-maroon)' },
            { icon: Calendar, label: 'Date Changes', value: String(dateChangeCount), color: 'var(--color-ink)' },
          ].map((s, i) => (
            <div key={i} className="bg-[var(--color-ivory)] rounded-lg p-3 text-center">
              <s.icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-[var(--color-ink)]/40">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Timeline */}
      <div className="bg-white rounded-xl border border-[#E5DDD3] p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--color-maroon)]" />
          Today's Activity
        </h3>
        {todayEvents.length === 0 ? (
          <p className="text-sm text-[var(--color-ink)]/40">No activity recorded today.</p>
        ) : (
          <div className="space-y-3">
            {todayEvents.map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-[var(--color-ink)]/40 w-16 shrink-0">{formatEventTime(ev.at)}</span>
                <div className="w-2 h-2 rounded-full bg-[var(--color-maroon)] shrink-0" />
                <span>{formatEventLabel(ev)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { FolderKanban, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useTasks } from '@/features/tasks/hooks';
import { usePeople } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Task, Profile, Milestone } from '@/types/database';

export default function ProjectsPage() {
  // Fetch long/project tasks
  const { data: tasks = [], isLoading } = useTasks({ timing_type: ['long'] });
  const { data: people = [] } = usePeople();

  // Fetch milestones for all long tasks
  const taskIds = tasks.map((t: Task) => t.id);
  const { data: allMilestones = [] } = useQuery({
    queryKey: ['project-milestones', taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return [];
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .in('task_id', taskIds)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data || []) as Milestone[];
    },
    enabled: taskIds.length > 0,
  });

  // Fetch checklist items for progress calculation
  const { data: allChecklist = [] } = useQuery({
    queryKey: ['project-checklists', taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return [];
      const { data, error } = await supabase
        .from('task_checklist_items')
        .select('*')
        .in('task_id', taskIds);
      if (error) throw error;
      return data || [];
    },
    enabled: taskIds.length > 0,
  });

  function getOwnerName(ownerId: string | null) {
    if (!ownerId) return 'Unassigned';
    const p = people.find((p: Profile) => p.id === ownerId);
    return p?.full_name || 'Unknown';
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getProjectData(task: Task) {
    const milestones = allMilestones.filter((m: Milestone) => m.task_id === task.id);
    const checklist = allChecklist.filter((c: any) => c.task_id === task.id);

    // pctDone from checklist items, fallback to milestones
    let pctDone = 0;
    if (checklist.length > 0) {
      const doneItems = checklist.filter((c: any) => c.done).length;
      pctDone = Math.round((doneItems / checklist.length) * 100);
    } else if (milestones.length > 0) {
      const doneMilestones = milestones.filter((m: Milestone) => m.done).length;
      pctDone = Math.round((doneMilestones / milestones.length) * 100);
    } else if (task.status === 'done') {
      pctDone = 100;
    }

    // pctTime from (now - created_at) / (due_at - created_at)
    let pctTime = 0;
    if (task.due_at && task.created_at) {
      const now = Date.now();
      const start = new Date(task.created_at).getTime();
      const end = new Date(task.due_at).getTime();
      if (end > start) {
        pctTime = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
      }
    }

    const atRisk = pctTime > pctDone + 15;

    return { pctDone, pctTime, atRisk, milestones };
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Projects & Long Tasks</h1>
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-3 border-[var(--color-maroon)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Projects & Long Tasks</h1>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-ink)]/40">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No long-running projects yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task: Task) => {
            const { pctDone, pctTime, atRisk, milestones } = getProjectData(task);
            return (
              <div key={task.id} className="bg-white rounded-xl border border-[#E5DDD3] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-long)]/10 flex items-center justify-center">
                      <FolderKanban className="w-5 h-5 text-[var(--color-long)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{task.title}</h3>
                        {atRisk && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)] font-medium">
                            <AlertTriangle className="w-3 h-3" /> At Risk
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-ink)]/50">
                        {getOwnerName(task.owner_id)} · Due {formatDate(task.due_at)}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-[var(--color-long)]">{pctDone}%</span>
                </div>

                {/* Progress bars */}
                <div className="space-y-2 mb-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--color-ink)]/50">Work done</span>
                      <span className="font-medium">{pctDone}%</span>
                    </div>
                    <div className="h-2.5 bg-[var(--color-ivory)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${atRisk ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'}`}
                        style={{ width: `${pctDone}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--color-ink)]/50">Time elapsed</span>
                      <span className="font-medium">{pctTime}%</span>
                    </div>
                    <div className="h-2.5 bg-[var(--color-ivory)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--color-ink)]/20" style={{ width: `${pctTime}%` }} />
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                {milestones.length > 0 && (
                  <div className="border-t border-[#E5DDD3] pt-3">
                    <p className="text-xs font-semibold text-[var(--color-ink)]/50 mb-2">Milestones</p>
                    <div className="space-y-1.5">
                      {milestones.map((m: Milestone) => (
                        <div key={m.id} className="flex items-center gap-2 text-sm">
                          {m.done ? (
                            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                          ) : (
                            <Clock className="w-4 h-4 text-[var(--color-ink)]/30" />
                          )}
                          <span className={m.done ? 'line-through text-[var(--color-ink)]/40' : ''}>{m.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

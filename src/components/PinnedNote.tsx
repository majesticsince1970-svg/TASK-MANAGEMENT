import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/features/tasks/hooks';
import { workOrderSort } from '@/lib/workOrder';
import { cn } from '@/lib/utils';
import { Pin, Minimize2, Maximize2, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { isPast, formatDistanceToNow } from 'date-fns';
import type { Task } from '@/types/database';

export function PinnedNote() {
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks({ tab: 'my', status: ['new', 'seen', 'in_progress', 'sent_back'] });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Sort by work order priority and take top 5
  const topTasks = workOrderSort(tasks as any).slice(0, 5);

  // Pulse when there's an urgent overdue task
  const hasUrgent = topTasks.some(
    (t: any) => t.timing_type === 'urgent' && t.due_at && isPast(new Date(t.due_at))
  );

  useEffect(() => {
    if (hasUrgent) {
      // Play a subtle chime (would need audio file in production)
      // For now, browser notification fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚠ Urgent task overdue!', { body: topTasks[0]?.title });
      }
    }
  }, [hasUrgent]);

  if (!isVisible || topTasks.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 right-4 z-40 w-80 bg-white rounded-xl border border-[#E5DDD3] shadow-xl transition-all duration-300',
        hasUrgent && 'ring-2 ring-[var(--color-urgent)] animate-pulse',
        isMinimized && 'w-12 h-12'
      )}
    >
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-12 h-12 flex items-center justify-center bg-[var(--color-maroon)] text-white rounded-xl hover:bg-[var(--color-maroon)]/90 transition-colors relative"
        >
          <Pin className="w-5 h-5" />
          {topTasks.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-urgent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {topTasks.length}
            </span>
          )}
        </button>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5DDD3]">
            <div className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-[var(--color-maroon)]" />
              <span className="text-xs font-semibold">My Priority</span>
              <span className="text-[10px] text-[var(--color-ink)]/30">{topTasks.length}</span>
            </div>
            <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-[var(--color-ivory)] rounded transition-colors">
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tasks */}
          <div className="max-h-[240px] overflow-y-auto">
            {topTasks.map((task: any, i: number) => {
              const isOverdue = task.due_at && isPast(new Date(task.due_at));
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-ivory)] cursor-pointer transition-colors border-b border-[#E5DDD3] last:border-0"
                  onClick={() => navigate(`/tasks?task=${task.id}`)}
                >
                  <span className="text-[10px] font-mono text-[var(--color-ink)]/20 w-4 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {isOverdue && <AlertTriangle className="w-3 h-3 text-[var(--color-urgent)]" />}
                      <span className={cn('text-[10px]', isOverdue ? 'text-[var(--color-urgent)]' : 'text-[var(--color-ink)]/30')}>
                        {task.due_at ? formatDistanceToNow(new Date(task.due_at), { addSuffix: true }) : 'Flexible'}
                      </span>
                    </div>
                  </div>
                  <StatusPill status={task.status} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

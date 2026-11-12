import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTasks, useTransitionTask } from '@/features/tasks/hooks';
import { workOrderSort } from '@/lib/workOrder';
import { cn } from '@/lib/utils';
import { Pin, Minimize2, ExternalLink, ChevronRight, AlertTriangle, Clock, Play, Check, X } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { isPast, formatDistanceToNow, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/lib/auth';
import type { Task } from '@/types/database';

/* ─── PiP support detection ─── */
const supportsPiP = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

export function PinnedNote() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: tasks = [] } = useTasks({ tab: 'my', status: ['new', 'seen', 'in_progress', 'sent_back'] });
  const { data: allMyTasks = [] } = useTasks({ tab: 'my' });
  const transition = useTransitionTask();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipContainerRef = useRef<HTMLDivElement | null>(null);

  /* ─── Variant: owner/director sees "Needs me" ─── */
  const isDirector = profile?.role === 'owner' || profile?.role === 'director';

  // Sort by work order priority and take top 5
  const topTasks = workOrderSort(tasks as any).slice(0, 5);

  // Stats for footer
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const todayDone = allMyTasks.filter(
    (t: any) => t.status === 'done' && t.completed_at && new Date(t.completed_at).toDateString() === now.toDateString()
  ).length;
  const todayTotal = allMyTasks.filter(
    (t: any) => t.due_at && new Date(t.due_at).toDateString() === now.toDateString()
  ).length;
  const monthRemaining = allMyTasks.filter(
    (t: any) => t.due_at && new Date(t.due_at) >= now && new Date(t.due_at) <= monthEnd && !['done', 'cancelled'].includes(t.status)
  ).length;

  // Pulse when there's an urgent overdue task
  const hasUrgent = topTasks.some(
    (t: any) => t.timing_type === 'urgent' && t.due_at && isPast(new Date(t.due_at))
  );

  useEffect(() => {
    if (hasUrgent) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚠ Urgent task overdue!', { body: topTasks[0]?.title });
      }
    }
  }, [hasUrgent]);

  /* ─── PiP lifecycle ─── */
  const handlePopOut = useCallback(async () => {
    if (!supportsPiP) return;
    try {
      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 340,
        height: 420,
      });
      // Copy stylesheets
      [...document.styleSheets].forEach((sheet) => {
        try {
          const newStyle = pip.document.createElement('style');
          [...sheet.cssRules].forEach((rule) => {
            newStyle.appendChild(pip.document.createTextNode(rule.cssText));
          });
          pip.document.head.appendChild(newStyle);
        } catch {
          // cross-origin stylesheet, skip
          if (sheet.href) {
            const link = pip.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pip.document.head.appendChild(link);
          }
        }
      });
      pip.addEventListener('pagehide', () => setPipWindow(null));
      setPipWindow(pip);
    } catch {
      // PiP denied or not supported
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pipWindow && !pipWindow.closed) pipWindow.close();
    };
  }, [pipWindow]);

  /* ─── Per-row action handler ─── */
  const handleRowAction = (task: Task) => {
    if (task.status === 'new' || task.status === 'seen' || task.status === 'sent_back') {
      transition.mutate({ taskId: task.id, action: 'start' });
    } else if (task.status === 'in_progress') {
      // Navigate to task for proof submission
      navigate(`/tasks?task=${task.id}`);
    }
  };

  const getRowActionLabel = (task: Task) => {
    if (task.status === 'new' || task.status === 'seen' || task.status === 'sent_back') return 'Start';
    if (task.status === 'in_progress') return 'View';
    return null;
  };

  if (!isVisible || topTasks.length === 0) return null;

  /* ─── Shared content ─── */
  const noteContent = (
    <div className="bg-white rounded-xl border border-[#E5DDD3] shadow-xl overflow-hidden w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5DDD3]">
        <div className="flex items-center gap-1.5">
          <Pin className="w-3.5 h-3.5 text-[var(--color-maroon)]" />
          <span className="text-xs font-semibold">{isDirector ? 'Needs Me' : 'My Priority'}</span>
          <span className="text-[10px] text-[var(--color-ink)]/30">{topTasks.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {supportsPiP && !pipWindow && (
            <button onClick={handlePopOut} className="p-1 hover:bg-[var(--color-ivory)] rounded transition-colors" title="Pop out">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          {!pipWindow && (
            <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-[var(--color-ivory)] rounded transition-colors">
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="max-h-[240px] overflow-y-auto">
        {topTasks.map((task: any, i: number) => {
          const isOverdue = task.due_at && isPast(new Date(task.due_at));
          const actionLabel = getRowActionLabel(task);
          return (
            <div
              key={task.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-ivory)] transition-colors border-b border-[#E5DDD3] last:border-0 group"
            >
              <span className="text-[10px] font-mono text-[var(--color-ink)]/20 w-4 shrink-0">#{i + 1}</span>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/tasks?task=${task.id}`)}
              >
                <p className="text-xs font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isOverdue && <AlertTriangle className="w-3 h-3 text-[var(--color-urgent)]" />}
                  <span className={cn('text-[10px]', isOverdue ? 'text-[var(--color-urgent)]' : 'text-[var(--color-ink)]/30')}>
                    {task.due_at ? formatDistanceToNow(new Date(task.due_at), { addSuffix: true }) : 'Flexible'}
                  </span>
                </div>
              </div>
              {actionLabel && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRowAction(task); }}
                  disabled={transition.isPending}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                    (task.status === 'new' || task.status === 'seen' || task.status === 'sent_back')
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-[var(--color-ivory)] text-[var(--color-ink)]/50 hover:bg-[#E5DDD3]'
                  )}
                >
                  {actionLabel === 'Start' ? <Play className="w-3 h-3 inline mr-0.5" /> : null}
                  {actionLabel}
                </button>
              )}
              <StatusPill status={task.status} />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[#E5DDD3] bg-[var(--color-ivory)]">
        <p className="text-[10px] text-[var(--color-ink)]/40">
          Today {todayDone}/{todayTotal || topTasks.length} done
          {monthRemaining > 0 && <span> · +{monthRemaining} more this month</span>}
        </p>
      </div>
    </div>
  );

  /* ─── PiP portal ─── */
  if (pipWindow && !pipWindow.closed) {
    return createPortal(noteContent, pipWindow.document.body);
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 right-4 z-40 transition-all duration-300',
        hasUrgent && !isMinimized && 'ring-2 ring-[var(--color-urgent)] rounded-xl animate-pulse',
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
        noteContent
      )}
    </div>
  );
}

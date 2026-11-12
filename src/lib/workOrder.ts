import type { Task, TimingType } from '@/types/database';

/**
 * Work order sorting function — used everywhere (pinned note, My Day, voice "what next?", AI).
 * Priority: 1) urgent, 2) overdue (most overdue first), 3) due today (★ important first),
 * 4) milestones/dated due this week, 5) later this month, 6) later, 7) flexible (earliest review_on).
 */

function isOverdue(task: Task): boolean {
  if (!task.due_at) return false;
  if (['done', 'cancelled'].includes(task.status)) return false;
  return new Date(task.due_at) < new Date();
}

function overdueMinutes(task: Task): number {
  if (!task.due_at) return 0;
  return (Date.now() - new Date(task.due_at).getTime()) / 60000;
}

function isDueToday(task: Task): boolean {
  if (!task.due_at) return false;
  const due = new Date(task.due_at);
  const now = new Date();
  return due.toDateString() === now.toDateString();
}

function isDueThisWeek(task: Task): boolean {
  if (!task.due_at) return false;
  const due = new Date(task.due_at);
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + (7 - now.getDay()));
  return due > now && due <= weekEnd;
}

function isDueThisMonth(task: Task): boolean {
  if (!task.due_at) return false;
  const due = new Date(task.due_at);
  const now = new Date();
  return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear() && due > now;
}

const TIMING_PRIORITY: Record<TimingType, number> = {
  urgent: 0,
  repeating: 1,
  dated: 2,
  long: 3,
  flexible: 4,
};

export function workOrderSort(tasks: Task[]): Task[] {
  return [...tasks]
    .filter((t) => !['done', 'cancelled'].includes(t.status))
    .sort((a, b) => {
      // 1. Urgent tasks first
      if (a.timing_type === 'urgent' && b.timing_type !== 'urgent') return -1;
      if (b.timing_type === 'urgent' && a.timing_type !== 'urgent') return 1;

      // 2. Overdue (most overdue first)
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (bOverdue && !aOverdue) return 1;
      if (aOverdue && bOverdue) return overdueMinutes(b) - overdueMinutes(a);

      // 3. Due today (important first, then earliest)
      const aToday = isDueToday(a);
      const bToday = isDueToday(b);
      if (aToday && !bToday) return -1;
      if (bToday && !aToday) return 1;
      if (aToday && bToday) {
        if (a.importance === 'important' && b.importance !== 'important') return -1;
        if (b.importance === 'important' && a.importance !== 'important') return 1;
        return new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime();
      }

      // 4. Due this week
      const aWeek = isDueThisWeek(a);
      const bWeek = isDueThisWeek(b);
      if (aWeek && !bWeek) return -1;
      if (bWeek && !aWeek) return 1;

      // 5. Due this month
      const aMonth = isDueThisMonth(a);
      const bMonth = isDueThisMonth(b);
      if (aMonth && !bMonth) return -1;
      if (bMonth && !aMonth) return 1;

      // 6. By timing type priority
      const timingDiff = TIMING_PRIORITY[a.timing_type] - TIMING_PRIORITY[b.timing_type];
      if (timingDiff !== 0) return timingDiff;

      // 7. Flexible: earliest review_on
      if (a.timing_type === 'flexible' && b.timing_type === 'flexible') {
        if (a.review_on && b.review_on) return a.review_on.localeCompare(b.review_on);
      }

      // 8. Earliest due date
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();

      return 0;
    });
}

export function getOverdueText(task: Task): string | null {
  if (!isOverdue(task)) return null;
  const mins = overdueMinutes(task);
  if (mins < 60) return `Overdue ${Math.round(mins)} min`;
  if (mins < 1440) return `Overdue ${Math.round(mins / 60)}h`;
  return `Overdue ${Math.round(mins / 1440)}d`;
}

export function getDueCountdown(task: Task): string {
  if (!task.due_at) {
    if (task.review_on) return `Review: ${new Date(task.review_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    return '';
  }

  const due = new Date(task.due_at);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) return getOverdueText(task) || 'Overdue';

  const diffMins = diffMs / 60000;
  if (diffMins < 60) return `${Math.round(diffMins)}m left`;
  if (diffMins < 1440) return `${Math.round(diffMins / 60)}h left`;
  if (diffMins < 10080) return `${Math.round(diffMins / 1440)}d left`;

  return due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export { isOverdue, isDueToday };


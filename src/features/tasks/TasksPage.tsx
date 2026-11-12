import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus, List, LayoutGrid, Calendar, Filter,
  CheckSquare, Clock, AlertTriangle, ChevronRight
} from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { TimingBadge } from '@/components/TimingBadge';
import type { TaskStatus, TimingType } from '@/types/database';

type ViewMode = 'list' | 'board' | 'calendar';
type Tab = 'my' | 'assigned' | 'team' | 'watching' | 'pickup';

/* Demo tasks for UI */
const DEMO_TASKS: {
  id: string; title: string; status: TaskStatus; timing_type: TimingType;
  owner: string; due: string; overdue: boolean; importance: 'normal' | 'important';
}[] = [
  { id: '1', title: 'Payments due list for this month', status: 'in_progress', timing_type: 'dated', owner: 'James Sheary', due: 'Fri 5:00 PM', overdue: false, importance: 'important' },
  { id: '2', title: 'Morning cash & safe count', status: 'new', timing_type: 'repeating', owner: 'James Sheary', due: 'Today 10:00 AM', overdue: true, importance: 'normal' },
  { id: '3', title: 'Gold rate post', status: 'submitted', timing_type: 'repeating', owner: 'Adil', due: 'Today 10:30 AM', overdue: false, importance: 'normal' },
  { id: '4', title: 'Diwali reel edit', status: 'in_progress', timing_type: 'dated', owner: 'Adil', due: 'Tomorrow 6:00 PM', overdue: false, importance: 'important' },
  { id: '5', title: 'Full stock audit', status: 'in_progress', timing_type: 'long', owner: 'Jelisha', due: '30 Dec 2026', overdue: false, importance: 'important' },
  { id: '6', title: 'Find new packaging supplier', status: 'new', timing_type: 'flexible', owner: 'Unassigned', due: 'Review: 19 Nov', overdue: false, importance: 'normal' },
  { id: '7', title: 'Bridal set from locker', status: 'done', timing_type: 'urgent', owner: 'Jelisha', due: 'Completed', overdue: false, importance: 'normal' },
  { id: '8', title: 'Weekly content plan', status: 'seen', timing_type: 'repeating', owner: 'Adil', due: 'Mon 11:00 AM', overdue: false, importance: 'normal' },
];

/* ─── Task Row ─── */
function TaskRow({ task }: { task: typeof DEMO_TASKS[0] }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-ivory)] transition-colors cursor-pointer border-b border-[#E5DDD3] last:border-0">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
        backgroundColor: task.timing_type === 'urgent' ? '#C62828' :
          task.timing_type === 'dated' ? '#B8862B' :
          task.timing_type === 'long' ? '#7A1F2B' :
          task.timing_type === 'flexible' ? '#8A7A72' : '#5B3FBF'
      }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {task.importance === 'important' && <span className="text-[var(--color-gold)]">★ </span>}
            {task.title}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--color-ink)]/40">{task.owner}</span>
          <span className="text-xs text-[var(--color-ink)]/20">·</span>
          <span className={cn('text-xs', task.overdue ? 'text-[var(--color-urgent)] font-medium' : 'text-[var(--color-ink)]/40')}>
            {task.overdue && '⚠ '}{task.due}
          </span>
        </div>
      </div>

      <TimingBadge timing={task.timing_type} />
      <StatusPill status={task.status} />
      <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20 shrink-0" />
    </div>
  );
}

/* ─── Board Column ─── */
function BoardColumn({ title, tasks, color }: { title: string; tasks: typeof DEMO_TASKS; color: string }) {
  return (
    <div className="min-w-[280px] max-w-[320px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-[var(--color-ink)]/40 ml-auto">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white rounded-xl border border-[#E5DDD3] p-3 cursor-pointer hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <TimingBadge timing={task.timing_type} />
              {task.importance === 'important' && <span className="text-[var(--color-gold)] text-xs">★</span>}
            </div>
            <p className="text-sm font-medium mb-2">{task.title}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-ink)]/40">{task.owner}</span>
              <span className={cn('text-xs', task.overdue ? 'text-[var(--color-urgent)]' : 'text-[var(--color-ink)]/40')}>
                {task.due}
              </span>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-xs text-[var(--color-ink)]/30">No tasks</div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Tasks Page ─── */
export default function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('list');
  const [tab, setTab] = useState<Tab>('my');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'my', label: 'My Tasks', count: 6 },
    { key: 'assigned', label: 'Assigned by Me', count: 4 },
    { key: 'team', label: 'Team', count: 12 },
    { key: 'watching', label: 'Watching', count: 2 },
    { key: 'pickup', label: 'Pick-up Board', count: 1 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.tasks')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4" /> Filters
          </Button>
          <Button size="sm" onClick={() => navigate('/tasks/new')}>
            <Plus className="w-4 h-4" /> {t('task.new')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors',
              tab === t.key
                ? 'bg-[var(--color-maroon)] text-white font-medium'
                : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]'
            )}
          >
            {t.label}
            <span className={cn('ml-1.5 text-xs', tab === t.key ? 'text-white/70' : 'text-[var(--color-ink)]/30')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-[var(--color-ivory)] rounded-lg p-1 w-fit">
        <button onClick={() => setView('list')} className={cn('p-2 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50')}>
          <List className="w-4 h-4" />
        </button>
        <button onClick={() => setView('board')} className={cn('p-2 rounded-md transition-colors', view === 'board' ? 'bg-white shadow-sm' : 'hover:bg-white/50')}>
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button onClick={() => setView('calendar')} className={cn('p-2 rounded-md transition-colors', view === 'calendar' ? 'bg-white shadow-sm' : 'hover:bg-white/50')}>
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden">
          {DEMO_TASKS.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}

      {view === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <BoardColumn title="New" tasks={DEMO_TASKS.filter(t => ['new', 'seen'].includes(t.status))} color="#3B82F6" />
          <BoardColumn title="In Progress" tasks={DEMO_TASKS.filter(t => t.status === 'in_progress')} color="#F59E0B" />
          <BoardColumn title="Submitted" tasks={DEMO_TASKS.filter(t => t.status === 'submitted')} color="#8B5CF6" />
          <BoardColumn title="Done" tasks={DEMO_TASKS.filter(t => t.status === 'done')} color="#22C55E" />
        </div>
      )}

      {view === 'calendar' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-6 text-center text-sm text-[var(--color-ink)]/40">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Calendar view — showing tasks by due date</p>
          <p className="text-xs mt-1">Drag tasks to reschedule</p>
        </div>
      )}
    </div>
  );
}


import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus, List, LayoutGrid, Calendar, Filter,
  ChevronRight, GripVertical
} from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { TimingBadge } from '@/components/TimingBadge';
import { TaskDrawer } from '@/components/TaskDrawer';
import { useTasks, useTransitionTask, useClaimTask } from '@/features/tasks/hooks';
import type { Task, TaskStatus, TimingType } from '@/types/database';
import { isPast, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import {
  DndContext, closestCenter, DragEndEvent,
  useSensor, useSensors, PointerSensor, KeyboardSensor,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ViewMode = 'list' | 'board' | 'calendar';
type Tab = 'my' | 'assigned' | 'team' | 'watching' | 'pickup';

/* Demo tasks for UI fallback */
const DEMO_TASKS: Task[] = [
  { id: '1', title: 'Payments due list for this month', status: 'in_progress', timing_type: 'dated', owner_id: null, due_at: new Date(Date.now() + 86400000 * 3).toISOString(), importance: 'important', created_by: '', assign_target: 'person', helpers: [], watchers: [], snooze_count: 0, actual_minutes: 0, proof_type: 'none', requires_approval: true, read_aloud: false, escalation_level: 0, date_change_count: 0, source: 'owner', is_draft: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title_ml: null, description: null, department_id: null, pool_department_id: null, review_on: null, started_at: null, submitted_at: null, completed_at: null, estimate_minutes: null, proof_rule: null, approver_id: null, report_back_to: null, template_id: null, routine_id: null, routine_instance_date: null, chain_run_id: null, chain_step: null, parent_task_id: null, batch_id: null, voice_note_id: null },
  { id: '2', title: 'Morning cash & safe count', status: 'new', timing_type: 'repeating', owner_id: null, due_at: new Date(Date.now() - 3600000).toISOString(), importance: 'normal', created_by: '', assign_target: 'person', helpers: [], watchers: [], snooze_count: 0, actual_minutes: 0, proof_type: 'number', requires_approval: true, read_aloud: false, escalation_level: 0, date_change_count: 0, source: 'routine', is_draft: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title_ml: null, description: null, department_id: null, pool_department_id: null, review_on: null, started_at: null, submitted_at: null, completed_at: null, estimate_minutes: null, proof_rule: null, approver_id: null, report_back_to: null, template_id: null, routine_id: null, routine_instance_date: null, chain_run_id: null, chain_step: null, parent_task_id: null, batch_id: null, voice_note_id: null },
  { id: '3', title: 'Gold rate post', status: 'submitted', timing_type: 'repeating', owner_id: null, due_at: new Date().toISOString(), importance: 'normal', created_by: '', assign_target: 'person', helpers: [], watchers: [], snooze_count: 0, actual_minutes: 0, proof_type: 'photo', requires_approval: true, read_aloud: false, escalation_level: 0, date_change_count: 0, source: 'routine', is_draft: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title_ml: null, description: null, department_id: null, pool_department_id: null, review_on: null, started_at: null, submitted_at: null, completed_at: null, estimate_minutes: null, proof_rule: null, approver_id: null, report_back_to: null, template_id: null, routine_id: null, routine_instance_date: null, chain_run_id: null, chain_step: null, parent_task_id: null, batch_id: null, voice_note_id: null },
  { id: '4', title: 'Diwali reel edit', status: 'in_progress', timing_type: 'dated', owner_id: null, due_at: new Date(Date.now() + 86400000).toISOString(), importance: 'important', created_by: '', assign_target: 'person', helpers: [], watchers: [], snooze_count: 0, actual_minutes: 0, proof_type: 'file', requires_approval: true, read_aloud: false, escalation_level: 0, date_change_count: 0, source: 'manager', is_draft: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title_ml: null, description: null, department_id: null, pool_department_id: null, review_on: null, started_at: null, submitted_at: null, completed_at: null, estimate_minutes: null, proof_rule: null, approver_id: null, report_back_to: null, template_id: null, routine_id: null, routine_instance_date: null, chain_run_id: null, chain_step: null, parent_task_id: null, batch_id: null, voice_note_id: null },
  { id: '5', title: 'Full stock audit', status: 'in_progress', timing_type: 'long', owner_id: null, due_at: new Date(Date.now() + 86400000 * 45).toISOString(), importance: 'important', created_by: '', assign_target: 'person', helpers: [], watchers: [], snooze_count: 0, actual_minutes: 0, proof_type: 'checklist', requires_approval: true, read_aloud: false, escalation_level: 0, date_change_count: 0, source: 'owner', is_draft: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title_ml: null, description: null, department_id: null, pool_department_id: null, review_on: null, started_at: null, submitted_at: null, completed_at: null, estimate_minutes: null, proof_rule: null, approver_id: null, report_back_to: null, template_id: null, routine_id: null, routine_instance_date: null, chain_run_id: null, chain_step: null, parent_task_id: null, batch_id: null, voice_note_id: null },
  { id: '6', title: 'Find new packaging supplier', status: 'new', timing_type: 'flexible', owner_id: null, due_at: null, review_on: '2026-11-19', importance: 'normal', created_by: '', assign_target: 'person', helpers: [], watchers: [], snooze_count: 0, actual_minutes: 0, proof_type: 'none', requires_approval: true, read_aloud: false, escalation_level: 0, date_change_count: 0, source: 'owner', is_draft: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title_ml: null, description: null, department_id: null, pool_department_id: null, started_at: null, submitted_at: null, completed_at: null, estimate_minutes: null, proof_rule: null, approver_id: null, report_back_to: null, template_id: null, routine_id: null, routine_instance_date: null, chain_run_id: null, chain_step: null, parent_task_id: null, batch_id: null, voice_note_id: null },
  { id: '7', title: 'Bridal set from locker', status: 'done', timing_type: 'urgent', owner_id: null, due_at: new Date(Date.now() - 7200000).toISOString(), importance: 'normal', created_by: '', assign_target: 'person', helpers: [], watchers: [], snooze_count: 0, actual_minutes: 0, proof_type: 'photo', requires_approval: true, read_aloud: false, escalation_level: 0, date_change_count: 0, source: 'owner', is_draft: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), title_ml: null, description: null, department_id: null, pool_department_id: null, review_on: null, started_at: null, submitted_at: null, completed_at: new Date().toISOString(), estimate_minutes: null, proof_rule: null, approver_id: null, report_back_to: null, template_id: null, routine_id: null, routine_instance_date: null, chain_run_id: null, chain_step: null, parent_task_id: null, batch_id: null, voice_note_id: null },
];

const TIMING_COLORS: Record<TimingType, string> = {
  urgent: '#C62828', dated: '#B8862B', long: '#7A1F2B', flexible: '#8A7A72', repeating: '#5B3FBF',
};

const BOARD_COLUMNS: { key: TaskStatus[]; title: string; color: string }[] = [
  { key: ['new', 'seen'], title: 'New', color: '#3B82F6' },
  { key: ['in_progress'], title: 'In Progress', color: '#F59E0B' },
  { key: ['submitted'], title: 'Submitted', color: '#8B5CF6' },
  { key: ['done'], title: 'Done', color: '#22C55E' },
];

/* ─── Task Row ─── */
function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const isOverdue = task.due_at && isPast(new Date(task.due_at)) && task.status !== 'done' && task.status !== 'cancelled';
  const dueText = task.due_at
    ? format(new Date(task.due_at), 'EEE h:mm a')
    : task.review_on
    ? `Review: ${format(new Date(task.review_on), 'dd MMM')}`
    : '';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-ivory)] transition-colors cursor-pointer border-b border-[#E5DDD3] last:border-0"
      onClick={onClick}
    >
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TIMING_COLORS[task.timing_type] }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {task.importance === 'important' && <span className="text-[var(--color-gold)]">★ </span>}
            {task.title}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('text-xs', isOverdue ? 'text-[var(--color-urgent)] font-medium' : 'text-[var(--color-ink)]/40')}>
            {isOverdue && '⚠ '}{dueText}
          </span>
        </div>
      </div>
      <TimingBadge timing={task.timing_type} />
      <StatusPill status={task.status} />
      <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20 shrink-0" />
    </div>
  );
}

/* ─── Sortable Board Card ─── */
function BoardCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition: t, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition: t };
  const isOverdue = task.due_at && isPast(new Date(task.due_at)) && task.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-xl border border-[#E5DDD3] p-3 cursor-pointer hover:shadow-sm transition-shadow',
        isDragging && 'opacity-50 shadow-lg'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3.5 h-3.5 text-[var(--color-ink)]/20" />
        </div>
        <TimingBadge timing={task.timing_type} />
        {task.importance === 'important' && <span className="text-[var(--color-gold)] text-xs">★</span>}
      </div>
      <p className="text-sm font-medium mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <span className={cn('text-xs', isOverdue ? 'text-[var(--color-urgent)]' : 'text-[var(--color-ink)]/40')}>
          {task.due_at ? format(new Date(task.due_at), 'dd MMM h:mm a') : task.review_on ? `Review: ${format(new Date(task.review_on), 'dd MMM')}` : ''}
        </span>
      </div>
    </div>
  );
}

/* ─── Board Column ─── */
function BoardColumn({ title, tasks, color, onCardClick }: { title: string; tasks: Task[]; color: string; onCardClick: (id: string) => void }) {
  return (
    <div className="min-w-[280px] max-w-[320px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-[var(--color-ink)]/40 ml-auto">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} onClick={() => onCardClick(task.id)} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-xs text-[var(--color-ink)]/30">No tasks</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/* ─── Calendar View ─── */
function CalendarView({ tasks, onDayClick }: { tasks: Task[]; onDayClick: (taskId: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const d = task.due_at ? format(new Date(task.due_at), 'yyyy-MM-dd') : null;
      if (d) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  return (
    <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5DDD3]">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-[var(--color-ivory)] rounded">←</button>
        <h3 className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-[var(--color-ivory)] rounded">→</button>
      </div>
      <div className="grid grid-cols-7">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-[var(--color-ink)]/40 py-2 border-b border-[#E5DDD3]">{d}</div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay.get(key) || [];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

          return (
            <div key={key} className={cn(
              'min-h-[80px] p-1 border-b border-r border-[#E5DDD3] text-xs',
              !isCurrentMonth && 'bg-[var(--color-ivory)]/50'
            )}>
              <div className={cn(
                'w-6 h-6 flex items-center justify-center rounded-full mb-0.5',
                isToday && 'bg-[var(--color-maroon)] text-white font-bold',
                !isCurrentMonth && 'text-[var(--color-ink)]/20'
              )}>
                {format(day, 'd')}
              </div>
              {dayTasks.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="truncate text-[10px] px-1 py-0.5 rounded cursor-pointer hover:bg-[var(--color-maroon)]/10 transition-colors"
                  style={{ color: TIMING_COLORS[t.timing_type] }}
                  onClick={() => onDayClick(t.id)}
                  title={t.title}
                >
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 3 && (
                <span className="text-[10px] text-[var(--color-ink)]/30 px-1">+{dayTasks.length - 3} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Tasks Page ─── */
export default function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('list');
  const [tab, setTab] = useState<Tab>('my');

  const selectedTaskId = searchParams.get('task');

  const { data: remoteTasks, isLoading, isError } = useTasks({ tab });
  const tasks = (remoteTasks && remoteTasks.length > 0) ? remoteTasks : DEMO_TASKS;

  const transition = useTransitionTask();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const openTask = (id: string) => {
    setSearchParams({ task: id });
  };

  const closeTask = () => {
    searchParams.delete('task');
    setSearchParams(searchParams);
  };

  // Board DnD: map status to action
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // In a full impl, determine target column and call transition
  };

  const tabCounts = useMemo(() => ({
    my: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length,
    assigned: tasks.length,
    team: tasks.length,
    watching: 0,
    pickup: tasks.filter(t => !t.owner_id).length,
  }), [tasks]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'my', label: 'My Tasks', count: tabCounts.my },
    { key: 'assigned', label: 'Assigned by Me', count: tabCounts.assigned },
    { key: 'team', label: 'Team', count: tabCounts.team },
    { key: 'watching', label: 'Watching', count: tabCounts.watching },
    { key: 'pickup', label: 'Pick-up Board', count: tabCounts.pickup },
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
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={cn(
              'px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors',
              tab === tabItem.key
                ? 'bg-[var(--color-maroon)] text-white font-medium'
                : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]'
            )}
          >
            {tabItem.label}
            <span className={cn('ml-1.5 text-xs', tab === tabItem.key ? 'text-white/70' : 'text-[var(--color-ink)]/30')}>
              {tabItem.count}
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[var(--color-maroon)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      {!isLoading && view === 'list' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={() => openTask(task.id)} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--color-ink)]/40">No tasks found</div>
          )}
        </div>
      )}

      {!isLoading && view === 'board' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {BOARD_COLUMNS.map((col) => (
              <BoardColumn
                key={col.title}
                title={col.title}
                tasks={tasks.filter(t => col.key.includes(t.status))}
                color={col.color}
                onCardClick={openTask}
              />
            ))}
          </div>
        </DndContext>
      )}

      {!isLoading && view === 'calendar' && (
        <CalendarView tasks={tasks} onDayClick={openTask} />
      )}

      {/* Task Drawer */}
      <TaskDrawer taskId={selectedTaskId} onClose={closeTask} />
    </div>
  );
}

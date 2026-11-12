import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  X, Play, Send, Check, XCircle, Clock, MessageSquare, History, Flag,
  ChevronRight, CalendarClock, UserPlus, Ban, Copy, Hand, CheckSquare, Milestone as MilestoneIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/StatusPill';
import { TimingBadge } from '@/components/TimingBadge';
import { ProofUploader } from '@/components/ProofUploader';
import {
  useTask, useTransitionTask, useTaskEvents, useTaskComments,
  useAddComment, useCreateTask, useClaimTask, useRequestDateChange,
} from '@/features/tasks/hooks';
import { useAuth } from '@/lib/auth';
import { usePeople } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { getDueCountdown, isOverdue } from '@/lib/workOrder';
import type { TaskStatus, TaskChecklistItem, Milestone } from '@/types/database';
import { formatDistanceToNow, isPast, format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/* ─── Sub-hooks for checklist & milestones ─── */

function useChecklistItems(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.taskChecklist(taskId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_checklist_items')
        .select('*')
        .eq('task_id', taskId!)
        .order('position');
      if (error) throw error;
      return (data || []) as TaskChecklistItem[];
    },
    enabled: !!taskId,
  });
}

function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ itemId, done }: { itemId: string; done: boolean }) => {
      const { error } = await supabase.from('task_checklist_items').update({
        done,
        done_by: done ? profile!.id : null,
        done_at: done ? new Date().toISOString() : null,
      }).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist'] });
    },
  });
}

function useMilestones(taskId: string | null) {
  return useQuery({
    queryKey: ['milestones', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('task_id', taskId!)
        .order('position');
      if (error) throw error;
      return (data || []) as Milestone[];
    },
    enabled: !!taskId,
  });
}

/* ─── Due Countdown Badge ─── */

function DueCountdown({ task }: { task: any }) {
  const countdown = getDueCountdown(task);
  if (!countdown) return null;
  const overdue = isOverdue(task);
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
      overdue ? 'bg-[var(--color-urgent)]/10 text-[var(--color-urgent)]' : 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
    )}>
      <Clock className="w-3 h-3" />
      {countdown}
    </span>
  );
}

/* ─── Primary action helper ─── */

interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

type DrawerTab = 'details' | 'comments' | 'history';

function getPrimaryAction(status: TaskStatus, isOwner: boolean, isApprover: boolean) {
  if (status === 'new' || status === 'seen') return { action: 'start' as const, label: 'Start', icon: Play, color: 'bg-blue-600' };
  if (status === 'in_progress') return { action: 'submit' as const, label: 'Submit', icon: Send, color: 'bg-purple-600' };
  if (status === 'submitted' && isApprover) return { action: 'approve' as const, label: 'Approve', icon: Check, color: 'bg-green-600' };
  if (status === 'sent_back') return { action: 'start' as const, label: 'Restart', icon: Play, color: 'bg-blue-600' };
  return null;
}

export function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useTask(taskId);
  const transition = useTransitionTask();
  const createTask = useCreateTask();
  const claimTask = useClaimTask();
  const requestDateChange = useRequestDateChange();
  const { data: events } = useTaskEvents(taskId || '');
  const { data: comments } = useTaskComments(taskId || '');
  const { data: checklistItems } = useChecklistItems(taskId);
  const { data: milestones } = useMilestones(task?.timing_type === 'long' ? taskId : null);
  const { data: people = [] } = usePeople();
  const toggleChecklist = useToggleChecklistItem();
  const addComment = useAddComment();
  const [tab, setTab] = useState<DrawerTab>('details');
  const [commentText, setCommentText] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  /* Secondary action dialogs */
  const [showDateChange, setShowDateChange] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [dateChangeReason, setDateChangeReason] = useState('');

  const [showReassign, setShowReassign] = useState(false);
  const [reassignSearch, setReassignSearch] = useState('');
  const [reassignTarget, setReassignTarget] = useState('');

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!taskId) return null;

  const isOwner = task?.owner_id === profile?.id;
  const isCreator = task?.created_by === profile?.id;
  const isApprover = task?.approver_id === profile?.id || task?.created_by === profile?.id;
  const isPoolTask = !task?.owner_id;
  const primaryAction = task ? getPrimaryAction(task.status, isOwner, isApprover) : null;

  const handleTransition = (action: string, note?: string) => {
    if (!taskId) return;
    transition.mutate({ taskId, action: action as any, note });
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !taskId) return;
    addComment.mutate({ taskId, body: commentText.trim() });
    setCommentText('');
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    handleTransition('reject', rejectReason.trim());
    setShowRejectReason(false);
    setRejectReason('');
  };

  /* Need more time */
  const handleRequestDateChange = () => {
    if (!taskId || !newDueDate.trim() || !dateChangeReason.trim()) return;
    requestDateChange.mutate({
      taskId,
      newDueAt: new Date(`${newDueDate}T17:00:00`).toISOString(),
      reason: dateChangeReason.trim(),
    }, {
      onSuccess: () => {
        setShowDateChange(false);
        setNewDueDate('');
        setDateChangeReason('');
      },
    });
  };

  /* Reassign */
  const handleReassign = async () => {
    if (!taskId || !reassignTarget) return;
    const { error } = await supabase.rpc('reassign_task', { p_task_id: taskId, p_new_owner_id: reassignTarget });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      setShowReassign(false);
      setReassignSearch('');
      setReassignTarget('');
    }
  };

  /* Cancel */
  const handleCancel = () => {
    if (!cancelReason.trim()) return;
    handleTransition('cancel', cancelReason.trim());
    setShowCancelConfirm(false);
    setCancelReason('');
  };

  /* Duplicate */
  const handleDuplicate = () => {
    if (!task) return;
    createTask.mutate({
      title: task.title,
      description: task.description || undefined,
      owner_id: task.owner_id || undefined,
      department_id: task.department_id || undefined,
      timing_type: task.timing_type,
      importance: task.importance,
      due_at: task.due_at || undefined,
      review_on: task.review_on || undefined,
      proof_type: task.proof_type,
      requires_approval: task.requires_approval,
      approver_id: task.approver_id || undefined,
      read_aloud: task.read_aloud,
    }, {
      onSuccess: (newTask) => {
        navigate(`/tasks?task=${newTask.id}`);
      },
    });
  };

  /* Claim */
  const handleClaim = () => {
    if (!taskId) return;
    claimTask.mutate(taskId);
  };

  const filteredReassignPeople = people.filter((p: any) =>
    p.full_name.toLowerCase().includes(reassignSearch.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5DDD3] shrink-0">
          <div className="flex items-center gap-2">
            {task && <StatusPill status={task.status} />}
            {task && <TimingBadge timing={task.timing_type} />}
            {task && <DueCountdown task={task} />}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-ivory)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-[var(--color-maroon)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : task ? (
            <div>
              {/* Title & Meta */}
              <div className="px-4 py-4 border-b border-[#E5DDD3]">
                <h2 className="text-lg font-semibold mb-2">
                  {task.importance === 'important' && <span className="text-[var(--color-gold)]">★ </span>}
                  {task.title}
                </h2>
                {task.description && (
                  <p className="text-sm text-[var(--color-ink)]/60 mb-3">{task.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-[var(--color-ink)]/50">
                  {task.due_at && (
                    <span className={cn('flex items-center gap-1', isPast(new Date(task.due_at)) && task.status !== 'done' && 'text-[var(--color-urgent)] font-medium')}>
                      <Clock className="w-3.5 h-3.5" />
                      {isPast(new Date(task.due_at)) && task.status !== 'done'
                        ? `Overdue ${formatDistanceToNow(new Date(task.due_at))}`
                        : `Due ${formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}`}
                    </span>
                  )}
                  {task.review_on && (
                    <span className="flex items-center gap-1">
                      <Flag className="w-3.5 h-3.5" />
                      Review: {format(new Date(task.review_on), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#E5DDD3]">
                {([
                  { key: 'details' as DrawerTab, label: 'Details', icon: ChevronRight },
                  { key: 'comments' as DrawerTab, label: 'Comments', icon: MessageSquare, count: comments?.length },
                  { key: 'history' as DrawerTab, label: 'History', icon: History, count: events?.length },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors border-b-2',
                      tab === t.key
                        ? 'border-[var(--color-maroon)] text-[var(--color-maroon)] font-medium'
                        : 'border-transparent text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]/70'
                    )}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                    {t.count != null && t.count > 0 && (
                      <span className="text-[10px] bg-[var(--color-ivory)] px-1.5 rounded-full">{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="px-4 py-3">
                {tab === 'details' && (
                  <div className="space-y-4">
                    {/* Proof Section */}
                    {task.proof_type !== 'none' && task.status === 'in_progress' && isOwner && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Proof Required: {task.proof_type}</h3>
                        <ProofUploader taskId={task.id} proofType={task.proof_type} proofRule={task.proof_rule} />
                      </div>
                    )}

                    {/* Reject reason dialog */}
                    {showRejectReason && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                        <p className="text-sm font-medium text-red-800">Reason for rejection:</p>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm resize-none"
                          rows={2}
                          placeholder="What needs to be fixed..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
                            Reject
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowRejectReason(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Need more time dialog */}
                    {showDateChange && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                        <p className="text-sm font-medium text-amber-800">Request more time</p>
                        <input
                          type="date"
                          value={newDueDate}
                          onChange={(e) => setNewDueDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-amber-200 text-sm"
                        />
                        <textarea
                          value={dateChangeReason}
                          onChange={(e) => setDateChangeReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-amber-200 text-sm resize-none"
                          rows={2}
                          placeholder="Reason for requesting extension..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="gold" onClick={handleRequestDateChange} disabled={!newDueDate || !dateChangeReason.trim() || requestDateChange.isPending}>
                            Request
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowDateChange(false)}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Reassign dialog */}
                    {showReassign && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                        <p className="text-sm font-medium text-blue-800">Reassign task</p>
                        <input
                          value={reassignSearch}
                          onChange={(e) => setReassignSearch(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm"
                          placeholder="Search person..."
                          autoFocus
                        />
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {filteredReassignPeople.slice(0, 10).map((p: any) => (
                            <button
                              key={p.id}
                              type="button"
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-left transition-colors',
                                reassignTarget === p.id ? 'bg-blue-100 border border-blue-300' : 'hover:bg-blue-50'
                              )}
                              onClick={() => setReassignTarget(p.id)}
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-semibold text-blue-700">
                                {p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </div>
                              <span>{p.full_name}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleReassign} disabled={!reassignTarget}>Reassign</Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowReassign(false)}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Cancel confirm dialog */}
                    {showCancelConfirm && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                        <p className="text-sm font-medium text-red-800">Are you sure you want to cancel this task?</p>
                        <textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm resize-none"
                          rows={2}
                          placeholder="Reason for cancellation..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>
                            Confirm Cancel
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(false)}>Go Back</Button>
                        </div>
                      </div>
                    )}

                    {/* Checklist Section */}
                    {checklistItems && checklistItems.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4" />
                          Checklist
                          <span className="text-[10px] text-[var(--color-ink)]/40 font-normal">
                            {checklistItems.filter(i => i.done).length}/{checklistItems.length}
                          </span>
                        </h3>
                        <div className="space-y-1.5">
                          {checklistItems.map((item) => (
                            <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={(e) => toggleChecklist.mutate({ itemId: item.id, done: e.target.checked })}
                                className="rounded text-[var(--color-maroon)]"
                                disabled={!isOwner}
                              />
                              <span className={cn(item.done && 'line-through text-[var(--color-ink)]/30')}>{item.text}</span>
                              {item.requires_photo && <span className="text-[10px] text-[var(--color-ink)]/30">📷</span>}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Milestones Section (for long tasks) */}
                    {task.timing_type === 'long' && milestones && milestones.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                          <MilestoneIcon className="w-4 h-4" />
                          Milestones
                          <span className="text-[10px] text-[var(--color-ink)]/40 font-normal">
                            {milestones.filter(m => m.done).length}/{milestones.length}
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {milestones.map((ms, i) => (
                            <div key={ms.id} className="flex items-center gap-2 text-sm">
                              <div className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                                ms.done ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white' : 'border-[#E5DDD3]'
                              )}>
                                {ms.done && <Check className="w-3 h-3" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('truncate', ms.done && 'line-through text-[var(--color-ink)]/30')}>{ms.title}</p>
                                {ms.due_at && (
                                  <p className="text-[10px] text-[var(--color-ink)]/30">
                                    {format(new Date(ms.due_at), 'dd MMM yyyy')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-[var(--color-ivory)] rounded-lg p-3">
                        <p className="text-[var(--color-ink)]/40 text-xs mb-0.5">Source</p>
                        <p className="font-medium capitalize">{task.source}</p>
                      </div>
                      <div className="bg-[var(--color-ivory)] rounded-lg p-3">
                        <p className="text-[var(--color-ink)]/40 text-xs mb-0.5">Date Changes</p>
                        <p className="font-medium">{task.date_change_count}</p>
                      </div>
                      <div className="bg-[var(--color-ivory)] rounded-lg p-3">
                        <p className="text-[var(--color-ink)]/40 text-xs mb-0.5">Approval</p>
                        <p className="font-medium">{task.requires_approval ? 'Required' : 'Auto-approve'}</p>
                      </div>
                      <div className="bg-[var(--color-ivory)] rounded-lg p-3">
                        <p className="text-[var(--color-ink)]/40 text-xs mb-0.5">Escalation</p>
                        <p className="font-medium">Level {task.escalation_level}</p>
                      </div>
                    </div>

                    {/* Secondary Actions */}
                    {task.status !== 'done' && task.status !== 'cancelled' && (
                      <div>
                        <h3 className="text-xs font-semibold text-[var(--color-ink)]/40 uppercase tracking-wider mb-2">Actions</h3>
                        <div className="flex flex-wrap gap-2">
                          {/* Claim — only for pool tasks */}
                          {isPoolTask && (
                            <Button size="sm" variant="outline" onClick={handleClaim} disabled={claimTask.isPending}>
                              <Hand className="w-3.5 h-3.5 mr-1" /> Claim
                            </Button>
                          )}
                          {/* Need more time */}
                          {(isOwner || isCreator) && task.due_at && (
                            <Button size="sm" variant="outline" onClick={() => setShowDateChange(true)}>
                              <CalendarClock className="w-3.5 h-3.5 mr-1" /> Need more time
                            </Button>
                          )}
                          {/* Reassign */}
                          {(isCreator || isApprover) && (
                            <Button size="sm" variant="outline" onClick={() => setShowReassign(true)}>
                              <UserPlus className="w-3.5 h-3.5 mr-1" /> Reassign
                            </Button>
                          )}
                          {/* Duplicate */}
                          <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={createTask.isPending}>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
                          </Button>
                          {/* Cancel */}
                          {(isOwner || isCreator) && (
                            <Button size="sm" variant="outline" className="text-[var(--color-urgent)] border-[var(--color-urgent)]/30 hover:bg-[var(--color-urgent)]/5" onClick={() => setShowCancelConfirm(true)}>
                              <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'comments' && (
                  <div className="space-y-3">
                    {comments && comments.length > 0 ? (
                      comments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--color-maroon)] shrink-0">
                            {comment.author?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium">{comment.author?.full_name || 'Unknown'}</span>
                              <span className="text-[10px] text-[var(--color-ink)]/30">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--color-ink)]/70 mt-0.5">{comment.body}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-center text-[var(--color-ink)]/30 py-6">No comments yet</p>
                    )}
                  </div>
                )}

                {tab === 'history' && (
                  <div className="space-y-2">
                    {events && events.length > 0 ? (
                      events.map((event: any) => (
                        <div key={event.id} className="flex items-start gap-3 text-sm py-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-maroon)]/30 mt-2 shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium capitalize">{event.type.replace(/_/g, ' ')}</span>
                            {event.note && <span className="text-[var(--color-ink)]/50"> — {event.note}</span>}
                            <p className="text-[10px] text-[var(--color-ink)]/30 mt-0.5">
                              {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-center text-[var(--color-ink)]/30 py-6">No history yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-[var(--color-ink)]/40">
              Task not found
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {task && task.status !== 'done' && task.status !== 'cancelled' && (
          <div className="px-4 py-3 border-t border-[#E5DDD3] bg-[var(--color-ivory)] shrink-0">
            {tab === 'comments' ? (
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-white text-sm"
                  placeholder="Add a comment..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                />
                <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim() || addComment.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {primaryAction && (isOwner || isApprover) && (
                  <Button
                    className={cn('flex-1', primaryAction.color, 'text-white hover:opacity-90')}
                    onClick={() => handleTransition(primaryAction.action)}
                    disabled={transition.isPending}
                  >
                    <primaryAction.icon className="w-4 h-4 mr-1.5" />
                    {primaryAction.label}
                  </Button>
                )}
                {task.status === 'submitted' && isApprover && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectReason(true)}
                    disabled={transition.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject
                  </Button>
                )}
                {(isOwner || isCreator) && task.status !== 'blocked' && task.status === 'in_progress' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTransition('block', 'Blocked')}
                    disabled={transition.isPending}
                  >
                    Block
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

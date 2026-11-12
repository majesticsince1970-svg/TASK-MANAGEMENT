import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Play, Send, Check, XCircle, Clock, MessageSquare, History, Flag, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/StatusPill';
import { TimingBadge } from '@/components/TimingBadge';
import { ProofUploader } from '@/components/ProofUploader';
import { useTask, useTransitionTask, useTaskEvents, useTaskComments, useAddComment } from '@/features/tasks/hooks';
import { useAuth } from '@/lib/auth';
import type { TaskStatus } from '@/types/database';
import { formatDistanceToNow, isPast, format } from 'date-fns';

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
  const { profile } = useAuth();
  const { data: task, isLoading } = useTask(taskId);
  const transition = useTransitionTask();
  const { data: events } = useTaskEvents(taskId || '');
  const { data: comments } = useTaskComments(taskId || '');
  const addComment = useAddComment();
  const [tab, setTab] = useState<DrawerTab>('details');
  const [commentText, setCommentText] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!taskId) return null;

  const isOwner = task?.owner_id === profile?.id;
  const isCreator = task?.created_by === profile?.id;
  const isApprover = task?.approver_id === profile?.id || task?.created_by === profile?.id;
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


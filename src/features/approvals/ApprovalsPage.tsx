import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useTransitionTask } from '@/features/tasks/hooks';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/StatusPill';
import { TimingBadge } from '@/components/TimingBadge';
import { cn } from '@/lib/utils';
import { Check, X, Clock, CalendarDays, Users, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Task } from '@/types/database';
import { queryKeys } from '@/lib/queryKeys';

type ApprovalTab = 'work' | 'dates' | 'peer' | 'handover';

function usePendingApprovals() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: queryKeys.pendingApprovals(profile?.id || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!profile?.id,
  });
}

function useDateChangeRequests() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: queryKeys.dateChangeRequests(profile?.id || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('date_change_requests')
        .select('*, task:tasks(title, timing_type)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });
}

/* Demo data for fallback */
const DEMO_APPROVALS: Task[] = [
  { id: 'a1', title: 'Gold rate post (proof: Instagram screenshot)', status: 'submitted', timing_type: 'repeating', importance: 'normal', submitted_at: new Date(Date.now() - 3600000).toISOString() } as Task,
  { id: 'a2', title: 'Morning cash count (₹4,52,300)', status: 'submitted', timing_type: 'repeating', importance: 'normal', submitted_at: new Date(Date.now() - 7200000).toISOString() } as Task,
  { id: 'a3', title: 'Diwali showcase photo', status: 'submitted', timing_type: 'dated', importance: 'important', submitted_at: new Date(Date.now() - 1800000).toISOString() } as Task,
];

const DEMO_DATE_REQUESTS = [
  { id: 'd1', task: { title: 'Payment list for October', timing_type: 'dated' }, reason: 'Supplier delayed invoice', old_due_at: '2026-11-15', new_due_at: '2026-11-20', created_at: new Date().toISOString() },
  { id: 'd2', task: { title: 'Interior redesign quote', timing_type: 'dated' }, reason: 'Waiting for vendor visit', old_due_at: '2026-11-12', new_due_at: '2026-11-18', created_at: new Date().toISOString() },
];

export default function ApprovalsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('work');
  const { data: remoteApprovals, isLoading: loadingApprovals } = usePendingApprovals();
  const { data: remoteDateRequests, isLoading: loadingDates } = useDateChangeRequests();
  const transition = useTransitionTask();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const approvals = (remoteApprovals && remoteApprovals.length > 0) ? remoteApprovals : DEMO_APPROVALS;
  const dateRequests = (remoteDateRequests && remoteDateRequests.length > 0) ? remoteDateRequests : DEMO_DATE_REQUESTS;

  const tabs: { key: ApprovalTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'work', label: 'Work Approvals', icon: Check, count: approvals.length },
    { key: 'dates', label: 'Date Changes', icon: CalendarDays, count: dateRequests.length },
    { key: 'peer', label: 'Peer Reviews', icon: Users, count: 0 },
    { key: 'handover', label: 'Handovers', icon: ArrowRight, count: 0 },
  ];

  const handleApprove = (taskId: string) => {
    transition.mutate({ taskId, action: 'approve' });
  };

  const handleReject = (taskId: string) => {
    if (rejectReason.trim()) {
      transition.mutate({ taskId, action: 'reject', reason: rejectReason.trim() });
      setRejectingId(null);
      setRejectReason('');
    }
  };

  const handleDateDecision = async (requestId: string, approved: boolean) => {
    await supabase.rpc('decide_date_change', { p_request_id: requestId, p_approved: approved });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.approvals')}</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors',
              activeTab === tab.key
                ? 'bg-[var(--color-maroon)] text-white font-medium'
                : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={cn('text-xs', activeTab === tab.key ? 'text-white/70' : 'text-[var(--color-ink)]/30')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Work Approvals */}
      {activeTab === 'work' && (
        <div className="space-y-3">
          {approvals.map((task) => (
            <div key={task.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TimingBadge timing={task.timing_type} />
                    {task.importance === 'important' && <span className="text-[var(--color-gold)]">★</span>}
                  </div>
                  <h3 className="font-medium mb-1">{task.title}</h3>
                  <p className="text-xs text-[var(--color-ink)]/40">
                    Submitted {task.submitted_at ? formatDistanceToNow(new Date(task.submitted_at), { addSuffix: true }) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {rejectingId === task.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="px-2 py-1 text-sm border border-[#E5DDD3] rounded-lg w-40"
                        placeholder="Reason..."
                        autoFocus
                      />
                      <Button size="sm" variant="destructive" onClick={() => handleReject(task.id)} disabled={!rejectReason.trim()}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="text-xs text-[var(--color-ink)]/40">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(task.id)}
                        disabled={transition.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectingId(task.id)}
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {approvals.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--color-ink)]/40">No pending approvals 🎉</div>
          )}
        </div>
      )}

      {/* Date Change Requests */}
      {activeTab === 'dates' && (
        <div className="space-y-3">
          {dateRequests.map((req: any) => (
            <div key={req.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{req.task?.title}</h3>
                  <p className="text-sm text-[var(--color-ink)]/60 mb-2">
                    <span className="font-medium">Reason:</span> {req.reason}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-ink)]/40">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="line-through">{req.old_due_at}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className="font-medium text-[var(--color-ink)]">{req.new_due_at}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleDateDecision(req.id, true)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDateDecision(req.id, false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {dateRequests.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--color-ink)]/40">No pending date change requests</div>
          )}
        </div>
      )}

      {/* Peer Reviews & Handovers */}
      {(activeTab === 'peer' || activeTab === 'handover') && (
        <div className="text-center py-12 text-sm text-[var(--color-ink)]/40">
          {activeTab === 'peer' ? 'No peer reviews pending' : 'No handover requests'}
        </div>
      )}
    </div>
  );
}

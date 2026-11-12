import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useDashboardStats } from '@/lib/hooks';
import { useTasks } from '@/features/tasks/hooks';
import { workOrderSort } from '@/lib/workOrder';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Plus, Mic, ClipboardList, CheckCircle, AlertTriangle, Clock,
  TrendingUp, Users, Bot, BarChart3, ChevronRight, Star
} from 'lucide-react';
import { isPast, formatDistanceToNow } from 'date-fns';
import type { Task } from '@/types/database';

export default function HomePage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: stats } = useDashboardStats();
  const { data: myTasks = [] } = useTasks({ tab: 'my', status: ['new', 'seen', 'in_progress', 'sent_back'] });

  const isManager = profile?.role === 'owner' || profile?.role === 'director';
  const isSenior = profile?.senior_mode;
  const topTasks = sortByWorkOrder(myTasks as any).slice(0, 5);

  // Senior mode: 3 big buttons
  if (isSenior) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <h1 className="text-3xl font-bold text-center">{t('app.title')}</h1>
        <p className="text-lg text-[var(--color-ink)]/60">
          {t('common.welcome')}, {profile?.full_name}
        </p>
        <div className="grid gap-4 w-full max-w-sm">
          <button
            onClick={() => navigate('/voice/new')}
            className="flex items-center gap-4 p-6 bg-[var(--color-maroon)] text-white rounded-2xl text-xl font-semibold hover:opacity-90 transition-opacity"
          >
            <Mic className="w-10 h-10" /> {t('nav.voice')}
          </button>
          <button
            onClick={() => navigate('/tasks?tab=my')}
            className="flex items-center gap-4 p-6 bg-white border-2 border-[#E5DDD3] rounded-2xl text-xl font-semibold hover:bg-[var(--color-ivory)] transition-colors"
          >
            <ClipboardList className="w-10 h-10 text-[var(--color-maroon)]" /> My Tasks
          </button>
          <button
            onClick={() => navigate('/approvals')}
            className="flex items-center gap-4 p-6 bg-white border-2 border-[#E5DDD3] rounded-2xl text-xl font-semibold hover:bg-[var(--color-ivory)] transition-colors"
          >
            <CheckCircle className="w-10 h-10 text-green-600" /> Approvals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          {t('common.welcome')}, {profile?.full_name?.split(' ')[0] || 'User'} 👋
        </h1>
        <p className="text-sm text-[var(--color-ink)]/50 mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Tasks', value: stats?.active ?? '-', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => navigate('/tasks') },
          { label: 'Overdue', value: stats?.overdue ?? '-', icon: AlertTriangle, color: 'text-[var(--color-urgent)]', bg: 'bg-red-50', onClick: () => navigate('/tasks') },
          { label: 'Awaiting Review', value: stats?.submitted ?? '-', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', onClick: () => navigate('/approvals') },
          { label: 'Completed', value: stats?.done ?? '-', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', onClick: () => navigate('/reports') },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-[#E5DDD3] p-4 cursor-pointer hover:shadow-sm transition-shadow"
            onClick={card.onClick}
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', card.bg)}>
              <card.icon className={cn('w-5 h-5', card.color)} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-[var(--color-ink)]/40 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate('/tasks/new')}>
          <Plus className="w-4 h-4 mr-1" /> {t('task.new')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/voice/new')}>
          <Mic className="w-4 h-4 mr-1" /> {t('nav.voice')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/eod')}>
          <BarChart3 className="w-4 h-4 mr-1" /> EOD Report
        </Button>
      </div>

      {/* My Priority Tasks */}
      {topTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Priority Tasks</h2>
            <button onClick={() => navigate('/tasks')} className="text-xs text-[var(--color-maroon)] hover:underline">
              View all →
            </button>
          </div>
          <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden">
            {topTasks.map((task: any) => {
              const isOverdue = task.due_at && isPast(new Date(task.due_at));
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#E5DDD3] last:border-0 hover:bg-[var(--color-ivory)] cursor-pointer transition-colors"
                  onClick={() => navigate(`/tasks?task=${task.id}`)}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{
                    backgroundColor: task.timing_type === 'urgent' ? '#C62828' :
                      task.timing_type === 'dated' ? '#B8862B' : '#8A7A72'
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {task.importance === 'important' && <span className="text-[var(--color-gold)]">★ </span>}
                      {task.title}
                    </p>
                    {task.due_at && (
                      <p className={cn('text-[10px] mt-0.5', isOverdue ? 'text-[var(--color-urgent)] font-medium' : 'text-[var(--color-ink)]/30')}>
                        {isOverdue ? '⚠ Overdue' : ''} {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Manager Preview (managers only) */}
      {isManager && (
        <div
          className="bg-gradient-to-r from-[var(--color-maroon)] to-[#5D1020] rounded-xl p-5 text-white cursor-pointer hover:opacity-95 transition-opacity"
          onClick={() => navigate('/ai')}
        >
          <div className="flex items-center gap-3 mb-3">
            <Bot className="w-6 h-6" />
            <h2 className="font-semibold">AI Manager</h2>
          </div>
          <p className="text-sm text-white/70 mb-3">Your AI assistant has insights ready</p>
          <div className="flex gap-4 text-xs">
            <span className="bg-white/10 px-2.5 py-1 rounded-full">3 alerts</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-full">Daily digest ready</span>
          </div>
        </div>
      )}

      {/* Points */}
      {profile && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/10 flex items-center justify-center">
            <Star className="w-6 h-6 text-[var(--color-gold)]" />
          </div>
          <div>
            <p className="text-xl font-bold">{profile.points} pts</p>
            <p className="text-xs text-[var(--color-ink)]/40">Your achievement points</p>
          </div>
          <button onClick={() => navigate('/reports?tab=leaderboard')} className="ml-auto text-xs text-[var(--color-maroon)] hover:underline">
            Leaderboard →
          </button>
        </div>
      )}
    </div>
  );
}

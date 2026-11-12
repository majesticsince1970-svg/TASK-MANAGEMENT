import { useTranslation } from 'react-i18next';
import { useAuth, hasMinRole } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import {
  Plus, CheckSquare, ClipboardCheck, Brain, Radio,
  BarChart3, TrendingUp, Users, Clock, AlertTriangle,
  ChevronRight, Zap, Calendar, FolderKanban
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ElementType; label: string; value: string | number; color: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E5DDD3] p-4 text-left hover:shadow-sm transition-shadow w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ backgroundColor: color + '15' }}>
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-[var(--color-ink)]/50 mt-0.5">{label}</p>
    </button>
  );
}

/* ─── Quick Action ─── */
function QuickAction({ icon: Icon, label, color, onClick }: {
  icon: React.ElementType; label: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5DDD3] hover:shadow-sm transition-shadow w-full"
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span className="text-sm font-medium">{label}</span>
      <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20 ml-auto" />
    </button>
  );
}

/* ─── Pinned Note Preview ─── */
function PinnedNotePreview() {
  const demoTasks = [
    { id: '1', title: 'Review payment list for this month', timing: 'dated', due: 'Today 5:00 PM', color: '#B8862B' },
    { id: '2', title: 'Morning cash & safe count', timing: 'repeating', due: 'Overdue 40 min', color: '#C62828' },
    { id: '3', title: 'Gold rate post for today', timing: 'repeating', due: 'Today 10:30 AM', color: '#5B3FBF' },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5DDD3] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[var(--color-maroon)] rounded-full animate-pulse" />
          <h3 className="text-sm font-semibold">📌 Pinned Note</h3>
        </div>
        <span className="text-xs text-[var(--color-ink)]/40">Today 3/6 done</span>
      </div>
      <div className="divide-y divide-[#E5DDD3]">
        {demoTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-ivory)] transition-colors cursor-pointer">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{task.title}</p>
              <p className="text-xs mt-0.5" style={{ color: task.color }}>{task.due}</p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 text-xs h-7">
              Start
            </Button>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 bg-[var(--color-ivory)] text-center">
        <span className="text-xs text-[var(--color-ink)]/40">+4 more this month</span>
      </div>
    </div>
  );
}

/* ─── Department Tile ─── */
function DepartmentTile({ name, done, inProgress, overdue, color }: {
  name: string; done: number; inProgress: number; overdue: number; color: string;
}) {
  const total = done + inProgress + overdue;
  return (
    <div className="bg-white rounded-xl border border-[#E5DDD3] p-4 hover:shadow-sm transition-shadow cursor-pointer">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <h4 className="text-sm font-medium truncate">{name}</h4>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-[var(--color-ivory)] mb-2">
        {done > 0 && <div className="bg-[var(--color-success)]" style={{ width: `${(done / total) * 100}%` }} />}
        {inProgress > 0 && <div className="bg-[var(--color-warning)]" style={{ width: `${(inProgress / total) * 100}%` }} />}
        {overdue > 0 && <div className="bg-[var(--color-urgent)]" style={{ width: `${(overdue / total) * 100}%` }} />}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--color-ink)]/50">
        <span className="text-[var(--color-success)]">{done} done</span>
        <span className="text-[var(--color-warning)]">{inProgress} active</span>
        <span className="text-[var(--color-urgent)]">{overdue} overdue</span>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function HomePage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isManager = profile && hasMinRole(profile.role, 'dept_head');
  const isOwner = profile?.role === 'owner' || profile?.role === 'director';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {profile?.language === 'ml' ? 'സ്വാഗതം' : 'Welcome'}, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-[var(--color-ink)]/50 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button onClick={() => navigate('/tasks/new')}>
          <Plus className="w-4 h-4" /> {t('task.new')}
        </Button>
      </div>

      {/* Pinned Note */}
      <PinnedNotePreview />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CheckSquare} label="Open Tasks" value={12} color="#7A1F2B" onClick={() => navigate('/tasks')} />
        <StatCard icon={AlertTriangle} label="Overdue" value={3} color="#C62828" onClick={() => navigate('/tasks?filter=overdue')} />
        <StatCard icon={TrendingUp} label="Done Today" value={5} color="#2E7D4F" onClick={() => navigate('/tasks?filter=done')} />
        {isManager ? (
          <StatCard icon={ClipboardCheck} label="To Approve" value={4} color="#5B3FBF" onClick={() => navigate('/approvals')} />
        ) : (
          <StatCard icon={Clock} label="Due This Week" value={8} color="#B8862B" onClick={() => navigate('/tasks')} />
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <QuickAction icon={Plus} label="Create New Task" color="#7A1F2B" onClick={() => navigate('/tasks/new')} />
        <QuickAction icon={CheckSquare} label="My Tasks" color="#2E7D4F" onClick={() => navigate('/tasks')} />
        {isManager && (
          <QuickAction icon={ClipboardCheck} label="Approvals" color="#5B3FBF" onClick={() => navigate('/approvals')} />
        )}
      </div>

      {/* Owner/Director: Department tiles */}
      {isOwner && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Departments</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DepartmentTile name="Accounts" done={8} inProgress={3} overdue={1} color="#4CAF50" />
            <DepartmentTile name="Creative" done={5} inProgress={4} overdue={2} color="#FF9800" />
            <DepartmentTile name="Sales Floor" done={12} inProgress={6} overdue={0} color="#2196F3" />
            <DepartmentTile name="HR & Admin" done={6} inProgress={2} overdue={1} color="#9C27B0" />
            <DepartmentTile name="Billing" done={9} inProgress={1} overdue={0} color="#00BCD4" />
            <DepartmentTile name="Stock & Old Gold" done={4} inProgress={5} overdue={3} color="#F44336" />
            <DepartmentTile name="Security" done={7} inProgress={2} overdue={0} color="#607D8B" />
            <DepartmentTile name="Management" done={3} inProgress={1} overdue={0} color="#795548" />
          </div>
        </div>
      )}

      {/* AI Manager Preview (owner/director) */}
      {isOwner && (
        <div className="bg-gradient-to-r from-[var(--color-ai)]/5 to-[var(--color-ai)]/10 rounded-xl border border-[var(--color-ai)]/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-ai)] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">AI Manager</h3>
              <p className="text-xs text-[var(--color-ink)]/50">3 new insights today</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate('/ai')}>
              View All <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg text-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--color-urgent)]" />
              <span>Cash count not submitted — Accounts department, 40 min overdue</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg text-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
              <span>James has 12 tasks due this week — consider redistributing</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


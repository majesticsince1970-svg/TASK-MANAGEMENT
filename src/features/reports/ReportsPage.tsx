import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLeaderboard, useDepartments, useDashboardStats, usePeople } from '@/lib/hooks';
import { useTasks } from '@/features/tasks/hooks';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Download, Trophy, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ReportTab = 'overview' | 'completion' | 'workload' | 'leaderboard' | 'export';

const COLORS = ['#7A1F2B', '#B8862B', '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ReportTab>('overview');
  const { data: leaderboard = [] } = useLeaderboard();
  const { data: departments = [] } = useDepartments();
  const { data: stats } = useDashboardStats();
  const { data: allTasks = [] } = useTasks({});
  const { data: people = [] } = usePeople();
  const { toast } = useToast();

  // Compute status distribution from real tasks
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of allTasks) {
      const s = (task as any).status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    }
    const statusColors: Record<string, string> = {
      draft: '#9CA3AF', new: '#3B82F6', seen: '#06B6D4', in_progress: '#F59E0B',
      blocked: '#EF4444', submitted: '#8B5CF6', sent_back: '#F97316', done: '#22C55E', cancelled: '#6B7280',
    };
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
      color: statusColors[name] || '#9CA3AF',
    }));
  }, [allTasks]);

  // Compute per-department completion rates from real tasks
  const completionData = useMemo(() => {
    const deptMap: Record<string, { total: number; done: number; late: number }> = {};
    for (const task of allTasks) {
      const deptId = (task as any).department_id;
      if (!deptId) continue;
      if (!deptMap[deptId]) deptMap[deptId] = { total: 0, done: 0, late: 0 };
      deptMap[deptId].total++;
      if ((task as any).status === 'done') deptMap[deptId].done++;
      if ((task as any).due_at && new Date((task as any).due_at) < new Date() && (task as any).status !== 'done' && (task as any).status !== 'cancelled') {
        deptMap[deptId].late++;
      }
    }
    return Object.entries(deptMap).map(([deptId, { total, done, late }]) => {
      const dept = departments.find((d: any) => d.id === deptId);
      const missed = late;
      const onTime = total > 0 ? Math.round(((done) / total) * 100) : 0;
      const latePercent = total > 0 ? Math.round((late / total) * 100) : 0;
      const missedPercent = Math.min(latePercent, 100 - onTime);
      return {
        name: dept ? (dept as any).name : deptId.slice(0, 8),
        onTime,
        late: latePercent,
        missed: missedPercent,
      };
    });
  }, [allTasks, departments]);

  // Compute workload per person (active task count)
  const workloadData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const task of allTasks) {
      const status = (task as any).status;
      if (['new', 'seen', 'in_progress', 'blocked', 'sent_back'].includes(status)) {
        const oid = (task as any).owner_id;
        if (oid) map[oid] = (map[oid] || 0) + 1;
      }
    }
    return people.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      workload: map[p.id] || 0,
    })).sort((a: any, b: any) => b.workload - a.workload);
  }, [allTasks, people]);

  // CSV export
  const handleCsvExport = useCallback(() => {
    if (allTasks.length === 0) {
      toast({ title: 'No data', description: 'There are no tasks to export.', variant: 'warning' });
      return;
    }
    const headers = ['ID', 'Title', 'Status', 'Timing', 'Owner', 'Department', 'Due', 'Created'];
    const rows = allTasks.map((task: any) => [
      task.id,
      `"${(task.title || '').replace(/"/g, '""')}"`,
      task.status,
      task.timing_type,
      task.owner_id || '',
      task.department_id || '',
      task.due_at || '',
      task.created_at || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `majestic-ops-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'CSV file downloaded.', variant: 'success' });
  }, [allTasks, toast]);

  const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'completion', label: 'Completion', icon: TrendingUp },
    { key: 'workload', label: 'Workload', icon: Users },
    { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { key: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.reports')}</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors',
              tab === tabItem.key
                ? 'bg-[var(--color-maroon)] text-white font-medium'
                : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]'
            )}
          >
            <tabItem.icon className="w-4 h-4" /> {tabItem.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active', value: stats?.active ?? 0, color: 'text-blue-600' },
              { label: 'Overdue', value: stats?.overdue ?? 0, color: 'text-[var(--color-urgent)]' },
              { label: 'Submitted', value: stats?.submitted ?? 0, color: 'text-purple-600' },
              { label: 'Done (month)', value: stats?.done ?? 0, color: 'text-green-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-[#E5DDD3] p-4 text-center">
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-[var(--color-ink)]/40">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Status pie chart */}
          <div className="bg-white rounded-xl border border-[#E5DDD3] p-4">
            <h3 className="text-sm font-semibold mb-3">Task Status Distribution</h3>
            {statusData.length === 0 ? (
              <p className="text-sm text-[var(--color-ink)]/40 text-center py-12">No data yet</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion rates */}
      {tab === 'completion' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-4">
          <h3 className="text-sm font-semibold mb-3">Completion Rate by Department</h3>
          {completionData.length === 0 ? (
            <p className="text-sm text-[var(--color-ink)]/40 text-center py-12">No data yet</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD3" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTime" stackId="a" fill="#22C55E" name="On Time" />
                  <Bar dataKey="late" stackId="a" fill="#F59E0B" name="Late" />
                  <Bar dataKey="missed" stackId="a" fill="#EF4444" name="Missed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Workload */}
      {tab === 'workload' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-4">
          <h3 className="text-sm font-semibold mb-3">Active Workload per Person</h3>
          {workloadData.length === 0 ? (
            <p className="text-sm text-[var(--color-ink)]/40 text-center py-12">No data yet</p>
          ) : (
            <div className="space-y-3">
              {workloadData.map((person: any) => (
                <div key={person.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xs font-semibold text-[var(--color-maroon)]">
                    {person.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium w-28 truncate">{person.full_name}</span>
                  <div className="flex-1">
                    <div className="h-5 bg-[var(--color-ivory)] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', person.workload > 8 ? 'bg-red-400' : person.workload > 5 ? 'bg-yellow-400' : 'bg-green-400')}
                        style={{ width: `${Math.min(100, (person.workload / 12) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-mono w-8 text-right">{person.workload}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        leaderboard.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No leaderboard data"
            description="Points are awarded as tasks are completed. The leaderboard will populate over time."
          />
        ) : (
          <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden">
            {leaderboard.map((person: any, i: number) => (
              <div key={person.id} className={cn(
                'flex items-center gap-4 px-4 py-3 border-b border-[#E5DDD3] last:border-0',
                i < 3 && 'bg-[var(--color-gold)]/5'
              )}>
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  i === 0 && 'bg-[var(--color-gold)] text-white',
                  i === 1 && 'bg-gray-400 text-white',
                  i === 2 && 'bg-amber-700 text-white',
                  i > 2 && 'bg-[var(--color-ivory)] text-[var(--color-ink)]/40'
                )}>
                  {i + 1}
                </span>
                <div className="w-9 h-9 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xs font-semibold text-[var(--color-maroon)]">
                  {person.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{person.full_name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className={cn('w-4 h-4', i < 3 ? 'text-[var(--color-gold)]' : 'text-[var(--color-ink)]/20')} />
                  <span className="text-sm font-bold">{person.points}</span>
                  <span className="text-xs text-[var(--color-ink)]/30">pts</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Export */}
      {tab === 'export' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-6 text-center">
          <Download className="w-12 h-12 mx-auto mb-4 text-[var(--color-ink)]/20" />
          <h3 className="font-semibold mb-2">Export Reports</h3>
          <p className="text-sm text-[var(--color-ink)]/50 mb-4">Download your task data as CSV</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={handleCsvExport}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => toast({ title: 'Coming soon', description: 'PDF export is coming soon.', variant: 'info' })}
            >
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

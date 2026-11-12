import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLeaderboard, useDepartments, useDashboardStats } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Download, Trophy, TrendingUp, Users, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ReportTab = 'overview' | 'completion' | 'workload' | 'leaderboard' | 'export';

const COLORS = ['#7A1F2B', '#B8862B', '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];

/* Demo data */
const DEMO_COMPLETION_DATA = [
  { name: 'Sales', onTime: 85, late: 10, missed: 5 },
  { name: 'Design', onTime: 92, late: 5, missed: 3 },
  { name: 'Accounts', onTime: 78, late: 15, missed: 7 },
  { name: 'Workshop', onTime: 88, late: 8, missed: 4 },
  { name: 'Social', onTime: 70, late: 20, missed: 10 },
  { name: 'Admin', onTime: 95, late: 3, missed: 2 },
];

const DEMO_TREND_DATA = [
  { week: 'W1', created: 45, completed: 40, overdue: 5 },
  { week: 'W2', created: 52, completed: 48, overdue: 3 },
  { week: 'W3', created: 38, completed: 35, overdue: 8 },
  { week: 'W4', created: 60, completed: 55, overdue: 4 },
];

const DEMO_STATUS_DATA = [
  { name: 'New', value: 12, color: '#3B82F6' },
  { name: 'In Progress', value: 18, color: '#F59E0B' },
  { name: 'Submitted', value: 8, color: '#8B5CF6' },
  { name: 'Done', value: 45, color: '#22C55E' },
  { name: 'Overdue', value: 5, color: '#EF4444' },
];

const DEMO_LEADERBOARD = [
  { id: '1', full_name: 'Jelisha', points: 320, avatar_url: null },
  { id: '2', full_name: 'Adil', points: 285, avatar_url: null },
  { id: '3', full_name: 'James Sheary', points: 265, avatar_url: null },
  { id: '4', full_name: 'Simi', points: 210, avatar_url: null },
  { id: '5', full_name: 'Rajan', points: 180, avatar_url: null },
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ReportTab>('overview');
  const { data: remoteLeaderboard } = useLeaderboard();
  const { data: departments } = useDepartments();
  const { data: stats } = useDashboardStats();

  const leaderboard = (remoteLeaderboard && remoteLeaderboard.length > 0) ? remoteLeaderboard : DEMO_LEADERBOARD;

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
              { label: 'Active', value: stats?.active ?? 42, color: 'text-blue-600' },
              { label: 'Overdue', value: stats?.overdue ?? 5, color: 'text-[var(--color-urgent)]' },
              { label: 'Submitted', value: stats?.submitted ?? 8, color: 'text-purple-600' },
              { label: 'Done (month)', value: stats?.done ?? 120, color: 'text-green-600' },
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
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={DEMO_STATUS_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {DEMO_STATUS_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly trend */}
          <div className="bg-white rounded-xl border border-[#E5DDD3] p-4">
            <h3 className="text-sm font-semibold mb-3">Weekly Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DEMO_TREND_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD3" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#22C55E" strokeWidth={2} />
                  <Line type="monotone" dataKey="overdue" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Completion rates */}
      {tab === 'completion' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-4">
          <h3 className="text-sm font-semibold mb-3">Completion Rate by Department</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMO_COMPLETION_DATA} layout="vertical">
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
        </div>
      )}

      {/* Workload */}
      {tab === 'workload' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-4">
          <h3 className="text-sm font-semibold mb-3">Active Workload per Person</h3>
          <div className="space-y-3">
            {DEMO_LEADERBOARD.map((person, i) => {
              const workload = Math.floor(Math.random() * 12) + 2;
              return (
                <div key={person.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xs font-semibold text-[var(--color-maroon)]">
                    {person.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium w-28 truncate">{person.full_name}</span>
                  <div className="flex-1">
                    <div className="h-5 bg-[var(--color-ivory)] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', workload > 8 ? 'bg-red-400' : workload > 5 ? 'bg-yellow-400' : 'bg-green-400')}
                        style={{ width: `${Math.min(100, (workload / 12) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-mono w-8 text-right">{workload}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
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
      )}

      {/* Export */}
      {tab === 'export' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-6 text-center">
          <Download className="w-12 h-12 mx-auto mb-4 text-[var(--color-ink)]/20" />
          <h3 className="font-semibold mb-2">Export Reports</h3>
          <p className="text-sm text-[var(--color-ink)]/50 mb-4">Download your reports as CSV or PDF</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

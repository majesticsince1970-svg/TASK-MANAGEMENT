import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BarChart3, Download, TrendingUp, Users, RotateCcw, Trophy } from 'lucide-react';

export default function ReportsPage() {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'completion', label: 'Completion', icon: TrendingUp },
    { key: 'routines', label: 'Routines', icon: RotateCcw },
    { key: 'workload', label: 'Workload', icon: Users },
    { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4" /> CSV</Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4" /> PDF</Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg whitespace-nowrap',
              tab === t.key ? 'bg-[var(--color-maroon)] text-white font-medium' : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]')}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks', value: '156', sub: 'This month' },
          { label: 'On-time Rate', value: '87%', sub: '+3% from last month' },
          { label: 'Avg Completion', value: '1.8d', sub: 'Average time' },
          { label: 'Date Changes', value: '12', sub: 'This month' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
            <p className="text-xs text-[var(--color-ink)]/50">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
            <p className="text-xs text-[var(--color-success)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-white rounded-xl border border-[#E5DDD3] p-6">
        <h3 className="font-semibold mb-4">Completion Rate by Department</h3>
        <div className="space-y-3">
          {[
            { dept: 'Accounts', rate: 95 },
            { dept: 'Creative', rate: 82 },
            { dept: 'HR & Admin', rate: 100 },
            { dept: 'Sales Floor', rate: 88 },
            { dept: 'Billing', rate: 90 },
            { dept: 'Stock & Old Gold', rate: 70 },
            { dept: 'Security', rate: 93 },
          ].map((d) => (
            <div key={d.dept} className="flex items-center gap-3">
              <span className="text-sm w-32 truncate">{d.dept}</span>
              <div className="flex-1 h-6 bg-[var(--color-ivory)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${d.rate >= 90 ? 'bg-[var(--color-success)]' : d.rate >= 80 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-urgent)]'}`}
                  style={{ width: `${d.rate}%` }} />
              </div>
              <span className="text-sm font-semibold w-12 text-right">{d.rate}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


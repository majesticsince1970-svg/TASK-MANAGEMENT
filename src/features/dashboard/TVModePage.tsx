import { useEffect, useState } from 'react';
import { Gem, BarChart3, CheckCircle2, AlertTriangle, Clock, Users } from 'lucide-react';

const PANELS = [
  {
    title: 'Department Overview',
    content: [
      { dept: 'Accounts', done: 8, active: 3, overdue: 1, color: '#4CAF50' },
      { dept: 'Creative', done: 5, active: 4, overdue: 2, color: '#FF9800' },
      { dept: 'Sales Floor', done: 12, active: 6, overdue: 0, color: '#2196F3' },
      { dept: 'HR & Admin', done: 6, active: 2, overdue: 1, color: '#9C27B0' },
    ]
  },
  {
    title: 'Today\'s Stats',
    stats: [
      { label: 'Tasks Done', value: 31, icon: CheckCircle2 },
      { label: 'Overdue', value: 4, icon: AlertTriangle },
      { label: 'Active Now', value: 15, icon: Clock },
      { label: 'Staff on Duty', value: 18, icon: Users },
    ]
  },
];

export default function TVModePage() {
  const [panelIdx, setPanelIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPanelIdx((i) => (i + 1) % PANELS.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-dark-bg)] text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-maroon)] flex items-center justify-center">
            <Gem className="w-6 h-6 text-[var(--color-gold)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Majestic Ops</h1>
            <p className="text-sm text-white/40">Control Room</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-sm text-white/40">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* Auto-rotating panels */}
      {panelIdx === 0 && PANELS[0].content && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {PANELS[0].content.map((d) => (
            <div key={d.dept} className="bg-[var(--color-dark-surface)] rounded-2xl p-6 border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <h3 className="font-semibold">{d.dept}</h3>
              </div>
              <div className="flex gap-4">
                <div><p className="text-3xl font-bold text-green-400">{d.done}</p><p className="text-xs text-white/40">Done</p></div>
                <div><p className="text-3xl font-bold text-yellow-400">{d.active}</p><p className="text-xs text-white/40">Active</p></div>
                <div><p className="text-3xl font-bold text-red-400">{d.overdue}</p><p className="text-xs text-white/40">Overdue</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {panelIdx === 1 && PANELS[1].stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {PANELS[1].stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-[var(--color-dark-surface)] rounded-2xl p-8 border border-white/5 text-center">
                <Icon className="w-10 h-10 mx-auto mb-4 text-[var(--color-gold)]" />
                <p className="text-5xl font-bold">{s.value}</p>
                <p className="text-sm text-white/40 mt-2">{s.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Panel indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {PANELS.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${panelIdx === i ? 'bg-[var(--color-gold)]' : 'bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}


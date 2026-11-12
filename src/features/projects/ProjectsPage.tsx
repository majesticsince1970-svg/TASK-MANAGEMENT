import { Button } from '@/components/ui/button';
import { FolderKanban, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const PROJECTS = [
  { id: '1', name: 'Full Stock Audit', owner: 'Jelisha', dueDate: '30 Dec 2026', pctDone: 45, pctTime: 60, atRisk: true,
    milestones: [
      { name: 'Gold inventory', done: true },
      { name: 'Silver inventory', done: true },
      { name: 'Diamond inventory', done: false },
      { name: 'Final reconciliation', done: false },
    ]
  },
  { id: '2', name: 'Store Renovation Phase 2', owner: 'Hadi Muhammad', dueDate: '15 Jan 2027', pctDone: 80, pctTime: 70, atRisk: false,
    milestones: [
      { name: 'Design approval', done: true },
      { name: 'Vendor selection', done: true },
      { name: 'Installation', done: true },
      { name: 'Final inspection', done: false },
    ]
  },
];

export default function ProjectsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Projects & Long Tasks</h1>

      <div className="space-y-4">
        {PROJECTS.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-[#E5DDD3] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-long)]/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-[var(--color-long)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.atRisk && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)] font-medium">
                        <AlertTriangle className="w-3 h-3" /> At Risk
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-ink)]/50">{p.owner} · Due {p.dueDate}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-[var(--color-long)]">{p.pctDone}%</span>
            </div>

            {/* Progress bars */}
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-ink)]/50">Work done</span>
                  <span className="font-medium">{p.pctDone}%</span>
                </div>
                <div className="h-2.5 bg-[var(--color-ivory)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${p.atRisk ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'}`} style={{ width: `${p.pctDone}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-ink)]/50">Time elapsed</span>
                  <span className="font-medium">{p.pctTime}%</span>
                </div>
                <div className="h-2.5 bg-[var(--color-ivory)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-ink)]/20" style={{ width: `${p.pctTime}%` }} />
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="border-t border-[#E5DDD3] pt-3">
              <p className="text-xs font-semibold text-[var(--color-ink)]/50 mb-2">Milestones</p>
              <div className="space-y-1.5">
                {p.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {m.done ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[var(--color-ink)]/30" />
                    )}
                    <span className={m.done ? 'line-through text-[var(--color-ink)]/40' : ''}>{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


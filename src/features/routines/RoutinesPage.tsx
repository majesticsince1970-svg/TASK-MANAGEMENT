import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw, Clock, CheckCircle2, ChevronRight, Calendar } from 'lucide-react';

const DEMO_ROUTINES = [
  { id: '1', name: 'Morning Cash & Safe Count', dept: 'Accounts', schedule: 'Daily 10:00 AM', assignee: 'James Sheary', compliance: 92, nextRun: 'Tomorrow 10:00 AM', proof: 'number' },
  { id: '2', name: 'Gold Rate Post', dept: 'Creative', schedule: 'Daily 10:30 AM', assignee: 'Adil', compliance: 88, nextRun: 'Tomorrow 10:30 AM', proof: 'photo' },
  { id: '3', name: 'Vendor & Bank Entries', dept: 'Accounts', schedule: 'Daily 1:00 PM', assignee: 'James Sheary', compliance: 95, nextRun: 'Tomorrow 1:00 PM', proof: 'text_note' },
  { id: '4', name: 'Weekly Content Plan', dept: 'Creative', schedule: 'Mon 10:00 AM', assignee: 'Adil', compliance: 78, nextRun: 'Mon 10:00 AM', proof: 'file' },
  { id: '5', name: 'Attendance Anomalies', dept: 'HR & Admin', schedule: 'Daily 11:00 AM', assignee: 'HR Head', compliance: 100, nextRun: 'Tomorrow 11:00 AM', proof: 'text_note' },
  { id: '6', name: 'Opening Tray Count', dept: 'Sales Floor', schedule: 'Daily 9:30 AM', assignee: 'Floor Staff', compliance: 85, nextRun: 'Tomorrow 9:30 AM', proof: 'checklist' },
];

export default function RoutinesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Routines</h1>
        <Button size="sm"><Plus className="w-4 h-4" /> Create Routine</Button>
      </div>

      <div className="space-y-3">
        {DEMO_ROUTINES.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4 hover:shadow-sm transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-repeating)]/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-[var(--color-repeating)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{r.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-ivory)] text-[var(--color-ink)]/50">{r.dept}</span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-[var(--color-ink)]/50">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.schedule}</span>
                  <span>→ {r.assignee}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Next: {r.nextRun}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className={`text-sm font-bold ${r.compliance >= 90 ? 'text-[var(--color-success)]' : r.compliance >= 80 ? 'text-[var(--color-warning)]' : 'text-[var(--color-urgent)]'}`}>
                    {r.compliance}%
                  </div>
                  <div className="text-[10px] text-[var(--color-ink)]/40">compliance</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


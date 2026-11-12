import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, Send } from 'lucide-react';

export default function EODPage() {
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">End of Day Report</h1>

      <div className="bg-white rounded-xl border border-[#E5DDD3] p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
          <h3 className="font-semibold">Today's Completed Tasks</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">Pre-filled</span>
        </div>
        <div className="space-y-2">
          {['Morning cash & safe count (₹4,82,300)', 'Gold rate post uploaded', 'Vendor payment entries — 5 entries'].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[var(--color-ink)]/70">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" /> {t}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5DDD3] p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5">Blockers / Issues</label>
          <textarea value={blockers} onChange={(e) => setBlockers(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm min-h-[80px] resize-none"
            placeholder="Any issues that slowed you down today..." />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">Tomorrow's Plan</label>
          <textarea value={tomorrowPlan} onChange={(e) => setTomorrowPlan(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm min-h-[80px] resize-none"
            placeholder="What do you plan to work on tomorrow..." />
        </div>
        <Button className="w-full"><Send className="w-4 h-4" /> Submit EOD Report</Button>
      </div>
    </div>
  );
}


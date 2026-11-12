import { Radio, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PEOPLE = [
  { id: '1', name: 'James Sheary', role: 'Accounts Head', availability: 'on_duty', task: 'Payments due list', timer: '1h 23m', doneToday: 3, total: 6, overdue: 1 },
  { id: '2', name: 'Adil', role: 'Creative', availability: 'on_duty', task: 'Diwali reel edit', timer: '45m', doneToday: 2, total: 4, overdue: 0 },
  { id: '3', name: 'Jelisha', role: 'Creative', availability: 'with_customer', task: null, timer: null, doneToday: 1, total: 3, overdue: 0 },
  { id: '4', name: 'Abdul Latif', role: 'Director', availability: 'on_duty', task: null, timer: null, doneToday: 0, total: 1, overdue: 0 },
  { id: '5', name: 'Ahmed', role: 'Director', availability: 'on_break', task: null, timer: null, doneToday: 0, total: 0, overdue: 0 },
  { id: '6', name: 'Ravi Kumar', role: 'Sales', availability: 'on_duty', task: 'Opening tray count', timer: '12m', doneToday: 4, total: 5, overdue: 0 },
];

const dotColor: Record<string, string> = {
  on_duty: 'bg-green-500', on_break: 'bg-yellow-500', with_customer: 'bg-blue-500', on_leave: 'bg-red-500', off_shift: 'bg-gray-400',
};

export default function LiveBoardPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-[var(--color-urgent)] animate-pulse" />
          <h1 className="text-2xl font-bold">Live Board</h1>
          <span className="text-xs text-[var(--color-ink)]/40">Auto-refreshing</span>
        </div>
        <Button variant="ghost" size="sm"><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PEOPLE.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4 hover:shadow-sm cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-sm font-semibold text-[var(--color-maroon)]">
                  {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className={cn('absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white', dotColor[p.availability])} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-[var(--color-ink)]/40">{p.role}</p>
              </div>
            </div>

            {p.task ? (
              <div className="bg-[var(--color-ivory)] rounded-lg px-3 py-2 mb-3">
                <p className="text-xs text-[var(--color-ink)]/50">Working on</p>
                <p className="text-sm font-medium truncate">{p.task}</p>
                {p.timer && <p className="text-xs text-[var(--color-maroon)] font-mono mt-0.5">⏱ {p.timer}</p>}
              </div>
            ) : (
              <div className="bg-[var(--color-ivory)] rounded-lg px-3 py-2 mb-3 text-xs text-[var(--color-ink)]/30">
                No active task
              </div>
            )}

            <div className="flex justify-between text-xs text-[var(--color-ink)]/50">
              <span className="text-[var(--color-success)]">✓ {p.doneToday}/{p.total} today</span>
              {p.overdue > 0 && <span className="text-[var(--color-urgent)]">⚠ {p.overdue} overdue</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


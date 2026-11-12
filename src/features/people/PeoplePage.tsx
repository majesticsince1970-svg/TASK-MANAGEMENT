import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, Users, ChevronRight } from 'lucide-react';

const PEOPLE = [
  { id: '1', name: 'James Sheary', role: 'dept_head', dept: 'Accounts', title: 'Senior Account Manager', availability: 'on_duty', workload: 'red' },
  { id: '2', name: 'Adil', role: 'staff', dept: 'Creative', title: 'Content Creator', availability: 'on_duty', workload: 'amber' },
  { id: '3', name: 'Jelisha', role: 'staff', dept: 'Creative', title: 'Designer', availability: 'with_customer', workload: 'green' },
  { id: '4', name: 'Hadi Muhammad', role: 'owner', dept: 'Management', title: 'Owner', availability: 'on_duty', workload: 'green' },
  { id: '5', name: 'Abdul Latif', role: 'director', dept: 'Management', title: 'Director', availability: 'on_duty', workload: 'green' },
  { id: '6', name: 'Ahmed', role: 'director', dept: 'Management', title: 'Director', availability: 'on_break', workload: 'green' },
];

const dotColors: Record<string, string> = { on_duty: 'bg-green-500', on_break: 'bg-yellow-500', with_customer: 'bg-blue-500', on_leave: 'bg-red-500', off_shift: 'bg-gray-400' };
const workloadColors: Record<string, string> = { green: 'bg-green-500', amber: 'bg-yellow-500', red: 'bg-red-500' };

export default function PeoplePage() {
  const [search, setSearch] = useState('');
  const filtered = PEOPLE.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <Button size="sm"><Users className="w-4 h-4" /> Invite User</Button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-[#E5DDD3]">
        <Search className="w-4 h-4 text-[var(--color-ink)]/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm" placeholder="Search people..." />
      </div>

      <div className="bg-white rounded-xl border border-[#E5DDD3] divide-y divide-[#E5DDD3]">
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-ivory)] cursor-pointer">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-sm font-semibold text-[var(--color-maroon)]">
                {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white', dotColors[p.availability])} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-xs text-[var(--color-ink)]/40">{p.title} · {p.dept}</p>
            </div>
            <div className={cn('w-2.5 h-2.5 rounded-full', workloadColors[p.workload])} title="Workload" />
            <span className="text-xs text-[var(--color-ink)]/40 capitalize">{p.role.replace('_', ' ')}</span>
            <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20" />
          </div>
        ))}
      </div>
    </div>
  );
}


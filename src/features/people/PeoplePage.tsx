import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePeople, useDepartments } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { AvailabilityDot } from '@/components/AvailabilityDot';
import { Search, ChevronRight, Filter } from 'lucide-react';

const DEMO_PEOPLE = [
  { id: '1', full_name: 'James Sheary', job_title: 'Sales Manager', department_id: 'd1', availability: 'on_duty' as const, points: 265 },
  { id: '2', full_name: 'Jelisha', job_title: 'Accounts Head', department_id: 'd2', availability: 'on_duty' as const, points: 320 },
  { id: '3', full_name: 'Adil', job_title: 'Social Media Manager', department_id: 'd3', availability: 'with_customer' as const, points: 285 },
  { id: '4', full_name: 'Simi', job_title: 'Workshop Lead', department_id: 'd4', availability: 'on_break' as const, points: 210 },
  { id: '5', full_name: 'Rajan', job_title: 'Sales Executive', department_id: 'd1', availability: 'on_duty' as const, points: 180 },
  { id: '6', full_name: 'Priya', job_title: 'Designer', department_id: 'd3', availability: 'off_shift' as const, points: 150 },
];

export default function PeoplePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const { data: remotePeople } = usePeople({ search, departmentId: deptFilter || undefined });
  const { data: departments = [] } = useDepartments();

  const people = (remotePeople && remotePeople.length > 0) ? remotePeople : DEMO_PEOPLE;
  const filtered = search
    ? people.filter((p: any) => p.full_name.toLowerCase().includes(search.toLowerCase()))
    : people;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.people')}</h1>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink)]/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
            placeholder="Search people..."
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
        >
          <option value="">All Departments</option>
          {departments.map((d: any) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((person: any) => {
          const demoWorkload = Math.floor(Math.random() * 10) + 1;
          return (
            <div
              key={person.id}
              className="bg-white rounded-xl border border-[#E5DDD3] p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => navigate(`/people/${person.id}`)}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-sm font-bold text-[var(--color-maroon)]">
                  {person.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <AvailabilityDot status={person.availability} className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{person.full_name}</p>
                <p className="text-xs text-[var(--color-ink)]/40">{person.job_title || 'Staff'}</p>
              </div>
              {/* Workload dots */}
              <div className="flex gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 h-2 rounded-full',
                      i < Math.ceil(demoWorkload / 2)
                        ? demoWorkload > 7 ? 'bg-red-400' : demoWorkload > 4 ? 'bg-yellow-400' : 'bg-green-400'
                        : 'bg-[var(--color-ivory)]'
                    )}
                  />
                ))}
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20 shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

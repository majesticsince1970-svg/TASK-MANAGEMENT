import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeople } from '@/lib/hooks';
import { useTasks } from '@/features/tasks/hooks';
import { EmptyState } from '@/components/EmptyState';
import { AvailabilityDot } from '@/components/AvailabilityDot';
import { cn } from '@/lib/utils';
import { Activity, CheckCircle, Wifi, WifiOff, Users } from 'lucide-react';

export default function LiveBoardPage() {
  const { t } = useTranslation();
  const { data: people = [], isLoading: loadingPeople } = usePeople();
  const { data: activeTasks = [] } = useTasks({ status: ['in_progress'] });
  const { data: doneTasks = [] } = useTasks({ status: ['done'] });

  // Build per-person task counts and current task title
  const personStats = useMemo(() => {
    const map: Record<string, { activeCount: number; doneCount: number; currentTask: string | null }> = {};
    for (const task of activeTasks) {
      const oid = (task as any).owner_id;
      if (!oid) continue;
      if (!map[oid]) map[oid] = { activeCount: 0, doneCount: 0, currentTask: null };
      map[oid].activeCount++;
      map[oid].currentTask = (task as any).title;
    }
    for (const task of doneTasks) {
      const oid = (task as any).owner_id;
      if (!oid) continue;
      if (!map[oid]) map[oid] = { activeCount: 0, doneCount: 0, currentTask: null };
      map[oid].doneCount++;
    }
    return map;
  }, [activeTasks, doneTasks]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h1 className="text-2xl font-bold">{t('nav.live')}</h1>
        <span className="text-xs text-[var(--color-ink)]/30">Real-time</span>
      </div>

      {people.length === 0 && !loadingPeople ? (
        <EmptyState
          icon={Users}
          title="No team members found"
          description="People will appear here once profiles are set up in the system."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {people.map((person: any) => {
            const isOnline = ['on_duty', 'on_break', 'with_customer'].includes(person.availability);
            const stats = personStats[person.id] || { activeCount: 0, doneCount: 0, currentTask: null };

            return (
              <div key={person.id} className={cn(
                'bg-white rounded-xl border border-[#E5DDD3] p-4 transition-all',
                !isOnline && 'opacity-50'
              )}>
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-sm font-bold text-[var(--color-maroon)]">
                      {person.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <AvailabilityDot status={person.availability} className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{person.full_name}</h3>
                    <p className="text-xs text-[var(--color-ink)]/40">{person.job_title || 'Staff'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-ink)]/50">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {stats.activeCount} active
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" /> {stats.doneCount} done
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                </div>

                {/* Current task */}
                {isOnline && stats.currentTask && (
                  <div className="mt-3 px-3 py-2 bg-[var(--color-ivory)] rounded-lg text-xs">
                    <span className="text-[var(--color-ink)]/40">Working on: </span>
                    <span className="font-medium">{stats.currentTask}</span>
                  </div>
                )}
                {isOnline && !stats.currentTask && (
                  <div className="mt-3 px-3 py-2 bg-[var(--color-ivory)] rounded-lg text-xs text-[var(--color-ink)]/40">
                    No active task
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

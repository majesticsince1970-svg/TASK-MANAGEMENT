import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeople } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { AvailabilityDot } from '@/components/AvailabilityDot';
import { Clock, CheckCircle, Activity, Monitor, Wifi, WifiOff } from 'lucide-react';
import type { Profile, AvailabilityStatus } from '@/types/database';

const DEMO_PEOPLE: Partial<Profile>[] = [
  { id: '1', full_name: 'James Sheary', availability: 'on_duty', job_title: 'Sales Manager' },
  { id: '2', full_name: 'Jelisha', availability: 'on_duty', job_title: 'Accounts Head' },
  { id: '3', full_name: 'Adil', availability: 'with_customer', job_title: 'Social Media' },
  { id: '4', full_name: 'Simi', availability: 'on_break', job_title: 'Workshop Lead' },
  { id: '5', full_name: 'Rajan', availability: 'on_duty', job_title: 'Sales' },
  { id: '6', full_name: 'Priya', availability: 'off_shift', job_title: 'Design' },
];

export default function LiveBoardPage() {
  const { t } = useTranslation();
  const { data: remotePeople } = usePeople();

  const people = (remotePeople && remotePeople.length > 0) ? remotePeople : DEMO_PEOPLE;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h1 className="text-2xl font-bold">{t('nav.live')}</h1>
        <span className="text-xs text-[var(--color-ink)]/30">Real-time</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {people.map((person: any) => {
          const isOnline = ['on_duty', 'on_break', 'with_customer'].includes(person.availability);
          const demoTaskCount = Math.floor(Math.random() * 5) + 1;
          const demoDoneCount = Math.floor(Math.random() * 4);

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
                      <Activity className="w-3 h-3" /> {demoTaskCount} active
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" /> {demoDoneCount} done
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
              {isOnline && (
                <div className="mt-3 px-3 py-2 bg-[var(--color-ivory)] rounded-lg text-xs">
                  <span className="text-[var(--color-ink)]/40">Working on: </span>
                  <span className="font-medium">Current task #{Math.floor(Math.random() * 100)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

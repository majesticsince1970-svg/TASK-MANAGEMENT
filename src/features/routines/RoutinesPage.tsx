import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoutines } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Plus, Play, Pause, Clock, Calendar, RotateCcw } from 'lucide-react';

export default function RoutinesPage() {
  const { t } = useTranslation();
  const { data: routines = [], isLoading } = useRoutines();
  const { toast } = useToast();

  const activeCount = routines.filter((r: any) => r.is_active).length;
  const avgCompliance = routines.length > 0
    ? Math.round(routines.reduce((sum: number, r: any) => sum + (r.compliance_percent || 0), 0) / routines.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.routines')}</h1>
        <Button
          size="sm"
          onClick={() => toast({ title: 'Coming soon', description: 'New Routine creation is coming soon.', variant: 'info' })}
        >
          <Plus className="w-4 h-4" /> New Routine
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-maroon)]">{activeCount}</p>
          <p className="text-xs text-[var(--color-ink)]/40">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{avgCompliance}%</p>
          <p className="text-xs text-[var(--color-ink)]/40">Avg Compliance</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-4 text-center">
          <p className="text-2xl font-bold">{routines.length}</p>
          <p className="text-xs text-[var(--color-ink)]/40">Total</p>
        </div>
      </div>

      {/* Routines list */}
      {routines.length === 0 && !isLoading ? (
        <EmptyState
          icon={RotateCcw}
          title="No routines yet"
          description="Create repeating routines to automate recurring tasks for your team."
          action={{ label: 'New Routine', onClick: () => toast({ title: 'Coming soon', description: 'New Routine creation is coming soon.', variant: 'info' }) }}
        />
      ) : (
        <div className="space-y-3">
          {routines.map((routine: any) => (
            <div key={routine.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  routine.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                )}>
                  {routine.is_active ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{routine.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--color-ink)]/50">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {routine.schedule_description || routine.schedule_cron}</span>
                    <span className="flex items-center gap-1 capitalize"><Calendar className="w-3.5 h-3.5" /> {routine.assignee_rule}</span>
                  </div>
                  {/* Compliance bar */}
                  {typeof routine.compliance_percent === 'number' && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[var(--color-ivory)] rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', routine.compliance_percent >= 90 ? 'bg-green-500' : routine.compliance_percent >= 70 ? 'bg-yellow-500' : 'bg-red-500')}
                          style={{ width: `${routine.compliance_percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{routine.compliance_percent}%</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium', routine.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {routine.is_active ? 'Active' : 'Paused'}
                  </span>
                  {routine.next_run_at && (
                    <p className="text-[10px] text-[var(--color-ink)]/30 mt-1">
                      Next: {new Date(routine.next_run_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

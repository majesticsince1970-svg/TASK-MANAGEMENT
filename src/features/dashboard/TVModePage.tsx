import { useEffect, useState, useMemo, useCallback } from 'react';
import { Gem, CheckCircle2, AlertTriangle, Clock, Users, Activity, Maximize, Megaphone } from 'lucide-react';
import { useDashboardStats, usePeople, useDepartments, useAnnouncements } from '@/lib/hooks';
import { useTasks } from '@/features/tasks/hooks';
import type { Task, Profile, Department } from '@/types/database';

const PANEL_COUNT = 4; // Added announcements panel

export default function TVModePage() {
  const [panelIdx, setPanelIdx] = useState(0);
  const [now, setNow] = useState(new Date());

  // Auto-rotate panels every 10s
  useEffect(() => {
    const timer = setInterval(() => {
      setPanelIdx((i) => (i + 1) % PANEL_COUNT);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Real clock that updates every second
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const { data: stats } = useDashboardStats();
  const { data: people = [] } = usePeople();
  const { data: allTasks = [] } = useTasks({});
  const { data: departments = [] } = useDepartments();
  const { data: announcements = [] } = useAnnouncements();

  // Build a lookup map from department ID → name/color
  const deptLookup = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const dept of departments as Department[]) {
      map.set(dept.id, { name: dept.name, color: dept.color });
    }
    return map;
  }, [departments]);

  // Department breakdown – resolve IDs to names
  const departmentData = useMemo(() => {
    const deptMap = new Map<string, { name: string; color: string; done: number; active: number; overdue: number }>();
    const nowMs = Date.now();

    for (const task of allTasks as Task[]) {
      const deptId = task.department_id || '__none__';
      if (!deptMap.has(deptId)) {
        const info = deptLookup.get(deptId);
        deptMap.set(deptId, {
          name: info?.name || (deptId === '__none__' ? 'General' : 'Unknown'),
          color: info?.color || '#7A1F2B',
          done: 0,
          active: 0,
          overdue: 0,
        });
      }
      const d = deptMap.get(deptId)!;
      if (task.status === 'done') {
        d.done++;
      } else if (['new', 'seen', 'in_progress', 'blocked'].includes(task.status)) {
        d.active++;
        if (task.due_at && new Date(task.due_at).getTime() < nowMs) {
          d.overdue++;
        }
      }
    }

    return Array.from(deptMap.values()).slice(0, 8);
  }, [allTasks, deptLookup]);

  // Today's live stats
  const todayStats = useMemo(() => {
    const nowMs = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tasksDone = (allTasks as Task[]).filter(
      (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= todayStart
    ).length;

    const overdue = (allTasks as Task[]).filter(
      (t) => !['done', 'cancelled'].includes(t.status) && t.due_at && new Date(t.due_at).getTime() < nowMs
    ).length;

    const active = (allTasks as Task[]).filter((t) =>
      ['new', 'seen', 'in_progress'].includes(t.status)
    ).length;

    const onDuty = (people as Profile[]).filter((p) => p.availability === 'on_duty').length;

    return { tasksDone, overdue, active, onDuty };
  }, [allTasks, people]);

  // Recent completions
  const recentCompletions = useMemo(() => {
    return (allTasks as Task[])
      .filter((t) => t.status === 'done' && t.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
      .slice(0, 6)
      .map((t) => {
        const owner = (people as Profile[]).find((p) => p.id === t.owner_id);
        return {
          id: t.id,
          title: t.title,
          owner: owner?.full_name || 'Unknown',
          completedAt: t.completed_at!,
        };
      });
  }, [allTasks, people]);

  // Active announcements (last 5)
  const activeAnnouncements = useMemo(() => {
    return (announcements as any[]).slice(0, 5);
  }, [announcements]);

  // Fullscreen handler
  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen not supported or denied
      });
    }
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
        <div className="flex items-center gap-4">
          <button
            onClick={handleFullscreen}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Toggle fullscreen"
          >
            <Maximize className="w-5 h-5 text-white/60" />
          </button>
          <div className="text-right">
            <p className="text-3xl font-mono">
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-sm text-white/40">
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {/* Panel 0: Department Overview */}
      {panelIdx === 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white/60 mb-4">Department Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {departmentData.map((d) => (
              <div key={d.name} className="bg-[var(--color-dark-surface)] rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <h3 className="font-semibold truncate">{d.name}</h3>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-3xl font-bold text-green-400">{d.done}</p>
                    <p className="text-xs text-white/40">Done</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-yellow-400">{d.active}</p>
                    <p className="text-xs text-white/40">Active</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-400">{d.overdue}</p>
                    <p className="text-xs text-white/40">Overdue</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel 1: Today's Live Stats */}
      {panelIdx === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-white/60 mb-4">Today's Stats</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Tasks Done', value: todayStats.tasksDone, icon: CheckCircle2 },
              { label: 'Overdue', value: todayStats.overdue, icon: AlertTriangle },
              { label: 'Active Now', value: todayStats.active, icon: Clock },
              { label: 'Staff on Duty', value: todayStats.onDuty, icon: Users },
            ].map((s) => {
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
        </div>
      )}

      {/* Panel 2: Recent Activity */}
      {panelIdx === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-white/60 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Recent Activity
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentCompletions.length === 0 ? (
              <div className="bg-[var(--color-dark-surface)] rounded-2xl p-8 border border-white/5 text-center col-span-2">
                <p className="text-white/40">No recent completions.</p>
              </div>
            ) : (
              recentCompletions.map((c) => (
                <div key={c.id} className="bg-[var(--color-dark-surface)] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{c.title}</p>
                    <p className="text-sm text-white/40">{c.owner}</p>
                  </div>
                  <p className="text-xs text-white/30 shrink-0">
                    {new Date(c.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Panel 3: Announcements */}
      {panelIdx === 3 && (
        <div>
          <h2 className="text-lg font-semibold text-white/60 mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Announcements
          </h2>
          {activeAnnouncements.length === 0 ? (
            <div className="bg-[var(--color-dark-surface)] rounded-2xl p-8 border border-white/5 text-center">
              <p className="text-white/40">No announcements</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeAnnouncements.map((a: any) => (
                <div key={a.id} className="bg-[var(--color-dark-surface)] rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone className="w-5 h-5 text-[var(--color-gold)]" />
                    <h3 className="font-semibold text-lg">{a.title}</h3>
                  </div>
                  <p className="text-sm text-white/60 whitespace-pre-line">{a.body}</p>
                  <p className="text-xs text-white/30 mt-3">
                    {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panel indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: PANEL_COUNT }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPanelIdx(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${panelIdx === i ? 'bg-[var(--color-gold)]' : 'bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}

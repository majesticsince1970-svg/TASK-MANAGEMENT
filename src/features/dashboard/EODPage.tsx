import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useEodReport, useSaveEod, usePeople } from '@/lib/hooks';
import { useTasks } from '@/features/tasks/hooks';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Loader2, CheckCircle, Users, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

type ViewTab = 'my' | 'manager';

function useAllEodReports(date: string) {
  return useQuery({
    queryKey: ['eod-all', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eod_reports')
        .select('*, profile:profiles!user_id(full_name, avatar_url, department_id)')
        .eq('report_date', date)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export default function EODPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: existingReport, isSuccess: reportLoaded } = useEodReport(today);
  const saveEod = useSaveEod();
  const { data: todayTasks = [] } = useTasks({ tab: 'my' });

  const isManager = profile?.role === 'owner' || profile?.role === 'director' || profile?.role === 'dept_head';
  const [viewTab, setViewTab] = useState<ViewTab>('my');

  // Manager view data
  const { data: allReports = [] } = useAllEodReports(today);
  const { data: allPeople = [] } = usePeople();

  const completedToday = todayTasks.filter((t: any) => t.status === 'done' && t.completed_at && format(new Date(t.completed_at), 'yyyy-MM-dd') === today);

  const [summary, setSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [plan, setPlan] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Fix: populate form when existing report data loads
  useEffect(() => {
    if (reportLoaded && existingReport) {
      setSummary(existingReport.completed_summary || '');
      setBlockers(existingReport.blockers || '');
      setPlan(existingReport.tomorrow_plan || '');
      setSubmitted(!!existingReport.submitted_at);
    }
  }, [reportLoaded, existingReport]);

  // Pre-fill summary from completed tasks
  const prefillSummary = completedToday.map((t: any) => `✓ ${t.title}`).join('\n');

  const handleSubmit = () => {
    saveEod.mutate({
      date: today,
      summary: summary || prefillSummary,
      blockers,
      plan,
    }, {
      onSuccess: () => setSubmitted(true),
    });
  };

  // Manager view: who submitted, who hasn't
  const submittedUserIds = new Set(allReports.map((r: any) => r.user_id));
  const activeStaff = allPeople.filter((p: any) => p.is_active && p.role !== 'device' && p.role !== 'ai_system');
  const missingStaff = activeStaff.filter((p: any) => !submittedUserIds.has(p.id));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">End of Day Report</h1>
          <p className="text-sm text-[var(--color-ink)]/50 mt-1">
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        {isManager && (
          <div className="flex gap-1 bg-[var(--color-ivory)] rounded-lg p-1">
            <button
              onClick={() => setViewTab('my')}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md font-medium transition-colors',
                viewTab === 'my' ? 'bg-white shadow-sm text-[var(--color-maroon)]' : 'text-[var(--color-ink)]/50'
              )}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              My Report
            </button>
            <button
              onClick={() => setViewTab('manager')}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md font-medium transition-colors',
                viewTab === 'manager' ? 'bg-white shadow-sm text-[var(--color-maroon)]' : 'text-[var(--color-ink)]/50'
              )}
            >
              <Users className="w-3.5 h-3.5 inline mr-1" />
              Team Reports
            </button>
          </div>
        )}
      </div>

      {/* My Report View */}
      {viewTab === 'my' && (
        <>
          {submitted ? (
            <div className="text-center py-20">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">EOD Report Submitted</h2>
              <p className="text-sm text-[var(--color-ink)]/50">
                {format(new Date(), 'EEEE, dd MMMM yyyy')}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setSubmitted(false)}>
                Edit Report
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5DDD3] overflow-hidden">
              <div className="p-6 space-y-5">
                {/* What I completed */}
                <div>
                  <label className="block text-sm font-semibold mb-2">What I completed today</label>
                  {completedToday.length > 0 && (
                    <div className="mb-2 p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-700 font-medium mb-1">Auto-detected ({completedToday.length} tasks):</p>
                      {completedToday.map((t: any) => (
                        <p key={t.id} className="text-xs text-green-600">✓ {t.title}</p>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm resize-none"
                    rows={4}
                    placeholder={prefillSummary || "What did you accomplish today?"}
                  />
                </div>

                {/* Blockers */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Blockers or issues</label>
                  <textarea
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm resize-none"
                    rows={2}
                    placeholder="Any blockers? (optional)"
                  />
                </div>

                {/* Tomorrow's plan */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Plan for tomorrow</label>
                  <textarea
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm resize-none"
                    rows={3}
                    placeholder="What will you work on tomorrow?"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#E5DDD3] bg-[var(--color-ivory)] flex justify-end">
                <Button onClick={handleSubmit} disabled={saveEod.isPending}>
                  {saveEod.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                  Submit Report
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Manager View */}
      {viewTab === 'manager' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-2xl font-bold text-green-700">{allReports.length}</p>
              <p className="text-xs text-green-600">Submitted</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-2xl font-bold text-red-700">{missingStaff.length}</p>
              <p className="text-xs text-red-600">Missing</p>
            </div>
          </div>

          {/* Submitted reports */}
          {allReports.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-green-700 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Submitted Reports
              </h3>
              <div className="space-y-2">
                {allReports.map((report: any) => (
                  <div key={report.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--color-maroon)]">
                        {report.profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <p className="text-sm font-medium">{report.profile?.full_name || 'Unknown'}</p>
                      <span className="text-[10px] text-[var(--color-ink)]/30 ml-auto">
                        {report.submitted_at && format(new Date(report.submitted_at), 'HH:mm')}
                      </span>
                    </div>
                    {report.completed_summary && (
                      <p className="text-xs text-[var(--color-ink)]/60 whitespace-pre-line">{report.completed_summary}</p>
                    )}
                    {report.blockers && (
                      <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-800">
                        <strong>Blockers:</strong> {report.blockers}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing staff */}
          {missingStaff.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Missing Reports
              </h3>
              <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden">
                {missingStaff.map((person: any) => (
                  <div key={person.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#E5DDD3] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-semibold text-red-500">
                      {person.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{person.full_name}</p>
                      <p className="text-[10px] text-[var(--color-ink)]/30 capitalize">{person.role} · {person.job_title || ''}</p>
                    </div>
                    <span className="text-[10px] text-red-400 font-medium">Not submitted</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allReports.length === 0 && missingStaff.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--color-ink)]/40">
              No staff data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

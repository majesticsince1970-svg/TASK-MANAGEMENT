import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEodReport, useSaveEod } from '@/lib/hooks';
import { useTasks } from '@/features/tasks/hooks';
import { Button } from '@/components/ui/button';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function EODPage() {
  const { t } = useTranslation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: existingReport } = useEodReport(today);
  const saveEod = useSaveEod();
  const { data: todayTasks = [] } = useTasks({ tab: 'my' });

  const completedToday = todayTasks.filter((t: any) => t.status === 'done' && t.completed_at && format(new Date(t.completed_at), 'yyyy-MM-dd') === today);

  const [summary, setSummary] = useState(existingReport?.completed_summary || '');
  const [blockers, setBlockers] = useState(existingReport?.blockers || '');
  const [plan, setPlan] = useState(existingReport?.tomorrow_plan || '');
  const [submitted, setSubmitted] = useState(!!existingReport?.submitted_at);

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

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">EOD Report Submitted</h2>
        <p className="text-sm text-[var(--color-ink)]/50">
          {format(new Date(), 'EEEE, dd MMMM yyyy')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">End of Day Report</h1>
        <p className="text-sm text-[var(--color-ink)]/50 mt-1">
          {format(new Date(), 'EEEE, dd MMMM yyyy')}
        </p>
      </div>

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
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Brain, Mic, Send, Clock, ChevronRight, AlertTriangle, Lightbulb, Zap, Volume2 } from 'lucide-react';

const ALERTS = [
  { id: '1', level: 'critical' as const, title: 'Cash count not submitted', explanation: 'Accounts — Morning cash & safe count is 40 minutes overdue. James Sheary has not opened the task.', action: 'Send urgent reminder' },
  { id: '2', level: 'important' as const, title: 'James has 12 tasks due this week', explanation: 'This is above the normal workload. Consider redistributing 3 tasks to other Accounts staff.', action: 'View workload' },
  { id: '3', level: 'insight' as const, title: 'Adil completed 5 reels this week — best streak', explanation: 'Creative department is on track. Adil has maintained 100% on-time delivery for 2 weeks.', action: '' },
];

const levelConfig = {
  critical: { color: '#C62828', bg: '#C62828', icon: Zap, label: 'Critical' },
  important: { color: '#C77A1E', bg: '#C77A1E', icon: AlertTriangle, label: 'Important' },
  insight: { color: '#5B3FBF', bg: '#5B3FBF', icon: Lightbulb, label: 'Insight' },
};

export default function AIManagerPage() {
  const [tab, setTab] = useState<'inbox' | 'ask' | 'digests'>('inbox');
  const [question, setQuestion] = useState('');

  const tabs = [
    { key: 'inbox' as const, label: 'AI Inbox', count: 3 },
    { key: 'ask' as const, label: 'Ask AI', count: 0 },
    { key: 'digests' as const, label: 'Digests', count: 0 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-ai)] flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold">AI Manager</h1>
      </div>

      <div className="flex gap-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-4 py-2 text-sm rounded-lg transition-colors',
              tab === t.key ? 'bg-[var(--color-ai)] text-white font-medium' : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]')}>
            {t.label} {t.count > 0 && <span className="ml-1 text-xs opacity-70">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'inbox' && (
        <div className="space-y-3">
          {ALERTS.map((alert) => {
            const config = levelConfig[alert.level];
            const Icon = config.icon;
            return (
              <div key={alert.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4" style={{ borderLeftWidth: 4, borderLeftColor: config.color }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: config.color + '15' }}>
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: config.color }}>{config.label}</span>
                      <span className="text-xs text-[var(--color-ink)]/40">2 min ago</span>
                    </div>
                    <h3 className="font-semibold text-sm">{alert.title}</h3>
                    <p className="text-sm text-[var(--color-ink)]/60 mt-1">{alert.explanation}</p>
                    <div className="flex gap-2 mt-3">
                      {alert.action && <Button size="sm">{alert.action}</Button>}
                      <Button variant="outline" size="sm">Snooze</Button>
                      <Button variant="ghost" size="sm" className="text-[var(--color-ink)]/40">Not important</Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'ask' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden">
          <div className="p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
            <Brain className="w-16 h-16 text-[var(--color-ai)]/20 mb-4" />
            <h3 className="font-semibold text-lg mb-1">Ask anything about your operations</h3>
            <p className="text-sm text-[var(--color-ink)]/50 max-w-md">
              "Who hasn't submitted EOD today?", "How is the stock audit going?", "Show me overdue tasks in Accounts"
            </p>
          </div>
          <div className="border-t border-[#E5DDD3] p-4 flex gap-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
              placeholder="Ask the AI Manager..." />
            <Button variant="ghost" size="icon"><Mic className="w-5 h-5" /></Button>
            <Button size="icon" disabled={!question.trim()}><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {tab === 'digests' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-[var(--color-ai)]" />
            <h3 className="font-semibold">Today's Digest</h3>
            <Button variant="ghost" size="sm" className="ml-auto"><Volume2 className="w-4 h-4" /> Listen</Button>
          </div>
          <div className="prose prose-sm text-[var(--color-ink)]/70">
            <p><strong>Summary:</strong> 18 tasks completed today across 6 departments. 3 tasks are overdue. Accounts has the highest completion rate at 95%.</p>
            <p><strong>Attention needed:</strong> Stock audit is falling behind schedule (45% done, 60% time elapsed). Cash count was delayed by 40 minutes.</p>
            <p><strong>Highlights:</strong> Adil completed 5 creative deliverables this week — best individual performance.</p>
          </div>
        </div>
      )}
    </div>
  );
}


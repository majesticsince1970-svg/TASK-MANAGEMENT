import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAiAlerts, useActionAiAlert } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bot, AlertTriangle, Lightbulb, TrendingUp, CheckCircle, Clock,
  MessageSquare, Send, Volume2, ChevronRight, Eye, X, Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type AITab = 'inbox' | 'ask' | 'digests';

const LEVEL_CONFIG = {
  critical: { icon: AlertTriangle, color: 'text-[var(--color-urgent)]', bg: 'bg-red-50', border: 'border-red-200' },
  important: { icon: Bell, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  insight: { icon: Lightbulb, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const DEMO_ALERTS = [
  { id: 'ai1', level: 'critical', title: 'Morning cash count overdue by 2 hours', explanation: 'The morning cash count task was due at 10:00 AM and has not been started. This is a daily critical routine.', suggested_action: 'Send reminder to James Sheary', status: 'open', rule_key: 'overdue_urgent', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'ai2', level: 'important', title: 'Diwali reel edit is behind schedule', explanation: 'Task has been in progress for 3 days with no proof submitted. Due tomorrow.', suggested_action: 'Check in with Adil', status: 'open', rule_key: 'stuck_in_progress', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'ai3', level: 'insight', title: 'Adil has 8 active tasks this week', explanation: 'Higher than usual workload. Average is 5 tasks. Consider redistributing some tasks.', suggested_action: 'Review task assignments', status: 'open', rule_key: 'high_workload', created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: 'ai4', level: 'important', title: 'Payment list date change requested twice', explanation: 'The same task has had 2 date change requests. May indicate scope issues.', suggested_action: 'Discuss scope with team', status: 'actioned', rule_key: 'repeated_date_changes', created_at: new Date(Date.now() - 86400000).toISOString() },
];

const DEMO_DIGESTS = [
  {
    id: 'd1', date: 'Today',
    summary: '8 tasks completed, 3 overdue, 2 new alerts. Morning cash count was late by 2h. Diwali reel is at risk. Overall completion rate: 78%.',
    highlights: ['Morning routine compliance: 88%', 'Adil workload high (8 tasks)', 'Stock audit on track (45% done)'],
  },
  {
    id: 'd2', date: 'Yesterday',
    summary: '12 tasks completed, 1 overdue. All routines ran on time. Great day for the team!',
    highlights: ['100% routine compliance', 'Jelisha earned 45 points', 'No critical alerts'],
  },
];

export default function AIManagerPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AITab>('inbox');
  const [askInput, setAskInput] = useState('');
  const [askHistory, setAskHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const { data: remoteAlerts } = useAiAlerts('open');
  const actionAlert = useActionAiAlert();

  const alerts = (remoteAlerts && remoteAlerts.length > 0) ? remoteAlerts : DEMO_ALERTS;
  const openAlerts = alerts.filter((a: any) => a.status === 'open');

  const handleAsk = () => {
    if (!askInput.trim()) return;
    setAskHistory([...askHistory, { role: 'user', text: askInput }]);
    // In production, this would call the AI edge function
    setTimeout(() => {
      setAskHistory(prev => [...prev, {
        role: 'ai',
        text: `Based on the current data: There are ${openAlerts.length} open alerts. The morning cash count is overdue. I recommend checking in with the team about their current tasks.`
      }]);
    }, 1000);
    setAskInput('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-maroon)] to-[#5D1020] flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Manager</h1>
          <p className="text-xs text-[var(--color-ink)]/40">Your intelligent assistant</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {[
          { key: 'inbox' as AITab, label: 'Inbox', icon: Bell, count: openAlerts.length },
          { key: 'ask' as AITab, label: 'Ask AI', icon: MessageSquare },
          { key: 'digests' as AITab, label: 'Digests', icon: TrendingUp },
        ].map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors',
              tab === tabItem.key
                ? 'bg-[var(--color-maroon)] text-white font-medium'
                : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]'
            )}
          >
            <tabItem.icon className="w-4 h-4" /> {tabItem.label}
            {tabItem.count != null && tabItem.count > 0 && (
              <span className={cn('text-xs', tab === tabItem.key ? 'text-white/70' : 'text-[var(--color-ink)]/30')}>
                {tabItem.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inbox */}
      {tab === 'inbox' && (
        <div className="space-y-3">
          {alerts.map((alert: any) => {
            const config = LEVEL_CONFIG[alert.level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.insight;
            const LevelIcon = config.icon;
            const isOpen = alert.status === 'open';

            return (
              <div key={alert.id} className={cn(
                'rounded-xl border p-4 transition-all',
                isOpen ? `${config.bg} ${config.border}` : 'bg-white border-[#E5DDD3] opacity-60'
              )}>
                <div className="flex items-start gap-3">
                  <LevelIcon className={cn('w-5 h-5 mt-0.5 shrink-0', config.color)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold">{alert.title}</h3>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                        alert.level === 'critical' ? 'bg-red-100 text-red-700' :
                        alert.level === 'important' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {alert.level}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-ink)]/60 mb-2">{alert.explanation}</p>
                    {alert.suggested_action && (
                      <p className="text-xs text-[var(--color-ink)]/40 mb-2">
                        💡 Suggestion: {alert.suggested_action}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--color-ink)]/30">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                      {isOpen && (
                        <div className="flex gap-1 ml-auto">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => actionAlert.mutate({ alertId: alert.id, action: 'actioned' })}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Done
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => actionAlert.mutate({ alertId: alert.id, action: 'snoozed' })}>
                            <Clock className="w-3.5 h-3.5 mr-1" /> Snooze
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => actionAlert.mutate({ alertId: alert.id, action: 'dismissed' })}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {alerts.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--color-ink)]/40">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
              No alerts — everything looks good!
            </div>
          )}
        </div>
      )}

      {/* Ask AI */}
      {tab === 'ask' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
          {/* Chat history */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {askHistory.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm text-[var(--color-ink)]/40">Ask anything about your team's tasks, workload, or performance</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['Who is overloaded?', 'What tasks are at risk?', "How's this week going?", 'Show overdue tasks'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setAskInput(q); }}
                      className="px-3 py-1.5 bg-[var(--color-ivory)] rounded-full text-xs hover:bg-[#E5DDD3] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {askHistory.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm',
                  msg.role === 'user'
                    ? 'bg-[var(--color-maroon)] text-white rounded-br-sm'
                    : 'bg-[var(--color-ivory)] rounded-bl-sm'
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#E5DDD3]">
            <div className="flex gap-2">
              <input
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                className="flex-1 px-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
                placeholder="Ask your AI manager..."
              />
              <Button onClick={handleAsk} disabled={!askInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Digests */}
      {tab === 'digests' && (
        <div className="space-y-4">
          {DEMO_DIGESTS.map((digest) => (
            <div key={digest.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[var(--color-maroon)]" />
                <h3 className="text-sm font-semibold">{digest.date}'s Digest</h3>
                <button className="ml-auto flex items-center gap-1 text-xs text-[var(--color-maroon)] hover:underline">
                  <Volume2 className="w-3.5 h-3.5" /> Listen in Malayalam
                </button>
              </div>
              <p className="text-sm text-[var(--color-ink)]/70 mb-3">{digest.summary}</p>
              <div className="space-y-1">
                {digest.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-ink)]/50">
                    <ChevronRight className="w-3 h-3 text-[var(--color-maroon)]" />
                    {h}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, ChevronRight, Calendar } from 'lucide-react';

const DEMO_APPROVALS = [
  { id: '1', title: 'Payments due list for this month', from: 'James Sheary', type: 'work', proof: 'payment_list', submitted: '2 hours ago' },
  { id: '2', title: 'Gold rate post', from: 'Adil', type: 'work', proof: 'photo', submitted: '30 min ago' },
  { id: '3', title: 'Morning cash & safe count', from: 'James Sheary', type: 'work', proof: 'number', submitted: '1 hour ago' },
];

const DATE_REQUESTS = [
  { id: '1', title: 'Vendor payments reconciliation', from: 'James Sheary', old: 'Fri 15 Nov', new: 'Mon 18 Nov', reason: 'Waiting for bank statements' },
];

type Tab = 'work' | 'dates' | 'peer' | 'handover';

export default function ApprovalsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('work');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'work', label: 'Work to Approve', count: 3 },
    { key: 'dates', label: 'Date Changes', count: 1 },
    { key: 'peer', label: 'Peer Requests', count: 0 },
    { key: 'handover', label: 'Handovers', count: 0 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.approvals')}</h1>

      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={cn('px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors',
              tab === tb.key ? 'bg-[var(--color-maroon)] text-white font-medium' : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]')}>
            {tb.label} {tb.count > 0 && <span className="ml-1 text-xs opacity-70">{tb.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'work' && (
        <div className="space-y-3">
          {DEMO_APPROVALS.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[var(--color-ink)]/50 mt-0.5">from {item.from} · {item.submitted}</p>
                  <div className="mt-3 p-3 bg-[var(--color-ivory)] rounded-lg text-sm text-[var(--color-ink)]/60">
                    Proof: {item.proof} — Click to view
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" className="text-[var(--color-urgent)] border-[var(--color-urgent)]/30">
                  <X className="w-4 h-4" /> Send Back
                </Button>
                <Button size="sm" className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90">
                  <Check className="w-4 h-4" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dates' && (
        <div className="space-y-3">
          {DATE_REQUESTS.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
              <p className="font-medium">{req.title}</p>
              <p className="text-sm text-[var(--color-ink)]/50 mt-0.5">from {req.from}</p>
              <div className="flex items-center gap-2 mt-3 text-sm">
                <span className="line-through text-[var(--color-ink)]/40">{req.old}</span>
                <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/30" />
                <span className="font-medium text-[var(--color-warning)]">{req.new}</span>
              </div>
              <p className="text-sm text-[var(--color-ink)]/60 mt-1 italic">"{req.reason}"</p>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" className="text-[var(--color-urgent)]"><X className="w-4 h-4" /> Reject</Button>
                <Button size="sm" className="bg-[var(--color-success)]"><Check className="w-4 h-4" /> Approve</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(tab === 'peer' || tab === 'handover') && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-[var(--color-ink)]/20" />
          <p className="text-sm text-[var(--color-ink)]/40">No pending {tab} requests</p>
        </div>
      )}
    </div>
  );
}


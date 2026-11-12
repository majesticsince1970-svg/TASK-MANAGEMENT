import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTemplates, useChains } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, FileText, Link, ChevronRight, Zap, Calendar, Mountain, RotateCcw } from 'lucide-react';
import type { TimingType } from '@/types/database';

const TIMING_ICONS: Record<TimingType, React.ElementType> = {
  urgent: Zap, dated: Calendar, long: Mountain, flexible: RotateCcw, repeating: RotateCcw,
};
const TIMING_COLORS: Record<TimingType, string> = {
  urgent: '#C62828', dated: '#B8862B', long: '#7A1F2B', flexible: '#8A7A72', repeating: '#5B3FBF',
};

/* Demo data */
const DEMO_TEMPLATES = [
  { id: 't1', title: 'Morning cash count', timing_type: 'repeating' as TimingType, proof_type: 'number', use_count: 45 },
  { id: 't2', title: 'Gold rate social post', timing_type: 'repeating' as TimingType, proof_type: 'photo', use_count: 30 },
  { id: 't3', title: 'End of day safe count', timing_type: 'repeating' as TimingType, proof_type: 'number', use_count: 42 },
  { id: 't4', title: 'Supplier payment list', timing_type: 'dated' as TimingType, proof_type: 'payment_list', use_count: 12 },
  { id: 't5', title: 'New product photoshoot', timing_type: 'dated' as TimingType, proof_type: 'photo', use_count: 8 },
];

const DEMO_CHAINS = [
  { id: 'c1', title: 'New employee onboarding', steps: [{title: 'Create ID'}, {title: 'Training'}, {title: 'Assign department'}], use_count: 3 },
  { id: 'c2', title: 'Customer special order', steps: [{title: 'Design approval'}, {title: 'Manufacturing'}, {title: 'QC'}, {title: 'Delivery'}], use_count: 15 },
];

type Tab = 'templates' | 'chains';

export default function TemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('templates');
  const { data: remoteTemplates } = useTemplates();
  const { data: remoteChains } = useChains();

  const templates = (remoteTemplates && remoteTemplates.length > 0) ? remoteTemplates : DEMO_TEMPLATES;
  const chains = (remoteChains && remoteChains.length > 0) ? remoteChains : DEMO_CHAINS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.templates')}</h1>
        <Button size="sm"><Plus className="w-4 h-4" /> New {tab === 'templates' ? 'Template' : 'Chain'}</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {[
          { key: 'templates' as Tab, label: 'Templates', icon: FileText, count: templates.length },
          { key: 'chains' as Tab, label: 'Chains', icon: Link, count: chains.length },
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
            <span className={cn('text-xs', tab === tabItem.key ? 'text-white/70' : 'text-[var(--color-ink)]/30')}>{tabItem.count}</span>
          </button>
        ))}
      </div>

      {/* Templates */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tmpl: any) => {
            const Icon = TIMING_ICONS[tmpl.timing_type as TimingType] || Calendar;
            return (
              <div key={tmpl.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4 hover:shadow-sm transition-shadow cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TIMING_COLORS[tmpl.timing_type as TimingType]}15`, color: TIMING_COLORS[tmpl.timing_type as TimingType] }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{tmpl.title}</h3>
                    <p className="text-[10px] text-[var(--color-ink)]/40">Proof: {tmpl.proof_type} · Used {tmpl.use_count}×</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => navigate(`/tasks/new?template=${tmpl.id}`)}>
                  Use Template
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Chains */}
      {tab === 'chains' && (
        <div className="space-y-3">
          {chains.map((chain: any) => (
            <div key={chain.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">{chain.title}</h3>
                  <p className="text-xs text-[var(--color-ink)]/40">{chain.steps?.length || 0} steps · Used {chain.use_count}×</p>
                </div>
                <Button size="sm">Start Chain</Button>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                {(chain.steps || []).map((step: any, i: number) => (
                  <div key={i} className="flex items-center gap-1 shrink-0">
                    <div className="px-2.5 py-1 bg-[var(--color-ivory)] rounded-lg text-xs font-medium whitespace-nowrap">
                      {step.title || `Step ${i + 1}`}
                    </div>
                    {i < (chain.steps?.length || 0) - 1 && <ChevronRight className="w-3.5 h-3.5 text-[var(--color-ink)]/20 shrink-0" />}
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

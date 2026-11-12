import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTemplates, useChains } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Plus, FileText, Link, ChevronRight, Zap, Calendar, Mountain, RotateCcw } from 'lucide-react';
import type { TimingType } from '@/types/database';

const TIMING_ICONS: Record<TimingType, React.ElementType> = {
  urgent: Zap, dated: Calendar, long: Mountain, flexible: RotateCcw, repeating: RotateCcw,
};
const TIMING_COLORS: Record<TimingType, string> = {
  urgent: '#C62828', dated: '#B8862B', long: '#7A1F2B', flexible: '#8A7A72', repeating: '#5B3FBF',
};

type Tab = 'templates' | 'chains';

export default function TemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('templates');
  const { data: templates = [], isLoading: loadingTemplates } = useTemplates();
  const { data: chains = [], isLoading: loadingChains } = useChains();
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.templates')}</h1>
        <Button
          size="sm"
          onClick={() => toast({ title: 'Coming soon', description: `New ${tab === 'templates' ? 'Template' : 'Chain'} creation is coming soon.`, variant: 'info' })}
        >
          <Plus className="w-4 h-4" /> New {tab === 'templates' ? 'Template' : 'Chain'}
        </Button>
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
        templates.length === 0 && !loadingTemplates ? (
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description="Templates let you quickly create common tasks with pre-filled settings."
            action={{ label: 'New Template', onClick: () => toast({ title: 'Coming soon', description: 'New Template creation is coming soon.', variant: 'info' }) }}
          />
        ) : (
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
                      <p className="text-[10px] text-[var(--color-ink)]/40">Proof: {tmpl.proof_type} · Used {tmpl.use_count ?? 0}×</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => navigate(`/tasks/new?template=${tmpl.id}`)}>
                    Use Template
                  </Button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Chains */}
      {tab === 'chains' && (
        chains.length === 0 && !loadingChains ? (
          <EmptyState
            icon={Link}
            title="No chains yet"
            description="Chains are multi-step workflows where completing one task automatically creates the next."
            action={{ label: 'New Chain', onClick: () => toast({ title: 'Coming soon', description: 'New Chain creation is coming soon.', variant: 'info' }) }}
          />
        ) : (
          <div className="space-y-3">
            {chains.map((chain: any) => (
              <div key={chain.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{chain.title}</h3>
                    <p className="text-xs text-[var(--color-ink)]/40">{chain.steps?.length || 0} steps · Used {chain.use_count ?? 0}×</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => toast({ title: 'Coming soon', description: 'Starting a chain is coming soon.', variant: 'info' })}
                  >
                    Start Chain
                  </Button>
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
        )
      )}
    </div>
  );
}

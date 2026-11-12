import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TimingType, ProofType } from '@/types/database';
import {
  Zap, Calendar, Mountain, RotateCcw, Repeat, Star,
  Camera, FileText, Video, Hash, CheckSquare, Pen,
  Link2, CreditCard, AlignLeft, X, Users, User,
  Building, Globe, ArrowLeft, Mic, Save
} from 'lucide-react';

const TIMING_OPTIONS: { type: TimingType; label: string; labelMl: string; icon: React.ElementType; color: string; desc: string }[] = [
  { type: 'urgent', label: 'Urgent', labelMl: 'അടിയന്തരം', icon: Zap, color: '#C62828', desc: 'Due today, ≤12h' },
  { type: 'dated', label: 'Dated', labelMl: 'തീയതിയുള്ളത്', icon: Calendar, color: '#B8862B', desc: 'Due within 30 days' },
  { type: 'long', label: 'Long task', labelMl: 'വലിയ ജോലി', icon: Mountain, color: '#7A1F2B', desc: '7-92 days, milestones' },
  { type: 'flexible', label: 'Flexible', labelMl: 'സമയപരിധിയില്ല', icon: RotateCcw, color: '#8A7A72', desc: 'No deadline, review date' },
  { type: 'repeating', label: 'Repeating', labelMl: 'ദിനചര്യ', icon: Repeat, color: '#5B3FBF', desc: 'From routines only' },
];

const PROOF_OPTIONS: { type: ProofType; label: string; icon: React.ElementType }[] = [
  { type: 'none', label: 'None', icon: X },
  { type: 'photo', label: 'Photo', icon: Camera },
  { type: 'file', label: 'File', icon: FileText },
  { type: 'video', label: 'Video', icon: Video },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'checklist', label: 'Checklist', icon: CheckSquare },
  { type: 'signature', label: 'Signature', icon: Pen },
  { type: 'link', label: 'Link', icon: Link2 },
  { type: 'payment_list', label: 'Payment List', icon: CreditCard },
  { type: 'text_note', label: 'Text Note', icon: AlignLeft },
];

const DATE_CHIPS = ['Today', 'Tomorrow', 'This Saturday', 'End of Month'];

export default function CreateTaskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [timingType, setTimingType] = useState<TimingType>('dated');
  const [proofType, setProofType] = useState<ProofType>('none');
  const [importance, setImportance] = useState<'normal' | 'important'>('normal');
  const [assignTarget, setAssignTarget] = useState<'person' | 'department' | 'pool'>('person');

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--color-ivory)] rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{t('task.new')}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5DDD3] overflow-hidden">
        <div className="p-6 space-y-6">
          {/* 1. What */}
          <div>
            <label className="block text-sm font-semibold mb-2">1. What needs to be done?</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] focus:outline-none focus:ring-2 focus:ring-[var(--color-maroon)] text-base"
              placeholder="e.g., Prepare payment list for this month..."
            />
          </div>

          {/* 2. Who */}
          <div>
            <label className="block text-sm font-semibold mb-2">2. Who should do it?</label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setAssignTarget('person')} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors', assignTarget === 'person' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5 text-[var(--color-maroon)]' : 'border-[#E5DDD3]')}>
                <User className="w-4 h-4" /> Person
              </button>
              <button onClick={() => setAssignTarget('department')} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors', assignTarget === 'department' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5 text-[var(--color-maroon)]' : 'border-[#E5DDD3]')}>
                <Building className="w-4 h-4" /> Department
              </button>
              <button onClick={() => setAssignTarget('pool')} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors', assignTarget === 'pool' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5 text-[var(--color-maroon)]' : 'border-[#E5DDD3]')}>
                <Globe className="w-4 h-4" /> Open Pool
              </button>
            </div>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
              placeholder={assignTarget === 'person' ? 'Search person...' : assignTarget === 'department' ? 'Select department...' : 'Select department for pool...'}
            />
          </div>

          {/* 3. Timing Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">3. Timing type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIMING_OPTIONS.filter(t => t.type !== 'repeating').map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    onClick={() => setTimingType(opt.type)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center',
                      timingType === opt.type
                        ? 'border-current shadow-sm'
                        : 'border-[#E5DDD3] hover:border-current/30'
                    )}
                    style={{ color: opt.color }}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-[10px] opacity-70">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Date */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              4. {timingType === 'flexible' ? 'Check again on' : 'Due date'}
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {DATE_CHIPS.map((chip) => (
                <button key={chip} className="px-3 py-1.5 rounded-full border border-[#E5DDD3] text-sm hover:bg-[var(--color-ivory)] transition-colors">
                  {chip}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <input type="date" className="flex-1 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm" />
              {timingType !== 'flexible' && (
                <input type="time" className="w-32 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm" />
              )}
            </div>
          </div>

          {/* 5. Importance */}
          <div>
            <label className="block text-sm font-semibold mb-2">5. Importance</label>
            <div className="flex gap-2">
              <button
                onClick={() => setImportance('normal')}
                className={cn('px-4 py-2 rounded-lg text-sm border transition-colors', importance === 'normal' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5' : 'border-[#E5DDD3]')}
              >
                Normal
              </button>
              <button
                onClick={() => setImportance('important')}
                className={cn('flex items-center gap-1 px-4 py-2 rounded-lg text-sm border transition-colors', importance === 'important' ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold-text)]' : 'border-[#E5DDD3]')}
              >
                <Star className="w-4 h-4" /> Important
              </button>
            </div>
          </div>

          {/* 6. Proof Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">6. Proof required</label>
            <div className="flex flex-wrap gap-2">
              {PROOF_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    onClick={() => setProofType(opt.type)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors',
                      proofType === opt.type ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5 text-[var(--color-maroon)]' : 'border-[#E5DDD3]'
                    )}
                  >
                    <Icon className="w-4 h-4" /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5DDD3] bg-[var(--color-ivory)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]/50 hover:text-[var(--color-ink)] transition-colors">
              <Save className="w-4 h-4" /> Save as template
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button disabled={!title.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


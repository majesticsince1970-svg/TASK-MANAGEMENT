import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCreateTask } from '@/features/tasks/hooks';
import { useCreateTemplate } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { TimingType, ProofType, Profile, Department } from '@/types/database';
import {
  Zap, Calendar, Mountain, RotateCcw, Star, Repeat,
  Camera, FileText, Video, Hash, CheckSquare, Pen,
  Link2, CreditCard, AlignLeft, X, Users, User,
  Building, Globe, ArrowLeft, Save, Loader2, Plus, Trash2,
  Clock, Paperclip, Eye, UserCheck
} from 'lucide-react';
import { addDays, endOfMonth, nextSaturday, format, setHours, setMinutes } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  assignTarget: z.enum(['person', 'department', 'pool']),
  ownerId: z.string().optional(),
  departmentId: z.string().optional(),
  timingType: z.enum(['urgent', 'dated', 'long', 'flexible', 'repeating'] as const),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  reviewOn: z.string().optional(),
  importance: z.enum(['normal', 'important'] as const),
  proofType: z.enum(['none', 'photo', 'file', 'video', 'number', 'checklist', 'signature', 'link', 'payment_list', 'text_note'] as const),
  requiresApproval: z.boolean(),
  approverId: z.string().optional(),
  readAloud: z.boolean(),
  checklistItems: z.array(z.object({ text: z.string(), requires_photo: z.boolean() })).optional(),
  /* New fields */
  watcherIds: z.array(z.string()).optional(),
  attachmentsNote: z.string().optional(),
  estimateMinutes: z.number().optional(),
  estimateUnit: z.enum(['minutes', 'hours']).optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const TIMING_OPTIONS: { type: TimingType; label: string; labelMl: string; icon: React.ElementType; color: string; desc: string }[] = [
  { type: 'urgent', label: 'Urgent', labelMl: 'അടിയന്തരം', icon: Zap, color: '#C62828', desc: 'Due today, ≤12h' },
  { type: 'dated', label: 'Dated', labelMl: 'തീയതിയുള്ളത്', icon: Calendar, color: '#B8862B', desc: 'Due within 30 days' },
  { type: 'long', label: 'Long task', labelMl: 'വലിയ ജോലി', icon: Mountain, color: '#7A1F2B', desc: '7-92 days, milestones' },
  { type: 'flexible', label: 'Flexible', labelMl: 'സമയപരിധിയില്ല', icon: RotateCcw, color: '#8A7A72', desc: 'No deadline, review date' },
  { type: 'repeating', label: 'Repeating', labelMl: 'ആവർത്തിക്കുക', icon: Repeat, color: '#5B3FBF', desc: 'Recurring schedule' },
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

function usePeople() {
  return useQuery({
    queryKey: queryKeys.profiles(),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('is_active', true).order('full_name');
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });
}

function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments(),
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('sort_order');
      if (error) throw error;
      return (data || []) as Department[];
    },
  });
}

export default function CreateTaskPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createTask = useCreateTask();
  const createTemplate = useCreateTemplate();
  const { data: people = [] } = usePeople();
  const { data: departments = [] } = useDepartments();
  const [personSearch, setPersonSearch] = useState('');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ text: string; requires_photo: boolean }[]>([]);

  /* Approver picker state */
  const [approverSearch, setApproverSearch] = useState('');
  const [showApproverDropdown, setShowApproverDropdown] = useState(false);

  /* Watchers multi-select state */
  const [watcherSearch, setWatcherSearch] = useState('');
  const [showWatcherDropdown, setShowWatcherDropdown] = useState(false);
  const [selectedWatchers, setSelectedWatchers] = useState<string[]>([]);

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      assignTarget: 'person',
      timingType: 'dated',
      importance: 'normal',
      proofType: 'none',
      requiresApproval: true,
      readAloud: false,
      checklistItems: [],
      approverId: profile?.id || '',
      watcherIds: [],
      attachmentsNote: '',
      estimateUnit: 'minutes',
    },
    mode: 'onChange',
  });

  const timingType = watch('timingType');
  const assignTarget = watch('assignTarget');
  const proofType = watch('proofType');
  const selectedOwnerId = watch('ownerId');
  const selectedApproverId = watch('approverId');

  const filteredPeople = people.filter((p) =>
    p.full_name.toLowerCase().includes(personSearch.toLowerCase()) ||
    (p.full_name_ml && p.full_name_ml.includes(personSearch))
  );

  const filteredApproverPeople = people.filter((p) =>
    p.full_name.toLowerCase().includes(approverSearch.toLowerCase())
  );

  const filteredWatcherPeople = people.filter((p) =>
    p.full_name.toLowerCase().includes(watcherSearch.toLowerCase()) &&
    !selectedWatchers.includes(p.id)
  );

  const selectedPerson = people.find((p) => p.id === selectedOwnerId);
  const selectedApprover = people.find((p) => p.id === selectedApproverId);

  const getDateChips = () => {
    const now = new Date();
    return [
      { label: 'Today 5 PM', date: format(setMinutes(setHours(now, 17), 0), "yyyy-MM-dd"), time: '17:00' },
      { label: 'Tomorrow', date: format(addDays(now, 1), "yyyy-MM-dd"), time: '17:00' },
      { label: 'This Saturday', date: format(nextSaturday(now), "yyyy-MM-dd"), time: '18:00' },
      { label: 'End of Month', date: format(endOfMonth(now), "yyyy-MM-dd"), time: '21:00' },
    ];
  };

  const onSubmit = (data: TaskFormValues) => {
    const dueAt = data.dueDate && data.dueTime
      ? new Date(`${data.dueDate}T${data.dueTime}:00`).toISOString()
      : data.dueDate
      ? new Date(`${data.dueDate}T17:00:00`).toISOString()
      : undefined;

    const estimateMinutes = data.estimateMinutes
      ? data.estimateUnit === 'hours' ? data.estimateMinutes * 60 : data.estimateMinutes
      : undefined;

    createTask.mutate({
      title: data.title,
      description: data.description,
      owner_id: data.assignTarget === 'person' ? data.ownerId : undefined,
      department_id: data.departmentId,
      timing_type: data.timingType as TimingType,
      importance: data.importance,
      due_at: data.timingType !== 'flexible' ? dueAt : undefined,
      review_on: data.timingType === 'flexible' ? data.reviewOn : undefined,
      proof_type: data.proofType as ProofType,
      requires_approval: data.requiresApproval,
      approver_id: data.approverId || undefined,
      read_aloud: data.readAloud,
      checklist_items: checklistItems.length > 0 ? checklistItems : undefined,
      watchers: selectedWatchers.length > 0 ? selectedWatchers : undefined,
    }, {
      onSuccess: (task) => {
        navigate(`/tasks?task=${task.id}`);
      },
    });
  };

  const handleSaveAsTemplate = () => {
    const data = getValues();
    createTemplate.mutate({
      title: data.title,
      timing_type: data.timingType,
      proof_type: data.proofType,
      importance: data.importance,
      description: data.description,
      checklist_items: checklistItems.length > 0 ? checklistItems : undefined,
    }, {
      onSuccess: () => {
        alert('Template saved successfully!');
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--color-ivory)] rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{t('task.new')}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-2xl border border-[#E5DDD3] overflow-hidden">
          <div className="p-6 space-y-6">
            {/* 1. What */}
            <div>
              <label className="block text-sm font-semibold mb-2">1. What needs to be done?</label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border bg-[var(--color-ivory)] focus:outline-none focus:ring-2 focus:ring-[var(--color-maroon)] text-base',
                      errors.title ? 'border-[var(--color-urgent)]' : 'border-[#E5DDD3]'
                    )}
                    placeholder="e.g., Prepare payment list for this month..."
                  />
                )}
              />
              {errors.title && <p className="text-xs text-[var(--color-urgent)] mt-1">{errors.title.message}</p>}
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="w-full mt-2 px-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm resize-none"
                    rows={2}
                    placeholder="Description (optional)..."
                  />
                )}
              />
            </div>

            {/* 2. Who */}
            <div>
              <label className="block text-sm font-semibold mb-2">2. Who should do it?</label>
              <Controller
                name="assignTarget"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2 mb-3">
                    {[
                      { value: 'person', icon: User, label: 'Person' },
                      { value: 'department', icon: Building, label: 'Department' },
                      { value: 'pool', icon: Globe, label: 'Open Pool' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors',
                          field.value === opt.value ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5 text-[var(--color-maroon)]' : 'border-[#E5DDD3]'
                        )}
                      >
                        <opt.icon className="w-4 h-4" /> {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              />

              {assignTarget === 'person' && (
                <div className="relative">
                  {selectedPerson ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-maroon)] bg-[var(--color-maroon)]/5">
                      <User className="w-4 h-4 text-[var(--color-maroon)]" />
                      <span className="text-sm font-medium">{selectedPerson.full_name}</span>
                      <button type="button" onClick={() => { setValue('ownerId', ''); setPersonSearch(''); }} className="ml-auto">
                        <X className="w-4 h-4 text-[var(--color-ink)]/40" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={personSearch}
                        onChange={(e) => { setPersonSearch(e.target.value); setShowPersonDropdown(true); }}
                        onFocus={() => setShowPersonDropdown(true)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
                        placeholder="Search person..."
                      />
                      {showPersonDropdown && filteredPeople.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowPersonDropdown(false)} />
                          <div className="absolute top-full mt-1 w-full bg-white rounded-xl border border-[#E5DDD3] shadow-lg z-20 max-h-48 overflow-y-auto">
                            {filteredPeople.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--color-ivory)] transition-colors text-left"
                                onClick={() => {
                                  setValue('ownerId', p.id);
                                  setPersonSearch(p.full_name);
                                  setShowPersonDropdown(false);
                                }}
                              >
                                <div className="w-6 h-6 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--color-maroon)]">
                                  {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <span>{p.full_name}</span>
                                {p.job_title && <span className="text-[var(--color-ink)]/30 text-xs ml-auto">{p.job_title}</span>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {(assignTarget === 'department' || assignTarget === 'pool') && (
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
                    >
                      <option value="">Select department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {i18n.language === 'ml' && d.name_ml ? d.name_ml : d.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              )}
            </div>

            {/* 3. Timing Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">3. Timing type</label>
              <Controller
                name="timingType"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {TIMING_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => field.onChange(opt.type)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center',
                            field.value === opt.type ? 'border-current shadow-sm' : 'border-[#E5DDD3] hover:border-current/30'
                          )}
                          style={{ color: opt.color }}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-sm font-semibold">{i18n.language === 'ml' ? opt.labelMl : opt.label}</span>
                          <span className="text-[10px] opacity-70">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* 4. Date */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                4. {timingType === 'flexible' ? 'Check again on' : 'Due date'}
              </label>
              {timingType !== 'flexible' && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {getDateChips().map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      className="px-3 py-1.5 rounded-full border border-[#E5DDD3] text-sm hover:bg-[var(--color-ivory)] transition-colors"
                      onClick={() => { setValue('dueDate', chip.date); setValue('dueTime', chip.time); }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                {timingType === 'flexible' ? (
                  <Controller
                    name="reviewOn"
                    control={control}
                    render={({ field }) => (
                      <input type="date" {...field} className="flex-1 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm" />
                    )}
                  />
                ) : (
                  <>
                    <Controller
                      name="dueDate"
                      control={control}
                      render={({ field }) => (
                        <input type="date" {...field} className="flex-1 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm" />
                      )}
                    />
                    <Controller
                      name="dueTime"
                      control={control}
                      render={({ field }) => (
                        <input type="time" {...field} className="w-32 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm" />
                      )}
                    />
                  </>
                )}
              </div>
            </div>

            {/* 5. Importance */}
            <div>
              <label className="block text-sm font-semibold mb-2">5. Importance</label>
              <Controller
                name="importance"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange('normal')}
                      className={cn('px-4 py-2 rounded-lg text-sm border transition-colors', field.value === 'normal' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5' : 'border-[#E5DDD3]')}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('important')}
                      className={cn('flex items-center gap-1 px-4 py-2 rounded-lg text-sm border transition-colors', field.value === 'important' ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold-text)]' : 'border-[#E5DDD3]')}
                    >
                      <Star className="w-4 h-4" /> Important
                    </button>
                  </div>
                )}
              />
            </div>

            {/* 6. Proof Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">6. Proof required</label>
              <Controller
                name="proofType"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {PROOF_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => field.onChange(opt.type)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors',
                            field.value === opt.type ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5 text-[var(--color-maroon)]' : 'border-[#E5DDD3]'
                          )}
                        >
                          <Icon className="w-4 h-4" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              />

              {/* Checklist items when proof type is checklist */}
              {proofType === 'checklist' && (
                <div className="mt-3 space-y-2">
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={item.text}
                        onChange={(e) => {
                          const items = [...checklistItems];
                          items[idx] = { ...items[idx], text: e.target.value };
                          setChecklistItems(items);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
                        placeholder={`Item ${idx + 1}`}
                      />
                      <label className="flex items-center gap-1 text-xs text-[var(--color-ink)]/50">
                        <input
                          type="checkbox"
                          checked={item.requires_photo}
                          onChange={(e) => {
                            const items = [...checklistItems];
                            items[idx] = { ...items[idx], requires_photo: e.target.checked };
                            setChecklistItems(items);
                          }}
                        /> 📷
                      </label>
                      <button type="button" onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}>
                        <Trash2 className="w-4 h-4 text-[var(--color-ink)]/30" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setChecklistItems([...checklistItems, { text: '', requires_photo: false }])}
                    className="flex items-center gap-1 text-sm text-[var(--color-maroon)] hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add item
                  </button>
                </div>
              )}
            </div>

            {/* 7. Options */}
            <div className="flex flex-wrap gap-4 text-sm">
              <Controller
                name="requiresApproval"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="rounded" />
                    Requires approval
                  </label>
                )}
              />
              <Controller
                name="readAloud"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="rounded" />
                    Read aloud (Malayalam)
                  </label>
                )}
              />
            </div>

            {/* 8. Approver */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4" /> 8. Approver</span>
              </label>
              <div className="relative">
                {selectedApprover ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-maroon)] bg-[var(--color-maroon)]/5">
                    <UserCheck className="w-4 h-4 text-[var(--color-maroon)]" />
                    <span className="text-sm font-medium">{selectedApprover.full_name}</span>
                    <button type="button" onClick={() => { setValue('approverId', ''); setApproverSearch(''); }} className="ml-auto">
                      <X className="w-4 h-4 text-[var(--color-ink)]/40" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={approverSearch}
                      onChange={(e) => { setApproverSearch(e.target.value); setShowApproverDropdown(true); }}
                      onFocus={() => setShowApproverDropdown(true)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
                      placeholder="Search approver... (default: you)"
                    />
                    {showApproverDropdown && filteredApproverPeople.length > 0 && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowApproverDropdown(false)} />
                        <div className="absolute top-full mt-1 w-full bg-white rounded-xl border border-[#E5DDD3] shadow-lg z-20 max-h-48 overflow-y-auto">
                          {filteredApproverPeople.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--color-ivory)] transition-colors text-left"
                              onClick={() => {
                                setValue('approverId', p.id);
                                setApproverSearch(p.full_name);
                                setShowApproverDropdown(false);
                              }}
                            >
                              <div className="w-6 h-6 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--color-maroon)]">
                                {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span>{p.full_name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 9. Watchers / helpers */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> 9. Watchers / Helpers</span>
              </label>
              {selectedWatchers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedWatchers.map((wId) => {
                    const person = people.find(p => p.id === wId);
                    return (
                      <span key={wId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-ivory)] border border-[#E5DDD3] text-xs">
                        {person?.full_name || 'Unknown'}
                        <button type="button" onClick={() => setSelectedWatchers(selectedWatchers.filter(id => id !== wId))}>
                          <X className="w-3 h-3 text-[var(--color-ink)]/40" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <input
                  value={watcherSearch}
                  onChange={(e) => { setWatcherSearch(e.target.value); setShowWatcherDropdown(true); }}
                  onFocus={() => setShowWatcherDropdown(true)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
                  placeholder="Add watchers..."
                />
                {showWatcherDropdown && filteredWatcherPeople.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowWatcherDropdown(false)} />
                    <div className="absolute top-full mt-1 w-full bg-white rounded-xl border border-[#E5DDD3] shadow-lg z-20 max-h-48 overflow-y-auto">
                      {filteredWatcherPeople.slice(0, 10).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--color-ivory)] transition-colors text-left"
                          onClick={() => {
                            setSelectedWatchers([...selectedWatchers, p.id]);
                            setValue('watcherIds', [...selectedWatchers, p.id]);
                            setWatcherSearch('');
                            setShowWatcherDropdown(false);
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--color-maroon)]">
                            {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span>{p.full_name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 10. Attachments note */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                <span className="flex items-center gap-1.5"><Paperclip className="w-4 h-4" /> 10. Attachments / Instructions note</span>
              </label>
              <Controller
                name="attachmentsNote"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="w-full px-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm resize-none"
                    rows={3}
                    placeholder="Reference files, links, or detailed instructions..."
                  />
                )}
              />
            </div>

            {/* 11. Estimate */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 11. Time estimate</span>
              </label>
              <div className="flex gap-2">
                <Controller
                  name="estimateMinutes"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      min={1}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-24 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
                      placeholder="0"
                    />
                  )}
                />
                <Controller
                  name="estimateUnit"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => field.onChange('minutes')}
                        className={cn('px-3 py-2 rounded-lg text-sm border transition-colors', field.value === 'minutes' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5' : 'border-[#E5DDD3]')}
                      >
                        Minutes
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange('hours')}
                        className={cn('px-3 py-2 rounded-lg text-sm border transition-colors', field.value === 'hours' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5' : 'border-[#E5DDD3]')}
                      >
                        Hours
                      </button>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E5DDD3] bg-[var(--color-ivory)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]/50 hover:text-[var(--color-ink)] transition-colors"
                onClick={handleSaveAsTemplate}
                disabled={createTemplate.isPending}
              >
                <Save className="w-4 h-4" />
                {createTemplate.isPending ? 'Saving...' : 'Save as template'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Create Task
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

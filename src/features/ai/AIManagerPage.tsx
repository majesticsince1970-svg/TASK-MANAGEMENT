import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAiAlerts, useActionAiAlert, usePeople, useDashboardStats } from '@/lib/hooks';
import { useTasks, useCreateTask } from '@/features/tasks/hooks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bot, AlertTriangle, Lightbulb, TrendingUp, CheckCircle, Clock,
  MessageSquare, Send, Volume2, ChevronRight, X, Bell,
  Mic, MicOff, Loader2, Plus, Square, VolumeX
} from 'lucide-react';
import { formatDistanceToNow, addDays, addHours, format } from 'date-fns';
import type { TimingType, ProofType, Profile } from '@/types/database';

type AITab = 'inbox' | 'ask' | 'digests';

const LEVEL_CONFIG = {
  critical: { icon: AlertTriangle, color: 'text-[var(--color-urgent)]', bg: 'bg-red-50', border: 'border-red-200' },
  important: { icon: Bell, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  insight: { icon: Lightbulb, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const DEMO_ALERTS = [
  { id: 'ai1', level: 'critical', title: 'Morning cash count overdue by 2 hours', explanation: 'The morning cash count task was due at 10:00 AM and has not been started.', suggested_action: 'Send reminder to James Sheary', status: 'open', rule_key: 'overdue_urgent', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'ai2', level: 'important', title: 'Diwali reel edit is behind schedule', explanation: 'Task has been in progress for 3 days with no proof submitted.', suggested_action: 'Check in with Adil', status: 'open', rule_key: 'stuck_in_progress', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'ai3', level: 'insight', title: 'Adil has 8 active tasks this week', explanation: 'Higher than usual workload. Consider redistributing.', suggested_action: 'Review task assignments', status: 'open', rule_key: 'high_workload', created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
];

const DEMO_DIGESTS = [
  { id: 'd1', date: 'Today', summary: '8 tasks completed, 3 overdue, 2 new alerts. Overall completion rate: 78%.', highlights: ['Morning routine compliance: 88%', 'Adil workload high (8 tasks)', 'Stock audit on track (45% done)'] },
  { id: 'd2', date: 'Yesterday', summary: '12 tasks completed, 1 overdue. All routines ran on time.', highlights: ['100% routine compliance', 'Jelisha earned 45 points', 'No critical alerts'] },
];

/* ─── Voice command parser ─── */

interface ParsedCommand {
  intent: 'create_task' | 'query_pending' | 'query_overdue' | 'query_person' | 'query_status' | 'greeting' | 'unknown';
  title?: string;
  assigneeName?: string;
  timing?: TimingType;
  proofType?: ProofType;
  department?: string;
  importance?: 'normal' | 'important';
  raw: string;
}

function parseVoiceCommand(text: string, people: Profile[]): ParsedCommand {
  const lower = text.toLowerCase();
  const result: ParsedCommand = { intent: 'unknown', raw: text };

  // Detect Malayalam or English
  const isMalayalam = /[\u0D00-\u0D7F]/.test(text);

  // --- Greetings ---
  if (/^(hi|hello|hey|namaskaram|hai|നമസ്കാരം|ഹായ്|ഹലോ)[\s,!.]*$/i.test(lower.trim()) ||
      /^(hi|hello|hey)\s*(ai|manager|sir|madam)/i.test(lower)) {
    result.intent = 'greeting';
    return result;
  }

  // --- Query: pending / what's left / status ---
  const pendingPatterns = [
    /pending\s*(tasks?)?/, /what('s| is)\s*(still\s+)?pending/, /what.*left/,
    /show.*pending/, /list.*pending/, /how many.*pending/,
    /ബാക്കി/, /പെൻഡിംഗ്/, /എന്ത്.*ബാക്കി/, /തീർക്കാനുള്ള/
  ];
  if (pendingPatterns.some(p => p.test(lower))) {
    result.intent = 'query_pending';
    // Check if asking about a specific person
    for (const p of people) {
      if (lower.includes(p.full_name.toLowerCase()) || (p.full_name_ml && text.includes(p.full_name_ml))) {
        result.assigneeName = p.full_name;
        result.intent = 'query_person';
        break;
      }
    }
    return result;
  }

  // --- Query: overdue ---
  const overduePatterns = [/overdue/, /late/, /missed/, /past\s*due/, /കാലാവധി.*കഴിഞ്ഞ/, /ലേറ്റ്/];
  if (overduePatterns.some(p => p.test(lower))) {
    result.intent = 'query_overdue';
    return result;
  }

  // --- Query: status / today / how's it going ---
  const statusPatterns = [
    /how('s| is).*going/, /today('s)?\s*(status|summary|report)/,
    /what('s| is)\s*(the\s+)?status/, /give me.*summary/,
    /ഇന്നത്തെ.*സ്ഥിതി/, /എങ്ങനെ.*പോകുന്ന/
  ];
  if (statusPatterns.some(p => p.test(lower))) {
    result.intent = 'query_status';
    return result;
  }

  // --- Create task (catch-all for commands with action words) ---
  const createPatterns = [
    /(?:assign|create|add|give|send|make|set\s*up|need\s+to|wants?\s+to|should)\s+(.+)/i,
    /(.+?)\s+(?:assign|create|give|send)\s+(?:to|for)\s+/i,
    /(?:task|work|job)[:]\s*(.+)/i,
    // Malayalam patterns
    /(.+?)\s*(?:ചെയ്യണം|ചെയ്യൂ|അസൈൻ|ടാസ്ക്|നൽകൂ|കൊടുക്കൂ)/,
    /(?:ടാസ്ക്|ജോലി|പണി)[:]\s*(.+)/,
  ];

  // If none of the specific patterns match, try to detect task creation from context
  const hasCreateIntent = createPatterns.some(p => p.test(text)) ||
    lower.includes('update') || lower.includes('prepare') || lower.includes('check') ||
    lower.includes('send') || lower.includes('complete') || lower.includes('submit') ||
    lower.includes('review') || lower.includes('call') || lower.includes('follow up') ||
    lower.includes('payment') || lower.includes('list') || lower.includes('report');

  if (hasCreateIntent) {
    result.intent = 'create_task';

    // Extract title — use the main content
    let title = text;
    // Remove common prefixes
    title = title.replace(/^(hi|hello|hey)\s*(ai|manager)?\s*,?\s*/i, '');
    title = title.replace(/^(i\s+)?(need\s+to|want\s+to|please|can\s+you)\s*/i, '');
    title = title.replace(/^(assign|create|add|make)\s*(a\s+)?(new\s+)?(task\s*)?(for|to)?\s*/i, '');
    result.title = title.charAt(0).toUpperCase() + title.slice(1);

    // Detect assignee by matching people names
    for (const p of people) {
      const nameLower = p.full_name.toLowerCase();
      const parts = nameLower.split(' ');
      if (lower.includes(nameLower) || parts.some(part => part.length > 2 && lower.includes(part))) {
        result.assigneeName = p.full_name;
        break;
      }
      if (p.full_name_ml && text.includes(p.full_name_ml)) {
        result.assigneeName = p.full_name;
        break;
      }
      if (p.aliases?.some(a => lower.includes(a.toLowerCase()))) {
        result.assigneeName = p.full_name;
        break;
      }
    }

    // Detect department
    if (/account/i.test(lower)) result.department = 'Accounts';
    else if (/sales|floor|shop/i.test(lower)) result.department = 'Sales Floor';
    else if (/creative|design|photo|video|reel/i.test(lower)) result.department = 'Creative';
    else if (/hr|admin/i.test(lower)) result.department = 'HR and Admin';

    // Detect timing
    if (/urgent|immediately|right\s+now|asap|അടിയന്തര/i.test(lower)) result.timing = 'urgent';
    else if (/today|ഇന്ന്/i.test(lower)) result.timing = 'dated';
    else result.timing = 'dated';

    // Detect importance
    if (/important|critical|priority|urgent|പ്രധാന/i.test(lower)) result.importance = 'important';

    // Detect proof type
    if (/photo|picture|image|ഫോട്ടോ/i.test(lower)) result.proofType = 'photo';
    else if (/payment|amount|number|₹|രൂപ/i.test(lower)) result.proofType = 'payment_list';
    else if (/list|ലിസ്റ്റ്/i.test(lower)) result.proofType = 'text_note';
    else if (/file|document|ഡോക്യുമെൻ/i.test(lower)) result.proofType = 'file';

    return result;
  }

  return result;
}

/* ─── Malayalam TTS helper ─── */

function speakText(text: string, lang: 'en-IN' | 'ml-IN' = 'en-IN') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  // Try to find a matching voice
  const voices = window.speechSynthesis.getVoices();
  const matchVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
  if (matchVoice) utterance.voice = matchVoice;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* ─── Main Component ─── */

export default function AIManagerPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AITab>('ask');
  const [askInput, setAskInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string; taskCreated?: boolean }[]>([
    { role: 'ai', text: `👋 Hi ${profile?.full_name || 'there'}! I'm your AI Manager. You can:\n\n• **Speak in Malayalam or English** to assign tasks\n• Ask "What's pending?" to check status\n• Say "Assign payment list update to accountant"\n\nTap the 🎤 mic button and speak!` }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<'en-IN' | 'ml-IN'>('en-IN');
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: remoteAlerts } = useAiAlerts('open');
  const actionAlert = useActionAiAlert();
  const { data: people = [] } = usePeople();
  const { data: stats } = useDashboardStats();
  const { data: allTasks = [] } = useTasks({ status: ['new', 'seen', 'in_progress', 'blocked', 'submitted', 'sent_back'] });
  const { data: myTasks = [] } = useTasks({ tab: 'my', status: ['new', 'seen', 'in_progress', 'sent_back'] });
  const createTask = useCreateTask();

  const alerts = (remoteAlerts && remoteAlerts.length > 0) ? remoteAlerts : DEMO_ALERTS;
  const openAlerts = alerts.filter((a: any) => a.status === 'open');

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Track speaking state
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const check = setInterval(() => {
      setIsSpeaking(window.speechSynthesis.speaking);
    }, 200);
    return () => clearInterval(check);
  }, []);

  /* ─── Voice recognition ─── */

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setChatMessages(prev => [...prev, { role: 'ai', text: '⚠️ Speech recognition is not supported in this browser. Please use Chrome.' }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== 'no-speech') {
        setChatMessages(prev => [...prev, { role: 'ai', text: `🎤 Mic error: ${e.error}. Please try again.` }]);
      }
    };

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setIsListening(false);
      processMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  /* ─── Process message (voice or typed) ─── */

  const processMessage = useCallback(async (text: string) => {
    setChatMessages(prev => [...prev, { role: 'user', text }]);
    setIsProcessing(true);

    // Small delay for UX
    await new Promise(r => setTimeout(r, 500));

    const command = parseVoiceCommand(text, people as Profile[]);
    let response = '';

    switch (command.intent) {
      case 'greeting': {
        const pendingCount = (allTasks as any[]).length;
        const overdueCount = (allTasks as any[]).filter((t: any) => t.due_at && new Date(t.due_at) < new Date() && t.status !== 'done').length;
        response = `👋 Hello! Here's a quick overview:\n\n📋 **${pendingCount} active tasks** across the team\n⚠️ **${overdueCount} overdue** tasks\n🔔 **${openAlerts.length} AI alerts** pending\n\nWhat would you like to do?`;
        if (language === 'ml-IN') {
          speakText(`നമസ്കാരം! ${pendingCount} ടാസ്ക്കുകൾ ആക്ടീവ് ആണ്. ${overdueCount} ഓവർഡ്യൂ ആണ്.`, 'ml-IN');
        } else {
          speakText(`Hello! You have ${pendingCount} active tasks and ${overdueCount} overdue.`, 'en-IN');
        }
        break;
      }

      case 'query_pending': {
        const pending = (allTasks as any[]).filter((t: any) => ['new', 'seen', 'in_progress'].includes(t.status));
        const grouped: Record<string, number> = {};
        pending.forEach((t: any) => { grouped[t.status] = (grouped[t.status] || 0) + 1; });
        response = `📋 **${pending.length} pending tasks:**\n\n`;
        if (grouped.new) response += `• 🆕 New (unread): **${grouped.new}**\n`;
        if (grouped.seen) response += `• 👁️ Seen: **${grouped.seen}**\n`;
        if (grouped.in_progress) response += `• 🔄 In Progress: **${grouped.in_progress}**\n`;
        response += `\nTop 5 pending:\n`;
        pending.slice(0, 5).forEach((t: any, i: number) => {
          response += `${i + 1}. **${t.title}** — ${t.status.replace('_', ' ')}\n`;
        });
        if (language === 'ml-IN') {
          speakText(`${pending.length} ടാസ്ക്കുകൾ ബാക്കിയുണ്ട്`, 'ml-IN');
        } else {
          speakText(`You have ${pending.length} pending tasks.`, 'en-IN');
        }
        break;
      }

      case 'query_person': {
        const person = (people as Profile[]).find(p => p.full_name === command.assigneeName);
        if (person) {
          const personTasks = (allTasks as any[]).filter((t: any) => t.owner_id === person.id);
          const active = personTasks.filter((t: any) => ['new', 'seen', 'in_progress'].includes(t.status));
          response = `👤 **${person.full_name}** — ${person.job_title || person.role}\n\n`;
          response += `📋 Active tasks: **${active.length}**\n`;
          response += `⭐ Points: **${person.points}**\n`;
          response += `📍 Status: **${person.availability.replace('_', ' ')}**\n\n`;
          if (active.length > 0) {
            response += `Current tasks:\n`;
            active.slice(0, 5).forEach((t: any, i: number) => {
              response += `${i + 1}. ${t.title}\n`;
            });
          }
        } else {
          response = `I couldn't find anyone named "${command.assigneeName}". Available team members: ${(people as Profile[]).map(p => p.full_name).join(', ')}`;
        }
        break;
      }

      case 'query_overdue': {
        const overdue = (allTasks as any[]).filter((t: any) => t.due_at && new Date(t.due_at) < new Date());
        response = `⚠️ **${overdue.length} overdue tasks:**\n\n`;
        overdue.slice(0, 8).forEach((t: any, i: number) => {
          const owner = (people as Profile[]).find(p => p.id === t.owner_id);
          response += `${i + 1}. **${t.title}** — ${owner?.full_name || 'Unassigned'} (${formatDistanceToNow(new Date(t.due_at), { addSuffix: true })})\n`;
        });
        if (overdue.length === 0) response = '✅ No overdue tasks! Everything is on track.';
        break;
      }

      case 'query_status': {
        const total = (allTasks as any[]).length;
        const overdue = (allTasks as any[]).filter((t: any) => t.due_at && new Date(t.due_at) < new Date()).length;
        const inProgress = (allTasks as any[]).filter((t: any) => t.status === 'in_progress').length;
        const submitted = (allTasks as any[]).filter((t: any) => t.status === 'submitted').length;
        const onDuty = (people as Profile[]).filter(p => p.availability === 'on_duty').length;

        response = `📊 **Today's Status:**\n\n`;
        response += `📋 Active tasks: **${total}**\n`;
        response += `🔄 In progress: **${inProgress}**\n`;
        response += `📥 Awaiting review: **${submitted}**\n`;
        response += `⚠️ Overdue: **${overdue}**\n`;
        response += `👥 Staff on duty: **${onDuty}/${(people as Profile[]).length}**\n`;
        response += `🔔 AI alerts: **${openAlerts.length}**\n`;
        break;
      }

      case 'create_task': {
        if (!command.title || command.title.length < 3) {
          response = "I couldn't understand the task. Could you describe it more clearly? For example:\n\n\"Assign payment list update to the accountant for today\"";
          break;
        }

        // Find assignee
        let assignee: Profile | undefined;
        if (command.assigneeName) {
          assignee = (people as Profile[]).find(p => p.full_name === command.assigneeName);
        }

        // Find department
        let departmentId: string | undefined;
        if (command.department) {
          // Would query departments in real app, for now skip
        }

        const dueAt = command.timing === 'urgent'
          ? addHours(new Date(), 2).toISOString()
          : addDays(new Date(), 1).toISOString();

        try {
          const newTask = await createTask.mutateAsync({
            title: command.title,
            timing_type: command.timing || 'dated',
            importance: command.importance || 'normal',
            due_at: dueAt,
            owner_id: assignee?.id,
            proof_type: command.proofType || 'none',
            source: 'voice',
          });

          response = `✅ **Task created!**\n\n`;
          response += `📝 **${command.title}**\n`;
          response += `👤 Assigned to: **${assignee?.full_name || 'You (unassigned)'}**\n`;
          response += `⏰ Due: **${format(new Date(dueAt), 'dd MMM yyyy, hh:mm a')}**\n`;
          response += `🏷️ Timing: **${command.timing || 'dated'}**\n`;
          if (command.proofType && command.proofType !== 'none') {
            response += `📎 Proof required: **${command.proofType.replace('_', ' ')}**\n`;
          }
          response += `\nThe task has been created and ${assignee ? `${assignee.full_name} will be notified` : 'is waiting to be assigned'}.`;

          // Voice confirmation
          if (language === 'ml-IN') {
            speakText(`ടാസ്ക് ക്രിയേറ്റ് ചെയ്തു. ${command.title}. ${assignee ? assignee.full_name + ' ന് അസൈൻ ചെയ്തു.' : ''}`, 'ml-IN');
          } else {
            speakText(`Task created. ${command.title}. ${assignee ? `Assigned to ${assignee.full_name}.` : ''}`, 'en-IN');
          }

          setChatMessages(prev => [...prev, { role: 'ai', text: response, taskCreated: true }]);
          setIsProcessing(false);
          return;
        } catch (err: any) {
          response = `❌ Error creating task: ${err.message || 'Something went wrong'}. Please try again or create it manually.`;
        }
        break;
      }

      default:
        response = `🤔 I didn't quite understand that. You can try:\n\n• **"What's pending?"** — See pending tasks\n• **"Assign [task] to [person]"** — Create a task by voice\n• **"Today's status"** — Get a summary\n• **"What's overdue?"** — See late tasks\n\nOr speak in Malayalam — I understand that too! 🇮🇳`;
        break;
    }

    setChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    setIsProcessing(false);
  }, [people, allTasks, openAlerts, language, createTask]);

  const handleSend = () => {
    if (!askInput.trim()) return;
    processMessage(askInput.trim());
    setAskInput('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-maroon)] to-[#5D1020] flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">AI Manager</h1>
          <p className="text-xs text-[var(--color-ink)]/40">Speak in English or Malayalam to manage tasks</p>
        </div>
        {/* Language toggle */}
        <button
          onClick={() => setLanguage(l => l === 'en-IN' ? 'ml-IN' : 'en-IN')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            language === 'ml-IN'
              ? 'bg-[var(--color-maroon)] text-white border-[var(--color-maroon)]'
              : 'bg-white border-[#E5DDD3] text-[var(--color-ink)]/60'
          )}
        >
          {language === 'ml-IN' ? 'മലയാളം' : 'EN'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {[
          { key: 'ask' as AITab, label: '🎤 Talk to AI', icon: MessageSquare },
          { key: 'inbox' as AITab, label: 'Alerts', icon: Bell, count: openAlerts.length },
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
            {tabItem.label}
            {tabItem.count != null && tabItem.count > 0 && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full', tab === tabItem.key ? 'bg-white/20 text-white' : 'bg-[var(--color-urgent)]/10 text-[var(--color-urgent)]')}>
                {tabItem.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Talk to AI Tab ─── */}
      {tab === 'ask' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-line',
                  msg.role === 'user'
                    ? 'bg-[var(--color-maroon)] text-white rounded-br-sm'
                    : 'bg-[var(--color-ivory)] rounded-bl-sm'
                )}>
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="w-3.5 h-3.5 text-[var(--color-maroon)]" />
                      <span className="text-[10px] font-semibold text-[var(--color-maroon)]">AI Manager</span>
                    </div>
                  )}
                  {msg.text.split('\n').map((line, j) => (
                    <span key={j}>
                      {line.replace(/\*\*(.+?)\*\*/g, '⟨$1⟩').split('⟨').map((part, k) => {
                        if (part.includes('⟩')) {
                          const [bold, rest] = part.split('⟩');
                          return <span key={k}><strong>{bold}</strong>{rest}</span>;
                        }
                        return <span key={k}>{part}</span>;
                      })}
                      {j < msg.text.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                  {msg.taskCreated && (
                    <button
                      onClick={() => navigate('/tasks')}
                      className="mt-2 flex items-center gap-1 text-xs text-[var(--color-maroon)] hover:underline"
                    >
                      <ChevronRight className="w-3 h-3" /> View in Tasks
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-[var(--color-ivory)] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-maroon)]" />
                  <span className="text-sm text-[var(--color-ink)]/50">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions */}
          {chatMessages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {[
                language === 'ml-IN' ? 'എന്ത് ബാക്കിയുണ്ട്?' : "What's pending?",
                language === 'ml-IN' ? 'ഇന്നത്തെ സ്ഥിതി' : "Today's status",
                language === 'ml-IN' ? 'ഓവർഡ്യൂ ടാസ്ക്കുകൾ' : 'Show overdue',
                language === 'ml-IN' ? 'പേയ്മെന്റ് ലിസ്റ്റ് അപ്ഡേറ്റ് ചെയ്യൂ' : 'Update payment list for today',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => processMessage(q)}
                  className="px-3 py-1.5 bg-[var(--color-ivory)] rounded-full text-xs hover:bg-[#E5DDD3] transition-colors border border-[#E5DDD3]"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar with mic */}
          <div className="p-3 border-t border-[#E5DDD3]">
            <div className="flex items-center gap-2">
              {/* Mic button */}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0',
                  isListening
                    ? 'bg-[var(--color-urgent)] text-white animate-pulse shadow-lg scale-110'
                    : 'bg-[var(--color-maroon)] text-white hover:bg-[var(--color-maroon)]/90 shadow-md'
                )}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {isListening ? (
                <div className="flex-1 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-[var(--color-urgent)] animate-pulse">
                  🎤 Listening{language === 'ml-IN' ? ' (മലയാളം)' : ' (English)'}... Speak now
                </div>
              ) : (
                <input
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-maroon)]"
                  placeholder={language === 'ml-IN' ? 'ഇവിടെ ടൈപ്പ് ചെയ്യൂ അല്ലെങ്കിൽ മൈക്ക് അമർത്തൂ...' : 'Type or press mic to speak...'}
                  disabled={isProcessing}
                />
              )}

              {/* Stop speaking button */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors shrink-0"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
              )}

              {!isListening && (
                <Button onClick={handleSend} disabled={!askInput.trim() || isProcessing} className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Inbox Tab ─── */}
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

      {/* ─── Digests Tab ─── */}
      {tab === 'digests' && (
        <div className="space-y-4">
          {DEMO_DIGESTS.map((digest) => (
            <div key={digest.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[var(--color-maroon)]" />
                <h3 className="text-sm font-semibold">{digest.date}'s Digest</h3>
                <button
                  onClick={() => speakText(digest.summary, language)}
                  className="ml-auto flex items-center gap-1 text-xs text-[var(--color-maroon)] hover:underline"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Listen in {language === 'ml-IN' ? 'Malayalam' : 'English'}
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

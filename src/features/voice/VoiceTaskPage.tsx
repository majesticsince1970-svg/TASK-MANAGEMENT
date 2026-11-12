import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Loader2, Check, X, RotateCcw, Volume2 } from 'lucide-react';
import { useCreateTask } from '@/features/tasks/hooks';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { TimingType, ProofType } from '@/types/database';

type VoiceState = 'idle' | 'listening' | 'processing' | 'confirm' | 'done' | 'error';

interface ParsedTask {
  title: string;
  owner_name: string;
  timing_type: TimingType;
  due_text: string;
  importance: 'normal' | 'important';
  proof_type: ProofType;
}

export default function VoiceTaskPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createTask = useCreateTask();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [error, setError] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef('');

  // Try edge function first, fall back to browser SpeechRecognition
  const startListening = useCallback(async () => {
    setState('listening');
    setTranscript('');
    setError('');
    transcriptRef.current = '';
    audioChunksRef.current = [];

    // Start recording audio for the edge function path
    let mediaStream: MediaStream | null = null;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
    } catch {
      // Mic access denied — fall through to SpeechRecognition only
    }

    // Also start browser SpeechRecognition for live transcript feedback
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = i18n.language === 'ml' ? 'ml-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
        transcriptRef.current = text;
      };

      recognition.onerror = (event: any) => {
        // Only set error if we have no other path
        if (!mediaRecorderRef.current) {
          setError(event.error);
          setState('error');
        }
      };

      recognition.onend = () => {
        // Do nothing — processing is triggered by stopListening
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else if (!mediaRecorderRef.current) {
      setError('Speech recognition not supported in this browser');
      setState('error');
    }
  }, [i18n.language]);

  const stopListening = useCallback(async () => {
    // Stop browser recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop media recorder and collect audio
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      // Wait for all data
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
      });

      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;

    setState('processing');

    // Try edge function first
    if (audioChunksRef.current.length > 0) {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const { data, error: fnError } = await supabase.functions.invoke('voice-to-task', {
          body: { audio_base64: base64, user_id: profile?.id },
        });

        if (!fnError && data?.parsed) {
          setParsedTask(data.parsed as ParsedTask);
          setTranscript(data.transcript || transcriptRef.current);
          setState('confirm');
          return;
        }
        // Edge function failed — fall through to client-side parsing
      } catch {
        // Fall through to client-side parsing
      }
    }

    // FALLBACK: client-side parsing from browser transcript
    const text = transcriptRef.current;
    if (!text) {
      setError('No speech detected. Please try again.');
      setState('error');
      return;
    }

    clientSideParse(text);
  }, [profile?.id]);

  const clientSideParse = (text: string) => {
    const lowerText = text.toLowerCase();

    // Detect timing type
    let timing_type: TimingType = 'dated';
    if (lowerText.includes('urgent') || lowerText.includes('immediately') || lowerText.includes('now')) {
      timing_type = 'urgent';
    } else if (lowerText.includes('no deadline') || lowerText.includes('whenever') || lowerText.includes('flexible')) {
      timing_type = 'flexible';
    }

    // Detect importance
    const importance = (lowerText.includes('important') || lowerText.includes('priority')) ? 'important' as const : 'normal' as const;

    // Detect proof type
    let proof_type: ProofType = 'none';
    if (lowerText.includes('photo') || lowerText.includes('picture')) proof_type = 'photo';
    else if (lowerText.includes('number') || lowerText.includes('count')) proof_type = 'number';

    // Extract person name (simple heuristic)
    let owner_name = '';
    const toMatch = text.match(/(?:tell|ask|assign to|for)\s+(\w+)/i);
    if (toMatch) owner_name = toMatch[1];

    const parsed: ParsedTask = {
      title: text,
      owner_name,
      timing_type,
      due_text: timing_type === 'urgent' ? 'Today' : 'Tomorrow',
      importance,
      proof_type,
    };

    setParsedTask(parsed);
    setState('confirm');
  };

  const handleConfirm = () => {
    if (!parsedTask) return;
    createTask.mutate({
      title: parsedTask.title,
      timing_type: parsedTask.timing_type,
      importance: parsedTask.importance,
      proof_type: parsedTask.proof_type,
      source: 'voice',
    }, {
      onSuccess: (task) => {
        setState('done');
        setTimeout(() => navigate(`/tasks?task=${task.id}`), 1500);
      },
    });
  };

  // Listen button: call TTS edge function
  const handleListen = async () => {
    if (!parsedTask) return;
    setTtsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('tts', {
        body: {
          text: parsedTask.title,
          language: i18n.language === 'ml' ? 'ml-IN' : 'en-IN',
        },
      });

      if (fnError) throw fnError;

      if (data?.audio_base64) {
        const audioBytes = Uint8Array.from(atob(data.audio_base64), (c) => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(audioUrl);
      }
    } catch {
      // If TTS edge function fails, use browser speech synthesis as fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(parsedTask.title);
        utterance.lang = i18n.language === 'ml' ? 'ml-IN' : 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4">
      {/* Title */}
      <h1 className="text-2xl font-bold text-center">
        {state === 'idle' && (i18n.language === 'ml' ? 'ശബ്ദ ടാസ്ക്' : 'Voice Task')}
        {state === 'listening' && (i18n.language === 'ml' ? 'കേൾക്കുന്നു...' : 'Listening...')}
        {state === 'processing' && (i18n.language === 'ml' ? 'പ്രോസസ് ചെയ്യുന്നു...' : 'Processing...')}
        {state === 'confirm' && (i18n.language === 'ml' ? 'ശരിയാണോ?' : 'Is this correct?')}
        {state === 'done' && (i18n.language === 'ml' ? 'ടാസ്ക് സൃഷ്ടിച്ചു!' : 'Task Created!')}
        {state === 'error' && 'Error'}
      </h1>

      {/* Mic button */}
      {(state === 'idle' || state === 'listening') && (
        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          className={cn(
            'w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-lg',
            state === 'listening'
              ? 'bg-[var(--color-urgent)] scale-110 animate-pulse shadow-red-200'
              : 'bg-[var(--color-maroon)] hover:scale-105 shadow-[var(--color-maroon)]/20'
          )}
        >
          {state === 'listening' ? (
            <MicOff className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>
      )}

      {/* Processing spinner */}
      {state === 'processing' && (
        <div className="w-32 h-32 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-[var(--color-maroon)] animate-spin" />
        </div>
      )}

      {/* Done check */}
      {state === 'done' && (
        <div className="w-32 h-32 rounded-full bg-green-50 flex items-center justify-center">
          <Check className="w-12 h-12 text-green-600" />
        </div>
      )}

      {/* Transcript */}
      {transcript && state === 'listening' && (
        <div className="max-w-md text-center">
          <p className="text-lg text-[var(--color-ink)]/70 italic">"{transcript}"</p>
        </div>
      )}

      {/* Confirm parsed task */}
      {state === 'confirm' && parsedTask && (
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5DDD3] p-6 space-y-4">
          <div>
            <p className="text-xs text-[var(--color-ink)]/40 mb-1">Task</p>
            <p className="text-lg font-medium">{parsedTask.title}</p>
          </div>
          {parsedTask.owner_name && (
            <div>
              <p className="text-xs text-[var(--color-ink)]/40 mb-1">Assign to</p>
              <p className="font-medium">{parsedTask.owner_name}</p>
            </div>
          )}
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-[var(--color-ink)]/40 mb-1">Timing</p>
              <p className="font-medium capitalize">{parsedTask.timing_type}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-ink)]/40 mb-1">Due</p>
              <p className="font-medium">{parsedTask.due_text}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-ink)]/40 mb-1">Importance</p>
              <p className="font-medium capitalize">{parsedTask.importance}</p>
            </div>
          </div>

          {/* Listen button — wired to TTS edge function */}
          <button
            onClick={handleListen}
            disabled={ttsLoading}
            className="flex items-center gap-2 text-sm text-[var(--color-maroon)] hover:underline disabled:opacity-50"
          >
            {ttsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            {i18n.language === 'ml' ? 'മലയാളത്തിൽ കേൾക്കുക' : 'Listen in Malayalam'}
          </button>

          {/* Action buttons — huge for senior mode */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Button
              onClick={handleConfirm}
              className="h-16 text-lg bg-green-600 hover:bg-green-700 rounded-xl"
              disabled={createTask.isPending}
            >
              {createTask.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
              <span className="ml-2">OK</span>
            </Button>
            <Button
              onClick={() => { setState('idle'); setParsedTask(null); setTranscript(''); }}
              variant="outline"
              className="h-16 text-lg rounded-xl"
            >
              <RotateCcw className="w-6 h-6" />
              <span className="ml-2">Change</span>
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="h-16 text-lg rounded-xl"
            >
              <X className="w-6 h-6" />
              <span className="ml-2">Cancel</span>
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="text-center">
          <p className="text-sm text-[var(--color-urgent)] mb-4">{error}</p>
          <Button onClick={() => setState('idle')}>Try Again</Button>
        </div>
      )}

      {/* Helper text */}
      {state === 'idle' && (
        <p className="text-sm text-[var(--color-ink)]/40 text-center max-w-xs">
          {i18n.language === 'ml'
            ? 'ബട്ടൺ അമർത്തി പിടിച്ച് ടാസ്ക് പറയുക'
            : 'Hold the button and speak your task'}
        </p>
      )}
    </div>
  );
}

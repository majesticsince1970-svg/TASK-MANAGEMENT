import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Languages } from 'lucide-react';
import { useTask } from '@/features/tasks/hooks';

export default function TaskListenPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(id ?? null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useMalayalam, setUseMalayalam] = useState(false);

  const handleSpeak = useCallback(() => {
    if (!task) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = useMalayalam
      ? `${task.title_ml || task.title}. ${task.description || ''}`
      : `${task.title}. ${task.description || ''}`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = useMalayalam ? 'ml-IN' : 'en-IN';
    utterance.rate = 0.85;
    utterance.pitch = 1;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [task, useMalayalam, isSpeaking]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[var(--color-maroon)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--color-ink)]/60 hover:text-[var(--color-ink)]">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-center text-lg text-[var(--color-ink)]/50">Task not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Back button */}
      <button
        onClick={() => {
          window.speechSynthesis.cancel();
          navigate(-1);
        }}
        className="flex items-center gap-2 text-base text-[var(--color-ink)]/60 hover:text-[var(--color-ink)] py-2"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Tasks
      </button>

      {/* Task content in large text */}
      <div className="bg-white rounded-2xl border border-[#E5DDD3] p-8 space-y-4">
        <h1 className="text-3xl font-bold leading-snug">
          {useMalayalam && task.title_ml ? task.title_ml : task.title}
        </h1>
        {task.description && (
          <p className="text-xl leading-relaxed text-[var(--color-ink)]/70">
            {task.description}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
        {/* Listen button */}
        <button
          onClick={handleSpeak}
          className={`flex items-center justify-center gap-3 w-full max-w-xs py-5 px-8 rounded-2xl text-xl font-bold transition-all ${
            isSpeaking
              ? 'bg-[var(--color-urgent)] text-white shadow-lg scale-105'
              : 'bg-[var(--color-maroon)] text-white hover:bg-[var(--color-maroon)]/90 shadow-md'
          }`}
        >
          {isSpeaking ? (
            <>
              <VolumeX className="w-7 h-7" /> Stop
            </>
          ) : (
            <>
              <Volume2 className="w-7 h-7" /> 🔊 Listen
            </>
          )}
        </button>

        {/* Malayalam toggle */}
        <button
          onClick={() => {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setUseMalayalam((v) => !v);
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium border-2 transition-all ${
            useMalayalam
              ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5 text-[var(--color-maroon)]'
              : 'border-[#E5DDD3] text-[var(--color-ink)]/60 hover:border-[var(--color-ink)]/30'
          }`}
        >
          <Languages className="w-5 h-5" />
          {useMalayalam ? 'മലയാളം (Malayalam)' : 'Switch to Malayalam'}
        </button>
      </div>
    </div>
  );
}

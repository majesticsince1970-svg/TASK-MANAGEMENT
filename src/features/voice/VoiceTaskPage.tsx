import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Check, X, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VoiceTaskPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'confirm'>('idle');

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--color-ink)]/60 hover:text-[var(--color-ink)] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl border border-[#E5DDD3] p-8 text-center">
        {state === 'idle' && (
          <>
            <h2 className="text-xl font-bold mb-2">Voice Task Creation</h2>
            <p className="text-sm text-[var(--color-ink)]/50 mb-8">Hold the button and speak in Malayalam, English, or Manglish</p>

            <button
              onPointerDown={() => setState('recording')}
              onPointerUp={() => setState('processing')}
              className="w-24 h-24 rounded-full bg-[var(--color-maroon)] flex items-center justify-center mx-auto shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-10 h-10 text-white" />
            </button>
            <p className="text-xs text-[var(--color-ink)]/40 mt-4">Hold to speak</p>
          </>
        )}

        {state === 'recording' && (
          <>
            <div className="w-24 h-24 rounded-full bg-[var(--color-urgent)] flex items-center justify-center mx-auto shadow-lg animate-pulse">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <p className="text-sm text-[var(--color-urgent)] font-medium mt-4">Recording... Release to process</p>
            {/* Waveform placeholder */}
            <div className="flex items-center justify-center gap-1 h-12 mt-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-1 bg-[var(--color-urgent)] rounded-full animate-pulse"
                  style={{ height: `${Math.random() * 30 + 10}px`, animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
          </>
        )}

        {state === 'processing' && (
          <>
            <div className="w-16 h-16 border-4 border-[var(--color-maroon)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[var(--color-ink)]/60 mt-4">Processing your voice...</p>
            <button onClick={() => setState('confirm')} className="text-xs text-[var(--color-maroon)] mt-2 underline">
              (Demo: click to see result)
            </button>
          </>
        )}

        {state === 'confirm' && (
          <>
            <div className="bg-[var(--color-ivory)] rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-[var(--color-ink)]/50 mb-2">Understood:</p>
              <p className="text-base font-medium mb-3">"ജെയിംസിനെ കൊണ്ട് ഈ മാസം കൊടുക്കാനുള്ള പേയ്‌മെന്റ്സ് ലിസ്റ്റ് വെള്ളിയാഴ്ചക്കകം ഉണ്ടാക്കാൻ പറയൂ"</p>
              <div className="space-y-1.5 text-sm">
                <p>👤 <strong>James Sheary</strong> (Accounts)</p>
                <p>📋 Payment list — Dated task</p>
                <p>📅 Friday 5:00 PM</p>
                <p>📎 Proof: Payment List</p>
                <p>🔊 Read result aloud: Yes</p>
              </div>
            </div>

            <p className="text-lg font-semibold mb-4" style={{ fontFamily: "'Noto Sans Malayalam', sans-serif" }}>
              ജെയിംസ് ഷിയറിക്ക് ടാസ്ക് കൊടുക്കട്ടെ?
            </p>

            {/* Big buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => navigate('/tasks')} className="h-16 text-lg bg-[var(--color-success)] hover:bg-[var(--color-success)]/90">
                <Check className="w-6 h-6" /> ശരി
              </Button>
              <Button onClick={() => setState('idle')} variant="outline" className="h-16 text-lg">
                <RefreshCw className="w-6 h-6" /> മാറ്റുക
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline" className="h-16 text-lg text-[var(--color-urgent)]">
                <X className="w-6 h-6" /> വേണ്ട
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


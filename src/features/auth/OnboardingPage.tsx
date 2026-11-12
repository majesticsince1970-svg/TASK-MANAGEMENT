import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Globe, Clock, Bell, Shield, Check, Loader2 } from 'lucide-react';

const STEPS = ['language', 'shift', 'notifications', 'privacy'] as const;

export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [shiftStart, setShiftStart] = useState(profile?.shift_start || '09:00');
  const [shiftEnd, setShiftEnd] = useState(profile?.shift_end || '18:00');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const stepIcons = [Globe, Clock, Bell, Shield];
  const stepLabels = ['Language', 'Shift Times', 'Notifications', 'Privacy Policy'];

  const next = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Save onboarding preferences to profile
      if (profile?.id) {
        setSaving(true);
        try {
          await supabase.from('profiles').update({
            language: i18n.language as 'en' | 'ml',
            shift_start: shiftStart,
            shift_end: shiftEnd,
          }).eq('id', profile.id);
        } catch {
          // Non-blocking — navigate anyway
        } finally {
          setSaving(false);
        }
      }
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ivory)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 px-4">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-[var(--color-maroon)]' : 'bg-[#E5DDD3]'}`} />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E5DDD3] p-8">
          {/* Step icon & title */}
          <div className="text-center mb-6">
            {(() => { const Icon = stepIcons[step]; return <Icon className="w-10 h-10 text-[var(--color-maroon)] mx-auto mb-3" />; })()}
            <h2 className="text-xl font-bold">{stepLabels[step]}</h2>
          </div>

          {/* Step content */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink)]/60 text-center mb-4">Choose your preferred language</p>
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  i18n.language === 'en' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5' : 'border-[#E5DDD3] hover:border-[var(--color-maroon)]/30'
                }`}
              >
                <span className="text-2xl">🇬🇧</span>
                <div className="text-left">
                  <p className="font-semibold">English</p>
                  <p className="text-xs text-[var(--color-ink)]/50">Use English for the interface</p>
                </div>
                {i18n.language === 'en' && <Check className="w-5 h-5 text-[var(--color-maroon)] ml-auto" />}
              </button>
              <button
                onClick={() => i18n.changeLanguage('ml')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  i18n.language === 'ml' ? 'border-[var(--color-maroon)] bg-[var(--color-maroon)]/5' : 'border-[#E5DDD3] hover:border-[var(--color-maroon)]/30'
                }`}
              >
                <span className="text-2xl">🇮🇳</span>
                <div className="text-left">
                  <p className="font-semibold">മലയാളം</p>
                  <p className="text-xs text-[var(--color-ink)]/50">മലയാളത്തിൽ ഉപയോഗിക്കുക</p>
                </div>
                {i18n.language === 'ml' && <Check className="w-5 h-5 text-[var(--color-maroon)] ml-auto" />}
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-ink)]/60 text-center mb-4">Set your working hours</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Shift Start</label>
                  <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shift End</label>
                  <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)]" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-[var(--color-ink)]/60 mb-4">Enable push notifications to stay updated on your tasks</p>
              <Button onClick={() => { if ('Notification' in window) Notification.requestPermission(); }} className="w-full" size="lg">
                <Bell className="w-5 h-5" /> Enable Notifications
              </Button>
              <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-800">
                <strong>iPhone users:</strong> Tap Share → "Add to Home Screen" first, then enable notifications.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="max-h-48 overflow-y-auto text-xs text-[var(--color-ink)]/70 bg-[var(--color-ivory)] p-4 rounded-lg">
                <p className="font-semibold mb-2">Activity Monitoring Policy</p>
                <p>Majestic Ops tracks in-app activity during task work to help measure performance. This includes:</p>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>Page visibility and focus status</li>
                  <li>Active/idle periods while working on tasks</li>
                  <li>Task timestamps (start, submit, complete)</li>
                </ul>
                <p className="mt-2">We do NOT track: keystrokes, screenshots, other apps, or personal data outside this app. Activity data is retained for 90 days. You can view your own data anytime.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="w-5 h-5 rounded border-[#E5DDD3] text-[var(--color-maroon)] accent-[var(--color-maroon)]"
                />
                <span className="text-sm">I have read and accept the monitoring policy</span>
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
            ) : <div />}
            <Button
              onClick={next}
              disabled={(step === 3 && !privacyAccepted) || saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {step === STEPS.length - 1 ? 'Get Started' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

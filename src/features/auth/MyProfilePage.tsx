import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Globe, Shield, Bell, User, Clock } from 'lucide-react';

export default function MyProfilePage() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.profile')}</h1>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-[#E5DDD3] p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xl font-bold text-[var(--color-maroon)]">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile?.full_name}</h2>
            {profile?.full_name_ml && <p className="text-sm text-[var(--color-ink)]/60">{profile.full_name_ml}</p>}
            <p className="text-sm text-[var(--color-ink)]/50 capitalize">{profile?.role?.replace('_', ' ')} · {profile?.job_title || 'Staff'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-[var(--color-ivory)] rounded-lg">
            <Globe className="w-5 h-5 text-[var(--color-ink)]/40" />
            <div>
              <p className="text-xs text-[var(--color-ink)]/50">Language</p>
              <p className="text-sm font-medium">{i18n.language === 'en' ? 'English' : 'മലയാളം'}</p>
            </div>
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ml' : 'en')}
              className="ml-auto text-xs text-[var(--color-maroon)] font-medium"
            >
              Switch
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[var(--color-ivory)] rounded-lg">
            <Clock className="w-5 h-5 text-[var(--color-ink)]/40" />
            <div>
              <p className="text-xs text-[var(--color-ink)]/50">Shift</p>
              <p className="text-sm font-medium">{profile?.shift_start || '09:00'} – {profile?.shift_end || '18:00'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[var(--color-ivory)] rounded-lg">
            <User className="w-5 h-5 text-[var(--color-ink)]/40" />
            <div>
              <p className="text-xs text-[var(--color-ink)]/50">Points</p>
              <p className="text-sm font-medium">{profile?.points || 0} pts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[var(--color-ivory)] rounded-lg">
            <Bell className="w-5 h-5 text-[var(--color-ink)]/40" />
            <div>
              <p className="text-xs text-[var(--color-ink)]/50">Notifications</p>
              <p className="text-sm font-medium">Enabled</p>
            </div>
            <button className="ml-auto text-xs text-[var(--color-maroon)] font-medium">Test</button>
          </div>
        </div>
      </div>
    </div>
  );
}


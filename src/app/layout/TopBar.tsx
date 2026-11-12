import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Mic, Bell, Search, Globe, ChevronDown, Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { AvailabilityStatus } from '@/types/database';
import { useUnreadCount, useUpdateAvailability } from '@/lib/hooks';

const AVAILABILITY_OPTIONS: { value: AvailabilityStatus; labelKey: string; color: string }[] = [
  { value: 'on_duty', labelKey: 'availability.on_duty', color: 'bg-green-500' },
  { value: 'on_break', labelKey: 'availability.on_break', color: 'bg-yellow-500' },
  { value: 'with_customer', labelKey: 'availability.with_customer', color: 'bg-blue-500' },
  { value: 'on_leave', labelKey: 'availability.on_leave', color: 'bg-red-500' },
  { value: 'off_shift', labelKey: 'availability.off_shift', color: 'bg-gray-400' },
];

export function TopBar() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showAvailability, setShowAvailability] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();
  const updateAvailability = useUpdateAvailability();

  const currentAvailability = AVAILABILITY_OPTIONS.find(
    (a) => a.value === (profile?.availability || 'on_duty')
  );

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ml' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="h-14 border-b border-[#E5DDD3] bg-white flex items-center px-4 gap-3 shrink-0">
      {/* Mobile menu button */}
      <button className="md:hidden p-2 -ml-2 hover:bg-[var(--color-ivory)] rounded-lg">
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-ivory)] rounded-lg text-sm text-[var(--color-ink)]/50 cursor-pointer hover:bg-[#F2ECE3] transition-colors">
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.search')}</span>
          <kbd className="hidden lg:inline ml-auto text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E5DDD3]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* New task */}
        <Button
          size="sm"
          onClick={() => navigate('/tasks/new')}
          className="hidden sm:flex"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">{t('task.new')}</span>
        </Button>

        {/* Voice */}
        <Button variant="ghost" size="icon" onClick={() => navigate('/voice/new')} title="Voice">
          <Mic className="w-[18px] h-[18px]" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')} className="relative">
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-[var(--color-urgent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Availability */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowAvailability(!showAvailability)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[var(--color-ivory)] text-sm transition-colors"
          >
            <span className={cn('w-2 h-2 rounded-full', currentAvailability?.color)} />
            <span className="hidden lg:inline text-xs">{t(currentAvailability?.labelKey || '')}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
          {showAvailability && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAvailability(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-[#E5DDD3] py-1 z-50">
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--color-ivory)] transition-colors"
                    onClick={() => {
                      updateAvailability.mutate({ availability: opt.value });
                      setShowAvailability(false);
                    }}
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full', opt.color)} />
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-[var(--color-ivory)] text-xs font-medium transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span>{i18n.language.toUpperCase()}</span>
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-8 h-8 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xs font-semibold text-[var(--color-maroon)] hover:ring-2 hover:ring-[var(--color-maroon)]/20 transition-all"
          >
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
          </button>
          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-[#E5DDD3] py-1 z-50">
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--color-ivory)] transition-colors"
                  onClick={() => { navigate('/me'); setShowProfile(false); }}
                >
                  {t('nav.profile')}
                </button>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--color-ivory)] transition-colors"
                  onClick={() => { navigate('/settings'); setShowProfile(false); }}
                >
                  {t('nav.settings')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


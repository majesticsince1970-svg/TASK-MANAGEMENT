import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/lib/hooks';
import { Bell, Check, CheckCheck, Clock, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const LEVEL_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  urgent: { icon: AlertTriangle, color: 'text-[var(--color-urgent)]', bg: 'bg-red-50' },
  alert: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  reminder: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  info: { icon: Info, color: 'text-[var(--color-ink)]/50', bg: 'bg-[var(--color-ivory)]' },
};

/* Demo notifications fallback */
const DEMO_NOTIFICATIONS = [
  { id: 'n1', title: 'Gold rate post — submitted by Adil', level: 'info', type: 'task_submit', read_at: null, created_at: new Date(Date.now() - 1800000).toISOString(), action_url: '/tasks?task=3' },
  { id: 'n2', title: 'Morning cash count is overdue!', level: 'urgent', type: 'task_overdue', read_at: null, created_at: new Date(Date.now() - 3600000).toISOString(), action_url: '/tasks?task=2' },
  { id: 'n3', title: 'Payment list for October — date change requested', level: 'alert', type: 'date_change', read_at: null, created_at: new Date(Date.now() - 7200000).toISOString(), action_url: '/approvals' },
  { id: 'n4', title: 'Diwali reel edit — due tomorrow', level: 'reminder', type: 'task_reminder', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 14400000).toISOString(), action_url: '/tasks?task=4' },
  { id: 'n5', title: 'Bridal set from locker — approved', level: 'info', type: 'task_approve', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000).toISOString(), action_url: '/tasks?task=7' },
];

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: remoteNotifs } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = (remoteNotifs && remoteNotifs.length > 0) ? remoteNotifs : DEMO_NOTIFICATIONS;
  const unreadCount = notifications.filter((n: any) => !n.read_at).length;

  const handleClick = (notif: any) => {
    if (!notif.read_at) {
      markRead.mutate(notif.id);
    }
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t('nav.notifications')}</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-[var(--color-urgent)] text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E5DDD3] overflow-hidden divide-y divide-[#E5DDD3]">
        {notifications.map((notif: any) => {
          const level = LEVEL_STYLES[notif.level] || LEVEL_STYLES.info;
          const LevelIcon = level.icon;
          const isRead = !!notif.read_at;

          return (
            <div
              key={notif.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                isRead ? 'opacity-60 hover:bg-[var(--color-ivory)]/50' : 'hover:bg-[var(--color-ivory)]'
              )}
              onClick={() => handleClick(notif)}
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', level.bg)}>
                <LevelIcon className={cn('w-4 h-4', level.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm truncate', !isRead && 'font-medium')}>
                  {notif.title}
                </p>
                <p className="text-[10px] text-[var(--color-ink)]/30 mt-0.5">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
              {!isRead && <div className="w-2 h-2 rounded-full bg-[var(--color-maroon)] shrink-0" />}
              <ChevronRight className="w-4 h-4 text-[var(--color-ink)]/20 shrink-0" />
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="text-center py-12 text-sm text-[var(--color-ink)]/40">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
            No notifications
          </div>
        )}
      </div>
    </div>
  );
}

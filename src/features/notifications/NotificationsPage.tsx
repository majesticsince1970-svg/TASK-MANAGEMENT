import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bell, Check, CheckCheck, Zap, CheckSquare, Calendar, AlertTriangle } from 'lucide-react';

const NOTIFICATIONS = [
  { id: '1', icon: Zap, title: 'Urgent: Bridal set from locker', body: 'Jelisha needs to bring bridal set immediately', time: '5 min ago', read: false, level: 'urgent' },
  { id: '2', icon: CheckSquare, title: 'Task approved: Gold rate post', body: 'Your submission was approved by Hadi Muhammad', time: '30 min ago', read: false, level: 'info' },
  { id: '3', icon: Calendar, title: 'Reminder: Payments due list', body: 'Due tomorrow at 5:00 PM', time: '1 hour ago', read: true, level: 'reminder' },
  { id: '4', icon: AlertTriangle, title: 'Cash count overdue', body: 'Morning cash & safe count is 40 minutes overdue', time: '2 hours ago', read: true, level: 'alert' },
  { id: '5', icon: CheckSquare, title: 'New task assigned', body: 'Vendor & bank entries — due today 1:00 PM', time: '3 hours ago', read: true, level: 'info' },
];

const levelColors: Record<string, string> = {
  urgent: 'text-[var(--color-urgent)]', alert: 'text-[var(--color-warning)]',
  reminder: 'text-[var(--color-dated)]', info: 'text-[var(--color-ai)]',
};

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="ghost" size="sm"><CheckCheck className="w-4 h-4" /> Mark all read</Button>
      </div>

      <div className="bg-white rounded-xl border border-[#E5DDD3] divide-y divide-[#E5DDD3]">
        {NOTIFICATIONS.map((n) => {
          const Icon = n.icon;
          return (
            <div key={n.id} className={cn('flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-ivory)] transition-colors', !n.read && 'bg-[var(--color-maroon)]/[0.02]')}>
              {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--color-maroon)] mt-2 shrink-0" />}
              {n.read && <div className="w-2 shrink-0" />}
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', levelColors[n.level])}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</p>
                <p className="text-xs text-[var(--color-ink)]/50 mt-0.5">{n.body}</p>
              </div>
              <span className="text-xs text-[var(--color-ink)]/30 shrink-0">{n.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


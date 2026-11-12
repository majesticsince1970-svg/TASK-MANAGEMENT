import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnouncements, useAckAnnouncement } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { MessageSquare, Check, Plus, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'announcements' | 'comments';

export default function MessagesPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('announcements');
  const { data: announcements = [], isLoading } = useAnnouncements();
  const ackAnnouncement = useAckAnnouncement();
  const { toast } = useToast();

  const hasAcked = (announcement: any) => {
    return announcement.acks?.some((a: any) => a.user_id === profile?.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.messages')}</h1>
        <Button
          size="sm"
          onClick={() => toast({ title: 'Coming soon', description: 'New Announcement creation is coming soon.', variant: 'info' })}
        >
          <Plus className="w-4 h-4" /> New Announcement
        </Button>
      </div>

      <div className="flex gap-1">
        {[
          { key: 'announcements' as Tab, label: 'Announcements', icon: Megaphone },
          { key: 'comments' as Tab, label: 'Comments', icon: MessageSquare },
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
            <tabItem.icon className="w-4 h-4" /> {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'announcements' && (
        announcements.length === 0 && !isLoading ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements"
            description="Company announcements and notices will appear here."
          />
        ) : (
          <div className="space-y-3">
            {announcements.map((ann: any) => (
              <div key={ann.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{ann.title}</h3>
                  <span className="text-[10px] text-[var(--color-ink)]/30 shrink-0">
                    {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-ink)]/70 mb-3">{ann.body}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-ink)]/30">
                    {ann.acks?.length || 0} read
                  </span>
                  {ann.requires_ack && !hasAcked(ann) ? (
                    <Button size="sm" variant="outline" onClick={() => ackAnnouncement.mutate(ann.id)}>
                      <Check className="w-4 h-4 mr-1" /> I have read this
                    </Button>
                  ) : ann.requires_ack ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Read
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'comments' && (
        <EmptyState
          icon={MessageSquare}
          title="No recent comments"
          description="Task comments will appear here."
        />
      )}
    </div>
  );
}

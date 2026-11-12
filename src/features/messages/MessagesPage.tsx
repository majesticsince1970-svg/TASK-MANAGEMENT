import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Megaphone, Check, Eye } from 'lucide-react';

export default function MessagesPage() {
  const [tab, setTab] = useState<'announcements' | 'comments'>('announcements');

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Messages</h1>

      <div className="flex gap-1">
        <button onClick={() => setTab('announcements')} className={cn('px-4 py-2 text-sm rounded-lg', tab === 'announcements' ? 'bg-[var(--color-maroon)] text-white font-medium' : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]')}>
          <Megaphone className="w-4 h-4 inline mr-1" /> Announcements
        </button>
        <button onClick={() => setTab('comments')} className={cn('px-4 py-2 text-sm rounded-lg', tab === 'comments' ? 'bg-[var(--color-maroon)] text-white font-medium' : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]')}>
          <MessageSquare className="w-4 h-4 inline mr-1" /> Comments
        </button>
      </div>

      {tab === 'announcements' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[#E5DDD3] p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">Diwali Office Timings</h3>
              <span className="text-xs text-[var(--color-ink)]/40">2 hours ago</span>
            </div>
            <p className="text-sm text-[var(--color-ink)]/70 mb-3">The shop will close at 6 PM on Diwali (1 Nov). Regular hours resume on 3 Nov. All staff should complete pending tasks before 5 PM.</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-[var(--color-ink)]/40">
                <Eye className="w-3 h-3" /> 85% read (17/20)
              </div>
              <Button variant="outline" size="sm"><Check className="w-4 h-4" /> I have read this</Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5DDD3] p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">New Packaging Guidelines</h3>
              <span className="text-xs text-[var(--color-ink)]/40">Yesterday</span>
            </div>
            <p className="text-sm text-[var(--color-ink)]/70 mb-3">Please use the new branded boxes for all items above ₹50,000. The old boxes should be used up for smaller items.</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
                <Check className="w-3 h-3" /> You acknowledged this
              </div>
              <span className="text-xs text-[var(--color-ink)]/40">100% read</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'comments' && (
        <div className="bg-white rounded-xl border border-[#E5DDD3] p-6 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-[var(--color-ink)]/20" />
          <p className="text-sm text-[var(--color-ink)]/40">Comments with @mentions will appear here</p>
        </div>
      )}
    </div>
  );
}


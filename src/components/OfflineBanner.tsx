import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw, Check } from 'lucide-react';
import { syncQueue, getQueuedActions } from '@/lib/offline';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const checkQueue = async () => {
      const actions = await getQueuedActions();
      setQueueCount(actions.length);
    };
    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncQueue();
    const actions = await getQueuedActions();
    setQueueCount(actions.length);
    setSyncing(false);
  };

  if (isOnline && queueCount === 0) return null;

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all',
      !isOnline ? 'bg-yellow-500 text-yellow-900' : 'bg-blue-500 text-white'
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          You're offline — changes will sync when connection returns
          {queueCount > 0 && <span className="bg-yellow-600 text-yellow-100 px-2 py-0.5 rounded-full text-xs ml-2">{queueCount} queued</span>}
        </>
      ) : (
        <>
          <Check className="w-4 h-4" />
          Back online!
          {queueCount > 0 && (
            <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs hover:bg-white/30 transition-colors">
              <RefreshCw className={cn('w-3 h-3', syncing && 'animate-spin')} />
              Sync {queueCount} changes
            </button>
          )}
        </>
      )}
    </div>
  );
}


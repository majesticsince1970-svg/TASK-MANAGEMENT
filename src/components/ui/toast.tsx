import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────────── */
type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

/* ── Context ──────────────────────────────────────────────────── */
const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

/* ── Variant styling ──────────────────────────────────────────── */
const variantStyles: Record<ToastVariant, string> = {
  default: 'border-[#E5DDD3] bg-white text-[var(--color-ink)]',
  success:
    'border-[var(--color-success)]/20 bg-[var(--color-success)]/5 text-[var(--color-success)]',
  warning:
    'border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 text-[var(--color-warning)]',
  error:
    'border-[var(--color-urgent)]/20 bg-[var(--color-urgent)]/5 text-[var(--color-urgent)]',
  info: 'border-[var(--color-ai)]/20 bg-[var(--color-ai)]/5 text-[var(--color-ai)]',
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <CheckCircle className="h-4 w-4 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0" />,
  error: <AlertCircle className="h-4 w-4 shrink-0" />,
  info: <Info className="h-4 w-4 shrink-0" />,
};

/* ── Single Toast ─────────────────────────────────────────────── */
interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast: t, onDismiss }) => {
  const variant = t.variant || 'default';

  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg',
        'animate-in slide-in-from-top-2 fade-in-0',
        variantStyles[variant]
      )}
    >
      {variantIcons[variant]}
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{t.title}</p>
        {t.description && (
          <p className="text-xs opacity-80">{t.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

/* ── Provider ─────────────────────────────────────────────────── */
let toastCounter = 0;

export const ToastProvider: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div
            className={cn(
              'fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none',
              className
            )}
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};
ToastProvider.displayName = 'ToastProvider';

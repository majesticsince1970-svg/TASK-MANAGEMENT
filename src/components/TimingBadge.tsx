import * as React from 'react';
import { Zap, Calendar, Mountain, RefreshCw, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimingType } from '@/types/database';

export interface TimingBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  timing: TimingType;
  showLabel?: boolean;
}

const timingConfig: Record<
  TimingType,
  { label: string; icon: React.ReactNode; emoji: string; classes: string }
> = {
  urgent: {
    label: 'Urgent',
    icon: <Zap className="h-3.5 w-3.5" />,
    emoji: '⚡',
    classes: 'bg-[var(--color-urgent)]/10 text-[var(--color-urgent)] border-[var(--color-urgent)]/20',
  },
  dated: {
    label: 'Dated',
    icon: <Calendar className="h-3.5 w-3.5" />,
    emoji: '📅',
    classes: 'bg-[var(--color-dated)]/10 text-[var(--color-dated)] border-[var(--color-dated)]/20',
  },
  long: {
    label: 'Long Term',
    icon: <Mountain className="h-3.5 w-3.5" />,
    emoji: '🏔️',
    classes: 'bg-[var(--color-long)]/10 text-[var(--color-long)] border-[var(--color-long)]/20',
  },
  flexible: {
    label: 'Flexible',
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    emoji: '🔄',
    classes: 'bg-[var(--color-flexible)]/10 text-[var(--color-flexible)] border-[var(--color-flexible)]/20',
  },
  repeating: {
    label: 'Repeating',
    icon: <Repeat className="h-3.5 w-3.5" />,
    emoji: '🔁',
    classes: 'bg-[var(--color-repeating)]/10 text-[var(--color-repeating)] border-[var(--color-repeating)]/20',
  },
};

const TimingBadge: React.FC<TimingBadgeProps> = ({
  timing,
  showLabel = true,
  className,
  ...props
}) => {
  const config = timingConfig[timing];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        config.classes,
        className
      )}
      {...props}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
TimingBadge.displayName = 'TimingBadge';

export { TimingBadge };

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AvailabilityStatus } from '@/types/database';

export interface AvailabilityDotProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: AvailabilityStatus;
  size?: 'sm' | 'default' | 'lg';
}

const dotColors: Record<AvailabilityStatus, string> = {
  on_duty: 'bg-[var(--color-success)]',
  on_break: 'bg-yellow-400',
  with_customer: 'bg-blue-500',
  on_leave: 'bg-[var(--color-urgent)]',
  off_shift: 'bg-gray-400',
};

const dotLabels: Record<AvailabilityStatus, string> = {
  on_duty: 'On Duty',
  on_break: 'On Break',
  with_customer: 'With Customer',
  on_leave: 'On Leave',
  off_shift: 'Off Shift',
};

const dotSizes = {
  sm: 'h-2 w-2',
  default: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
} as const;

const AvailabilityDot: React.FC<AvailabilityDotProps> = ({
  status,
  size = 'default',
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-block rounded-full ring-2 ring-white',
        dotColors[status],
        dotSizes[size],
        className
      )}
      aria-label={dotLabels[status]}
      title={dotLabels[status]}
      {...props}
    />
  );
};
AvailabilityDot.displayName = 'AvailabilityDot';

export { AvailabilityDot };

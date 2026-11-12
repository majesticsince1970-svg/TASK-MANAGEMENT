import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/database';

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: TaskStatus;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; classes: string }
> = {
  draft: {
    label: 'Draft',
    classes: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  new: {
    label: 'New',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  seen: {
    label: 'Seen',
    classes: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  blocked: {
    label: 'Blocked',
    classes: 'bg-red-50 text-red-700 border-red-200',
  },
  submitted: {
    label: 'Submitted',
    classes: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  sent_back: {
    label: 'Sent Back',
    classes: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  done: {
    label: 'Done',
    classes: 'bg-green-50 text-green-700 border-green-200',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-100 text-gray-400 border-gray-200 line-through',
  },
};

const StatusPill: React.FC<StatusPillProps> = ({
  status,
  className,
  ...props
}) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.classes,
        className
      )}
      {...props}
    >
      {config.label}
    </span>
  );
};
StatusPill.displayName = 'StatusPill';

export { StatusPill };

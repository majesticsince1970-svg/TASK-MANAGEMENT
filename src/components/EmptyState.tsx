import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 px-6 text-center',
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-maroon)]/5">
          <Icon className="h-8 w-8 text-[var(--color-maroon)]/60" />
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-[var(--color-ink)]">
          {title}
        </h3>
        {description && (
          <p className="max-w-sm text-sm text-[var(--color-flexible)]">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} variant="default" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
};
EmptyState.displayName = 'EmptyState';

export { EmptyState };

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--color-maroon)] text-white',
        secondary:
          'border-[#E5DDD3] bg-[var(--color-ivory)] text-[var(--color-ink)]',
        outline: 'border-current text-[var(--color-ink)]',

        /* Timing types */
        urgent:
          'border-transparent bg-[var(--color-urgent)]/10 text-[var(--color-urgent)]',
        dated:
          'border-transparent bg-[var(--color-dated)]/10 text-[var(--color-dated)]',
        long:
          'border-transparent bg-[var(--color-long)]/10 text-[var(--color-long)]',
        flexible:
          'border-transparent bg-[var(--color-flexible)]/10 text-[var(--color-flexible)]',
        repeating:
          'border-transparent bg-[var(--color-repeating)]/10 text-[var(--color-repeating)]',

        /* Status */
        success:
          'border-transparent bg-[var(--color-success)]/10 text-[var(--color-success)]',
        warning:
          'border-transparent bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
        destructive:
          'border-transparent bg-[var(--color-urgent)]/10 text-[var(--color-urgent)]',
        ai:
          'border-transparent bg-[var(--color-ai)]/10 text-[var(--color-ai)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
};
Badge.displayName = 'Badge';

export { Badge, badgeVariants };

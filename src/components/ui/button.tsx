import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-maroon)] text-white shadow-sm hover:bg-[#611824] focus-visible:ring-[var(--color-maroon)]',
        secondary:
          'bg-[var(--color-ivory)] text-[var(--color-ink)] border border-[#E5DDD3] shadow-sm hover:bg-[#F2ECE3]',
        outline:
          'border border-[var(--color-maroon)] text-[var(--color-maroon)] bg-transparent hover:bg-[var(--color-maroon)]/5',
        ghost:
          'text-[var(--color-ink)] hover:bg-[var(--color-ink)]/5',
        destructive:
          'bg-[var(--color-urgent)] text-white shadow-sm hover:bg-[#A41F1F] focus-visible:ring-[var(--color-urgent)]',
        gold:
          'bg-[var(--color-gold)] text-[var(--color-ink)] shadow-sm hover:bg-[#C49A48] focus-visible:ring-[var(--color-gold)]',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base rounded-xl',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

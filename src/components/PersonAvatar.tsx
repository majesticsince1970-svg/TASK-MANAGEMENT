import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, type AvatarProps } from '@/components/ui/avatar';
import { AvailabilityDot } from '@/components/AvailabilityDot';
import type { AvailabilityStatus } from '@/types/database';

export interface PersonAvatarProps extends AvatarProps {
  availability?: AvailabilityStatus;
}

const dotPositions = {
  sm: '-bottom-0.5 -right-0.5',
  default: '-bottom-0.5 -right-0.5',
  lg: 'bottom-0 right-0',
} as const;

const PersonAvatar = React.forwardRef<HTMLDivElement, PersonAvatarProps>(
  ({ availability, size = 'default', className, ...props }, ref) => {
    return (
      <div className={cn('relative inline-flex', className)}>
        <Avatar ref={ref} size={size} {...props} />
        {availability && (
          <AvailabilityDot
            status={availability}
            size={size === 'lg' ? 'default' : 'sm'}
            className={cn('absolute', dotPositions[size])}
          />
        )}
      </div>
    );
  }
);
PersonAvatar.displayName = 'PersonAvatar';

export { PersonAvatar };

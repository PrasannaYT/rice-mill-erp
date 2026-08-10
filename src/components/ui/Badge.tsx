'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'gold' | 'green' | 'red' | 'blue' | 'slate' | 'orange' | 'outline';

export function Badge({ variant = 'slate', children, className }: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  );
}

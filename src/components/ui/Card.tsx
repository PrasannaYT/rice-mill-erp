'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  hoverable?: boolean;
  accent?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({ className, children, hoverable = false, accent = false, padding = 'md', ...props }: CardProps) {
  const paddingClass = { sm: 'p-4', md: 'p-5', lg: 'p-7', none: '' }[padding];

  return (
    <motion.div
      className={cn(
        'card-brutal',
        paddingClass,
        accent && 'border-l-4 border-l-[var(--gold)]',
        className
      )}
      whileHover={hoverable ? { x: -2, y: -2, boxShadow: '6px 6px 0px var(--border)' } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-4 pb-3 border-b-2 border-[var(--dust)] )]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-display text-base font-bold uppercase tracking-wide', className)} {...props}>
      {children}
    </h3>
  );
}

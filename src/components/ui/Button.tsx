'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';

const buttonVariants = cva('btn appearance-none active:scale-[0.98] active:opacity-80', {
  variants: {
    variant: {
      primary: 'btn-primary',
      dark: 'btn-dark',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
      green: 'btn-green',
    },
    size: {
      sm: 'btn-sm',
      md: 'min-h-[56px] sm:min-h-[48px]',
      lg: 'btn-lg',
      icon: 'btn-icon',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, icon, disabled, onClick, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        whileHover={{ x: -2, y: -2 }}
        whileTap={{ x: 2, y: 2, boxShadow: 'none' }}
        transition={{ duration: 0.1 }}
        onClick={(e) => {
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(10); // Light haptic tap
          }
          if (onClick) {
            onClick(e);
          }
        }}
        {...(props as any)}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

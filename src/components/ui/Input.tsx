'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label-brutal">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            inputMode={props.type === 'number' ? 'decimal' : props.inputMode}
            enterKeyHint={props.type === 'number' ? 'next' : props.enterKeyHint}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId ?? (hint ? `${inputId}-hint` : undefined)}
            className={cn(
              'input-brutal sm:min-h-[48px] min-h-[56px] text-[16px] appearance-none',
              icon && '!pl-12 sm:!pl-10',
              error && 'border-red-500 focus:border-red-500',
              className
            )}
            {...props}
          />
        </div>
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
        )}
        {error && (
          <p
            id={errorId}
            className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1.5"
            role="alert"
          >
            {/* Icon ensures error is not conveyed by colour alone (§4 A11y) */}
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && <label htmlFor={selectId} className="label-brutal">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn('input-brutal sm:min-h-[48px] min-h-[56px] text-[16px] appearance-none cursor-pointer pr-10', className)}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-600 font-semibold">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

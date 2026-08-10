'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[size];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] z-60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet (slides up from bottom on mobile, fades in on desktop) */}
          <motion.div
            className={cn(
              'relative w-full bg-[var(--surface)] border-t-4 sm:border-4 border-[var(--border)] rounded-t-2xl sm:rounded-sm overflow-hidden',
              'sm:shadow-brutal-xl shadow-[0_-8px_20px_rgba(0,0,0,0.2)] transform-gpu will-change-transform',
              sizeClass,
              className
            )}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-5 border-b-2 border-[var(--border)] bg-[var(--charcoal)]">
                <h3 className="text-white font-display font-bold text-base uppercase tracking-wider">{title}</h3>
                <button
                  onClick={onClose}
                  className="text-white/70 hover:text-white transition-colors p-1"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-5 overflow-y-auto max-h-[85vh] sm:max-h-[70vh]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

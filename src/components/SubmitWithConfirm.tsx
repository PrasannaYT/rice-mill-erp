'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

/**
 * SubmitWithConfirm
 *
 * Replaces the native `window.confirm()` call with a branded, accessible
 * modal dialog as required by §3 of the UI/UX manifest (Destructive Actions).
 *
 * How it works:
 *   1. The trigger button intercepts the submit event and opens the modal.
 *   2. On "Yes, Delete" the button's `type` is briefly flipped to `submit`
 *      and clicked, which fires the parent <form>'s server action.
 *   3. The type is immediately restored so subsequent renders are safe.
 *
 * - Keyboard accessible: Escape-equivalent via ×, Tab order is Cancel → Confirm
 * - Minimum 44px touch targets on all interactive elements (§5)
 * - Error/icon pairing not needed here (it's a confirmation, not an error state)
 */
export default function SubmitWithConfirm({
  children,
  confirmMessage = 'This action cannot be undone.',
  confirmTitle = 'Are you sure?',
  className,
}: {
  children: ReactNode;
  confirmMessage?: string;
  confirmTitle?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleTriggerClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setOpen(true);
  }

  function handleConfirm() {
    setOpen(false);
    const form = btnRef.current?.closest('form');
    if (form) {
      form.requestSubmit();
    }
  }

  function handleClose() {
    setOpen(false);
  }

  const modal = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
          />

          {/* Dialog sheet — slides up from bottom on mobile, scales in on desktop */}
          <motion.div
            className="relative w-full max-w-sm bg-[var(--surface)] border-t-4 sm:border-4 border-[var(--border)] rounded-t-2xl sm:rounded-sm overflow-hidden shadow-brutal-xl"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b-2 border-[var(--border)] bg-[var(--charcoal)]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--gold)]" aria-hidden="true" />
                <h2
                  id="confirm-dialog-title"
                  className="text-white font-display font-bold text-base uppercase tracking-wider"
                >
                  {confirmTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-white/70 hover:text-white transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
                aria-label="Cancel and close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p
                id="confirm-dialog-desc"
                className="text-sm text-[var(--muted)] leading-relaxed mb-6"
              >
                {confirmMessage}
              </p>

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {/* Cancel — autoFocus so keyboard users land here first */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-ghost flex-1 min-h-[48px]"
                  autoFocus
                >
                  Cancel
                </button>
                {/* Confirm */}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="btn btn-danger flex-1 min-h-[48px]"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Trigger button — always type="button" to intercept submit */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleTriggerClick}
        className={className ?? 'btn btn-danger btn-sm min-h-[44px] min-w-[44px]'}
      >
        {children}
      </button>

      {/* Render modal in portal to avoid CSS transform container issues */}
      {mounted && createPortal(modal, document.body)}
    </>
  );
}

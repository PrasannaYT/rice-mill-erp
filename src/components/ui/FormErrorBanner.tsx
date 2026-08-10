'use client';

import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FormErrorBanner
 *
 * Renders an inline, branded error message inside a form.
 * Used by FAB modals and any form that calls a server action.
 *
 * §3 Graceful Error Handling: human-readable, dismissible, with icon.
 * §4 A11y: role="alert" announces to screen readers on mount.
 */
export function FormErrorBanner({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          className="flex items-start gap-3 p-3 border-2 border-red-500 bg-red-50 dark:bg-red-950/30"
          style={{ boxShadow: '3px 3px 0px #991b1b' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-700 dark:text-red-400 font-semibold flex-1 leading-snug">
            {message}
          </p>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-red-500 hover:text-red-700 transition-colors p-0.5 shrink-0"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

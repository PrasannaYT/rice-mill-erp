'use client';

import { useState, useCallback } from 'react';

interface UseFormActionResult {
  /** True while the server action is in flight */
  pending: boolean;
  /** Non-null if the last action threw */
  error: string | null;
  /**
   * Wrap a server action for use as a `<form action>` prop.
   * Automatically tracks pending state and surfaces errors.
   */
  wrap: (action: (formData: FormData) => Promise<void> | void) => (formData: FormData) => Promise<void>;
  /** Clear the error (e.g. when the user edits a field) */
  clearError: () => void;
}

/**
 * useFormAction — loading + error state for Server Action forms.
 *
 * Usage:
 *   const { pending, error, wrap } = useFormAction();
 *   <form action={wrap(myServerAction)}>
 *     <Button loading={pending}>Save</Button>
 *     {error && <ErrorBanner message={error} />}
 *   </form>
 */
export function useFormAction(): UseFormActionResult {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const wrap = useCallback(
    (action: (formData: FormData) => Promise<void> | void) =>
      async (formData: FormData) => {
        setPending(true);
        setError(null);
        try {
          await action(formData);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
        } finally {
          setPending(false);
        }
      },
    []
  );

  return { pending, error, wrap, clearError };
}

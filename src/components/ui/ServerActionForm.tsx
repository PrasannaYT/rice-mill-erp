'use client';

import { type ReactNode } from 'react';
import { useFormAction } from '@/hooks/useFormAction';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';

/**
 * ServerActionForm
 *
 * A thin 'use client' wrapper that adds loading + error state to any
 * `<form action={serverAction}>` that lives inside a Server Component.
 *
 * Usage (in a Server Component):
 *   <ServerActionForm action={createFarmerAction} submitLabel="Save Farmer">
 *     <Input ... />
 *   </ServerActionForm>
 *
 * The children are rendered as-is inside the form. A loading spinner
 * automatically appears on the submit button while the action runs,
 * and any thrown error is shown in a FormErrorBanner above the fields.
 */
export function ServerActionForm({
  action,
  children,
  submitLabel = 'Save',
  submitClassName,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<unknown> | void;
  children: ReactNode;
  submitLabel?: string;
  submitClassName?: string;
  onSuccess?: () => void;
}) {
  const { pending, error, wrap, clearError } = useFormAction();

  const handleSubmit = wrap(async (formData: FormData) => {
    await action(formData);
    onSuccess?.();
  });

  return (
    <form action={handleSubmit} className="space-y-5">
      <FormErrorBanner message={error} onDismiss={clearError} />
      {children}
      <button
        type="submit"
        disabled={pending}
        className={
          submitClassName ??
          'btn btn-dark w-full mt-4 min-h-[48px]'
        }
      >
        {pending ? (
          <>
            <span
              className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            Saving...
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}

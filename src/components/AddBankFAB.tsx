'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';
import { useFormAction } from '@/hooks/useFormAction';

export default function AddBankFAB({
  createAction,
}: {
  createAction: (formData: FormData) => Promise<void> | void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { pending, error, wrap, clearError } = useFormAction();

  const handleSubmit = wrap(async (formData: FormData) => {
    await createAction(formData);
    setIsOpen(false);
  });

  function handleOpen() { setIsOpen(true); clearError(); }
  function handleClose() { if (!pending) setIsOpen(false); }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Add bank account"
        className="lg:hidden fixed bottom-24 right-6 z-40 w-14 h-14 bg-[var(--rust)] text-white rounded-full flex items-center justify-center shadow-[4px_4px_0px_#0D0D0B] active:translate-y-[4px] active:shadow-none transition-all"
      >
        <Plus className="w-6 h-6" aria-hidden="true" />
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Add Bank Account">
        <form action={handleSubmit} className="space-y-5 mt-4">
          <FormErrorBanner message={error} onDismiss={clearError} />

          <Input label="Bank Name *" type="text" name="bankName" required placeholder="e.g. State Bank of India" />
          <Input label="Account Number *" type="text" name="accountNumber" required placeholder="e.g. 1234567890" />
          <Input label="IFSC Code" type="text" name="ifscCode" className="uppercase" placeholder="e.g. SBIN0001234" />
          <Input label="Opening Balance (₹)" type="number" step="0.01" name="balance" placeholder="e.g. 500000" />

          <Button type="submit" variant="dark" loading={pending} className="w-full mt-4">
            {pending ? 'Saving...' : 'Save Bank Account'}
          </Button>
        </form>
      </Modal>
    </>
  );
}

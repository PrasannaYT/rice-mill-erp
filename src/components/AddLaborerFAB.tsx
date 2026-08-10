'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';
import { useFormAction } from '@/hooks/useFormAction';

export default function AddLaborerFAB({
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
        aria-label="Add laborer or gang"
        className="lg:hidden fixed bottom-24 right-6 z-40 w-14 h-14 bg-[#7c3aed] text-white rounded-full flex items-center justify-center shadow-[4px_4px_0px_#0D0D0B] active:translate-y-[4px] active:shadow-none transition-all"
      >
        <Plus className="w-6 h-6" aria-hidden="true" />
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Add Laborer/Gang">
        <form action={handleSubmit} className="space-y-5 mt-4">
          <FormErrorBanner message={error} onDismiss={clearError} />

          <Select label="Type *" name="type" required>
            <option value="GANG_BASED">Gang Based (Piece-Rate / Hamali)</option>
            <option value="MONTHLY">Monthly / Salary Worker</option>
          </Select>
          <Input label="Name / Gang Leader *" type="text" name="name" required placeholder="e.g. Ramesh Gang" />
          <Input label="Contact Phone" type="text" name="contact" placeholder="e.g. 9876543210" />
          <Input label="Opening Balance (₹)" type="number" step="0.01" name="balance" placeholder="e.g. 0.00" />

          <Button type="submit" variant="dark" loading={pending} className="w-full mt-4">
            {pending ? 'Saving...' : 'Save Laborer'}
          </Button>
        </form>
      </Modal>
    </>
  );
}

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';
import { useFormAction } from '@/hooks/useFormAction';

export default function AddGodownFAB({
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
        aria-label="Add godown"
        className="lg:hidden fixed bottom-24 right-6 z-40 w-14 h-14 bg-[var(--gold)] text-[var(--ink)] rounded-full flex items-center justify-center shadow-[4px_4px_0px_#0D0D0B] active:translate-y-[4px] active:shadow-none transition-all"
      >
        <Plus className="w-6 h-6" aria-hidden="true" />
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Add Godown">
        <form action={handleSubmit} className="space-y-5 mt-4">
          <FormErrorBanner message={error} onDismiss={clearError} />

          <Input label="Godown Name *" type="text" name="name" required placeholder="e.g. Primary Storage" />
          <Select label="Godown Type *" name="type" required>
            <option value="PADDY">Paddy Storage</option>
            <option value="RICE">Rice / Finished Goods</option>
            <option value="PACKAGING">Packaging Material</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input label="Location" type="text" name="location" placeholder="e.g. Unit 1" />
          <Input label="Capacity (KG)" type="number" step="0.01" name="capacity" placeholder="e.g. 5000" />

          <Button type="submit" variant="dark" loading={pending} className="w-full mt-4">
            {pending ? 'Saving...' : 'Save Godown'}
          </Button>
        </form>
      </Modal>
    </>
  );
}

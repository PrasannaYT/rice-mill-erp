'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';
import { useFormAction } from '@/hooks/useFormAction';

export default function AddFarmerFAB({
  createAction,
  brokers,
}: {
  createAction: (formData: FormData) => Promise<void> | void;
  brokers: { id: string; name: string }[];
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
        aria-label="Add farmer"
        className="lg:hidden fixed bottom-24 right-6 z-40 w-14 h-14 bg-[var(--green)] text-[var(--ink)] rounded-full flex items-center justify-center shadow-[4px_4px_0px_#0D0D0B] active:translate-y-[4px] active:shadow-none transition-all"
      >
        <Plus className="w-6 h-6" aria-hidden="true" />
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Add Farmer">
        <form action={handleSubmit} className="space-y-5 mt-4">
          <FormErrorBanner message={error} onDismiss={clearError} />

          <Input label="Full Name *" type="text" name="name" required placeholder="e.g. Ramesh Kumar" />
          <Select label="Associated Broker *" name="brokerId" required>
            <option value="">Select a Broker...</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Input label="Contact Number" type="text" name="contact" placeholder="e.g. 9876543210" />
          <Input label="Village / Address" type="text" name="village" placeholder="e.g. Guntur" />

          <Button type="submit" variant="dark" loading={pending} className="w-full mt-4">
            {pending ? 'Saving...' : 'Save Farmer'}
          </Button>
        </form>
      </Modal>
    </>
  );
}

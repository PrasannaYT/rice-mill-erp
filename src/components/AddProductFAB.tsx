'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';
import { useFormAction } from '@/hooks/useFormAction';

export default function AddProductFAB({
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
        aria-label="Add product"
        className="lg:hidden fixed bottom-24 right-6 z-40 w-14 h-14 bg-[var(--green)] text-white rounded-full flex items-center justify-center shadow-[4px_4px_0px_#0D0D0B] active:translate-y-[4px] active:shadow-none transition-all"
      >
        <Plus className="w-6 h-6" aria-hidden="true" />
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Add Product">
        <form action={handleSubmit} className="space-y-5 mt-4">
          <FormErrorBanner message={error} onDismiss={clearError} />

          <Input label="Product Name *" type="text" name="name" required placeholder="e.g. Fine Rice 25kg" />

          <Select label="Category *" name="category" required>
            <option value="RAW_MATERIAL">Raw Material (Paddy)</option>
            <option value="FINISHED_GOOD">Finished Good (Rice)</option>
            <option value="BYPRODUCT">Byproduct (Bran/Husk)</option>
            <option value="PACKING_MATERIAL">Packing Material (Gunny/Branded Bags)</option>
          </Select>

          <Select label="Unit of Measure *" name="unit" required>
            <option value="KG">Kilogram (KG)</option>
            <option value="QUINTAL">Quintal</option>
            <option value="TONNE">Tonne</option>
            <option value="BAG">Bag</option>
          </Select>

          <Input label="HSN Code" type="text" name="hsnCode" placeholder="e.g. 1006" />
          <Input label="GST Rate (%)" type="number" step="0.01" name="gstRate" placeholder="e.g. 5.00" />

          <Button type="submit" variant="dark" loading={pending} className="w-full mt-4">
            {pending ? 'Saving...' : 'Save Product'}
          </Button>
        </form>
      </Modal>
    </>
  );
}

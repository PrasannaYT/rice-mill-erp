'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner } from '@/components/ui/FormErrorBanner';
import { useFormAction } from '@/hooks/useFormAction';

export default function AddPersonFAB({
  createAction,
}: {
  createAction: (formData: FormData) => Promise<void>;
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
        aria-label="Add person or company"
        className="lg:hidden fixed bottom-24 right-6 z-40 w-14 h-14 bg-[var(--blue)] text-white rounded-full flex items-center justify-center shadow-[4px_4px_0px_#0D0D0B] active:translate-y-[4px] active:shadow-none transition-all"
      >
        <Plus className="w-6 h-6" aria-hidden="true" />
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Add Person/Company">
        <form action={handleSubmit} className="space-y-5 mt-4">
          <FormErrorBanner message={error} onDismiss={clearError} />

          <Select label="Role *" name="role" required>
            <option value="CUSTOMER">Customer (Sales)</option>
            <option value="SUPPLIER">Paddy Broker (Procurement)</option>
            <option value="BAG_VENDOR">Bag Vendor / Packaging Supplier</option>
            <option value="RICE_MILL">Rice Mill Owner</option>
          </Select>

          <Input label="Company / Name *" type="text" name="name" required placeholder="e.g. Acme Farms" />
          <Input label="Contact Phone" type="text" name="contact" />
          <Input label="GSTIN" type="text" name="gstin" className="uppercase" />

          <div>
            <label htmlFor="person-address" className="label-brutal">Address</label>
            <textarea
              id="person-address"
              name="address"
              rows={2}
              className="w-full p-3 font-bold border-2 border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-[var(--border)] shadow-[2px_2px_0px_#0D0D0B] transition-all"
            />
          </div>

          <Input label="Opening Balance (₹)" type="number" step="0.01" name="balance" placeholder="e.g. 0.00" />

          <Button type="submit" variant="dark" loading={pending} className="w-full mt-4">
            {pending ? 'Saving...' : 'Save Contact'}
          </Button>
        </form>
      </Modal>
    </>
  );
}

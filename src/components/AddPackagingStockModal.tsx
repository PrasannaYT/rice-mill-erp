'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Calculator, Tags, Building2 } from 'lucide-react';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { addPackagingOpeningStockAction } from '@/app/actions/inventory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  godowns: { id: string; name: string; type?: string }[];
  suppliers?: { id: string; name: string }[];
  existingBrandNames?: string[];
}

export default function AddPackagingStockModal({ isOpen, onClose, godowns, suppliers = [], existingBrandNames = [] }: Props) {
  const [brandName, setBrandName] = useState('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [capacityKg, setCapacityKg] = useState('');
  const [quantityBags, setQuantityBags] = useState('');
  const [perBagRate, setPerBagRate] = useState('');
  const [godownId, setGodownId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [hsnCode, setHsnCode] = useState('3923');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedBags = parseFloat(quantityBags) || 0;
  const parsedRate = parseFloat(perBagRate) || 0;
  const totalValue = parsedBags * parsedRate;

  const finalBrandName = brandName === 'NEW' ? customBrandName.trim() : brandName.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!finalBrandName) {
      toast.error('Please specify the Brand or Bag Name');
      return;
    }
    if (!godownId) {
      toast.error('Please select a target Godown');
      return;
    }
    if (parsedBags <= 0 || parseFloat(capacityKg) <= 0 || parsedRate <= 0) {
      toast.error('Bags, Capacity, and Rate must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('brandName', finalBrandName);
      fd.append('capacityKg', capacityKg);
      fd.append('quantityBags', quantityBags);
      fd.append('perBagRate', perBagRate);
      fd.append('godownId', godownId);
      if (supplierId) fd.append('supplierId', supplierId);
      if (hsnCode) fd.append('hsnCode', hsnCode);

      await addPackagingOpeningStockAction(fd);

      toast.success(`Added ${parsedBags.toLocaleString('en-IN')} bags of ${finalBrandName}!`);

      // Reset
      setBrandName('');
      setCustomBrandName('');
      setCapacityKg('');
      setQuantityBags('');
      setPerBagRate('');
      setGodownId('');
      setSupplierId('');
      setHsnCode('3923');

      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add packaging stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-[#111] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-[#1A1A1A]">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#F5A623]" />
                  Add Existing Packaging Stock
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5 font-medium">Record opening balance of empty packaging bags in godowns</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-xl transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
              {/* Brand Selector or Custom Entry */}
              <div className="space-y-3">
                <Select
                  label="Brand / Packaging Name *"
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  required
                >
                  <option value="">Select Brand or Create New...</option>
                  {existingBrandNames.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="NEW">+ Create New Brand Name</option>
                </Select>

                {brandName === 'NEW' && (
                  <Input
                    label="Custom Brand Name *"
                    type="text"
                    value={customBrandName}
                    onChange={e => setCustomBrandName(e.target.value)}
                    placeholder="e.g. ROYAL BASMATI 26KG BAGGING"
                    required
                  />
                )}
              </div>

              {/* Capacity, Quantity, Rate */}
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Bag Capacity (KG) *"
                  type="number"
                  value={capacityKg}
                  onChange={e => setCapacityKg(e.target.value)}
                  placeholder="e.g. 26"
                  required
                  min="0.5"
                  step="0.5"
                />
                <Input
                  label="Total Bags *"
                  type="number"
                  value={quantityBags}
                  onChange={e => setQuantityBags(e.target.value)}
                  placeholder="e.g. 1000"
                  required
                  min="1"
                  step="1"
                />
                <Input
                  label="Rate / Bag (₹) *"
                  type="number"
                  value={perBagRate}
                  onChange={e => setPerBagRate(e.target.value)}
                  placeholder="e.g. 18.50"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              {/* Target Godown & Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Target Storage Godown *"
                  value={godownId}
                  onChange={e => setGodownId(e.target.value)}
                  required
                >
                  <option value="">Select Godown...</option>
                  {godowns.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>

                <Select
                  label="Supplier / Vendor (Optional)"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                >
                  <option value="">Select Supplier (Optional)...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>

              {/* HSN Code */}
              <Input
                label="HSN Code (Optional)"
                type="text"
                value={hsnCode}
                onChange={e => setHsnCode(e.target.value)}
                placeholder="e.g. 3923 or 6305"
              />

              {/* Live Financial Summary */}
              <div className="bg-[#1A1A1A] p-4 rounded-xl border border-neutral-800 flex justify-between items-center">
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider flex items-center gap-1">
                    <Tags className="w-3 h-3 text-[#F5A623]" /> Total Stock Value
                  </label>
                  <p className="font-mono text-xs text-neutral-400 mt-0.5">
                    {parsedBags.toLocaleString('en-IN')} Bags @ ₹{parsedRate.toFixed(2)}/bag
                  </p>
                </div>
                <p className="font-mono text-xl font-black text-[#F5A623]">
                  ₹{totalValue > 0 ? totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 bg-[#F5A623] hover:bg-[#d98e19] text-black font-black uppercase"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Add Packaging Stock'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

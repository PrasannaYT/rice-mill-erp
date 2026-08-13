'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Box, Weight, Calculator } from 'lucide-react';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { addPaddyOpeningStockAction } from '@/app/actions/inventory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paddyProducts: { id: string; name: string }[];
  godowns: { id: string; name: string; type?: string }[];
}

export default function ExistingPaddyStockModal({ isOpen, onClose, paddyProducts, godowns }: Props) {
  const [productId, setProductId] = useState('');
  const [godownId, setGodownId] = useState('');
  const [bags, setBags] = useState('');
  const [kgPerBag, setKgPerBag] = useState('');
  const [ratePerBag, setRatePerBag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedBags = parseFloat(bags) || 0;
  const parsedKgPerBag = parseFloat(kgPerBag) || 0;
  const parsedRatePerBag = parseFloat(ratePerBag) || 0;

  const totalKg = parsedBags * parsedKgPerBag;
  const totalValue = parsedBags * parsedRatePerBag;

  // Filter godowns to only show Paddy godowns
  const paddyGodowns = godowns.filter(g => !g.type || g.type === 'PADDY');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !godownId) {
      toast.error('Please select product and godown');
      return;
    }
    if (parsedBags <= 0 || parsedKgPerBag <= 0 || parsedRatePerBag <= 0) {
      toast.error('Bags, KG per bag, and Rate must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('productId', productId);
      fd.append('godownId', godownId);
      fd.append('numberOfBags', bags);
      fd.append('perBagWeight', kgPerBag);
      fd.append('ratePerBag', ratePerBag);

      await addPaddyOpeningStockAction(fd);
      
      toast.success('Opening stock added successfully!');
      
      // Reset form
      setProductId('');
      setGodownId('');
      setBags('');
      setKgPerBag('');
      setRatePerBag('');
      
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add opening stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
              <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-400" />
                Add Existing Stock
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-xl transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Select label="Paddy Variety *" value={productId} onChange={e => setProductId(e.target.value)} required>
                  <option value="">Select Variety...</option>
                  {paddyProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <Select label="Target Godown *" value={godownId} onChange={e => setGodownId(e.target.value)} required>
                  <option value="">Select Godown...</option>
                  {paddyGodowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input 
                  label="Total Bags *" 
                  type="number" 
                  value={bags} 
                  onChange={e => setBags(e.target.value)}
                  placeholder="e.g. 100"
                  required
                  min="1"
                  step="1"
                />
                <Input 
                  label="KG per Bag *" 
                  type="number" 
                  value={kgPerBag} 
                  onChange={e => setKgPerBag(e.target.value)}
                  placeholder="e.g. 50"
                  required
                  min="0.1"
                  step="0.1"
                />
                <Input 
                  label="Rate / Bag (₹) *" 
                  type="number" 
                  value={ratePerBag} 
                  onChange={e => setRatePerBag(e.target.value)}
                  placeholder="e.g. 1500"
                  required
                  min="1"
                  step="0.01"
                />
              </div>

              {/* Live Calculation Cards */}
              <div className="bg-[#1A1A1A] p-4 rounded-xl border border-neutral-800 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 mb-1">
                    <Weight className="w-3 h-3" /> Total Quantity
                  </label>
                  <p className="font-mono text-xl font-bold text-emerald-400">
                    {totalKg > 0 ? (totalKg / 100).toFixed(2) + ' Qtl' : '0 Qtl'}
                  </p>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">{totalKg.toLocaleString('en-IN')} KG</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 mb-1">
                    <Calculator className="w-3 h-3" /> Total Value
                  </label>
                  <p className="font-mono text-xl font-bold text-[#F5A623]">
                    ₹{totalValue > 0 ? totalValue.toLocaleString('en-IN') : '0'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Stock'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

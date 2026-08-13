'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Factory, X, Plus, Trash2, Sparkles, Scale, RefreshCw, CheckCircle2, AlertCircle, Calculator, Zap, ChevronRight, ArrowLeft } from 'lucide-react';
import { convertPaddyToRiceAction } from '@/app/actions/inventory';
import { motion, AnimatePresence } from 'framer-motion';

interface MilledOutputRow {
  id: string;
  outputType: string;
  bagCapacityKg: string;
  numberOfBags: string;
}

type SavedTemplate = {
  id: string;
  label: string;
  rows: { outputType: string; bagCapacityKg: string; numberOfBags: string }[];
  count: number;
};

interface MillingConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  godowns: Array<{ id: string; name: string; type?: string }>;
  paddyProducts: Array<{ id: string; name: string }>;
  lots: Array<{ id: string; productId: string; godownId: string; currentQuantity: number | string }>;
  initialGodownId?: string;
  initialProductId?: string;
}

const OUTPUT_TYPES = [
  'Fine Rice',
  'Broken Rice',
  'Black Rice',
  'Mixed Rice',
  'Bran',
  'Husk',
  'Raw Rice'
];

const CAPACITY_PRESETS = ['25', '50', '75'];

export default function MillingConversionModal({
  isOpen,
  onClose,
  godowns,
  paddyProducts,
  lots,
  initialGodownId = '',
  initialProductId = ''
}: MillingConversionModalProps) {
  const [sourceGodownId, setSourceGodownId] = useState(initialGodownId);
  const [destinationGodownId, setDestinationGodownId] = useState('');
  const [productId, setProductId] = useState(initialProductId);

  // Wizard Step: 1 = Source Selection, 2 = Output Bags & Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Dynamic Milled Output Rows
  const [outputRows, setOutputRows] = useState<MilledOutputRow[]>([
    { id: '1', outputType: 'Fine Rice', bagCapacityKg: '50', numberOfBags: '' }
  ]);

  // Optional Moisture / Invisible Loss (KG)
  const [moistureLossKg, setMoistureLossKg] = useState('0');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frequentTemplates, setFrequentTemplates] = useState<SavedTemplate[]>([]);

  // Load frequent templates
  useEffect(() => {
    try {
      const stored = localStorage.getItem('milling_quick_templates');
      if (stored) {
        const parsed = JSON.parse(stored) as SavedTemplate[];
        setFrequentTemplates(parsed.sort((a, b) => b.count - a.count).slice(0, 2));
      }
    } catch (e) {}
  }, []);

  // 1. PERSISTENT PADDY GODOWNS: Include all Paddy Godowns
  const paddyGodowns = useMemo(() => {
    return godowns.filter(g => g.type === 'PADDY');
  }, [godowns]);

  // Rice Godowns for Destination
  const riceGodowns = useMemo(() => {
    return godowns.filter(g => g.type === 'RICE');
  }, [godowns]);

  // Sync initial props when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialGodownId) {
        setSourceGodownId(initialGodownId);
      } else if (paddyGodowns.length > 0) {
        setSourceGodownId(paddyGodowns[0].id);
      }
      
      if (!destinationGodownId && riceGodowns.length > 0) {
        setDestinationGodownId(riceGodowns[0].id);
      }
      if (initialProductId) {
        setProductId(initialProductId);
      }
      setCurrentStep(1);
    }
  }, [isOpen, initialGodownId, initialProductId, paddyGodowns]);

  // 2. DYNAMIC PADDY VARIETY DROPDOWN
  const availableVarietiesInGodown = useMemo(() => {
    if (!sourceGodownId) return paddyProducts;
    
    const activeProductIds = Array.from(new Set(
      lots
        .filter(l => l.godownId === sourceGodownId && Number(l.currentQuantity) > 0)
        .map(l => l.productId)
    ));

    const godownProducts = paddyProducts.filter(p => activeProductIds.includes(p.id));
    return godownProducts.length > 0 ? godownProducts : paddyProducts;
  }, [sourceGodownId, lots, paddyProducts]);

  // Auto-select variety
  useEffect(() => {
    if (availableVarietiesInGodown.length > 0) {
      if (!productId || !availableVarietiesInGodown.some(p => p.id === productId)) {
        setProductId(availableVarietiesInGodown[0].id);
      }
    }
  }, [availableVarietiesInGodown, productId]);

  // 3. AVAILABLE STOCK IN GODOWN & VARIETY
  const maxAvailableStock = useMemo(() => {
    if (!sourceGodownId || !productId) return 0;
    return lots
      .filter(l => l.godownId === sourceGodownId && l.productId === productId)
      .reduce((sum, l) => sum + Number(l.currentQuantity), 0);
  }, [sourceGodownId, productId, lots]);

  // Row management
  const addOutputRow = () => {
    setOutputRows([
      ...outputRows,
      { id: Date.now().toString(), outputType: 'Fine Rice', bagCapacityKg: '50', numberOfBags: '' }
    ]);
  };

  const removeOutputRow = (id: string) => {
    setOutputRows(prev => {
      if (prev.length === 1) {
        toast.error('At least one output row is required.');
        return prev;
      }
      return prev.filter(r => r.id !== id);
    });
  };

  const updateOutputRow = (id: string, field: keyof MilledOutputRow, value: string) => {
    setOutputRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const adjustBagsForRow = (id: string, delta: number) => {
    setOutputRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const current = parseFloat(r.numberOfBags) || 0;
      const updated = Math.max(0, current + delta);
      return { ...r, numberOfBags: updated.toString() };
    }));
  };

  // 1-TAP TEMPLATE PRESETS (ZERO TYPING REQUIRED!)
  const applyPresetTemplate = (preset: 'clear') => {
    if (preset === 'clear') {
      setOutputRows([
        { id: '1', outputType: 'Fine Rice', bagCapacityKg: '50', numberOfBags: '' }
      ]);
      toast('Reset all output rows.');
    }
  };

  // REVERSE CALCULATION: Total Milled Outputs + Moisture Loss = Total Paddy Consumed
  const totalMilledOutputsKg = useMemo(() => {
    return outputRows.reduce((sum, row) => {
      const cap = parseFloat(row.bagCapacityKg) || 0;
      const bags = parseFloat(row.numberOfBags) || 0;
      return sum + (cap * bags);
    }, 0);
  }, [outputRows]);

  const lossKg = parseFloat(moistureLossKg) || 0;
  const totalPaddyConsumedKg = totalMilledOutputsKg + lossKg;

  // Validation: Calculated consumption vs Available Stock
  const isConsumptionExceeded = totalPaddyConsumedKg > maxAvailableStock;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceGodownId) return toast.error('Please select a Source Paddy Godown.');
    if (!destinationGodownId) return toast.error('Please select a Destination Rice Godown.');
    if (!productId) return toast.error('Please select a Paddy Variety.');
    if (totalPaddyConsumedKg <= 0) {
      return toast.error('Please enter No. of Bags for at least one output row.');
    }
    if (isConsumptionExceeded) {
      return toast.error(`Calculated consumption (${totalPaddyConsumedKg.toLocaleString('en-IN')} KG) exceeds available stock (${maxAvailableStock.toLocaleString('en-IN')} KG).`);
    }

    // Process output rows
    const validOutputs = outputRows
      .map(r => ({
        outputType: r.outputType,
        bagCapacityKg: parseFloat(r.bagCapacityKg) || 0,
        numberOfBags: parseFloat(r.numberOfBags) || 0,
        quantityKg: (parseFloat(r.bagCapacityKg) || 0) * (parseFloat(r.numberOfBags) || 0)
      }))
      .filter(o => o.quantityKg > 0);

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('sourceGodownId', sourceGodownId);
      formData.append('destinationGodownId', destinationGodownId);
      formData.append('productId', productId);
      formData.append('paddyQuantityKg', totalPaddyConsumedKg.toString());
      formData.append('moistureLossKg', lossKg.toString());
      formData.append('milledOutputs', JSON.stringify(validOutputs));

      await convertPaddyToRiceAction(formData);

      // Save template to localStorage
      try {
        const simplifiedRows = validOutputs.map(r => ({
          outputType: r.outputType,
          bagCapacityKg: r.bagCapacityKg.toString(),
          numberOfBags: r.numberOfBags.toString()
        }));
        const labelStr = simplifiedRows.map(r => `${r.numberOfBags}x${r.bagCapacityKg}kg ${r.outputType}`).join(' + ');

        const stored = localStorage.getItem('milling_quick_templates');
        const templates: SavedTemplate[] = stored ? JSON.parse(stored) : [];
        
        const existingIdx = templates.findIndex(t => {
          if (t.rows.length !== simplifiedRows.length) return false;
          return t.rows.every((row, i) => 
            row.outputType === simplifiedRows[i].outputType && 
            row.bagCapacityKg === simplifiedRows[i].bagCapacityKg && 
            row.numberOfBags === simplifiedRows[i].numberOfBags
          );
        });

        if (existingIdx >= 0) {
          templates[existingIdx].count++;
        } else {
          templates.push({
            id: Date.now().toString(),
            label: labelStr,
            rows: simplifiedRows,
            count: 1
          });
        }
        
        localStorage.setItem('milling_quick_templates', JSON.stringify(templates));
      } catch (e) {}

      toast.success('Milling batch processed! Output bags moved to destination Godown.');
      onClose();
    } catch (err: any) {
      toast.error('Milling batch processing failed: ' + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/90 backdrop-blur-md"
        />

        {/* Mobile Full Bottom Drawer Window */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-2xl bg-[#1A1A1A] border-t-2 sm:border-2 border-[#F5A623] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 text-white font-sans h-[94vh] sm:h-auto sm:max-h-[92vh] flex flex-col"
        >
          {/* Mobile Handle */}
          <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto my-2 block sm:hidden shrink-0" />

          {/* Header */}
          <div className="bg-[#121212] p-4 sm:p-5 border-b border-[#F5A623]/30 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-10 h-10 rounded-xl bg-[#F5A623]/10 border border-[#F5A623] flex items-center justify-center text-[#F5A623] shrink-0">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-base sm:text-lg uppercase tracking-wider text-[#F5A623]">
                  Process Milling Batch
                </h3>
                <p className="text-[11px] text-neutral-400">Step {currentStep} of 2 • Reverse-Calculated Yield</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* STEPPER PROGRESS TABS */}
          <div className="flex border-b border-neutral-800 bg-[#121212]">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex-1 py-2.5 text-xs font-display font-black uppercase tracking-wider text-center transition-colors border-b-2 ${
                currentStep === 1 
                  ? 'border-[#F5A623] text-[#F5A623] bg-[#F5A623]/10' 
                  : 'border-transparent text-neutral-400'
              }`}
            >
              1. Source & Variety
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              className={`flex-1 py-2.5 text-xs font-display font-black uppercase tracking-wider text-center transition-colors border-b-2 ${
                currentStep === 2 
                  ? 'border-[#F5A623] text-[#F5A623] bg-[#F5A623]/10' 
                  : 'border-transparent text-neutral-400'
              }`}
            >
              2. Output Bags ({outputRows.length} Rows)
            </button>
          </div>

          {/* Form Scroll Area */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 pb-28 sm:pb-6">
            
            {/* ========================================================================= */}
            {/* STEP 1: SOURCE SELECTION */}
            {/* ========================================================================= */}
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="p-5 bg-neutral-900 rounded-2xl border border-[#F5A623]/40 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                    <span className="text-xs font-black uppercase tracking-widest text-[#F5A623]">
                      Source Paddy Selection
                    </span>
                    {productId && (
                      <span className="text-xs font-mono font-bold text-[#F5A623]">
                        Stock: {maxAvailableStock.toLocaleString('en-IN')} KG
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Source Godown */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                        Source Paddy Godown *
                      </label>
                      <select
                        value={sourceGodownId}
                        onChange={e => setSourceGodownId(e.target.value)}
                        required
                        className="w-full bg-[#121212] border border-[#F5A623]/40 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-[#F5A623] min-h-[48px]"
                      >
                        <option value="">Select Paddy Godown...</option>
                        {paddyGodowns.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Destination Rice Godown */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                        Destination Rice Godown *
                      </label>
                      <select
                        value={destinationGodownId}
                        onChange={e => setDestinationGodownId(e.target.value)}
                        required
                        className="w-full bg-[#121212] border border-sky-400/40 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-sky-400 min-h-[48px]"
                      >
                        <option value="">Select Rice Godown...</option>
                        {riceGodowns.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Paddy Variety */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                        Paddy Variety *
                      </label>
                      <select
                        value={productId}
                        onChange={e => setProductId(e.target.value)}
                        required
                        disabled={!sourceGodownId}
                        className="w-full bg-[#121212] border border-[#F5A623]/40 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-[#F5A623] disabled:opacity-50 min-h-[48px]"
                      >
                        {!sourceGodownId ? (
                          <option value="">Select Godown First...</option>
                        ) : (
                          availableVarietiesInGodown.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))
                        )}
                      </select>
                      <p className="text-[10px] text-neutral-500 mt-2 font-medium leading-relaxed border-l-2 border-[#F5A623]/50 pl-2">
                        <span className="text-[#F5A623] font-bold">NOTE:</span> The selected variety only applies to Fine Rice and Raw Rice. Other by-products (Broken Rice, Bran, etc.) are mixed generically in the Rice Godown.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!sourceGodownId || !destinationGodownId || !productId}
                  className="w-full py-4 bg-[#F5A623] hover:bg-[#d98e19] text-black font-black uppercase tracking-wider rounded-xl shadow-xl transition-all disabled:opacity-50 min-h-[52px] text-sm flex items-center justify-center gap-2"
                >
                  <span>NEXT: ENTER OUTPUT BAGS</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: OUTPUT BAGS & 1-TAP QUICK PRESETS */}
            {/* ========================================================================= */}
            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                
                {/* 1-TAP TEMPLATE PRESETS BAR */}
                <div className="p-3 bg-[#121212] rounded-2xl border border-[#F5A623]/40 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F5A623] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#F5A623]" /> 1-Tap Quick Yield Templates:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {frequentTemplates.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          setOutputRows(template.rows.map((r, i) => ({ ...r, id: i.toString() })));
                          toast.success(`Loaded ${template.label}`);
                        }}
                        className="px-3 py-1.5 bg-[#F5A623]/20 hover:bg-[#F5A623] text-[#F5A623] hover:text-black border border-[#F5A623]/40 rounded-xl font-bold text-xs transition-all"
                      >
                        ⚡ {template.label}
                      </button>
                    ))}

                    {frequentTemplates.length === 0 && (
                      <span className="text-xs text-neutral-500 italic py-1">Process a batch to save frequent templates!</span>
                    )}

                    <button
                      type="button"
                      onClick={() => applyPresetTemplate('clear')}
                      className="px-3 py-1.5 bg-neutral-800 text-neutral-400 hover:text-white rounded-xl font-bold text-xs ml-auto"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Output Rows */}
                <div className="space-y-4">
                  {outputRows.map((row, idx) => {
                    const cap = parseFloat(row.bagCapacityKg) || 0;
                    const bags = parseFloat(row.numberOfBags) || 0;
                    const calculatedYieldKg = cap * bags;

                    return (
                      <div key={row.id} className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-3">
                        
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                          <span className="text-xs font-black uppercase text-[#F5A623] tracking-wider">
                            Output #{idx + 1}: {row.outputType}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOutputRow(row.id)}
                            className="text-neutral-500 hover:text-red-400 text-xs font-bold uppercase flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* 1. Output Type Select */}
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                              Output Type *
                            </label>
                            <select
                              value={row.outputType}
                              onChange={e => {
                                const newType = e.target.value;
                                updateOutputRow(row.id, 'outputType', newType);
                                if (['Broken Rice', 'Black Rice', 'Mixed Rice', 'Bran', 'Husk'].includes(newType)) {
                                  updateOutputRow(row.id, 'bagCapacityKg', '1');
                                }
                              }}
                              className="w-full bg-[#121212] border border-[#F5A623]/30 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-[#F5A623] min-h-[44px]"
                            >
                              {OUTPUT_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          {['Broken Rice', 'Black Rice', 'Mixed Rice', 'Bran', 'Husk'].includes(row.outputType) ? (
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                                Total Weight (KG) *
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="0"
                                value={row.numberOfBags}
                                onChange={e => updateOutputRow(row.id, 'numberOfBags', e.target.value)}
                                className="w-full bg-[#121212] border border-[#F5A623]/40 rounded-xl p-3 font-mono font-black text-base text-white focus:outline-none focus:border-[#F5A623] min-h-[44px]"
                              />
                            </div>
                          ) : (
                            <div>
                              {/* 2. Bag Capacity (KG) */}
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                  Bag Weight (KG) *
                                </label>
                                <div className="flex gap-1">
                                  {CAPACITY_PRESETS.map(preset => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => updateOutputRow(row.id, 'bagCapacityKg', preset)}
                                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                        row.bagCapacityKg === preset 
                                          ? 'bg-[#F5A623] text-black font-black border-[#F5A623]' 
                                          : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                                      }`}
                                    >
                                      {preset}k
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <input
                                type="number"
                                step="0.1"
                                value={row.bagCapacityKg}
                                onChange={e => updateOutputRow(row.id, 'bagCapacityKg', e.target.value)}
                                className="w-full bg-[#121212] border border-[#F5A623]/30 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-[#F5A623] min-h-[44px]"
                              />
                            </div>
                          )}
                        </div>

                        {/* 3. QUICK INCREMENT CHIPS & NO OF BAGS */}
                        {!['Broken Rice', 'Black Rice', 'Mixed Rice', 'Bran', 'Husk'].includes(row.outputType) && (
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                No. of Bags *
                              </label>
                              {/* 1-TAP QUICK BAG INCREMENT CHIPS */}
                              <div className="flex gap-1">
                                {[10, 50, 100].map(inc => (
                                  <button
                                    key={inc}
                                    type="button"
                                    onClick={() => adjustBagsForRow(row.id, inc)}
                                    className="text-[9px] font-mono px-2 py-0.5 bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30 rounded-lg hover:bg-[#F5A623] hover:text-black font-bold transition-all"
                                  >
                                    +{inc}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => adjustBagsForRow(row.id, -10)}
                                className="w-10 h-[46px] bg-neutral-800 text-white font-black rounded-l-xl border border-neutral-700 active:bg-neutral-700 flex items-center justify-center shrink-0 text-base"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                step="1"
                                placeholder="0"
                                value={row.numberOfBags}
                                onChange={e => updateOutputRow(row.id, 'numberOfBags', e.target.value)}
                                className="w-full bg-[#121212] border border-[#F5A623]/40 p-2.5 text-center font-mono font-black text-base text-white focus:outline-none focus:border-[#F5A623] min-h-[46px]"
                              />
                              <button
                                type="button"
                                onClick={() => adjustBagsForRow(row.id, 10)}
                                className="w-10 h-[46px] bg-neutral-800 text-white font-black rounded-r-xl border border-neutral-700 active:bg-neutral-700 flex items-center justify-center shrink-0 text-base"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Yield Subtotal Badge */}
                        <div className="flex justify-between items-center p-2.5 bg-black/60 rounded-xl border border-neutral-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Output Yield:
                          </span>
                          <span className="font-mono font-black text-xs text-[#F5A623]">
                            {calculatedYieldKg > 0 ? `${calculatedYieldKg.toLocaleString('en-IN')} KG` : '0 KG'}
                          </span>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={addOutputRow}
                  className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-[#F5A623] font-bold text-xs uppercase tracking-wider rounded-xl border border-[#F5A623]/40 flex items-center justify-center gap-2 transition-colors min-h-[48px]"
                >
                  <Plus className="w-4 h-4" /> [+ Add Another Output Row]
                </button>

                {/* REVERSE CONSUMPTION BANNER */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${
                  isConsumptionExceeded 
                    ? 'bg-red-950/40 border-red-500/80 text-red-200' 
                    : 'bg-[#121212] border-[#F5A623] text-white'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">
                        Auto-Calculated Paddy Input
                      </span>
                      <h4 className="font-display font-black text-sm uppercase tracking-wider">
                        TOTAL PADDY CONSUMED
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-black text-2xl block tabular-nums ${
                        isConsumptionExceeded ? 'text-red-400' : 'text-[#F5A623]'
                      }`}>
                        {totalPaddyConsumedKg.toLocaleString('en-IN')} KG
                      </span>
                    </div>
                  </div>

                  {isConsumptionExceeded && (
                    <div className="mt-2 pt-2 border-t border-red-500/40 flex items-center gap-2 text-xs font-bold text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Exceeds available stock (Max: {maxAvailableStock.toLocaleString('en-IN')} KG).</span>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

          </form>

          {/* Sticky Mobile Footer Submit */}
          {currentStep === 2 && (
            <div className="sticky bottom-0 bg-[#121212] p-4 border-t border-neutral-800 shadow-2xl z-30 shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isConsumptionExceeded || totalPaddyConsumedKg <= 0}
                className="w-full bg-[#F5A623] hover:bg-[#d98e19] text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-xl transition-all active:scale-[0.99] disabled:opacity-50 min-h-[52px] text-base flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>PROCESSING MILLING...</span>
                  </>
                ) : (
                  <>
                    <Factory className="w-5 h-5" />
                    <span>[ PROCESS MILLING BATCH ]</span>
                  </>
                )}
              </button>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

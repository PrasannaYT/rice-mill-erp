'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Wrench, 
  Trash2, 
  Plus, 
  Scale, 
  IndianRupee, 
  CheckCircle2, 
  X,
  ArrowRight
} from 'lucide-react';
import { addSparePartAction, assignSpareToMillAction, sendToScrapAction, sellBulkScrapAction } from '@/app/actions/spares';

interface SparePart {
  id: string;
  name: string;
  category: string;
  availableQty: number;
  inUseQty: number;
  ratePerUnit: number;
}

interface ScrapEntry {
  id: string;
  sparePartName: string;
  reason: string;
  estimatedWeightKg: number | null;
  createdAt: string;
}

interface SparesScrapTabProps {
  spareParts: SparePart[];
  scrapEntries: ScrapEntry[];
}

export default function SparesScrapTab({ spareParts, scrapEntries }: SparesScrapTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [isSellBulkModalOpen, setIsSellBulkModalOpen] = useState(false);

  const [selectedSpare, setSelectedSpare] = useState<SparePart | null>(null);
  const [scrapSource, setScrapSource] = useState<'AVAILABLE'|'IN_USE'>('AVAILABLE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group same scrap items together for clean accumulation bin view
  const groupedScrapEntries = useMemo(() => {
    if (!scrapEntries || scrapEntries.length === 0) return [];

    const map = new Map<string, {
      sparePartName: string;
      totalCount: number;
      totalWeightKg: number;
      reasons: string[];
      latestDate: string;
      entries: ScrapEntry[];
    }>();

    for (const entry of scrapEntries) {
      const name = entry.sparePartName || 'Scrap Item';
      const existing = map.get(name) || {
        sparePartName: name,
        totalCount: 0,
        totalWeightKg: 0,
        reasons: [],
        latestDate: entry.createdAt,
        entries: []
      };

      existing.totalCount += 1;
      existing.totalWeightKg += (entry.estimatedWeightKg || 0);
      if (entry.reason && !existing.reasons.includes(entry.reason)) {
        existing.reasons.push(entry.reason);
      }
      if (new Date(entry.createdAt).getTime() > new Date(existing.latestDate).getTime()) {
        existing.latestDate = entry.createdAt;
      }
      existing.entries.push(entry);
      map.set(name, existing);
    }

    return Array.from(map.values());
  }, [scrapEntries]);

  const activeSpareParts = useMemo(() => {
    return spareParts.filter(p => p.availableQty > 0 || p.inUseQty > 0);
  }, [spareParts]);
  const totalSparesValue = spareParts.reduce((sum, p) => sum + (p.availableQty * p.ratePerUnit), 0);
  const activeMachineryCount = spareParts.reduce((sum, p) => sum + p.inUseQty, 0);
  const totalScrapWeight = scrapEntries.reduce((sum, e) => sum + (e.estimatedWeightKg || 0), 0);

  // Form Handlers
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addSparePartAction(new FormData(e.currentTarget));
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await assignSpareToMillAction(new FormData(e.currentTarget));
      setIsAssignModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScrapSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sendToScrapAction(new FormData(e.currentTarget));
      setIsScrapModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellScrapSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sellBulkScrapAction(new FormData(e.currentTarget));
      setIsSellBulkModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee size={48} /></div>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Total Spares Value</p>
          <div className="text-2xl font-black text-white">₹{totalSparesValue.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-green-400 mt-1">Available unused inventory</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-neutral-900 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wrench size={48} /></div>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Active Machinery</p>
          <div className="text-2xl font-black text-[#F5A623]">{activeMachineryCount} Nos</div>
          <p className="text-[10px] text-neutral-500 mt-1">Parts currently in-use</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-red-950/20 rounded-2xl p-4 border border-red-500/20 relative overflow-hidden col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500"><Trash2 size={48} /></div>
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Scrap Yard</p>
          <div className="text-2xl font-black text-white">{totalScrapWeight} KG</div>
          <p className="text-[10px] text-red-300 mt-1">{scrapEntries.length} items accumulated</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SPARES LIST */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#F5A623]" />
              Spares Inventory
            </h2>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-neutral-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Spare
            </button>
          </div>

          <div className="space-y-3">
            {activeSpareParts.length === 0 ? (
              <div className="bg-neutral-900 p-8 rounded-2xl border border-white/5 text-center">
                <p className="text-neutral-500 text-sm">No spares in inventory.</p>
              </div>
            ) : (
              activeSpareParts.map(part => (
                <div key={part.id} className="bg-neutral-900 rounded-xl p-4 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-neutral-700 transition-all">
                  <div>
                    <h3 className="font-bold text-white text-base">{part.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1">Category: {part.category} • Rate: ₹{part.ratePerUnit}</p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs font-medium text-neutral-300">Available: {part.availableQty}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-xs font-medium text-neutral-300">In-Use: {part.inUseQty}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    <button
                      disabled={part.availableQty === 0}
                      onClick={() => { setSelectedSpare(part); setIsAssignModalOpen(true); }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-[#F5A623]/10 text-[#F5A623] hover:bg-[#F5A623]/20 disabled:opacity-30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                    >
                      Assign
                    </button>
                    <button
                      disabled={part.availableQty === 0 && part.inUseQty === 0}
                      onClick={() => { setSelectedSpare(part); setIsScrapModalOpen(true); }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                    >
                      Scrap
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SCRAP YARD CARD */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-[#1a110a] rounded-3xl border border-[#F5A623]/30 p-1 flex flex-col h-[calc(100vh-120px)] sm:h-[600px]">
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Scrap Yard</h2>
                  <p className="text-xs text-[#F5A623]">Accumulation Bin</p>
                </div>
              </div>

              <div className="space-y-3">
                {groupedScrapEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-500 text-sm">Scrap bin is empty.</p>
                  </div>
                ) : (
                  groupedScrapEntries.map(group => (
                    <div key={group.sparePartName} className="bg-neutral-900/90 rounded-xl p-3.5 border border-red-500/20 space-y-2 hover:border-red-500/40 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{group.sparePartName}</span>
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-black font-mono rounded-full border border-red-500/30">
                            × {group.totalCount} {group.totalCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        {group.totalWeightKg > 0 && (
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {group.totalWeightKg.toFixed(1)} KG
                          </span>
                        )}
                      </div>

                      {group.reasons.length > 0 && (
                        <div className="text-xs text-neutral-400">
                          <p className="text-xs text-red-300/90 font-medium line-clamp-2">
                            {group.reasons.join(' · ')}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px] text-neutral-500">
                        <span>Latest: {new Date(group.latestDate).toLocaleDateString()}</span>
                        <span className="font-mono">{group.entries.length} scrap {group.entries.length === 1 ? 'log' : 'logs'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-2 mt-auto">
              <button
                disabled={scrapEntries.length === 0}
                onClick={() => setIsSellBulkModalOpen(true)}
                className="w-full py-4 bg-gradient-to-r from-[#F5A623] to-[#e69a1f] hover:from-[#e69a1f] hover:to-[#d98e19] disabled:opacity-50 text-black font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-yellow-900/20 transition-all flex items-center justify-center gap-2"
              >
                <Scale className="w-5 h-5" />
                Weigh & Sell Scrap
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121212] w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-neutral-900">
                <h3 className="font-black text-white uppercase tracking-wider">Add New Spare</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-2 flex gap-3 items-start">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-200">This will automatically push an expense entry to the Cashbook based on Qty × Rate.</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Item Name *</label>
                  <input name="name" required className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#F5A623] outline-none" placeholder="e.g. Elevator Cup" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Category *</label>
                  <input name="category" required className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#F5A623] outline-none" placeholder="e.g. Mechanical" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Qty (Nos) *</label>
                    <input name="quantity" type="number" min="1" required className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#F5A623] outline-none" placeholder="10" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Rate/Unit (₹) *</label>
                    <input name="ratePerUnit" type="number" step="0.01" min="0" required className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#F5A623] outline-none" placeholder="150" />
                  </div>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full py-3.5 bg-[#F5A623] text-black font-black uppercase tracking-wider rounded-xl mt-4 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Add Spare Part'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAssignModalOpen && selectedSpare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121212] w-full max-w-sm rounded-2xl border border-[#F5A623]/30 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-neutral-900">
                <h3 className="font-black text-white uppercase tracking-wider text-sm">Assign to Mill</h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
                <input type="hidden" name="sparePartId" value={selectedSpare.id} />
                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-white">{selectedSpare.name}</p>
                  <p className="text-xs text-[#F5A623] uppercase">Available: {selectedSpare.availableQty} Nos</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Machine/Location *</label>
                  <input name="machineName" required className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#F5A623] outline-none" placeholder="e.g. Hullar 1" />
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full py-3.5 bg-[#F5A623] text-black font-black uppercase tracking-wider rounded-xl mt-4 disabled:opacity-50">
                  {isSubmitting ? 'Assigning...' : 'Mark as In-Use'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isScrapModalOpen && selectedSpare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121212] w-full max-w-sm rounded-2xl border border-red-500/30 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-neutral-900">
                <h3 className="font-black text-white uppercase tracking-wider text-sm">Send to Scrap</h3>
                <button onClick={() => setIsScrapModalOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleScrapSubmit} className="p-6 space-y-4">
                <input type="hidden" name="sparePartId" value={selectedSpare.id} />
                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-white">{selectedSpare.name}</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Source of Scrap *</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setScrapSource('AVAILABLE')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border ${scrapSource === 'AVAILABLE' ? 'bg-[#F5A623] text-black border-[#F5A623]' : 'bg-black text-neutral-400 border-white/10'} disabled:opacity-30`} disabled={selectedSpare.availableQty < 1}>From Stock</button>
                    <button type="button" onClick={() => setScrapSource('IN_USE')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border ${scrapSource === 'IN_USE' ? 'bg-[#F5A623] text-black border-[#F5A623]' : 'bg-black text-neutral-400 border-white/10'} disabled:opacity-30`} disabled={selectedSpare.inUseQty < 1}>From Machine</button>
                  </div>
                  <input type="hidden" name="source" value={scrapSource} />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold uppercase text-neutral-400">Number of Items *</label>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      Max: {scrapSource === 'AVAILABLE' ? selectedSpare.availableQty : selectedSpare.inUseQty}
                    </span>
                  </div>
                  <input 
                    name="quantity" 
                    type="number" 
                    min="1" 
                    max={scrapSource === 'AVAILABLE' ? selectedSpare.availableQty : selectedSpare.inUseQty}
                    defaultValue="1" 
                    required 
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none font-mono" 
                    placeholder="Enter quantity to scrap" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Reason *</label>
                  <input name="reason" required className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none" placeholder="e.g. Burnt out, worn out" />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Estimated Weight (KG) <span className="text-neutral-600 font-normal ml-1">(Optional)</span></label>
                  <input name="estimatedWeightKg" type="number" step="0.1" className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none" placeholder="e.g. 5.5" />
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full py-3.5 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase tracking-wider rounded-xl mt-4 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Tossing to Scrap...' : 'Toss in Scrap Bin'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isSellBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121212] w-full max-w-md rounded-2xl border border-green-500/30 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-neutral-900">
                <h3 className="font-black text-white uppercase tracking-wider">Sell Bulk Scrap</h3>
                <button onClick={() => setIsSellBulkModalOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSellScrapSubmit} className="p-6 space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4 text-center">
                  <p className="text-sm font-bold text-green-400">Clearing {scrapEntries.length} items from Scrap Yard</p>
                  <p className="text-xs text-green-200/70 mt-1">This creates a Cashbook receipt and resets the bin to zero.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Final Weight (KG) *</label>
                    <input name="weightSold" type="number" step="0.01" min="0.01" required className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-green-500 outline-none" placeholder="e.g. 540" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400 mb-1 block">Rate/KG (₹) *</label>
                    <input name="ratePerKg" type="number" step="0.01" min="0.01" required className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-green-500 outline-none" placeholder="e.g. 30" />
                  </div>
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl mt-4 disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : 'Confirm Sale & Log Income'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}

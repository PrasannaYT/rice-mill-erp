'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, Plus, X, CreditCard, Banknote, History, UserPlus, ChevronRight, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { recordWageAction, getLaborerHistoryAction, issueAdvanceAction, settleLaborerPaymentAction } from '@/app/actions/payroll';
import { createLaborerAction } from '@/app/actions/masterData';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

type Laborer = { id: string; name: string; type: string; balance: number | string | { toString(): string } };
type SelectOption = { id: string; bankName?: string; accountNumber?: string };
type HistoryItem = { id: string; date: Date; type: string; desc: string; amount: number };

const TYPE_COLOR: Record<string, string> = {
  HAMALI: 'bg-amber-500/20 text-amber-300 border-amber-700/40',
  DRIVER: 'bg-sky-500/20 text-sky-300 border-sky-700/40',
  OPERATOR: 'bg-purple-500/20 text-purple-300 border-purple-700/40',
  GENERAL: 'bg-neutral-500/20 text-neutral-300 border-neutral-700/40',
};

export default function MobilePayrollDesk({ laborers, banks = [] }: { laborers: Laborer[], banks?: SelectOption[] }) {
  const [localLaborers, setLocalLaborers] = useState(laborers);
  const [activeLaborerId, setActiveLaborerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'WAGE' | 'ADVANCE' | 'SETTLE' | 'HISTORY'>('WAGE');

  const [workType, setWorkType] = useState('');
  const [totalWageFlat, setTotalWageFlat] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isAddingLaborer, setIsAddingLaborer] = useState(false);
  const [newLaborerName, setNewLaborerName] = useState('');
  const [newLaborerType, setNewLaborerType] = useState('HAMALI');
  const [newLaborerContact, setNewLaborerContact] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeLaborerId && activeTab === 'HISTORY') {
      setIsLoadingHistory(true);
      getLaborerHistoryAction(activeLaborerId).then(data => {
        setHistory(data);
        setIsLoadingHistory(false);
      });
    }
  }, [activeLaborerId, activeTab]);

  const activeLaborer = localLaborers.find(l => l.id === activeLaborerId);
  const calculatedTotal = useMemo(() => Number(totalWageFlat) || 0, [totalWageFlat]);

  const resetForms = () => {
    setTotalWageFlat(''); setWorkType(''); setAmount(''); setDescription(''); setSelectedBankId('');
  };

  const handleWageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedTotal <= 0) { toast.error("Total wage must be greater than zero."); return; }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('laborerId', activeLaborerId!);
      if (workType) fd.append('workType', workType);
      fd.append('totalWage', totalWageFlat);
      await recordWageAction(fd);
      toast.success('Wage recorded successfully!');
      window.location.reload();
    } catch (error) {
      toast.error('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsSubmitting(false);
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('laborerId', activeLaborerId!); fd.append('amount', amount); fd.append('description', description);
      if (selectedBankId) fd.append('bankId', selectedBankId);
      await issueAdvanceAction(fd);
      toast.success('Advance issued!'); window.location.reload();
    } catch (error) { toast.error('Error: ' + (error instanceof Error ? error.message : String(error))); setIsSubmitting(false); }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('laborerId', activeLaborerId!); fd.append('amount', amount);
      if (selectedBankId) fd.append('bankId', selectedBankId);
      await settleLaborerPaymentAction(fd);
      toast.success('Payment settled!'); window.location.reload();
    } catch (error) { toast.error('Error: ' + (error instanceof Error ? error.message : String(error))); setIsSubmitting(false); }
  };

  const handleAddLaborer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingLaborer(true);
    try {
      const fd = new FormData();
      fd.append('name', newLaborerName); fd.append('type', newLaborerType);
      if (newLaborerContact) fd.append('contact', newLaborerContact);
      const newLaborer = await createLaborerAction(fd);
      setLocalLaborers(prev => [...prev, { id: newLaborer.id, name: newLaborer.name, type: newLaborerType, balance: 0 }]);
      setActiveLaborerId(newLaborer.id);
      setIsAddSheetOpen(false);
      setNewLaborerName(''); setNewLaborerContact('');
    } catch (error) { toast.error('Error adding laborer: ' + (error instanceof Error ? error.message : String(error))); }
    finally { setIsAddingLaborer(false); }
  };

  const filteredLaborers = localLaborers.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOwed = localLaborers.reduce((s, l) => s + Math.max(0, Number(l.balance)), 0);

  return (
    <div className="w-full pb-32 bg-[#0E0E0E] min-h-screen">

      {/* Top Summary Bar */}
      <div className="px-4 pt-4 pb-3 grid grid-cols-2 gap-3">
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-neutral-500">Total Workers</p>
            <p className="font-mono font-black text-lg text-white">{localLaborers.length}</p>
          </div>
        </div>
        <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-xl">
            <Wallet className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-neutral-500">Total Owed</p>
            <p className="font-mono font-black text-lg text-red-400">₹{totalOwed.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="flex items-center bg-[#1A1A1A] rounded-2xl px-4 py-3 border border-neutral-800 focus-within:border-[#F5A623] transition-all gap-3">
          <Users className="w-4 h-4 text-neutral-500 shrink-0" />
          <input
            type="text"
            placeholder="Search laborers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm w-full text-white placeholder:text-neutral-600"
          />
        </div>
      </div>

      {/* Laborer Cards */}
      <div className="px-4 space-y-3">
        {filteredLaborers.length === 0 ? (
          <div className="text-center py-16 text-neutral-600">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-black text-sm uppercase tracking-widest">No Laborers Found</p>
          </div>
        ) : (
          filteredLaborers.map(laborer => {
            const bal = Number(laborer.balance);
            return (
              <motion.div
                key={laborer.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => { setActiveLaborerId(laborer.id); setActiveTab('WAGE'); resetForms(); }}
                className={`bg-[#1A1A1A] p-4 rounded-2xl border active:scale-[0.98] transition-all flex items-center gap-4 ${activeLaborerId === laborer.id ? 'border-[#F5A623]' : 'border-neutral-800 hover:border-neutral-700'}`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-[#262626] flex items-center justify-center shrink-0 font-black text-lg text-white">
                  {laborer.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-base truncate">{laborer.name}</p>
                  <span className={`inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${TYPE_COLOR[laborer.type] || TYPE_COLOR.GENERAL}`}>
                    {laborer.type}
                  </span>
                </div>

                {/* Balance */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase font-black text-neutral-500 block mb-0.5">Balance</p>
                  <p className={`font-mono font-black text-base tabular-nums ${bal > 0 ? 'text-red-400' : bal < 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
                    ₹{Math.abs(bal).toFixed(0)}
                  </p>
                  {bal > 0 && <p className="text-[9px] text-red-500 font-black">OWED</p>}
                  {bal < 0 && <p className="text-[9px] text-emerald-500 font-black">PAID ADV</p>}
                </div>

                <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
              </motion.div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setIsAddSheetOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-[#F5A623] text-black rounded-2xl flex items-center justify-center shadow-lg shadow-[#F5A623]/30 border border-black/20 z-30 active:scale-95 transition-transform"
      >
        <UserPlus className="w-6 h-6" />
      </button>

      {/* ADD LABORER BOTTOM SHEET */}
      <AnimatePresence>
        {isAddSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddSheetOpen(false)}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/70 z-[100] backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-[#111111] rounded-t-3xl border-t border-neutral-800 z-[110] p-6 pb-12 shadow-2xl"
            >
              <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-xl uppercase tracking-tight text-white">Add Laborer</h2>
                <button onClick={() => setIsAddSheetOpen(false)} className="p-2 bg-neutral-800 rounded-xl text-neutral-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddLaborer} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Name *</label>
                  <input type="text" required value={newLaborerName} onChange={e => setNewLaborerName(e.target.value)}
                    placeholder="Laborer or Gang Name"
                    className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3.5 text-white font-semibold placeholder:text-neutral-600 focus:outline-none focus:border-[#F5A623] transition-colors" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Type *</label>
                  <select value={newLaborerType} onChange={e => setNewLaborerType(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3.5 text-white font-semibold focus:outline-none focus:border-[#F5A623] transition-colors">
                    <option value="HAMALI">Hamali (Loading/Unloading)</option>
                    <option value="DRIVER">Driver</option>
                    <option value="OPERATOR">Machine Operator</option>
                    <option value="GENERAL">General Laborer</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Contact (Optional)</label>
                  <input type="text" value={newLaborerContact} onChange={e => setNewLaborerContact(e.target.value)}
                    placeholder="Phone Number"
                    className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3.5 text-white font-semibold placeholder:text-neutral-600 focus:outline-none focus:border-[#F5A623] transition-colors" />
                </div>

                <button type="submit" disabled={isAddingLaborer}
                  className="w-full py-4 bg-[#F5A623] text-black font-black text-base uppercase tracking-wider rounded-2xl active:scale-95 transition-transform disabled:opacity-50 mt-2">
                  {isAddingLaborer ? 'Adding...' : '+ Add Laborer'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ACTIVE LABORER BOTTOM SHEET */}
      <AnimatePresence>
        {activeLaborerId && activeLaborer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setActiveLaborerId(null); resetForms(); }}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/70 z-[100] backdrop-blur-sm" />

            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 h-[88vh] flex flex-col bg-[#0E0E0E] rounded-t-3xl border-t border-neutral-800 z-[110] shadow-2xl"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mt-4 mb-2 shrink-0" />

              {/* Sheet Header */}
              <div className="px-5 pb-4 border-b border-neutral-800 shrink-0">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="font-black text-2xl text-white tracking-tight">{activeLaborer.name}</h2>
                    <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border mt-1 ${TYPE_COLOR[activeLaborer.type] || TYPE_COLOR.GENERAL}`}>
                      {activeLaborer.type}
                    </span>
                  </div>
                  <button onClick={() => { setActiveLaborerId(null); resetForms(); }}
                    className="p-2 bg-neutral-800 rounded-xl text-neutral-400 active:bg-neutral-700 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Balance Hero */}
                <div className={`flex items-center justify-between p-3 rounded-2xl border ${Number(activeLaborer.balance) > 0 ? 'bg-red-950/40 border-red-900/50' : 'bg-emerald-950/40 border-emerald-900/50'}`}>
                  <div className="flex items-center gap-2">
                    {Number(activeLaborer.balance) > 0 ? (
                      <TrendingUp className="w-4 h-4 text-red-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ledger Balance</span>
                  </div>
                  <span className={`text-2xl font-mono font-black tabular-nums ${Number(activeLaborer.balance) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ₹{Math.abs(Number(activeLaborer.balance)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-neutral-800 shrink-0 px-2 pt-1">
                {[
                  { id: 'WAGE', label: 'Wage', icon: '💰' },
                  { id: 'ADVANCE', label: 'Advance', icon: '💵' },
                  { id: 'SETTLE', label: 'Settle', icon: '✅' },
                  { id: 'HISTORY', label: 'History', icon: '📋' },
                ].map(tab => (
                  <button key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); resetForms(); }}
                    className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === tab.id ? 'border-[#F5A623] text-[#F5A623]' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}>
                    <span className="mr-1">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 pb-6">

                {/* WAGE TAB */}
                {activeTab === 'WAGE' && (
                  <form onSubmit={handleWageSubmit} className="space-y-5">
                    <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-neutral-800">
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Credit wage to ledger. This will <strong className="text-red-400">increase</strong> the amount you owe this worker.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Work Type (Optional)</label>
                      <input type="text" value={workType} onChange={e => setWorkType(e.target.value)}
                        placeholder="e.g. Unloading Paddy"
                        className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3.5 text-white font-semibold placeholder:text-neutral-600 focus:outline-none focus:border-[#F5A623] transition-colors" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Total Wage (₹) *</label>
                      <input type="number" step="0.01" required value={totalWageFlat} onChange={e => setTotalWageFlat(e.target.value)}
                        placeholder="0.00" inputMode="decimal"
                        className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-4 text-sky-400 font-mono font-black text-3xl tabular-nums placeholder:text-neutral-700 focus:outline-none focus:border-sky-500 transition-colors" />
                    </div>

                    <button type="submit" disabled={isSubmitting || calculatedTotal <= 0}
                      className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-black text-base uppercase tracking-wider rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-sky-500/20">
                      {isSubmitting ? 'Recording...' : `Credit ₹${calculatedTotal.toFixed(2)}`}
                    </button>
                  </form>
                )}

                {/* ADVANCE TAB */}
                {activeTab === 'ADVANCE' && (
                  <form onSubmit={handleAdvanceSubmit} className="space-y-5">
                    <div className="bg-amber-950/30 p-4 rounded-2xl border border-amber-900/40">
                      <p className="text-xs text-amber-200/70 leading-relaxed">
                        Issue a cash advance. This will <strong className="text-amber-300">decrease</strong> the amount you owe this worker.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Advance Amount (₹) *</label>
                      <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder="0.00" inputMode="decimal"
                        className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-4 text-amber-400 font-mono font-black text-3xl tabular-nums placeholder:text-neutral-700 focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Reason *</label>
                      <input type="text" required value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="e.g. Groceries, Festival Advance"
                        className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3.5 text-white font-semibold placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Paid From</label>
                      <select value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3.5 text-white font-semibold focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="">Cash Account</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - ...{b.accountNumber?.slice(-4)}</option>)}
                      </select>
                    </div>

                    <button type="submit" disabled={isSubmitting}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-base uppercase tracking-wider rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                      {isSubmitting ? 'Processing...' : 'Issue Advance'}
                    </button>
                  </form>
                )}

                {/* SETTLE TAB */}
                {activeTab === 'SETTLE' && (
                  <form onSubmit={handleSettleSubmit} className="space-y-5">
                    <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-900/40">
                      <p className="text-xs text-emerald-200/70 leading-relaxed">
                        Pay off outstanding balance. This will <strong className="text-emerald-300">settle</strong> what you owe this worker.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Payment Amount (₹) *</label>
                      <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder="0.00" inputMode="decimal"
                        className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-4 text-emerald-400 font-mono font-black text-3xl tabular-nums placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-2">Source Account</label>
                      <select value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3.5 text-white font-semibold focus:outline-none focus:border-emerald-500 transition-colors">
                        <option value="">Cash Account</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - ...{b.accountNumber?.slice(-4)}</option>)}
                      </select>
                    </div>

                    <button type="submit" disabled={isSubmitting}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base uppercase tracking-wider rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                      {isSubmitting ? 'Processing...' : 'Pay Now'}
                    </button>
                  </form>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'HISTORY' && (
                  <div className="space-y-3 pb-4">
                    {isLoadingHistory ? (
                      <div className="py-12 text-center">
                        <div className="w-8 h-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Loading History...</span>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="py-12 text-center text-neutral-600">
                        <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <span className="text-xs font-bold uppercase">No records found.</span>
                      </div>
                    ) : (
                      history.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3.5 bg-[#1A1A1A] rounded-2xl border border-neutral-800">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.amount > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                              {item.amount > 0 ? (
                                <TrendingUp className="w-4 h-4 text-red-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{item.desc || item.type}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-neutral-500">{new Date(item.date).toLocaleDateString('en-IN')}</span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${item.amount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                  {item.type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className={`font-mono font-black text-base tabular-nums ${item.amount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

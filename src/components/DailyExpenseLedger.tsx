'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Sparkles,
  Settings,
  BookOpen,
  Calendar,
  Wallet
} from 'lucide-react';
import { recordTransactionAction, deleteTransactionAction } from '@/app/actions/accounting';
import { motion, AnimatePresence } from 'framer-motion';

// Known labor names for smart auto-tagging
const DEFAULT_LABOR_NAMES = [
  'raju', 'suresh', 'ramesh', 'kumar', 'mahesh', 
  'vijay', 'ravi', 'babu', 'somu', 'muthu', 
  'gopalan', 'chinnu', 'sharma', 'singh', 'labor', 'labour'
];

interface ExpenseEntry {
  id: string;
  type: string;
  mode?: string;
  amount: string;
  createdAt: string;
  notes?: string;
  expenseCategory?: { id: string; name: string } | null;
  customer?: { name: string } | null;
  supplier?: { name: string } | null;
}

interface DailyExpenseLedgerProps {
  expenseCategories: Array<{ id: string; name: string }>;
  banks: Array<{ id: string; bankName: string; accountNumber: string }>;
  transactions?: ExpenseEntry[];
  laborers?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export default function DailyExpenseLedger({
  expenseCategories: initialCategories = [],
  banks = [],
  transactions: initialTransactions = [],
  laborers = [],
  onSuccess
}: DailyExpenseLedgerProps) {
  const router = useRouter();

  // Selected Month State (Default: Current Year & Month e.g. "2026-08")
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // Form State
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [particulars, setParticulars] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [mode, setMode] = useState<'CASH' | 'BANK' | 'UPI'>('CASH');
  const [bankId, setBankId] = useState('');
  
  // Smart Feature & Category Editing State
  const [isAutoTagged, setIsAutoTagged] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState(() => {
    // Combine props categories with defaults
    const propCats = initialCategories.map(c => c.name);
    const defaults = ['Labor Expenses', 'Fuel & Diesel', 'Tea & Snacks', 'Maintenance & Repairs', 'Electricity', 'Transport', 'General'];
    const merged = Array.from(new Set([...defaults, ...propCats]));
    return merged.map((name, idx) => ({
      id: initialCategories.find(c => c.name.toLowerCase() === name.toLowerCase())?.id || `cat-${idx}`,
      name
    }));
  });
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile Bottom Sheet state for Add Entry
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Combine labor names list
  const laborNamesList = useMemo(() => {
    const fromProps = laborers.map(l => l.name.toLowerCase());
    return Array.from(new Set([...DEFAULT_LABOR_NAMES, ...fromProps]));
  }, [laborers]);

  // Set default category to "General" or first category
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      const general = categories.find(c => c.name.toLowerCase().includes('general'));
      setCategoryId(general ? general.id : categories[0].id);
    }
  }, [categories, categoryId]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Month Display String
  const monthDisplay = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedYear = currentDate.getFullYear();
  const selectedMonthNum = currentDate.getMonth();

  // Smart Labor Auto-Tagging on Particulars Change
  const handleParticularsChange = (val: string) => {
    setParticulars(val);
    const lowerVal = val.toLowerCase();
    
    // Check if any labor name matches as a word or substring
    const hasLaborName = laborNamesList.some(name => lowerVal.includes(name));
    
    if (hasLaborName) {
      const laborCat = categories.find(c => c.name.toLowerCase().includes('labor') || c.name.toLowerCase().includes('labour'));
      if (laborCat && categoryId !== laborCat.id) {
        setCategoryId(laborCat.id);
        setIsAutoTagged(true);
        // Hide badge after 4 seconds
        setTimeout(() => setIsAutoTagged(false), 4000);
      }
    }
  };

  // Quick Access Category Chip Click
  const handleChipClick = (catId: string) => {
    setCategoryId(catId);
    // On mobile, open bottom sheet
    if (window.innerWidth < 768) {
      setIsMobileSheetOpen(true);
    }
  };

  // Filter transactions for selected month (showing PAYMENT / EXPENSE transactions)
  const monthTransactions = useMemo(() => {
    return initialTransactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonthNum && tx.type === 'PAYMENT';
    });
  }, [initialTransactions, selectedYear, selectedMonthNum]);

  // Calculate monthly total
  const monthlyTotal = useMemo(() => {
    return monthTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [monthTransactions]);

  // Group transactions by date for the Notebook Ledger View
  const groupedTransactions = useMemo(() => {
    const groups: { [dateStr: string]: ExpenseEntry[] } = {};
    
    // Sort descending by creation time
    const sorted = [...monthTransactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    sorted.forEach(tx => {
      const d = new Date(tx.createdAt);
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', weekday: 'short' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });

    return groups;
  }, [monthTransactions]);

  // Handle Recording New Expense
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid expense amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find(c => c.id === categoryId);
      const formData = new FormData();
      formData.append('type', 'PAYMENT');
      formData.append('mode', mode);
      formData.append('amount', amount);
      if (particulars) formData.append('notes', particulars);
      
      // If valid UUID category ID from backend, attach expenseCategoryId
      if (categoryId && !categoryId.startsWith('cat-')) {
        formData.append('expenseCategoryId', categoryId);
      } else if (selectedCat) {
        // Dynamic category: pass the name so the server action can find or create it
        formData.append('expenseCategoryName', selectedCat.name);
      }

      if ((mode === 'BANK' || mode === 'UPI') && bankId) {
        formData.append('bankId', bankId);
      }

      await recordTransactionAction(formData);
      toast.success('Expense recorded successfully!');
      
      // Reset form
      setParticulars('');
      setAmount('');
      setIsMobileSheetOpen(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Failed to record expense: ' + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Deleting Transaction
  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;

    try {
      const formData = new FormData();
      formData.append('transactionId', id);
      await deleteTransactionAction(formData);
      toast.success('Expense entry deleted.');
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to delete expense: ' + (err?.message || String(err)));
    }
  };

  // Add Custom Category
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim();
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already exists.');
      return;
    }
    const newCat = { id: `cat-custom-${Date.now()}`, name };
    setCategories(prev => [...prev, newCat]);
    setNewCatName('');
    toast.success(`Category "${name}" added!`);
  };

  // Remove Category
  const handleRemoveCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.success('Category removed.');
  };

  return (
    <div className="w-full bg-[#121212] text-white rounded-2xl border border-[#F5A623]/30 p-4 sm:p-6 shadow-2xl font-sans space-y-6">
      
      {/* --- SECTION 3: TOP STICKY MONTH SELECTOR --- */}
      <div className="sticky top-[72px] sm:top-0 z-20 bg-[#121212] pt-2 pb-4 border-b border-[#F5A623]/20 space-y-4 shadow-sm">
        <div className="flex items-center justify-between max-w-md mx-auto bg-neutral-900 border border-[#F5A623]/40 rounded-xl p-2 shadow-inner">
          <button 
            type="button"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-[#F5A623]/20 text-[#F5A623] rounded-lg transition-colors active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2 font-display font-black text-lg uppercase tracking-wider text-[#F5A623]">
            <Calendar className="w-5 h-5 text-[#F5A623]" />
            <span>{monthDisplay}</span>
          </div>

          <button 
            type="button"
            onClick={handleNextMonth}
            className="p-2 hover:bg-[#F5A623]/20 text-[#F5A623] rounded-lg transition-colors active:scale-95"
            title="Next Month"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* --- SECTION 3: MONTHLY TOTAL BANNER --- */}
        <div className="bg-[#1A1A1A] border-2 border-[#F5A623] rounded-xl p-4 text-center shadow-lg max-w-md mx-auto">
          <span className="text-xs uppercase font-black tracking-widest text-neutral-400 block mb-1">
            Total Monthly Expenses
          </span>
          <div className="font-mono font-black text-2xl sm:text-3xl text-white tracking-tight">
            <span className="text-[#F5A623] mr-1">₹</span>
            {monthlyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* --- SECTION 4: QUICK ACCESS CATEGORY BAR (HORIZONTAL SCROLL) --- */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
          {categories.map(cat => {
            const isLabor = cat.name.toLowerCase().includes('labor') || cat.name.toLowerCase().includes('labour');
            const isFuel = cat.name.toLowerCase().includes('fuel') || cat.name.toLowerCase().includes('diesel');
            const isSnacks = cat.name.toLowerCase().includes('snack') || cat.name.toLowerCase().includes('tea');
            const isMaint = cat.name.toLowerCase().includes('maint') || cat.name.toLowerCase().includes('repair');
            
            const icon = isLabor ? '🔨' : isFuel ? '⛽' : isSnacks ? '☕' : isMaint ? '🔧' : '📁';
            const isSelected = categoryId === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleChipClick(cat.id)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-md font-black scale-105' 
                    : 'bg-neutral-900 text-neutral-300 border-[#F5A623]/40 hover:border-[#F5A623] hover:text-[#F5A623]'
                }`}
              >
                <span>{icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}

          {/* Edit Categories Chip */}
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="shrink-0 px-3.5 py-2 rounded-full text-xs font-bold bg-neutral-900 text-[#F5A623] border border-[#F5A623]/50 hover:bg-[#F5A623]/10 transition-all flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>Edit Categories</span>
          </button>
        </div>
      </div>

      {/* --- DESKTOP & MOBILE MAIN CONTAINER --- */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* --- SECTION 6: "ADD EXPENSE" FORM (Desktop 30% / 3 cols) --- */}
        <div className="hidden md:block lg:col-span-4 bg-[#1A1A1A] border border-[#F5A623]/40 rounded-xl p-5 space-y-5 h-fit shadow-xl">
          <div className="flex items-center justify-between border-b border-[#F5A623]/20 pb-3">
            <h3 className="font-display font-black text-lg uppercase tracking-wider text-[#F5A623] flex items-center gap-2">
              <Plus className="w-5 h-5" /> Record Expense
            </h3>
          </div>

          <form onSubmit={handleSubmitExpense} className="space-y-4">
            {/* 1. Date */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                required
                className="w-full bg-neutral-900 border border-[#F5A623]/40 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]"
              />
            </div>

            {/* 2. Particulars / Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                Particulars / Description *
              </label>
              <input
                type="text"
                placeholder="e.g. Raju labor charge, Diesel, Tea snacks"
                value={particulars}
                onChange={e => handleParticularsChange(e.target.value)}
                required
                className="w-full bg-neutral-900 border border-[#F5A623]/40 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]"
              />
            </div>

            {/* 3. Amount */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="w-full bg-neutral-900 border border-[#F5A623]/40 rounded-lg p-3 font-mono font-bold text-xl text-[#F5A623] focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]"
              />
            </div>

            {/* 4. Category Dropdown with Smart Auto-Tagging Indicator */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Category *
                </label>
                {isAutoTagged && (
                  <span className="text-[10px] font-black uppercase text-[#F5A623] flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3" /> ✨ Auto-tagged
                  </span>
                )}
              </div>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className={`w-full bg-neutral-900 border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#F5A623] transition-colors ${
                  isAutoTagged ? 'border-[#F5A623] ring-2 ring-[#F5A623]/40' : 'border-[#F5A623]/40'
                }`}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Payment Mode */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'BANK', 'UPI'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-colors border ${
                      mode === m
                        ? 'bg-[#F5A623] text-black border-[#F5A623]'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-[#F5A623]/50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank selector if Bank or UPI */}
            {(mode === 'BANK' || mode === 'UPI') && banks.length > 0 && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Select Bank Account
                </label>
                <select
                  value={bankId}
                  onChange={e => setBankId(e.target.value)}
                  className="w-full bg-neutral-900 border border-[#F5A623]/40 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#F5A623]"
                >
                  <option value="">Select Bank...</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} (...{b.accountNumber.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#F5A623] hover:bg-[#d98e19] text-black font-black uppercase tracking-wider py-4 rounded-lg shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 min-h-[48px]"
            >
              {isSubmitting ? 'RECORDING...' : '[ RECORD EXPENSE ]'}
            </button>
          </form>
        </div>

        {/* --- SECTION 5: "NOTEBOOK" LEDGER VIEW (Desktop 70% / 7 cols, Mobile Full) --- */}
        <div className="lg:col-span-6 space-y-4 pb-28 sm:pb-8">
          <div className="flex items-center justify-between border-b border-[#F5A623]/30 pb-3">
            <h3 className="font-display font-black text-lg uppercase tracking-wider text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#F5A623]" /> Daily Ledger Notebook
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              {monthTransactions.length} entry(ies)
            </span>
          </div>

          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A1A] rounded-xl border border-dashed border-neutral-800 text-neutral-500 p-6 space-y-2">
              <Wallet className="w-12 h-12 text-[#F5A623]/40 mx-auto" />
              <p className="font-bold text-white uppercase text-sm tracking-wider">No Expenses Recorded</p>
              <p className="text-xs text-neutral-400">No daily expense entries recorded for {monthDisplay}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTransactions).map(([dateStr, entries]) => (
                <div key={dateStr} className="space-y-2">
                  {/* Sticky Date Header in Golden Text */}
                  <div className="sticky top-[270px] sm:top-28 z-10 bg-[#121212] border-b border-[#F5A623]/40 pb-1.5 pt-2 flex items-center justify-between">
                    <span className="font-display font-black text-xs uppercase tracking-widest text-[#F5A623] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F5A623]"></span>
                      {dateStr}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-neutral-400">
                      Day Total: ₹{entries.reduce((s, e) => s + Number(e.amount), 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Notebook Rows with min-h-[44px] touch target */}
                  <div className="bg-[#1A1A1A] rounded-xl border border-[#F5A623]/20 divide-y divide-neutral-800/80 overflow-hidden shadow-md">
                    {entries.map(entry => {
                      const entryTime = new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const catName = entry.expenseCategory?.name || 'General Expense';
                      const descriptionText = entry.notes || 'Daily Expense Entry';

                      return (
                        <div 
                          key={entry.id}
                          className="p-3.5 min-h-[48px] hover:bg-neutral-800/50 transition-colors flex items-center justify-between gap-4 group"
                        >
                          {/* Left Side: Particulars & Category */}
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="font-bold text-sm text-white truncate tracking-tight">
                              {descriptionText}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-[#F5A623] px-2 py-0.5 rounded border border-[#F5A623]/30">
                                {catName}
                              </span>
                              {entry.mode && (
                                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                                  • {entry.mode}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Side: Amount & Time */}
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div>
                              <span className="font-mono font-bold text-base text-red-400 block tabular-nums">
                                - ₹{Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] font-mono text-neutral-500 block">
                                {entryTime}
                              </span>
                            </div>

                            {/* Action Icons */}
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-2 min-h-[44px] min-w-[44px] text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors flex items-center justify-center opacity-80 group-hover:opacity-100"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 4: MOBILE PILL-SHAPED FAB & BOTTOM SHEET FOR ADD EXPENSE --- */}
      <div className="md:hidden">
        {/* Distinct Golden Pill FAB to eliminate confusion with generic '+' button */}
        <button
          type="button"
          onClick={() => setIsMobileSheetOpen(true)}
          className="fixed bottom-24 right-4 sm:right-6 px-5 py-3.5 bg-[#F5A623] hover:bg-[#d98e19] text-black font-display font-black text-sm uppercase tracking-wider rounded-full flex items-center gap-2 shadow-2xl border-2 border-black z-40 active:scale-95 transition-all min-h-[48px]"
          title="Add New Expense"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>ADD EXPENSE</span>
        </button>

        <AnimatePresence>
          {isMobileSheetOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSheetOpen(false)}
                className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/85 z-50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto bg-[#1A1A1A] border-t-4 border-[#F5A623] rounded-t-3xl z-60 p-6 pb-24 space-y-5 transform-gpu will-change-transform"
              >
                <div className="flex justify-between items-center border-b border-[#F5A623]/20 pb-3">
                  <h3 className="font-display font-black text-lg uppercase tracking-wider text-[#F5A623] flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Record New Expense
                  </h3>
                  <button 
                    onClick={() => setIsMobileSheetOpen(false)}
                    className="p-2.5 min-h-[44px] min-w-[44px] text-neutral-400 hover:text-white flex items-center justify-center"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Section 6 Req: Quick Access Chips at Top of Bottom Sheet */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                    Quick Select Category
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
                    {categories.map(cat => {
                      const isLabor = cat.name.toLowerCase().includes('labor') || cat.name.toLowerCase().includes('labour');
                      const isFuel = cat.name.toLowerCase().includes('fuel') || cat.name.toLowerCase().includes('diesel');
                      const isSnacks = cat.name.toLowerCase().includes('snack') || cat.name.toLowerCase().includes('tea');
                      const isMaint = cat.name.toLowerCase().includes('maint') || cat.name.toLowerCase().includes('repair');
                      
                      const icon = isLabor ? '🔨' : isFuel ? '⛽' : isSnacks ? '☕' : isMaint ? '🔧' : '📁';
                      const isSelected = categoryId === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id)}
                          className={`shrink-0 px-3.5 py-2.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 min-h-[44px] ${
                            isSelected 
                              ? 'bg-[#F5A623] text-black border-[#F5A623] font-black scale-105' 
                              : 'bg-neutral-900 text-neutral-300 border-[#F5A623]/40 hover:border-[#F5A623]'
                          }`}
                        >
                          <span>{icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleSubmitExpense} className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Date</label>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={e => setEntryDate(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-[#F5A623]/40 rounded-lg p-3.5 text-sm text-white font-mono focus:outline-none focus:border-[#F5A623] min-h-[48px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Particulars / Description *</label>
                    <input
                      type="text"
                      placeholder="e.g. Raju labor charge, Fuel diesel, Tea snacks"
                      value={particulars}
                      onChange={e => handleParticularsChange(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-[#F5A623]/40 rounded-lg p-3.5 text-sm text-white focus:outline-none focus:border-[#F5A623] min-h-[48px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-[#F5A623]/40 rounded-lg p-3.5 font-mono font-bold text-2xl text-[#F5A623] focus:outline-none focus:border-[#F5A623] min-h-[52px]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Category *</label>
                      {isAutoTagged && (
                        <span className="text-[10px] font-black uppercase text-[#F5A623] flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3" /> ✨ Auto-tagged
                        </span>
                      )}
                    </div>
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      className={`w-full bg-neutral-900 border rounded-lg p-3.5 text-sm text-white focus:outline-none focus:border-[#F5A623] min-h-[48px] ${
                        isAutoTagged ? 'border-[#F5A623] ring-2 ring-[#F5A623]/40' : 'border-[#F5A623]/40'
                      }`}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id} className="bg-neutral-900 text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['CASH', 'BANK', 'UPI'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(m)}
                          className={`py-3 px-3 rounded-lg text-xs font-bold uppercase border min-h-[44px] ${
                            mode === m ? 'bg-[#F5A623] text-black border-[#F5A623]' : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#F5A623] hover:bg-[#d98e19] text-black font-black uppercase tracking-wider py-4 rounded-lg shadow-lg transition-all min-h-[52px] mt-2"
                  >
                    {isSubmitting ? 'RECORDING...' : '[ RECORD EXPENSE ]'}
                  </button>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* --- EDIT CATEGORIES MODAL --- */}
      <AnimatePresence>
        {showCategoryModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryModal(false)}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/80 z-[70] backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1A1A1A] border-2 border-[#F5A623] rounded-2xl z-[80] p-6 space-y-4 shadow-2xl transform-gpu will-change-transform"
            >
              <div className="flex justify-between items-center border-b border-[#F5A623]/30 pb-3">
                <h3 className="font-display font-black text-lg uppercase tracking-wider text-[#F5A623] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#F5A623]" /> Manage Categories
                </h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-neutral-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add Category Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Category Name"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-[#F5A623]/40 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F5A623]"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="bg-[#F5A623] text-black font-bold text-xs uppercase px-4 py-2.5 rounded-lg hover:bg-[#d98e19]"
                >
                  Add
                </button>
              </div>

              {/* Category List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-2.5 bg-neutral-900 rounded-lg border border-neutral-800">
                    <span className="text-sm font-bold text-white">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat.id)}
                      className="text-neutral-500 hover:text-red-400 p-1"
                      title="Remove Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

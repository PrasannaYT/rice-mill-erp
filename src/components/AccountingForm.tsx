'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Landmark, ArrowDownCircle, ArrowUpCircle, Truck, Package, UserCheck, Phone, FileText, Wallet, CheckCircle2, Clock, Tags, RefreshCw, X } from 'lucide-react';
import { recordTransactionAction, confirmProcurementPaymentAction, confirmSalesReceiptAction, confirmPackingItemPaymentAction } from '@/app/actions/accounting';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import ManualJournalForm from '@/components/ManualJournalForm';

type Customer = { id: string; name: string; contact?: string | null; gstin?: string | null; address?: string | null; balance: number | string | { toString(): string } };
type Supplier = { id: string; name: string; contact?: string | null; gstin?: string | null; balance: number | string | { toString(): string } };
type ExpenseCategory = { id: string; name: string };
type Bank = { id: string; bankName: string; accountNumber: string; balance: number | string | { toString(): string } };

export function isProcurementRiceBatch(batch: any): boolean {
  if (!batch) return false;

  // 1. Explicit Paddy signals (Farmer attached, moisture metrics, broker commission)
  if (batch.farmerId || (batch.farmer && batch.farmer.id)) return false;
  if (batch.beforeDryingMoisture != null || batch.dryingShortage != null) return false;
  if (batch.brokerCommissionRate != null || (batch.brokerCommissionTotal != null && Number(batch.brokerCommissionTotal) > 0)) return false;

  const cat = (batch.product?.category || '').toUpperCase();
  if (cat === 'RAW_MATERIAL' || cat === 'PADDY') return false;

  // 2. Explicit Rice signals
  const suppCat = (batch.supplier?.category || '').toUpperCase();
  if (suppCat === 'RICE_MILL' || suppCat === 'RICE_SUPPLIER' || suppCat === 'RICE_VENDOR') return true;
  if (cat.includes('FINISHED') || cat.includes('RICE')) return true;

  const pName = (batch.product?.name || '').toUpperCase();
  if (pName.includes('RICE')) return true;

  const gType = (batch.godown?.type || '').toUpperCase();
  if (gType === 'RICE') return true;

  // 3. Direct Rice Procurement signature: Supplier batch without farmer or paddy broker tag
  if (suppCat !== 'PADDY_BROKER' && !batch.farmerId) return true;

  return false;
}

export type PaymentHistory = { id: string; amount: string; date: string };

export type PendingProcurementBatch = {
  id: string;
  createdAt: string;
  status?: string;
  amountPaid?: string;
  payments?: PaymentHistory[];
  grossWeight: string | number;
  netWeight: string | number | null;
  numberOfBags: string | number | null;
  perBagWeight: string | number | null;
  farmerBagRate: string | number | null;
  farmerTotalPayable: string | number | null;
  brokerCommissionRate: string | number | null;
  brokerCommissionTotal: string | number | null;
  supplier: { id: string; name: string; contact?: string | null; gstin?: string | null };
  farmer?: { id: string; name: string; contact?: string | null; village?: string | null } | null;
  product?: { id: string; name: string } | null;
  godown?: { id: string; name: string } | null;
};

export type PendingPackingItem = {
  id: string;
  brandName: string;
  status?: string;
  amountPaid?: string;
  payments?: PaymentHistory[];
  capacityKg: string | number;
  quantityBags: string | number;
  initialQuantityBags?: string | number;
  perBagRate: string | number;
  createdAt: string;
  godown: { id: string; name: string };
  supplier?: { id: string; name: string; contact?: string | null; gstin?: string | null } | null;
};

export type PendingSalesInvoice = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  status?: string;
  amountPaid?: string;
  payments?: PaymentHistory[];
  subtotal: string | number;
  taxTotal: string | number;
  grandTotal: string | number;
  customer: { id: string; name: string; contact?: string | null; gstin?: string | null; address?: string | null; balance: string | number };
  vehicle?: { id: string; licensePlate: string } | null;
  items: Array<{
    id: string;
    quantity: string | number;
    rate: string | number;
    lineTotal: string | number;
    gstRate: string | number;
    product: { name: string };
    godown: { name: string };
  }>;
};

export default function AccountingForm({ 
  customers, 
  suppliers,
  expenseCategories,
  banks,
  pendingProcurements = [],
  pendingPackingItems = [],
  pendingSales = [],
  transactions = []
}: { 
  customers: Customer[],
  suppliers: Supplier[],
  expenseCategories: ExpenseCategory[],
  banks: Bank[],
  pendingProcurements?: PendingProcurementBatch[],
  pendingPackingItems?: PendingPackingItem[],
  pendingSales?: PendingSalesInvoice[],
  transactions?: any[]
}) {
  const [activeTab, setActiveTab] = useState<'PROCUREMENT_PAYMENTS' | 'SALES_RECEIPTS' | 'MANUAL_JOURNAL'>('PROCUREMENT_PAYMENTS');

  // State for manual journal form
  const [type, setType] = useState<'RECEIPT' | 'PAYMENT' | 'SELL_ITEM' | 'BUY_ITEM'>('SELL_ITEM');
  const [entityType, setEntityType] = useState<'CUSTOMER' | 'SUPPLIER' | 'EXPENSE'>('CUSTOMER');
  
  const [customerId, setCustomerId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  
  const [mode, setMode] = useState<'CASH' | 'BANK' | 'UPI' | 'CREDIT'>('CASH');
  const [bankId, setBankId] = useState('');
  
  const [amount, setAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  // --- NEW STATES FOR MOBILE UX ---
  const router = useRouter();
  const [activePayment, setActivePayment] = useState<{ id: string; type: 'PADDY' | 'PACKING' | 'SALES'; maxAmount: number; title: string } | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PADDY' | 'RICE' | 'PACKING' | 'SALES'>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredProcurements = pendingProcurements.filter(p => {
    if (skippedIds.includes(p.id)) return false;
    if (queueFilter === 'ALL') return true;
    const isRice = isProcurementRiceBatch(p);
    if (queueFilter === 'RICE') return isRice;
    if (queueFilter === 'PADDY') return !isRice;
    return false;
  });
  const filteredPackingItems = pendingPackingItems.filter(p => !skippedIds.includes(p.id) && (queueFilter === 'ALL' || queueFilter === 'PACKING'));
  const filteredSales = pendingSales.filter(p => !skippedIds.includes(p.id) && (queueFilter === 'ALL' || queueFilter === 'SALES'));

  const totalPendingOutboundCount = filteredProcurements.length + filteredPackingItems.length;

  // Auto-switch entity type based on transaction type for UX
  const handleTypeChange = (newType: 'RECEIPT' | 'PAYMENT' | 'SELL_ITEM' | 'BUY_ITEM') => {
    setType(newType);
    if (newType === 'RECEIPT' || newType === 'SELL_ITEM') setEntityType('CUSTOMER');
    if (newType === 'PAYMENT' || newType === 'BUY_ITEM') setEntityType('SUPPLIER');
    setCustomerId('');
    setSupplierId('');
    setExpenseCategoryId('');
    if (newType === 'RECEIPT' || newType === 'PAYMENT') {
       if (mode === 'CREDIT') setMode('CASH');
       setItemName('');
       setQuantity('');
       setRate('');
    }
  };

  const getOutstandingBalance = () => {
    if (entityType === 'CUSTOMER' && customerId) {
      return Number(customers.find(c => c.id === customerId)?.balance || 0);
    }
    if (entityType === 'SUPPLIER' && supplierId) {
      return Number(suppliers.find(s => s.id === supplierId)?.balance || 0);
    }
    return null;
  };

  const outstanding = getOutstandingBalance();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      if (mode) formData.append('mode', mode);
      formData.append('amount', amount);
      if (referenceNumber) formData.append('referenceNumber', referenceNumber);
      if (notes) formData.append('notes', notes);
      
      if (itemName) formData.append('itemName', itemName);
      if (quantity) formData.append('quantity', quantity);
      if (rate) formData.append('rate', rate);
      
      if (entityType === 'CUSTOMER' && customerId) formData.append('customerId', customerId);
      if (entityType === 'SUPPLIER' && supplierId) formData.append('supplierId', supplierId);
      if (entityType === 'EXPENSE' && expenseCategoryId) formData.append('expenseCategoryId', expenseCategoryId);
      
      if (mode !== 'CREDIT' && (mode === 'BANK' || mode === 'UPI') && bankId) {
        formData.append('bankId', bankId);
      }
      
      await recordTransactionAction(formData);
      toast.success('Transaction recorded successfully!');
      
      setAmount('');
      setReferenceNumber('');
      setNotes('');
    } catch (error) {
      toast.error('Error recording transaction: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-6">
      
      <div className="card-brutal p-0 overflow-hidden bg-[var(--surface-2)]">
        {/* Top Header & Navigation Tabs */}
        <div className="bg-[var(--blue)] p-6 sm:p-10 text-white border-b-2 border-[var(--border)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="font-display font-black text-3xl flex items-center tracking-tight">
                <Landmark className="h-8 w-8 mr-3 text-[var(--gold)]" />
                ACCOUNTING DESK
              </h2>
              <p className="mt-2 text-white/90 text-sm font-medium">
                Review party details, confirm procurement payments & sales receipts, and manage cashbook.
              </p>
            </div>
          </div>

          {/* Action Queues Navigation Bar */}
          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 pt-4 border-t border-white/20 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('PROCUREMENT_PAYMENTS')}
              className={`shrink-0 snap-start px-4 py-3 sm:py-2 font-display font-bold text-sm tracking-wider uppercase border-2 flex items-center transition-all ${activeTab === 'PROCUREMENT_PAYMENTS' ? 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] shadow-[4px_4px_0px_#0D0D0B] -translate-y-1' : 'bg-[var(--charcoal)] text-white border-[var(--charcoal)] hover:bg-[var(--surface)] hover:text-[var(--text)] hover:border-[var(--border)]'}`}
            >
              <ArrowUpCircle className={`w-5 h-5 mr-2 ${activeTab === 'PROCUREMENT_PAYMENTS' ? 'text-[var(--red)]' : 'text-white/70'}`} />
              Procurement Payments
              <span className={`ml-3 px-2 py-0.5 font-black border-2 border-[var(--border)] ${activeTab === 'PROCUREMENT_PAYMENTS' ? 'bg-[var(--red)] text-white' : 'bg-[var(--surface)]/20 text-white border-transparent'}`}>
                {totalPendingOutboundCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SALES_RECEIPTS')}
              className={`shrink-0 snap-start px-4 py-3 sm:py-2 font-display font-bold text-sm tracking-wider uppercase border-2 flex items-center transition-all ${activeTab === 'SALES_RECEIPTS' ? 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] shadow-[4px_4px_0px_#0D0D0B] -translate-y-1' : 'bg-[var(--charcoal)] text-white border-[var(--charcoal)] hover:bg-[var(--surface)] hover:text-[var(--text)] hover:border-[var(--border)]'}`}
            >
              <ArrowDownCircle className={`w-5 h-5 mr-2 ${activeTab === 'SALES_RECEIPTS' ? 'text-[var(--green)]' : 'text-white/70'}`} />
              Sales Receipts
              <span className={`ml-3 px-2 py-0.5 font-black border-2 border-[var(--border)] ${activeTab === 'SALES_RECEIPTS' ? 'bg-[var(--green)] text-[var(--text)]' : 'bg-[var(--surface)]/20 text-white border-transparent'}`}>
                {pendingSales.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MANUAL_JOURNAL')}
              className={`shrink-0 snap-start px-4 py-3 sm:py-2 font-display font-bold text-sm tracking-wider uppercase border-2 flex items-center transition-all ${activeTab === 'MANUAL_JOURNAL' ? 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] shadow-[4px_4px_0px_#0D0D0B] -translate-y-1' : 'bg-[var(--charcoal)] text-white border-[var(--charcoal)] hover:bg-[var(--surface)] hover:text-[var(--text)] hover:border-[var(--border)]'}`}
            >
              <FileText className={`w-5 h-5 mr-2 ${activeTab === 'MANUAL_JOURNAL' ? 'text-[var(--blue)]' : 'text-white/70'}`} />
              Manual Ledger
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 min-h-[500px]">
          
          {/* MOBILE UI/UX: Sync Button & Filter Pills */}
          {activeTab !== 'MANUAL_JOURNAL' && (
            <div className="md:hidden sticky top-[72px] z-20 bg-[var(--surface-2)] -mx-6 -mt-6 px-6 py-4 mb-6 border-b-2 border-[var(--border)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black tracking-widest uppercase text-sm text-[var(--muted)]">Action Queue</h3>
                <button 
                  onClick={() => { setIsSyncing(true); router.refresh(); setTimeout(()=>setIsSyncing(false),1000); }}
                  className="bg-[var(--surface)] text-[var(--text)] border-2 border-[var(--border)] px-3 py-1.5 rounded-full shadow-[2px_2px_0px_#0D0D0B] flex items-center font-bold text-xs active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncing ? 'animate-spin text-[var(--blue)]' : ''}`} />
                  SYNC
                </button>
              </div>
              <div className="flex overflow-x-auto hide-scrollbar snap-x gap-2 pb-2 pr-24">
                {['ALL', 'PADDY', 'RICE', 'PACKING', 'SALES'].map(pill => (
                  <button 
                    key={pill}
                    onClick={() => setQueueFilter(pill as any)}
                    className={`shrink-0 snap-start px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase border-2 transition-all ${queueFilter === pill ? 'bg-[var(--ink)] text-[var(--gold)] border-[var(--ink)] shadow-brutal-sm' : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--surface-2)]'}`}
                  >
                    {pill} 
                    <span className="ml-2 opacity-70">
                      {pill === 'ALL' && `(${totalPendingOutboundCount + filteredSales.length})`}
                      {pill === 'PADDY' && `(${pendingProcurements.filter(p => !skippedIds.includes(p.id) && !isProcurementRiceBatch(p)).length})`}
                      {pill === 'RICE' && `(${pendingProcurements.filter(p => !skippedIds.includes(p.id) && isProcurementRiceBatch(p)).length})`}
                      {pill === 'PACKING' && `(${filteredPackingItems.length})`}
                      {pill === 'SALES' && `(${filteredSales.length})`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* --- TAB 1: PENDING PROCUREMENT OUTBOUND PAYMENTS --- */}
            {activeTab === 'PROCUREMENT_PAYMENTS' && (
              <motion.div 
                key="procurement"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end pb-4 border-b-2 border-[var(--border)]">
                  <h3 className="font-display font-black text-xl text-[var(--text)] flex items-center uppercase tracking-tight">
                    <Clock className="w-6 h-6 mr-3 text-[var(--red)]" /> 
                    Pending Procurements
                  </h3>
                </div>

                {totalPendingOutboundCount === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-[var(--dust)] text-[var(--muted)] bg-[var(--surface-2)] rounded-2xl p-8">
                    <CheckCircle2 className="w-16 h-16 text-[var(--green)] mx-auto mb-4 opacity-75" />
                    <p className="font-display font-black text-2xl uppercase tracking-widest text-[var(--text)]">All Settled</p>
                    <p className="font-medium mt-2 text-sm">No pending payments for paddy, rice or packing bags.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* 1. Paddy Procurement Batches */}
                    {filteredProcurements.map((batch, idx) => {
                      const farmerPayable = Number(batch.farmerTotalPayable || 0);
                      const brokerCommission = Number(batch.brokerCommissionTotal || 0);
                      const totalOutbound = farmerPayable + brokerCommission;
                      const amountPaid = Number(batch.amountPaid || 0);
                      const remaining = Math.max(0, totalOutbound - amountPaid);
                      const percentPaid = totalOutbound > 0 ? Math.min(100, Math.round((amountPaid / totalOutbound) * 100)) : 0;
                      const isExpanded = expandedCardId === batch.id;

                      return (
                        <motion.div 
                          key={batch.id} 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl shadow-brutal-sm overflow-hidden"
                        >
                          {/* Top Card Bar */}
                          <div className="p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  {(() => {
                                    const isRice = isProcurementRiceBatch(batch);
                                    return (
                                      <span className={`font-display font-black text-[10px] ${isRice ? 'bg-sky-600 border-sky-400' : 'bg-[var(--rust)] border-[var(--ink)]'} text-white px-2.5 py-0.5 rounded border uppercase tracking-wider flex items-center`}>
                                        <Truck className="w-3 h-3 mr-1" /> {isRice ? 'RICE' : 'PADDY'}
                                      </span>
                                    );
                                  })()}
                                  <span className="text-xs font-bold text-[var(--muted)] font-mono">
                                    {new Date(batch.createdAt).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-display font-black text-xl text-[var(--text)] tracking-tight">
                                  {batch.farmer?.name || batch.supplier.name}
                                </h4>
                                <p className="text-xs text-[var(--muted)] font-medium mt-1">
                                  {Number(batch.numberOfBags || 0)} bags • {Number(batch.netWeight || batch.grossWeight).toFixed(0)} kg ({batch.product?.name || 'Paddy'})
                                </p>
                              </div>

                              <div className="sm:text-right shrink-0">
                                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block">Remaining Balance</span>
                                <span className="font-display font-black text-2xl text-[var(--red)] tabular-nums block">
                                  ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs text-[var(--muted)] font-bold block mt-0.5">
                                  Total Payable: ₹{totalOutbound.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-black uppercase text-[var(--muted)]">
                                <span>Paid: ₹{amountPaid.toLocaleString('en-IN')} ({percentPaid}%)</span>
                                <span>Due: ₹{remaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="w-full h-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-full overflow-hidden flex">
                                <div style={{ width: `${percentPaid}%` }} className="bg-[var(--green)] h-full transition-all duration-300" />
                                <div style={{ width: `${100 - percentPaid}%` }} className="bg-[var(--red)] h-full transition-all duration-300 opacity-80" />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                onClick={() => {
                                  const isRice = isProcurementRiceBatch(batch);
                                  setActivePayment({
                                    id: batch.id,
                                    type: 'PADDY',
                                    maxAmount: remaining,
                                    title: `${isRice ? 'Rice' : 'Paddy'} Payment – ${batch.farmer?.name || batch.supplier.name}`
                                  });
                                }}
                                className="flex-1 bg-[var(--red)] hover:bg-[#8B2E06] text-white py-3 font-black text-sm shadow-sm min-h-[46px]"
                              >
                                RECORD PAYMENT
                              </Button>

                              <button
                                onClick={() => setExpandedCardId(isExpanded ? null : batch.id)}
                                className="px-4 py-3 border-2 border-[var(--border)] rounded-lg text-xs font-black uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition-colors min-h-[46px]"
                              >
                                {isExpanded ? 'Hide Details' : 'View Details ▾'}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Detailed Breakdown */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]"
                              >
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                  <div className="p-3 bg-[var(--surface)] border border-[var(--dust)] rounded-lg space-y-2">
                                    <div className="flex justify-between border-b border-[var(--dust)] pb-1.5">
                                      <span className="text-[var(--muted)] font-bold">Farmer</span>
                                      <span className="font-black">{batch.farmer?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-[var(--dust)] pb-1.5">
                                      <span className="text-[var(--muted)] font-bold">Broker Supplier</span>
                                      <span className="font-black">{batch.supplier.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)] font-bold">Paddy Variety</span>
                                      <span className="font-black">{batch.product?.name || 'Raw Paddy'}</span>
                                    </div>
                                  </div>

                                  <div className="p-3 bg-[var(--surface)] border border-[var(--dust)] rounded-lg space-y-2">
                                    <div className="flex justify-between border-b border-[var(--dust)] pb-1.5">
                                      <span className="text-[var(--muted)] font-bold">Farmer Payable</span>
                                      <span className="font-black">₹{farmerPayable.toFixed(2)}</span>
                                    </div>
                                    {brokerCommission > 0 && (
                                      <div className="flex justify-between border-b border-[var(--dust)] pb-1.5">
                                        <span className="text-[var(--muted)] font-bold">Broker Commission</span>
                                        <span className="font-black">₹{brokerCommission.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)] font-bold">Godown Location</span>
                                      <span className="font-black text-[var(--blue)]">{batch.godown?.name || 'Main Godown'}</span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}

                    {/* 2. Packaging Material & Bag Procurements */}
                    {filteredPackingItems.map((pkg, idx) => {
                      const bags = Number(pkg.initialQuantityBags || pkg.quantityBags);
                      const rate = Number(pkg.perBagRate);
                      const totalPayable = bags * rate;
                      const amountPaid = Number(pkg.amountPaid || 0);
                      const remaining = Math.max(0, totalPayable - amountPaid);
                      const percentPaid = totalPayable > 0 ? Math.min(100, Math.round((amountPaid / totalPayable) * 100)) : 0;
                      const isExpanded = expandedCardId === pkg.id;

                      return (
                        <motion.div 
                          key={pkg.id} 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (filteredProcurements.length + idx) * 0.05 }}
                          className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl shadow-brutal-sm overflow-hidden"
                        >
                          {/* Top Card Bar */}
                          <div className="p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-display font-black text-[10px] bg-[var(--ink)] text-white px-2.5 py-0.5 rounded border border-[var(--ink)] uppercase tracking-wider flex items-center">
                                    <Package className="w-3 h-3 mr-1 text-[var(--gold)]" /> PACKING
                                  </span>
                                  <span className="text-xs font-bold text-[var(--muted)] font-mono">
                                    {new Date(pkg.createdAt).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-display font-black text-xl text-[var(--text)] tracking-tight">
                                  {pkg.supplier?.name || 'General Vendor'}
                                </h4>
                                <p className="text-xs text-[var(--muted)] font-medium mt-1">
                                  Brand: {pkg.brandName} • {bags.toLocaleString()} bags @ ₹{rate.toFixed(2)} ({pkg.capacityKg}kg)
                                </p>
                              </div>

                              <div className="sm:text-right shrink-0">
                                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block">Remaining Balance</span>
                                <span className="font-display font-black text-2xl text-[var(--red)] tabular-nums block">
                                  ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs text-[var(--muted)] font-bold block mt-0.5">
                                  Total Payable: ₹{totalPayable.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-black uppercase text-[var(--muted)]">
                                <span>Paid: ₹{amountPaid.toLocaleString('en-IN')} ({percentPaid}%)</span>
                                <span>Due: ₹{remaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="w-full h-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-full overflow-hidden flex">
                                <div style={{ width: `${percentPaid}%` }} className="bg-[var(--green)] h-full transition-all duration-300" />
                                <div style={{ width: `${100 - percentPaid}%` }} className="bg-[var(--red)] h-full transition-all duration-300 opacity-80" />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                onClick={() => setActivePayment({
                                  id: pkg.id,
                                  type: 'PACKING',
                                  maxAmount: remaining,
                                  title: `Packing Bags – ${pkg.supplier?.name || 'General Vendor'}`
                                })}
                                className="flex-1 bg-[var(--ink)] hover:bg-black text-white py-3 font-black text-sm shadow-sm min-h-[46px]"
                              >
                                RECORD PAYMENT
                              </Button>

                              <button
                                onClick={() => setExpandedCardId(isExpanded ? null : pkg.id)}
                                className="px-4 py-3 border-2 border-[var(--border)] rounded-lg text-xs font-black uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition-colors min-h-[46px]"
                              >
                                {isExpanded ? 'Hide Details' : 'View Details ▾'}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Detailed Breakdown */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]"
                              >
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                  <div className="p-3 bg-[var(--surface)] border border-[var(--dust)] rounded-lg space-y-2">
                                    <div className="flex justify-between border-b border-[var(--dust)] pb-1.5">
                                      <span className="text-[var(--muted)] font-bold">Vendor Name</span>
                                      <span className="font-black">{pkg.supplier?.name || 'General Vendor'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)] font-bold">Brand Name</span>
                                      <span className="font-black">{pkg.brandName}</span>
                                    </div>
                                  </div>

                                  <div className="p-3 bg-[var(--surface)] border border-[var(--dust)] rounded-lg space-y-2">
                                    <div className="flex justify-between border-b border-[var(--dust)] pb-1.5">
                                      <span className="text-[var(--muted)] font-bold">Capacity & Bags</span>
                                      <span className="font-black">{pkg.capacityKg}kg ({bags.toLocaleString()} bags)</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)] font-bold">Godown Location</span>
                                      <span className="font-black text-[var(--blue)]">{pkg.godown.name}</span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}

                  </div>
                )}
              </motion.div>
            )}

            {/* --- TAB 2: PENDING SALES INBOUND RECEIPTS --- */}
            {activeTab === 'SALES_RECEIPTS' && (
              <motion.div 
                key="sales"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end pb-4 border-b-2 border-[var(--border)]">
                  <h3 className="font-display font-black text-xl text-[var(--text)] flex items-center uppercase tracking-tight">
                    <Clock className="w-6 h-6 mr-3 text-[var(--green)]" /> 
                    Pending Sales Invoices
                  </h3>
                </div>

                {pendingSales.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-[var(--dust)] text-[var(--muted)] bg-[var(--surface-2)] rounded-2xl p-8">
                    <CheckCircle2 className="w-16 h-16 text-[var(--green)] mx-auto mb-4 opacity-75" />
                    <p className="font-display font-black text-2xl uppercase tracking-widest text-[var(--text)]">All Received</p>
                    <p className="font-medium mt-2 text-sm">No pending sales invoices awaiting receipt.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredSales.map((invoice, idx) => {
                      const grandTotal = Number(invoice.grandTotal);
                      const amountPaid = Number(invoice.amountPaid || 0);
                      const remaining = Math.max(0, grandTotal - amountPaid);
                      const percentPaid = grandTotal > 0 ? Math.min(100, Math.round((amountPaid / grandTotal) * 100)) : 0;
                      const isExpanded = expandedCardId === invoice.id;

                      return (
                        <motion.div 
                          key={invoice.id} 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl shadow-brutal-sm overflow-hidden"
                        >
                          {/* Top Card Bar */}
                          <div className="p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-display font-black text-[10px] bg-[var(--green)] text-[var(--text)] px-2.5 py-0.5 rounded border border-[var(--border)] uppercase tracking-wider flex items-center">
                                    <FileText className="w-3 h-3 mr-1" /> SALES #{invoice.invoiceNumber}
                                  </span>
                                  <span className="text-xs font-bold text-[var(--muted)] font-mono">
                                    {new Date(invoice.createdAt).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-display font-black text-xl text-[var(--text)] tracking-tight">
                                  {invoice.customer.name}
                                </h4>
                                <p className="text-xs text-[var(--muted)] font-medium mt-1">
                                  Vehicle: {invoice.vehicle?.licensePlate || 'N/A'} • {invoice.items.length} Line item(s)
                                </p>
                              </div>

                              <div className="sm:text-right shrink-0">
                                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block">Remaining Balance</span>
                                <span className="font-display font-black text-2xl text-[var(--green)] tabular-nums block">
                                  ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs text-[var(--muted)] font-bold block mt-0.5">
                                  Total Invoice: ₹{grandTotal.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-black uppercase text-[var(--muted)]">
                                <span>Received: ₹{amountPaid.toLocaleString('en-IN')} ({percentPaid}%)</span>
                                <span>Due: ₹{remaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="w-full h-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-full overflow-hidden flex">
                                <div style={{ width: `${percentPaid}%` }} className="bg-[var(--green)] h-full transition-all duration-300" />
                                <div style={{ width: `${100 - percentPaid}%` }} className="bg-[var(--gold)] h-full transition-all duration-300 opacity-80" />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                onClick={() => setActivePayment({
                                  id: invoice.id,
                                  type: 'SALES',
                                  maxAmount: remaining,
                                  title: `Sales Receipt – ${invoice.customer.name}`
                                })}
                                className="flex-1 bg-[var(--green)] hover:bg-[var(--green-light)] text-[var(--text)] py-3 font-black text-sm shadow-sm min-h-[46px]"
                              >
                                RECORD RECEIPT
                              </Button>

                              <button
                                onClick={() => setExpandedCardId(isExpanded ? null : invoice.id)}
                                className="px-4 py-3 border-2 border-[var(--border)] rounded-lg text-xs font-black uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition-colors min-h-[46px]"
                              >
                                {isExpanded ? 'Hide Details' : 'View Details ▾'}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Detailed Breakdown */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]"
                              >
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                  <div className="p-3 bg-[var(--surface)] border border-[var(--dust)] rounded-lg space-y-2">
                                    <div className="flex justify-between border-b border-[var(--dust)] pb-1.5">
                                      <span className="text-[var(--muted)] font-bold">Customer Name</span>
                                      <span className="font-black">{invoice.customer.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)] font-bold">Vehicle License</span>
                                      <span className="font-black">{invoice.vehicle?.licensePlate || 'N/A'}</span>
                                    </div>
                                  </div>

                                  <div className="p-3 bg-[var(--surface)] border border-[var(--dust)] rounded-lg space-y-2">
                                    <div className="flex justify-between border-b border-[var(--dust)] pb-1.5">
                                      <span className="text-[var(--muted)] font-bold">Subtotal & Tax</span>
                                      <span className="font-black">₹{Number(invoice.subtotal).toFixed(2)} (+₹{Number(invoice.taxTotal).toFixed(2)} GST)</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[var(--muted)] font-bold">Grand Total</span>
                                      <span className="font-black text-[var(--green)]">₹{grandTotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* --- TAB 3: MANUAL LEDGER JOURNAL ENTRY --- */}
            {activeTab === 'MANUAL_JOURNAL' && (
              <motion.div 
                key="manual_journal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-end pb-4 border-b-2 border-[var(--border)]">
                  <h3 className="font-display font-black text-xl text-[var(--text)] flex items-center uppercase tracking-tight">
                    <FileText className="w-6 h-6 mr-3 text-[var(--blue)]" /> 
                    Manual Ledger Entry
                  </h3>
                </div>

                <div className="bg-[var(--surface-2)] p-2 sm:p-4 rounded-xl border-2 border-[var(--border)] shadow-brutal-sm">
                  <ManualJournalForm 
                    customers={customers} 
                    suppliers={suppliers} 
                    expenseCategories={expenseCategories} 
                    banks={banks} 
                    transactions={transactions}
                  />
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

      {/* --- PAYMENT / RECEIPT MODAL (MOBILE & DESKTOP) --- */}
      <AnimatePresence>
        {activePayment && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActivePayment(null)}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-xl md:w-full md:rounded-2xl max-h-[92vh] overflow-y-auto bg-[var(--bg)] rounded-t-3xl border-t-4 md:border-4 border-[var(--border)] z-60 p-6 pb-20 sm:p-8 shadow-2xl transform-gpu will-change-transform"
            >
              <div className="flex justify-between items-center mb-6 border-b-2 border-dashed border-[var(--dust)] pb-4">
                <h2 className="font-black text-xl uppercase tracking-tight flex items-center text-[var(--text)]">
                  Record {activePayment.type === 'SALES' ? 'Receipt' : 'Payment'}
                </h2>
                <button onClick={() => setActivePayment(null)} className="p-2 bg-[var(--surface-2)] rounded-full text-[var(--muted)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-[var(--surface-2)] rounded-xl border-2 border-[var(--border)]">
                <span className="font-bold text-xs uppercase tracking-widest text-[var(--muted)] block mb-1">Target</span>
                <span className="font-black text-lg block">{activePayment.title}</span>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--dust)]">
                  <span className="font-bold text-xs uppercase text-[var(--muted)]">Pending Balance</span>
                  <span className={`font-black text-lg ${activePayment.type === 'SALES' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    ₹{activePayment.maxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <form action={async (formData: FormData) => {
                setSubmittingId(activePayment.id);
                try {
                  if (activePayment.type === 'PADDY') {
                    formData.append('batchId', activePayment.id);
                    await confirmProcurementPaymentAction(formData);
                  } else if (activePayment.type === 'PACKING') {
                    formData.append('packingItemId', activePayment.id);
                    await confirmPackingItemPaymentAction(formData);
                  } else if (activePayment.type === 'SALES') {
                    formData.append('invoiceId', activePayment.id);
                    await confirmSalesReceiptAction(formData);
                  }
                  toast.success(`${activePayment.type === 'SALES' ? 'Receipt' : 'Payment'} Confirmed!`);
                  setActivePayment(null);
                } catch (err) {
                  toast.error('Error confirming: ' + (err instanceof Error ? err.message : String(err)));
                } finally {
                  setSubmittingId(null);
                }
              }} className="space-y-4">
                <Input 
                  label={`Amount (${activePayment.type === 'SALES' ? 'Received' : 'Paid'}) ₹ *`}
                  type="number" step="0.01" name="amount" required max={activePayment.maxAmount} placeholder="e.g. 0.00"
                  className={`${activePayment.type === 'SALES' ? 'text-[var(--green)]' : 'text-[var(--red)]'} font-black text-xl`} 
                />
                <Select label="Payment Mode *" name="mode" required>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank / Cheque</option>
                  <option value="UPI">UPI</option>
                </Select>
                <Select label="Bank Account (if applicable)" name="bankId">
                  <option value="">Select Bank...</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} (...{b.accountNumber.slice(-4)})</option>
                  ))}
                </Select>
                <Input label="Reference No." type="text" name="referenceNumber" placeholder="Cheque / UTR" />
                <div className="pt-3 pb-6">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submittingId === activePayment.id}
                    className={`w-full min-h-[52px] py-4 text-base font-black shadow-brutal-sm ${activePayment.type === 'SALES' ? 'bg-[var(--green)] hover:bg-[var(--green-light)] text-[var(--text)]' : 'bg-[var(--red)] hover:bg-[#8B2E06] text-white'}`}
                  >
                    {submittingId === activePayment.id ? 'PROCESSING...' : `CONFIRM ${activePayment.type === 'SALES' ? 'RECEIPT' : 'PAYMENT'}`}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

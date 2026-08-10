'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Landmark, ArrowDownCircle, ArrowUpCircle, Truck, Package, UserCheck, Phone, FileText, Wallet, CheckCircle2, Clock, Tags, RefreshCw, X } from 'lucide-react';
import { recordTransactionAction, confirmProcurementPaymentAction, confirmSalesReceiptAction, confirmPackingItemPaymentAction, confirmSalesRefundAction } from '@/app/actions/accounting';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';

type Customer = { id: string; name: string; contact?: string | null; gstin?: string | null; address?: string | null; balance: number | string | { toString(): string } };
type Supplier = { id: string; name: string; contact?: string | null; gstin?: string | null; balance: number | string | { toString(): string } };
type ExpenseCategory = { id: string; name: string };
type Bank = { id: string; bankName: string; accountNumber: string; balance: number | string | { toString(): string } };

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

export default function MobileAccountingQueues({ 
  customers, 
  suppliers,
  expenseCategories,
  banks,
  pendingProcurements = [],
  pendingPackingItems = [],
  pendingSales = []
}: { 
  customers: Customer[],
  suppliers: Supplier[],
  expenseCategories: ExpenseCategory[],
  banks: Bank[],
  pendingProcurements?: PendingProcurementBatch[],
  pendingPackingItems?: PendingPackingItem[],
  pendingSales?: PendingSalesInvoice[]
}) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  // --- STATES FOR MOBILE UX ---
  const router = useRouter();
  const [activePayment, setActivePayment] = useState<{ id: string; type: 'PADDY' | 'PACKING' | 'SALES' | 'SALES_REFUND'; maxAmount: number; title: string } | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PADDY' | 'PACKING' | 'SALES'>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredProcurements = pendingProcurements.filter(p => !skippedIds.includes(p.id) && (queueFilter === 'ALL' || queueFilter === 'PADDY'));
  const filteredPackingItems = pendingPackingItems.filter(p => !skippedIds.includes(p.id) && (queueFilter === 'ALL' || queueFilter === 'PACKING'));
  const filteredSales = pendingSales.filter(p => !skippedIds.includes(p.id) && (queueFilter === 'ALL' || queueFilter === 'SALES'));

  const totalPendingOutboundCount = filteredProcurements.length + filteredPackingItems.length;

  return (
    <div className="w-full">
      
      <div className="p-0">
          
        {/* MOBILE UI/UX: Sync Button & Filter Pills */}
        <div className="bg-[var(--surface-2)] p-4 rounded-xl border-2 border-[var(--border)] shadow-brutal-sm mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-black tracking-widest uppercase text-xs text-[var(--muted)] flex items-center">
              Action Queue
            </h3>
            <button 
              onClick={() => { setIsSyncing(true); router.refresh(); setTimeout(()=>setIsSyncing(false),1000); }}
              className="bg-[var(--surface)] text-[var(--text)] border-2 border-[var(--border)] px-3 py-1 rounded-full flex items-center font-black text-[10px] tracking-wider active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${isSyncing ? 'animate-spin text-[var(--blue)]' : ''}`} />
              SYNC
            </button>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
            {['ALL', 'PADDY', 'SALES', 'PACKING'].map(pill => (
              <button 
                key={pill}
                onClick={() => setQueueFilter(pill as any)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase border-2 transition-all ${queueFilter === pill ? 'bg-[var(--ink)] text-[var(--gold)] border-[var(--ink)] shadow-sm' : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--surface-2)]'}`}
              >
                {pill} 
                  <span className="ml-1.5 opacity-80">
                    {pill === 'ALL' && `(${pendingProcurements.filter(p => !skippedIds.includes(p.id)).length + pendingPackingItems.filter(p => !skippedIds.includes(p.id)).length + pendingSales.filter(p => !skippedIds.includes(p.id)).length})`}
                    {pill === 'PADDY' && `(${pendingProcurements.filter(p => !skippedIds.includes(p.id)).length})`}
                    {pill === 'PACKING' && `(${pendingPackingItems.filter(p => !skippedIds.includes(p.id)).length})`}
                    {pill === 'SALES' && `(${pendingSales.filter(p => !skippedIds.includes(p.id)).length})`}
                  </span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {/* --- LIST VIEWS --- */}
            <motion.div 
              key="queues"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >

                {totalPendingOutboundCount === 0 && filteredSales.length === 0 ? (
                  <div className="text-center py-16 text-[var(--muted)] bg-[var(--surface-2)] rounded-2xl border-2 border-dashed border-[var(--dust)] p-8">
                    <CheckCircle2 className="w-16 h-16 text-[var(--green)] mx-auto mb-4 opacity-75" />
                    <p className="font-display font-black text-2xl uppercase tracking-widest text-[var(--text)]">All Clear</p>
                    <p className="font-medium mt-2 text-sm">No pending payments or receipts in the queue.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    
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
                          {/* Card Top Section */}
                          <div className="p-4 sm:p-5 bg-[var(--surface)] space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-display font-black text-[10px] bg-[var(--rust)] text-white px-2.5 py-0.5 rounded border border-[var(--ink)] uppercase tracking-wider flex items-center">
                                    <Truck className="w-3 h-3 mr-1" /> PADDY
                                  </span>
                                  <span className="text-[11px] font-bold text-[var(--muted)] font-mono">
                                    {new Date(batch.createdAt).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-display font-black text-lg text-[var(--text)] tracking-tight">
                                  {batch.farmer?.name || batch.supplier.name}
                                </h4>
                                <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
                                  {Number(batch.numberOfBags || 0)} bags • {Number(batch.netWeight || batch.grossWeight).toFixed(0)} kg ({batch.product?.name || 'Paddy'})
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block">Remaining</span>
                                <span className="font-display font-black text-xl text-[var(--red)] tabular-nums block">
                                  ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[11px] text-[var(--muted)] font-bold block mt-0.5">
                                  Total: ₹{totalOutbound.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-black uppercase text-[var(--muted)]">
                                <span>Paid: ₹{amountPaid.toLocaleString('en-IN')} ({percentPaid}%)</span>
                                <span>Due: ₹{remaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="w-full h-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full overflow-hidden flex">
                                <div style={{ width: `${percentPaid}%` }} className="bg-[var(--green)] h-full transition-all duration-300" />
                                <div style={{ width: `${100 - percentPaid}%` }} className="bg-[var(--red)] h-full transition-all duration-300 opacity-80" />
                              </div>
                            </div>

                            {/* Action Controls */}
                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                onClick={() => setActivePayment({
                                  id: batch.id,
                                  type: 'PADDY',
                                  maxAmount: remaining,
                                  title: `Paddy Payment – ${batch.farmer?.name || batch.supplier.name}`
                                })}
                                className="flex-1 bg-[var(--red)] hover:bg-[#8B2E06] text-white py-3 font-black text-sm shadow-sm min-h-[46px]"
                              >
                                RECORD PAYMENT
                              </Button>

                              <button
                                onClick={() => setExpandedCardId(isExpanded ? null : batch.id)}
                                className="px-3 py-3 border-2 border-[var(--border)] rounded-lg text-xs font-black uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition-colors min-h-[46px]"
                              >
                                {isExpanded ? 'Hide' : 'Details ▾'}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Breakdown */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]"
                              >
                                <div className="p-4 space-y-3 text-xs">
                                  <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                    <span className="text-[var(--muted)] font-bold">Farmer Name</span>
                                    <span className="font-black">{batch.farmer?.name || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                    <span className="text-[var(--muted)] font-bold">Broker Supplier</span>
                                    <span className="font-black">{batch.supplier.name}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                    <span className="text-[var(--muted)] font-bold">Farmer Payable</span>
                                    <span className="font-black">₹{farmerPayable.toFixed(2)}</span>
                                  </div>
                                  {brokerCommission > 0 && (
                                    <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                      <span className="text-[var(--muted)] font-bold">Broker Commission</span>
                                      <span className="font-black">₹{brokerCommission.toFixed(2)}</span>
                                    </div>
                                  )}
                                                                    <div className="flex justify-between">
                                    <span className="text-[var(--muted)] font-bold">Godown Location</span>
                                    <span className="font-black text-[var(--blue)]">{batch.godown?.name || 'Main Godown'}</span>
                                  </div>
                                  {batch.payments && batch.payments.length > 0 && (
                                    <div className="pt-2 mt-2 border-t border-[var(--dust)]">
                                      <span className="text-[var(--muted)] font-bold mb-2 block">Payment History</span>
                                      <div className="space-y-1.5">
                                        {batch.payments.map(p => (
                                          <div key={p.id} className="flex justify-between items-center bg-[#111] p-2.5 rounded-lg border border-neutral-800">
                                            <span className="text-[10px] text-[var(--muted)] font-mono">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                            <span className="font-bold text-[var(--green)]">₹{Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}

                    {/* 2. Packaging Material & Bag Procurements */}
                    {filteredPackingItems.map((pkg, idx) => {
                      const bags = Number(pkg.quantityBags);
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
                          {/* Card Top Section */}
                          <div className="p-4 sm:p-5 bg-[var(--surface)] space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-display font-black text-[10px] bg-[var(--ink)] text-white px-2.5 py-0.5 rounded border border-[var(--ink)] uppercase tracking-wider flex items-center">
                                    <Package className="w-3 h-3 mr-1 text-[var(--gold)]" /> PACKING
                                  </span>
                                  <span className="text-[11px] font-bold text-[var(--muted)] font-mono">
                                    {new Date(pkg.createdAt).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-display font-black text-lg text-[var(--text)] tracking-tight">
                                  {pkg.supplier?.name || 'General Vendor'}
                                </h4>
                                <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
                                  Brand: {pkg.brandName} • {bags.toLocaleString()} bags @ ₹{rate.toFixed(2)} ({pkg.capacityKg}kg)
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block">Remaining</span>
                                <span className="font-display font-black text-xl text-[var(--red)] tabular-nums block">
                                  ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[11px] text-[var(--muted)] font-bold block mt-0.5">
                                  Total: ₹{totalPayable.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-black uppercase text-[var(--muted)]">
                                <span>Paid: ₹{amountPaid.toLocaleString('en-IN')} ({percentPaid}%)</span>
                                <span>Due: ₹{remaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="w-full h-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full overflow-hidden flex">
                                <div style={{ width: `${percentPaid}%` }} className="bg-[var(--green)] h-full transition-all duration-300" />
                                <div style={{ width: `${100 - percentPaid}%` }} className="bg-[var(--red)] h-full transition-all duration-300 opacity-80" />
                              </div>
                            </div>

                            {/* Action Controls */}
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
                                className="px-3 py-3 border-2 border-[var(--border)] rounded-lg text-xs font-black uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition-colors min-h-[46px]"
                              >
                                {isExpanded ? 'Hide' : 'Details ▾'}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Breakdown */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]"
                              >
                                <div className="p-4 space-y-3 text-xs">
                                  <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                    <span className="text-[var(--muted)] font-bold">Vendor Name</span>
                                    <span className="font-black">{pkg.supplier?.name || 'General Vendor'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                    <span className="text-[var(--muted)] font-bold">Brand & Capacity</span>
                                    <span className="font-black">{pkg.brandName} ({pkg.capacityKg} KG)</span>
                                  </div>
                                  <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                    <span className="text-[var(--muted)] font-bold">Quantity & Per Bag Rate</span>
                                    <span className="font-black">{bags.toLocaleString()} bags @ ₹{rate.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[var(--muted)] font-bold">Destination Godown</span>
                                    <span className="font-black text-[var(--blue)]">{pkg.godown.name}</span>
                                  </div>
                                  {pkg.payments && pkg.payments.length > 0 && (
                                    <div className="pt-2 mt-2 border-t border-[var(--dust)]">
                                      <span className="text-[var(--muted)] font-bold mb-2 block">Payment History</span>
                                      <div className="space-y-1.5">
                                        {pkg.payments.map(p => (
                                          <div key={p.id} className="flex justify-between items-center bg-[#111] p-2.5 rounded-lg border border-neutral-800">
                                            <span className="text-[10px] text-[var(--muted)] font-mono">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                            <span className="font-bold text-[var(--green)]">₹{Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}

                    {/* 3. Sales Invoices */}
                    {filteredSales.map((invoice, idx) => {
                      const grandTotal = Number(invoice.grandTotal);
                      const amountPaid = Number(invoice.amountPaid || 0);
                      const actualRemaining = grandTotal - amountPaid;
                      const isRefund = actualRemaining < 0;
                      const remaining = Math.abs(actualRemaining);
                      const percentPaid = grandTotal > 0 ? Math.min(100, Math.max(0, Math.round((amountPaid / grandTotal) * 100))) : 0;
                      const isExpanded = expandedCardId === invoice.id;

                      return (
                        <motion.div 
                          key={invoice.id} 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl shadow-brutal-sm overflow-hidden"
                        >
                          {/* Card Top Section */}
                          <div className="p-4 sm:p-5 bg-[var(--surface)] space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-display font-black text-[10px] bg-[var(--green)] text-[var(--text)] px-2.5 py-0.5 rounded border border-[var(--border)] uppercase tracking-wider flex items-center">
                                    <FileText className="w-3 h-3 mr-1" /> SALES #{invoice.invoiceNumber}
                                  </span>
                                  <span className="text-[11px] font-bold text-[var(--muted)] font-mono">
                                    {new Date(invoice.createdAt).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-display font-black text-lg text-[var(--text)] tracking-tight">
                                  {invoice.customer.name}
                                </h4>
                                <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
                                  Vehicle: {invoice.vehicle?.licensePlate || 'N/A'} • {invoice.items.length} Line item(s)
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block">{isRefund ? 'Refund Pending' : 'Remaining'}</span>
                                <span className={`font-display font-black text-xl tabular-nums block ${isRefund ? 'text-[var(--gold)]' : 'text-[var(--green)]'}`}>
                                  ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[11px] text-[var(--muted)] font-bold block mt-0.5">
                                  Total: ₹{grandTotal.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-black uppercase text-[var(--muted)]">
                                <span>Received: ₹{amountPaid.toLocaleString('en-IN')} ({percentPaid}%)</span>
                                <span>{isRefund ? 'Due Refund' : 'Due'}: ₹{remaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="w-full h-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full overflow-hidden flex">
                                <div style={{ width: `${percentPaid}%` }} className="bg-[var(--green)] h-full transition-all duration-300" />
                                <div style={{ width: `${100 - percentPaid}%` }} className="bg-[var(--gold)] h-full transition-all duration-300 opacity-80" />
                              </div>
                            </div>

                            {/* Action Controls */}
                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                onClick={() => setActivePayment({
                                  id: invoice.id,
                                  type: isRefund ? 'SALES_REFUND' : 'SALES',
                                  maxAmount: remaining,
                                  title: isRefund ? `Issue Refund – ${invoice.customer.name}` : `Sales Receipt – ${invoice.customer.name}`
                                })}
                                className={`flex-1 text-[var(--text)] py-3 font-black text-sm shadow-sm min-h-[46px] ${isRefund ? 'bg-[var(--gold)] hover:bg-[#B38B22]' : 'bg-[var(--green)] hover:bg-[var(--green-light)]'}`}
                              >
                                {isRefund ? 'ISSUE REFUND / CREDIT' : 'RECORD RECEIPT'}
                              </Button>

                              <button
                                onClick={() => setExpandedCardId(isExpanded ? null : invoice.id)}
                                className="px-3 py-3 border-2 border-[var(--border)] rounded-lg text-xs font-black uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition-colors min-h-[46px]"
                              >
                                {isExpanded ? 'Hide' : 'Details ▾'}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Breakdown */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]"
                              >
                                <div className="p-4 space-y-3 text-xs">
                                  <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                    <span className="text-[var(--muted)] font-bold">Customer Name</span>
                                    <span className="font-black">{invoice.customer.name}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-[var(--dust)] pb-2">
                                    <span className="text-[var(--muted)] font-bold">Vehicle License</span>
                                    <span className="font-black">{invoice.vehicle?.licensePlate || 'N/A'}</span>
                                  </div>
                                  <div className="pt-1">
                                    <span className="text-[var(--muted)] font-bold uppercase text-[10px] tracking-widest block mb-2">Invoice Line Items</span>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                      {invoice.items.map(item => (
                                        <div key={item.id} className="flex justify-between bg-[var(--surface)] p-2 rounded border border-[var(--dust)]">
                                          <span className="font-bold">{item.product.name} ({Number(item.quantity).toFixed(2)}kg)</span>
                                          <span className="font-black text-[var(--blue)]">₹{Number(item.lineTotal).toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {invoice.payments && invoice.payments.length > 0 && (
                                    <div className="pt-2 mt-2 border-t border-[var(--dust)]">
                                      <span className="text-[var(--muted)] font-bold mb-2 block">Payment History</span>
                                      <div className="space-y-1.5">
                                        {invoice.payments.map(p => (
                                          <div key={p.id} className="flex justify-between items-center bg-[#111] p-2.5 rounded-lg border border-neutral-800">
                                            <span className="text-[10px] text-[var(--muted)] font-mono">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                            <span className="font-bold text-[var(--green)]">₹{Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
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
          </AnimatePresence>
        </div>
      </div>

      {/* --- MOBILE UI/UX: BOTTOM SHEET FOR PAYMENTS --- */}
      <AnimatePresence>
        {activePayment && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActivePayment(null)}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/60 z-[100] backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto bg-[var(--bg)] rounded-t-3xl border-t-4 border-[var(--border)] z-[110] p-6 pb-20 shadow-2xl md:hidden"
            >
              <div className="flex justify-between items-center mb-6 border-b-2 border-dashed border-[var(--dust)] pb-4">
                <h2 className="font-black text-xl uppercase tracking-tight flex items-center text-[var(--text)]">
                  Record {activePayment.type === 'SALES' ? 'Receipt' : (activePayment.type === 'SALES_REFUND' ? 'Refund' : 'Payment')}
                </h2>
                <button onClick={() => setActivePayment(null)} className="p-2 bg-[var(--surface-2)] rounded-full text-[var(--muted)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-[var(--surface-2)] rounded-xl border-2 border-[var(--border)]">
                <span className="font-bold text-xs uppercase tracking-widest text-[var(--muted)] block mb-1">Target</span>
                <span className="font-black text-lg block">{activePayment.title}</span>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--dust)]">
                  <span className="font-bold text-xs uppercase text-[var(--muted)]">{activePayment.type === 'SALES_REFUND' ? 'Refund Amount' : 'Pending Balance'}</span>
                  <span className={`font-black text-lg ${activePayment.type === 'SALES' ? 'text-[var(--green)]' : (activePayment.type === 'SALES_REFUND' ? 'text-[var(--gold)]' : 'text-[var(--red)]')}`}>
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
                  } else if (activePayment.type === 'SALES_REFUND') {
                    formData.append('invoiceId', activePayment.id);
                    await confirmSalesRefundAction(formData);
                  }
                  toast.success(`${activePayment.type === 'SALES' ? 'Receipt' : (activePayment.type === 'SALES_REFUND' ? 'Refund' : 'Payment')} Confirmed!`);
                  setActivePayment(null);
                } catch (err) {
                  toast.error('Error confirming: ' + (err instanceof Error ? err.message : String(err)));
                } finally {
                  setSubmittingId(null);
                }
              }} className="space-y-4">
                <Input 
                  label={`Amount (${activePayment.type === 'SALES' ? 'Received' : (activePayment.type === 'SALES_REFUND' ? 'Refunded' : 'Paid')}) ₹ *`}
                  type="number" step="0.01" name="amount" required max={activePayment.maxAmount} placeholder="e.g. 0.00"
                  className={`${activePayment.type === 'SALES' ? 'text-[var(--green)]' : (activePayment.type === 'SALES_REFUND' ? 'text-[var(--gold)]' : 'text-[var(--red)]')} font-black text-xl`} 
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
                    className={`w-full min-h-[52px] py-4 text-base font-black shadow-brutal-sm ${activePayment.type === 'SALES' ? 'bg-[var(--green)] hover:bg-[var(--green-light)] text-[var(--text)]' : (activePayment.type === 'SALES_REFUND' ? 'bg-[var(--gold)] hover:bg-[#B38B22] text-[var(--text)]' : 'bg-[var(--red)] hover:bg-[#8B2E06] text-white')}`}
                  >
                    {submittingId === activePayment.id ? 'PROCESSING...' : `CONFIRM ${activePayment.type === 'SALES' ? 'RECEIPT' : (activePayment.type === 'SALES_REFUND' ? 'REFUND' : 'PAYMENT')}`}
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

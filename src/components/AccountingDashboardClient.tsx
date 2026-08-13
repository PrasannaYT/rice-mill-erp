'use client';

import { useState } from 'react';
import { Landmark, ArrowUpCircle, ArrowDownCircle, Wallet, FileText, Plus, X, History, Activity, PieChart, CheckCircle2, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from "date-fns";
import AccountingForm from '@/components/AccountingForm';
import MobileAccountingQueues from '@/components/MobileAccountingQueues';
import ManualJournalForm from '@/components/ManualJournalForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function isProcurementRiceBatch(batch: any): boolean {
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

export default function AccountingDashboardClient({
  totalAR,
  totalAP,
  totalBankBalance,
  totalCashInHand,
  banks,
  customers,
  suppliers,
  expenseCategories,
  pendingProcurements,
  pendingPackingItems,
  pendingSales,
  transactions
}: {
  totalAR: number;
  totalAP: number;
  totalBankBalance: number;
  totalCashInHand: number;
  banks: { id: string; bankName: string; accountNumber: string; ifsc?: string | null; balance: string }[];
  customers: { id: string; name: string; contact?: string | null; gstin?: string | null; address?: string | null; balance: string }[];
  suppliers: { id: string; name: string; contact?: string | null; gstin?: string | null; address?: string | null; balance: string }[];
  expenseCategories: { id: string; name: string; description?: string | null }[];
  pendingProcurements: any[];
  pendingPackingItems: any[];
  pendingSales: any[];
  transactions: {
    id: string;
    type: string;
    mode: string;
    amount: string;
    referenceNumber?: string | null;
    createdAt: string;
    customer?: { name: string } | null;
    supplier?: { name: string } | null;
    expenseCategory?: { name: string } | null;
    bank?: { bankName: string } | null;
  }[];
}) {
  const [mobileTab, setMobileTab] = useState<'OVERVIEW' | 'APPROVALS' | 'EXPENSES' | 'HISTORY'>('OVERVIEW');
  const [showFABModal, setShowFABModal] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const pendingCount = pendingProcurements.length + pendingPackingItems.length + pendingSales.length;
  const overallLiquidity = totalBankBalance + totalCashInHand;

  const DesktopView = (
    <div className="hidden md:block max-w-7xl mx-auto space-y-8 pb-24">
      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--surface)] p-6 rounded-xl shadow-sm border border-[var(--border)]">
          <div className="flex items-center text-emerald-600 mb-2">
            <ArrowDownCircle className="h-5 w-5 mr-2" /> <span className="font-semibold">Accounts Receivable (AR)</span>
          </div>
          <p className="text-sm text-[var(--muted)] mb-1">Money owed to us by Customers</p>
          <p className="text-3xl font-bold text-[var(--text)] tabular-nums">
            ₹ {totalAR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-xl shadow-sm border border-[var(--border)]">
          <div className="flex items-center text-rose-600 mb-2">
            <ArrowUpCircle className="h-5 w-5 mr-2" /> <span className="font-semibold">Accounts Payable (AP)</span>
          </div>
          <p className="text-sm text-[var(--muted)] mb-1">Money we owe to Suppliers</p>
          <p className="text-3xl font-bold text-[var(--text)] tabular-nums">
            ₹ {totalAP.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-xl shadow-sm border border-[var(--border)]">
          <div className="flex items-center text-sky-600 mb-2">
            <Landmark className="h-5 w-5 mr-2" /> <span className="font-semibold">Total Liquidity</span>
          </div>
          <p className="text-sm text-[var(--muted)] mb-1">Available cash & bank balances</p>
          <p className="text-3xl font-bold text-[var(--text)] tabular-nums">
            ₹ {overallLiquidity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Bank Liquidity Strip */}
      <div className="bg-[var(--surface)] shadow-sm rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center">
          <Wallet className="h-5 w-5 mr-2 text-sky-600" /> Cash & Bank Accounts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg">
            <p className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center"><Banknote className="w-4 h-4 mr-2" /> Cash in Hand</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mb-2">Physical cash available</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">₹{totalCashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          {banks.map((bank: any) => (
              <div key={bank.id} className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                <p className="font-semibold text-[var(--text)]">{bank.bankName}</p>
                <p className="text-xs text-[var(--muted)] font-mono mb-2">Acct: ...{bank.accountNumber.slice(-4)}</p>
                <p className="text-lg font-bold text-sky-700 tabular-nums">₹{Number(bank.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
          ))}
        </div>
      </div>

      {/* Cashier Approval Queues */}
      <AccountingForm 
        customers={customers} 
        suppliers={suppliers} 
        expenseCategories={expenseCategories}
        banks={banks}
        pendingProcurements={pendingProcurements}
        pendingPackingItems={pendingPackingItems}
        pendingSales={pendingSales}
        transactions={transactions}
      />
      
      {/* Recent Confirmed Transactions Table */}
      <div className="bg-[var(--surface)] shadow-sm rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--text)] flex items-center">
            <History className="w-5 h-5 mr-2" /> Recent Confirmed Transactions Log
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-[var(--surface-2)]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Entity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Mode / Ref</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {transactions.map((tx: any) => {
                const isReceipt = tx.type === 'RECEIPT';
                const isRiceProcurement = isProcurementRiceBatch(tx.procurementBatch);
                const categoryLabel = tx.procurementBatch ? (isRiceProcurement ? 'Rice' : 'Paddy') : tx.salesInvoice ? 'Sales' : tx.packingItem ? 'Packing' : tx.expenseCategory ? 'Expense' : 'General';
                const entityName = tx.customer?.name || tx.supplier?.name || tx.expenseCategory?.name || 'Manual Transaction';
                const entityType = tx.customer ? 'Customer' : tx.supplier ? 'Supplier' : tx.expenseCategory ? 'Expense Category' : 'General Ledger';
                
                return (
                  <tr key={tx.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)] tabular-nums">
                      {format(new Date(tx.createdAt), "MMM dd, yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isReceipt ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {tx.type}
                        </span>
                        <span className="px-2 inline-flex text-xs leading-5 font-black uppercase rounded bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                          {categoryLabel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[var(--text)]">{entityName}</div>
                      <div className="text-xs text-[var(--muted)]">{entityType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--text)] font-medium">{tx.mode} {tx.bank ? `(${tx.bank.bankName})` : ''}</div>
                      <div className="text-xs text-[var(--muted)] font-mono">{tx.referenceNumber || '-'}</div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold tabular-nums ${isReceipt ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isReceipt ? '+' : '-'} ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[var(--muted)]">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const MobileView = (
    <div className="md:hidden pb-48 pt-4">

      {/* Tab Navigation Bar (Sticky top bar with precise padding & shadow clearance) */}
      <div className="sticky top-0 z-20 bg-[var(--bg)] pt-2 pb-3 mb-6 px-1.5 flex gap-2 border-b-2 border-[var(--dust)]">
        <button 
          onClick={() => setMobileTab('OVERVIEW')} 
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all ${
            mobileTab === 'OVERVIEW' 
              ? 'bg-[#F5A623] border-[#F5A623] text-black font-black shadow-[2px_2px_0px_#000]' 
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <PieChart className="w-4 h-4 mb-1 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-full">Overview</span>
        </button>
        
        <button 
          onClick={() => setMobileTab('APPROVALS')} 
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 relative transition-all ${
            mobileTab === 'APPROVALS' 
              ? 'bg-[#F5A623] border-[#F5A623] text-black font-black shadow-[2px_2px_0px_#000]' 
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <Activity className="w-4 h-4 mb-1 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-full">Queues</span>
          {pendingCount > 0 && (
            <span className="absolute -top-2.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] text-[9px] font-black rounded-full bg-[var(--rust)] text-white border border-black shadow-xs z-10">
              {pendingCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setMobileTab('EXPENSES')} 
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all ${
            mobileTab === 'EXPENSES' 
              ? 'bg-[#F5A623] border-[#F5A623] text-black font-black shadow-[2px_2px_0px_#000]' 
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <FileText className="w-4 h-4 mb-1 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-full">Ledger</span>
        </button>

        <button 
          onClick={() => setMobileTab('HISTORY')} 
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all ${
            mobileTab === 'HISTORY' 
              ? 'bg-[#F5A623] border-[#F5A623] text-black font-black shadow-[2px_2px_0px_#000]' 
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <History className="w-4 h-4 mb-1 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-full">History</span>
        </button>
      </div>


      <AnimatePresence mode="wait">
        {mobileTab === 'OVERVIEW' && (
          <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--surface)] p-4 rounded-xl border-2 border-[var(--border)] shadow-brutal-sm">
                <div className="text-[var(--green)] flex flex-col mb-1">
                  <ArrowDownCircle className="h-5 w-5 mb-1" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">Receivable</span>
                </div>
                <p className="text-xl font-black text-[var(--text)] tabular-nums mt-1">₹{totalAR.toLocaleString('en-IN')}</p>
              </div>
              
              <div className="bg-[var(--surface)] p-4 rounded-xl border-2 border-[var(--border)] shadow-brutal-sm">
                <div className="text-[var(--red)] flex flex-col mb-1">
                  <ArrowUpCircle className="h-5 w-5 mb-1" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">Payable</span>
                </div>
                <p className="text-xl font-black text-[var(--text)] tabular-nums mt-1">₹{totalAP.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="bg-[var(--blue)] text-white p-6 rounded-xl shadow-brutal-sm border-2 border-[var(--border)] relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-20"><Landmark className="w-24 h-24" /></div>
              <p className="font-bold text-xs uppercase tracking-widest text-white/80 mb-2">Total Liquidity</p>
              <p className="text-4xl font-black tabular-nums">₹{overallLiquidity.toLocaleString('en-IN')}</p>
            </div>

            {/* Swipeable Bank Cards */}
            <div className="mt-8">
              <h3 className="font-black uppercase tracking-widest text-[var(--muted)] mb-3 flex items-center text-sm">
                <Wallet className="w-4 h-4 mr-2" /> Cash & Banks
              </h3>
              <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 pb-4 px-1">
                <div className="min-w-[240px] shrink-0 snap-start bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 rounded-2xl shadow-brutal-sm border-2 border-[var(--border)]">
                  <div className="flex justify-between items-start mb-4">
                    <Banknote className="w-6 h-6 text-emerald-200" />
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">CASH</span>
                  </div>
                  <p className="text-sm text-emerald-100/80 mb-1 uppercase tracking-widest font-black">Cash in Hand</p>
                  <p className="text-2xl font-black tabular-nums">₹{totalCashInHand.toLocaleString('en-IN')}</p>
                </div>
                {banks.map((bank: any) => (
                    <div key={bank.id} className="min-w-[240px] shrink-0 snap-start bg-gradient-to-br from-[var(--charcoal)] to-[var(--ink)] text-white p-5 rounded-2xl shadow-brutal-sm border-2 border-[var(--border)]">
                      <div className="flex justify-between items-start mb-4">
                        <Wallet className="w-6 h-6 text-[var(--gold)]" />
                        <span className="text-xs font-mono bg-white/20 px-2 py-1 rounded">...{bank.accountNumber.slice(-4)}</span>
                      </div>
                      <p className="font-bold text-sm text-white/70 mb-1">{bank.bankName}</p>
                      <p className="text-2xl font-black tabular-nums tracking-tight">₹{Number(bank.balance).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}

        {mobileTab === 'APPROVALS' && (
          <motion.div key="approvals" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {/* Mobile specific Queues rendering without Desktop fluff */}
            <MobileAccountingQueues 
              customers={customers} 
              suppliers={suppliers} 
              expenseCategories={expenseCategories}
              banks={banks}
              pendingProcurements={pendingProcurements}
              pendingPackingItems={pendingPackingItems}
              pendingSales={pendingSales}
            />
          </motion.div>
        )}

        {mobileTab === 'EXPENSES' && (
          <motion.div key="expenses" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <ManualJournalForm 
              customers={customers} 
              suppliers={suppliers} 
              expenseCategories={expenseCategories} 
              banks={banks} 
              transactions={transactions}
            />
          </motion.div>
        )}

        {mobileTab === 'HISTORY' && (
          <motion.div key="history" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <h3 className="font-black uppercase tracking-widest text-[var(--muted)] mb-4 flex items-center text-sm">
              <History className="w-4 h-4 mr-2" /> Recent Transactions
            </h3>
            <div className="space-y-4">
              {(() => {
                if (transactions.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-12 h-12 text-[var(--dust)] mx-auto mb-2" />
                      <p className="font-bold text-[var(--muted)]">No recent history.</p>
                    </div>
                  );
                }

                const groupedTxs = transactions.reduce((acc: any, tx: any) => {
                  const recordId = tx.procurementBatch?.id || tx.salesInvoice?.id || tx.packingItem?.id || tx.id;
                  const isCompleted = tx.procurementBatch?.status === 'PAID' || tx.salesInvoice?.status === 'PAID' || tx.packingItem?.status === 'PAID';
                  
                  if (!acc[recordId]) {
                    acc[recordId] = {
                      id: recordId,
                      isCompleted,
                      entityName: tx.customer?.name || tx.supplier?.name || tx.expenseCategory?.name || 'Manual Transaction',
                      type: tx.procurementBatch ? 'Paddy' : tx.salesInvoice ? 'Sales' : tx.packingItem ? 'Packing' : tx.expenseCategory ? 'Expense' : 'Manual',
                      transactions: []
                    };
                  }
                  acc[recordId].transactions.push(tx);
                  return acc;
                }, {});

                return Object.values(groupedTxs).map((group: any) => {
                  const isExpanded = expandedHistoryId === group.id;
                  
                  return (
                    <div key={group.id} className="bg-[var(--surface)] p-4 rounded-xl border-2 border-[var(--border)] shadow-brutal-sm relative overflow-hidden">
                      {group.isCompleted && (
                        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden select-none opacity-20">
                          <svg viewBox="0 0 400 400" className="w-64 h-64 -rotate-12 text-[var(--green)]" fill="none" stroke="currentColor">
                            <circle cx="200" cy="200" r="180" strokeWidth="12" strokeDasharray="20 10"/>
                            <circle cx="200" cy="200" r="160" strokeWidth="4"/>
                            <text x="200" y="220" textAnchor="middle" fontSize="60" fontWeight="900" strokeWidth="2" fill="currentColor">COMPLETED</text>
                          </svg>
                        </div>
                      )}

                      <div 
                        className="flex justify-between items-center cursor-pointer relative z-10"
                        onClick={() => setExpandedHistoryId(isExpanded ? null : group.id)}
                      >
                        <div>
                          <span className="font-bold text-[var(--text)] block text-lg">{group.entityName}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{group.type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {group.isCompleted && (
                            <div className="bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30 px-2.5 py-1 rounded-full flex items-center shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              <span className="font-black text-[10px] uppercase tracking-wider">Completed</span>
                            </div>
                          )}
                          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[var(--blue)]' : 'text-[var(--muted)]'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="relative z-10 space-y-2 overflow-hidden"
                          >
                            <div className="pt-4 mt-3 border-t border-[var(--dust)] space-y-2">
                              {group.transactions.map((tx: any) => {
                                const isReceipt = tx.type === 'RECEIPT';
                                return (
                                  <div key={tx.id} className="flex justify-between items-center bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--dust)]">
                                    <span className="text-xs text-[var(--muted)] font-medium font-mono">
                                      {format(new Date(tx.createdAt), "dd MMM yy")} • {tx.mode}
                                    </span>
                                    <div className="text-right flex flex-col">
                                      <span className={`font-black text-sm tabular-nums ${isReceipt ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                                        {isReceipt ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );

  return (
    <div className="p-4 sm:p-8">
      {DesktopView}
      {MobileView}


      {/* FAB Modal (Mobile Bottom Sheet / Desktop Centered Modal) */}
      <AnimatePresence>
        {showFABModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFABModal(false)}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-3xl md:w-full md:rounded-3xl max-h-[92vh] overflow-y-auto bg-[var(--bg)] rounded-t-3xl border-t-4 md:border-4 border-[var(--border)] z-60 p-6 pb-20 sm:p-8 shadow-2xl transform-gpu will-change-transform"
            >
              <div className="flex justify-between items-center mb-6 border-b-2 border-dashed border-[var(--dust)] pb-4">
                <h2 className="font-black text-2xl uppercase tracking-tight flex items-center text-[var(--text)]">
                  <FileText className="w-6 h-6 mr-3 text-[var(--blue)]" /> Manual Ledger Entry
                </h2>
                <button onClick={() => setShowFABModal(false)} className="p-2 bg-[var(--surface-2)] rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <ManualJournalForm 
                customers={customers} 
                suppliers={suppliers} 
                expenseCategories={expenseCategories} 
                banks={banks} 
                transactions={transactions}
                onSuccess={() => setShowFABModal(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


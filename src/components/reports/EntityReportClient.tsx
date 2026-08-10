'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ShoppingCart, Truck, Calendar,
  Download, X, FileText, ArrowLeft, Users, PackageSearch, Banknote
} from 'lucide-react';
import { getEntityReportAction } from '@/app/actions/entityReport';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type ReportMode = 'PURCHASES' | 'SALES';
type PeriodType = 'MONTHLY' | 'YEARLY';

type Transaction = {
  id: string;
  date: Date | string;
  refNo: string;
  particulars: string;
  qtyAndRate: string;
  amount: number;
};

type EntityLedger = {
  entityId: string;
  entityName: string;
  totalTransactions: number;
  totalVolumeKg: number;
  totalValue: number;
  transactions: Transaction[];
};

export default function EntityReportClient() {
  const router = useRouter();
  const [mode, setMode] = useState<ReportMode>('PURCHASES');
  const [periodType, setPeriodType] = useState<PeriodType>('MONTHLY');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EntityLedger[]>([]);

  const [selectedEntity, setSelectedEntity] = useState<EntityLedger | null>(null);

  // Compute period string
  const periodValue = useMemo(() => {
    if (periodType === 'MONTHLY') {
      const y = currentDate.getFullYear();
      const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      return `${y}-${m}`; // e.g. 2026-08
    } else {
      const y = currentDate.getFullYear();
      return `${y}`; // e.g. 2026
    }
  }, [currentDate, periodType]);

  const periodLabel = useMemo(() => {
    if (periodType === 'MONTHLY') {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else {
      return `FY ${currentDate.getFullYear()}-${(currentDate.getFullYear() + 1).toString().slice(2)}`;
    }
  }, [currentDate, periodType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getEntityReportAction(mode, periodType, periodValue);
      setData(result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch report data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mode, periodType, periodValue]);

  const changePeriod = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (periodType === 'MONTHLY') {
      d.setMonth(d.getMonth() + dir);
    } else {
      d.setFullYear(d.getFullYear() + dir);
    }
    setCurrentDate(d);
  };

  // KPIs
  const totalVolume = data.reduce((sum, item) => sum + item.totalVolumeKg, 0);
  const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);
  const activeEntities = data.length;

  const fmtCurrency = (n: number) => {
    if (n >= 10000000) return `₹ ${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹ ${(n / 100000).toFixed(2)} L`;
    return `₹ ${n.toLocaleString('en-IN')}`;
  };

  const fmtVolume = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)} Tons`;
    return `${kg} KG`;
  };

  const maxVolume = Math.max(...data.map(d => d.totalVolumeKg), 1);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white font-sans pb-32 print:bg-white print:text-black">
      {/* Sticky Header & Filters */}
      <div className="sticky top-0 z-40 bg-[#0E0E0E]/90 backdrop-blur-xl border-b border-neutral-800 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-black uppercase tracking-wider">Entity Ledger Reports</h1>
              <p className="text-xs text-neutral-400">Detailed break-down by Supplier & Customer</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Mode Tabs */}
            <div className="flex p-1 bg-neutral-900 rounded-xl border border-neutral-800 shrink-0">
              <button
                onClick={() => setMode('PURCHASES')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                  mode === 'PURCHASES' 
                    ? 'bg-[#F5A623] text-black shadow-lg shadow-[#F5A623]/20' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4" /> Purchases
              </button>
              <button
                onClick={() => setMode('SALES')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                  mode === 'SALES' 
                    ? 'bg-[#F5A623] text-black shadow-lg shadow-[#F5A623]/20' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Truck className="w-4 h-4" /> Sales
              </button>
            </div>

            {/* Timeframe & Period Selectors */}
            <div className="flex items-center gap-2">
              <div className="flex bg-neutral-900 rounded-xl border border-neutral-800 p-1">
                <button
                  onClick={() => setPeriodType('MONTHLY')}
                  className={`px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors ${periodType === 'MONTHLY' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setPeriodType('YEARLY')}
                  className={`px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors ${periodType === 'YEARLY' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
                >
                  Yearly
                </button>
              </div>

              <div className="flex items-center bg-neutral-900 rounded-xl border border-neutral-800 p-1">
                <button onClick={() => changePeriod(-1)} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="min-w-[120px] text-center text-sm font-bold tracking-wide">
                  {periodLabel}
                </span>
                <button onClick={() => changePeriod(1)} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 print:py-0 print:px-0">
        {/* KPI Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8 print:hidden">
          <div className="p-4 bg-[#1A1A1A] border border-neutral-800 rounded-2xl">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <PackageSearch className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{mode === 'PURCHASES' ? 'Total Volume' : 'Total Dispatch'}</span>
            </div>
            <p className="font-mono text-xl sm:text-2xl font-black">{fmtVolume(totalVolume)}</p>
          </div>
          <div className="p-4 bg-[#1A1A1A] border border-neutral-800 rounded-2xl">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <Banknote className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{mode === 'PURCHASES' ? 'Total Value' : 'Total Revenue'}</span>
            </div>
            <p className="font-mono text-xl sm:text-2xl font-black">{fmtCurrency(totalValue)}</p>
          </div>
          <div className="p-4 bg-[#1A1A1A] border border-neutral-800 rounded-2xl">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{mode === 'PURCHASES' ? 'Active Suppliers' : 'Active Buyers'}</span>
            </div>
            <p className="font-mono text-xl sm:text-2xl font-black">{activeEntities}</p>
          </div>
        </div>

        {/* List of Entities */}
        <div className="space-y-3 print:hidden">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-neutral-900 rounded-2xl" />)}
            </div>
          ) : data.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
              <Calendar className="w-12 h-12 mb-4 text-neutral-500" />
              <p className="font-bold text-lg">No transactions found</p>
              <p className="text-sm">for {periodLabel}</p>
            </div>
          ) : (
            data.map(entity => (
              <button
                key={entity.entityId}
                onClick={() => setSelectedEntity(entity)}
                className="w-full text-left bg-[#1A1A1A] hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 transition-all relative overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-4 z-10 relative">
                  <div>
                    <h3 className="font-bold text-base">{entity.entityName}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{entity.totalTransactions} Transactions</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-black tabular-nums ${mode === 'SALES' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {mode === 'SALES' ? '+' : '-'}{fmtCurrency(entity.totalValue)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 tabular-nums font-mono">{fmtVolume(entity.totalVolumeKg)}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-neutral-800 w-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(entity.totalVolumeKg / maxVolume) * 100}%` }}
                    className="h-full bg-[#F5A623] opacity-50 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bottom Sheet for Detailed Ledger */}
      <AnimatePresence>
        {selectedEntity && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntity(null)}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/80 backdrop-blur-sm z-50 print:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t-2 border-[#F5A623] rounded-t-3xl z-60 max-h-[90dvh] flex flex-col print:relative print:max-h-none print:border-none print:rounded-none print:bg-white print:text-black"
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto my-3 shrink-0 print:hidden" />

              <div className="px-6 py-2 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-xl font-black">{selectedEntity.entityName}</h2>
                  <p className="text-sm text-neutral-400">{periodLabel} Report</p>
                </div>
                <div className="flex gap-2 print:hidden">
                  <button onClick={handlePrint} className="p-2 bg-neutral-800 hover:bg-neutral-700 text-[#F5A623] rounded-xl flex items-center gap-2 px-4 transition-colors">
                    <Download className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Export PDF</span>
                  </button>
                  <button onClick={() => setSelectedEntity(null)} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Transaction List */}
              <div className="overflow-y-auto px-6 py-4 flex-1">
                {/* Print Only Header */}
                <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
                  <h1 className="text-3xl font-black">RICE MILL ERP</h1>
                  <h2 className="text-xl font-bold mt-2">Entity Ledger Report: {selectedEntity.entityName}</h2>
                  <p className="text-gray-600">Period: {periodLabel} | Type: {mode}</p>
                  <div className="flex gap-8 mt-4">
                    <p>Total Volume: <strong>{fmtVolume(selectedEntity.totalVolumeKg)}</strong></p>
                    <p>Total Value: <strong>{fmtCurrency(selectedEntity.totalValue)}</strong></p>
                  </div>
                </div>

                <div className="space-y-0">
                  <div className="grid grid-cols-12 gap-2 pb-2 mb-2 border-b-2 border-neutral-800 print:border-black text-[10px] font-black uppercase tracking-wider text-neutral-500 print:text-black">
                    <div className="col-span-2">Date</div>
                    <div className="col-span-3">Ref No.</div>
                    <div className="col-span-3">Particulars</div>
                    <div className="col-span-2">Qty & Rate</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  {selectedEntity.transactions.map((t, idx) => (
                    <div key={t.id} className={`grid grid-cols-12 gap-2 py-3 border-b border-neutral-800 print:border-gray-300 text-sm ${idx % 2 === 0 ? 'bg-black/20 print:bg-transparent' : ''}`}>
                      <div className="col-span-2 text-neutral-400 print:text-black">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                      <div className="col-span-3 font-mono text-xs">{t.refNo}</div>
                      <div className="col-span-3 truncate">{t.particulars}</div>
                      <div className="col-span-2 text-xs text-neutral-400 print:text-black">{t.qtyAndRate}</div>
                      <div className="col-span-2 text-right font-mono font-bold tabular-nums">
                        {t.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

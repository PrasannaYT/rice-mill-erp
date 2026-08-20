import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { ReportService } from "@/services/reportService";
import {
  TrendingUp, TrendingDown, Activity, BarChart2,
  ArrowLeft, Layers, Truck, PackageSearch, Users,
  Warehouse, AlertCircle, CheckCircle2, Clock, Banknote,
  PieChart, Zap, Factory, CreditCard
} from "lucide-react";
import Link from 'next/link';
import {
  YieldPieChart,
  ExpensePieChart,
  ARAgingBarChart,
  SupplierTrendLineChart,
  VehicleProfitabilityBarChart,
  SalesVelocityBarChart,
  MonthlySalesAreaChart,
  PaymentModeBarChart,
  ExportCSVButton
} from "@/components/AdvancedCharts";
import { AppHeader } from "@/components/ui/AppHeader";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Reports & Analytics – Rice Mill ERP',
};

export default async function ReportsDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  const [pnl, advanced] = await Promise.all([
    ReportService.generatePnL(),
    ReportService.getAdvancedAnalytics(),
  ]);

  const isProfitable = pnl.netProfit >= 0;
  const grossMarginPct = pnl.revenue > 0 ? ((pnl.grossProfit / pnl.revenue) * 100).toFixed(1) : '0.0';
  const totalAR = advanced.arSummary.reduce((s, b) => s + b.value, 0);
  const totalPaymentReceived = advanced.paymentModeBreakdown.reduce((s, p) => s + p.amount, 0);

  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${n.toLocaleString('en-IN')}`;

  const godownSummary = (advanced.godownValuationSummary && advanced.godownValuationSummary.length > 0)
    ? advanced.godownValuationSummary
    : (() => {
        if (!advanced.valuation || advanced.valuation.length === 0) return [];
        const map = new Map<string, any>();
        for (const item of advanced.valuation) {
          const gName = item.godownName || 'Main Storage Godown';
          const existing = map.get(gName) || {
            godownId: gName,
            godownName: gName,
            location: 'Storage Godown',
            totalValue: 0,
            totalQuantityKg: 0,
            items: []
          };
          existing.totalValue += item.estimatedValue;
          existing.totalQuantityKg += item.quantity;
          existing.items.push(item);
          map.set(gName, existing);
        }
        return Array.from(map.values());
      })();

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white font-sans pb-32">

      <AppHeader
        title="Reports & Analytics"
        subtitle="P&L · AR · Inventory · Procurement · Operations"
        breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Reports'}]}
        icon={<BarChart2 className="w-5 h-5" />}
        actions={<ExportCSVButton pnl={pnl} advanced={advanced} />}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">

        {/* Entity Reports Banner */}
        <Link 
          href="/admin/reports/entity"
          className="block p-4 sm:p-6 bg-gradient-to-r from-[#1A1A1A] to-black border border-[#F5A623]/30 hover:border-[#F5A623] rounded-2xl transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#F5A623]/20 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-[#F5A623]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#F5A623] group-hover:text-white transition-colors">Advanced Entity Reports</h2>
                <p className="text-sm text-neutral-400 mt-1">Detailed Monthly & Yearly Ledger by Supplier and Customer</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[#F5A623]">
              <span className="text-xs font-bold uppercase tracking-wider">View Ledger</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </div>
        </Link>

        {/* ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
            SECTION 1 – P&L HEADLINE KPIs (4 cards)
        ════════════════════════════════════════════ */}
        <section aria-label="Profit and Loss Summary">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#F5A623]" />
            Profit & Loss Overview
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

            {/* Revenue */}
            <div className="p-4 sm:p-5 bg-[#1A1A1A] border border-neutral-800 rounded-2xl flex flex-col justify-between gap-3 hover:border-neutral-700 transition-colors overflow-hidden">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1 truncate">Total Revenue</p>
                <p className="font-mono font-black text-xl sm:text-2xl leading-none text-white tabular-nums truncate">{fmt(pnl.revenue)}</p>
                <p className="text-[10px] text-neutral-500 mt-2 truncate">All confirmed sales</p>
              </div>
            </div>

            {/* COGS */}
            <div className="p-4 sm:p-5 bg-[#1A1A1A] border border-neutral-800 rounded-2xl flex flex-col justify-between gap-3 hover:border-neutral-700 transition-colors overflow-hidden">
              <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1 truncate">Total COGS</p>
                <p className="font-mono font-black text-xl sm:text-2xl leading-none text-amber-400 tabular-nums truncate">{fmt(pnl.cogs.total)}</p>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] text-neutral-500 truncate">Procurement: {fmt(pnl.cogs.procurement)}</p>
                  <p className="text-[10px] text-neutral-500 truncate">Labour: {fmt(pnl.cogs.labor)}</p>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="p-4 sm:p-5 bg-[#1A1A1A] border border-neutral-800 rounded-2xl flex flex-col justify-between gap-3 hover:border-neutral-700 transition-colors overflow-hidden">
              <div className="w-8 h-8 bg-sky-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1 truncate">Gross Profit</p>
                <p className="font-mono font-black text-xl sm:text-2xl leading-none text-sky-400 tabular-nums truncate">{fmt(pnl.grossProfit)}</p>
                <p className="text-[10px] text-neutral-500 mt-2 truncate">Margin: {grossMarginPct}%</p>
              </div>
            </div>

            {/* Net Profit */}
            <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-3 transition-colors overflow-hidden ${isProfitable ? 'bg-emerald-950/40 border-emerald-800/50 hover:border-emerald-600' : 'bg-red-950/40 border-red-800/50 hover:border-red-600'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isProfitable ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {isProfitable ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1 truncate">Net Profit</p>
                <p className={`font-mono font-black text-xl sm:text-2xl leading-none tabular-nums truncate ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(pnl.netProfit)}
                </p>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black truncate ${isProfitable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {pnl.netMarginPercentage.toFixed(2)}% Margin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            SECTION 2 — OPERATIONS QUICK STATS ROW
        ════════════════════════════════════════════ */}
        <section aria-label="Operations Quick Stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-[#1A1A1A] border border-neutral-800 rounded-2xl flex flex-col justify-between gap-3">
            <div className="w-8 h-8 bg-[#F5A623]/20 rounded-xl flex items-center justify-center shrink-0">
              <Factory className="w-4 h-4 text-[#F5A623]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Milling Sessions</p>
              <p className="font-mono font-black text-xl leading-none text-white">{advanced.millingSessionCount}</p>
            </div>
          </div>
          <div className="p-4 bg-[#1A1A1A] border border-neutral-800 rounded-2xl flex flex-col justify-between gap-3">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Warehouse className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Inventory Value</p>
              <p className="font-mono font-black text-xl leading-none text-emerald-400">{fmt(advanced.totalValuation)}</p>
            </div>
          </div>
          <div className="p-4 bg-[#1A1A1A] border border-neutral-800 rounded-2xl flex flex-col justify-between gap-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Total AR Due</p>
              <p className="font-mono font-black text-xl leading-none text-red-400">{fmt(totalAR)}</p>
            </div>
          </div>
          <div className="p-4 bg-[#1A1A1A] border border-neutral-800 rounded-2xl flex flex-col justify-between gap-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Payments Received</p>
              <p className="font-mono font-black text-xl leading-none text-purple-400">{fmt(totalPaymentReceived)}</p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            SECTION 3 — MONTHLY REVENUE TREND (full width)
        ════════════════════════════════════════════ */}
        <section aria-label="Monthly Revenue Trend">
          <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#F5A623]" />
                <h2 className="font-black text-base uppercase tracking-wider">Monthly Revenue Trend</h2>
              </div>
              <span className="text-[10px] text-neutral-500 font-semibold">Last 6 months</span>
            </div>
            <MonthlySalesAreaChart data={advanced.monthlySales} />
          </div>
        </section>

        {/* ════════════════════════════════════════════
            SECTION 4 — AR AGING + GODOWN VALUATION
        ════════════════════════════════════════════ */}
        <section aria-label="AR Aging and Godown Valuation" className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* AR Aging */}
          <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-400" />
                <h2 className="font-black text-base uppercase tracking-wider">AR Aging</h2>
              </div>
              <span className="font-mono font-black text-base text-red-400">{fmt(totalAR)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {advanced.arSummary.map((bucket, i) => {
                const configs = [
                  'bg-emerald-500/15 text-emerald-300 border-emerald-800/60',
                  'bg-amber-500/15 text-amber-300 border-amber-800/60',
                  'bg-red-500/15 text-red-300 border-red-800/60'
                ];
                return (
                  <div key={bucket.name} className={`p-3 rounded-xl border text-center ${configs[i]}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">{bucket.name}</p>
                    <p className="font-mono font-black text-sm">{fmt(bucket.value)}</p>
                  </div>
                );
              })}
            </div>

            <ARAgingBarChart data={advanced.arSummary} />
          </div>

          {/* Godown Valuation (Grouped & Split by Godown) */}
          <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-black text-base uppercase tracking-wider">Godown Valuation Report</h2>
                </div>
                <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">Split by Godown &amp; Stock Category</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-neutral-400 block">Total Inventory Value</span>
                <span className="font-mono font-black text-lg text-emerald-400">{fmt(advanced.totalValuation)}</span>
              </div>
            </div>

            {/* Split Godowns List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {!godownSummary || godownSummary.length === 0 ? (
                <div className="p-6 border border-dashed border-neutral-800 rounded-xl text-center text-xs font-bold text-neutral-500 uppercase">
                  No active godown stock found
                </div>
              ) : (
                godownSummary.map((godown: any) => {
                  const isRiceGodown = (godown.godownType || '').toUpperCase() === 'RICE' ||
                                       godown.godownName.toLowerCase().includes('rice') || 
                                       godown.godownName.toLowerCase().includes('central') ||
                                       godown.godownName.toLowerCase().includes('finish') ||
                                       (godown.items && godown.items.some((i: any) => i.category === 'FINISHED_GOOD' || (i.product || '').toLowerCase().includes('rice')));
                  
                  return (
                    <div key={godown.godownId} className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2.5 hover:border-emerald-500/40 transition-colors">
                      
                      {/* Godown Header */}
                      <div className="flex justify-between items-center border-b border-neutral-800/80 pb-2">
                        <div>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                            <span>{isRiceGodown ? '🍚' : '🌾'}</span>
                            <span>{godown.godownName}</span>
                          </h3>
                          <span className="text-[10px] text-neutral-400 font-medium block">
                            {isRiceGodown ? 'Central Rice Storage Godown' : (godown.location || 'Storage Godown')}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-emerald-400 block">
                            {fmt(godown.totalValue)}
                          </span>
                          <span className="text-[10px] font-mono text-sky-300 block">
                            {godown.totalQuantityKg.toLocaleString('en-IN')} kg
                          </span>
                        </div>
                      </div>

                      {/* Items in this Godown grouped by Category */}
                      <div className="space-y-3 pt-1">
                        {(() => {
                          const grouped = godown.items.reduce((acc: any, item: any) => {
                            const cat = item.category || 'RAW_MATERIAL';
                            if (!acc[cat]) acc[cat] = [];
                            acc[cat].push(item);
                            return acc;
                          }, {});
                          
                          return Object.entries(grouped).map(([category, items]: [string, any]) => {
                            const catLabel = (category === 'FINISHED_GOOD' || category === 'RICE' || category.includes('FINISHED')) ? 'RICE' : 
                                             (category === 'RAW_MATERIAL' || category === 'PADDY') ? 'PADDY' : 
                                             category === 'PACKAGING_MATERIAL' ? 'PACKAGING' : 
                                             category === 'SPARE_PART' ? 'SPARES' : 'BYPRODUCT';
                            
                            const catColor = (category === 'FINISHED_GOOD' || category === 'RICE' || category.includes('FINISHED')) ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                              category === 'PACKAGING_MATERIAL' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                              category === 'SPARE_PART' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                                              category === 'BYPRODUCT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                              'bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20';
                            
                            const catValue = items.reduce((sum: number, i: any) => sum + (i.estimatedValue || 0), 0);
                            const catQty = items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
                            const qtyUnit = (category === 'PACKAGING_MATERIAL' || category === 'SPARE_PART') ? 'units' : 'kg';
                            
                            return (
                              <div key={category} className="space-y-1.5 bg-[#121212]/50 p-2 rounded-xl border border-neutral-800/40">
                                <div className="flex justify-between items-center px-1 pb-1">
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${catColor}`}>
                                    {catLabel}
                                  </span>
                                  <div className="text-right flex items-center gap-3">
                                    <span className="text-[10px] text-neutral-400 font-mono">{catQty.toLocaleString('en-IN')} {qtyUnit}</span>
                                    <span className="text-[10px] font-bold text-emerald-400/90 font-mono min-w-[70px]">{fmt(catValue)}</span>
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  {items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-1.5 px-3 mx-1 bg-neutral-900/60 rounded-lg">
                                      <span className="font-semibold text-neutral-300 text-[11px] truncate max-w-[140px] sm:max-w-[180px]">{item.product}</span>
                                      <div className="flex items-center gap-3 text-right font-mono">
                                        <span className="text-neutral-500 text-[10px]">{item.quantity.toLocaleString('en-IN')} kg</span>
                                        <span className="font-bold text-emerald-500/70 text-[10px] min-w-[60px]">{fmt(item.estimatedValue || 0)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            SECTION 5 — PROCUREMENT TREND + SALES VELOCITY
        ════════════════════════════════════════════ */}
        <section aria-label="Procurement and Sales" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <h2 className="font-black text-base uppercase tracking-wider">Procurement Rate Trend</h2>
            </div>
            <p className="text-[11px] text-neutral-500">Avg paddy rate per kg (₹) by month</p>
            <SupplierTrendLineChart data={advanced.supplierTrends} />
          </div>

          <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-purple-400" />
              <h2 className="font-black text-base uppercase tracking-wider">Top Selling Products</h2>
            </div>
            <p className="text-[11px] text-neutral-500">Top 5 by quantity sold (kg)</p>
            <SalesVelocityBarChart data={advanced.salesVelocity} />
          </div>
        </section>

        {/* ════════════════════════════════════════════
            SECTION 6 — PAYMENT MODES + VEHICLE PROFITABILITY
        ════════════════════════════════════════════ */}
        <section aria-label="Payments and Vehicles" className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Payment Mode Breakdown */}
          <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <h2 className="font-black text-base uppercase tracking-wider">Payment Mode Breakdown</h2>
            </div>
            <p className="text-[11px] text-neutral-500">Total receipts received via Cash, Bank, and UPI</p>
            <PaymentModeBarChart data={advanced.paymentModeBreakdown} />
            {/* Pill legend */}
            <div className="flex flex-wrap gap-2 pt-1">
              {advanced.paymentModeBreakdown.map((pm) => {
                const colors: Record<string, string> = { CASH: 'bg-emerald-500/20 text-emerald-300', BANK: 'bg-blue-500/20 text-blue-300', UPI: 'bg-purple-500/20 text-purple-300' };
                return (
                  <span key={pm.mode} className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${colors[pm.mode] || 'bg-neutral-700 text-neutral-300'}`}>
                    {pm.mode}: {fmt(pm.amount)}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Vehicle Profitability */}
          <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-400" />
              <h2 className="font-black text-base uppercase tracking-wider">Vehicle Profitability</h2>
            </div>
            <p className="text-[11px] text-neutral-500">Freight income vs maintenance expenses per vehicle</p>
            <VehicleProfitabilityBarChart data={advanced.vehicleProfitability} />
          </div>
        </section>

        {/* ════════════════════════════════════════════
            SECTION 7 — HAMALI & BROKER + LABOR BREAKDOWN
        ════════════════════════════════════════════ */}
        <section aria-label="Labor and Broker" className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Hamali & Broker Efficiency */}
          <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="font-black text-base uppercase tracking-wider">Hamali & Broker</h2>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300/60 mb-0.5">Cost Per Ton</p>
                <p className="font-mono font-black text-2xl text-indigo-300">
                  ₹{advanced.hamaliEfficiency.costPerTon.toFixed(2)} <span className="text-xs font-normal opacity-60">/ ton</span>
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300/60 mb-0.5">Total Volume Handled</p>
                <p className="font-mono font-black text-lg text-white">{advanced.hamaliEfficiency.totalTons.toFixed(1)} <span className="text-xs text-neutral-400">tons</span></p>
                <p className="text-[10px] text-neutral-500">Total Wages: {fmt(advanced.hamaliEfficiency.totalWage)}</p>
              </div>
            </div>

            {/* Labor Work Type Breakdown */}
            {advanced.laborBreakdown.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Labour by Work Type</p>
                {advanced.laborBreakdown.map((lb) => (
                  <div key={lb.workType} className="flex items-center justify-between px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
                    <span className="font-bold uppercase tracking-wider text-neutral-300">{lb.workType.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-black text-[#F5A623]">{fmt(lb.totalWage)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Top Brokers */}
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Top Brokers by Commission</p>
              {advanced.brokerStats.length === 0 ? (
                <div className="p-3 border border-dashed border-neutral-800 rounded-xl text-center text-xs font-bold text-neutral-500 uppercase">No commissions paid yet</div>
              ) : (
                advanced.brokerStats.sort((a, b) => b.commission - a.commission).slice(0, 5).map((b, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-[#F5A623]/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#F5A623]/20 text-[#F5A623] text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="font-bold uppercase tracking-wider text-xs text-white">{b.broker}</span>
                    </div>
                    <span className="font-mono font-black text-amber-400 text-xs">{fmt(b.commission)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Yield + Expense Pie */}
          <div className="space-y-5">
            <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-400" />
                <h2 className="font-black text-base uppercase tracking-wider">Milling Yield</h2>
              </div>
              <p className="text-[11px] text-neutral-500">Fine rice, broken, bran & husk as % of paddy</p>
              <YieldPieChart data={advanced.yieldAnalytics} />
            </div>

            <div className="p-5 sm:p-6 bg-[#1A1A1A] border border-neutral-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-rose-400" />
                <h2 className="font-black text-base uppercase tracking-wider">Expense Breakdown</h2>
              </div>
              <p className="text-[11px] text-neutral-500">Total outflows per expense category</p>
              <ExpensePieChart data={advanced.expenseBreakdown} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

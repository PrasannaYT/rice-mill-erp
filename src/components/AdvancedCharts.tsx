'use client';

import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart, ReferenceLine
} from 'recharts';
import { Download, TrendingUp } from 'lucide-react';

// ─── SHARED TOOLTIP STYLES ────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#1A1A1A',
  border: '1px solid #333',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
  fontFamily: 'monospace',
};

const gridColor = '#262626';
const axisColor = '#555';

// ─── YIELD PIE CHART ─────────────────────────────────────────────────────────
export function YieldPieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-xs font-bold uppercase">
        No milling data available
      </div>
    );

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '']}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom Legend Rows */}
      <div className="mt-2 space-y-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-[11px] font-semibold text-neutral-300">{entry.name}</span>
            </div>
            <span className="font-mono font-black text-xs" style={{ color: entry.color }}>
              {entry.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EXPENSE PIE CHART ────────────────────────────────────────────────────────
export function ExpensePieChart({ data }: { data: any[] }) {
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-xs font-bold uppercase">
        No expenses recorded
      </div>
    );

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={85}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-2 space-y-2">
        {data.slice(0, 5).map((entry, index) => (
          <div key={entry.name} className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-[11px] font-semibold text-neutral-300 truncate max-w-[150px]">{entry.name}</span>
            </div>
            <span className="font-mono font-black text-xs text-neutral-300">
              ₹{entry.value.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
        {data.length > 5 && (
          <p className="text-[10px] text-neutral-500 text-center">+{data.length - 5} more categories</p>
        )}
      </div>
    </div>
  );
}

// ─── AR AGING BAR CHART ───────────────────────────────────────────────────────
export function ARAgingBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0 || data.every(d => d.value === 0))
    return (
      <div className="flex items-center justify-center h-32 text-emerald-400 text-xs font-bold uppercase">
        ✓ No outstanding dues
      </div>
    );

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Outstanding']} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── PROCUREMENT TREND LINE CHART ─────────────────────────────────────────────
export function SupplierTrendLineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-xs font-bold uppercase">
        No procurement data
      </div>
    );

  const avg = data.reduce((s, d) => s + d.avgPricePerKg, 0) / data.length;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} domain={['auto', 'auto']} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`₹${Number(value).toFixed(2)}/kg`, 'Avg Price']} />
        <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Avg', fill: '#f59e0b', fontSize: 10 }} />
        <Area type="monotone" dataKey="avgPricePerKg" stroke="#3b82f6" strokeWidth={2.5} fill="url(#priceGrad)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#60a5fa' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── VEHICLE PROFITABILITY BAR CHART ──────────────────────────────────────────
export function VehicleProfitabilityBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-xs font-bold uppercase">
        No vehicle data
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="25%" barGap={2}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="vehicle" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#888', paddingTop: 8 }} />
        <Bar dataKey="income" name="Freight Income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── SALES VELOCITY HORIZONTAL BAR CHART ──────────────────────────────────────
export function SalesVelocityBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-xs font-bold uppercase">
        No sales data
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
            <stop offset="100%" stopColor="#d946ef" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
        <XAxis type="number" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis
          dataKey="product"
          type="category"
          width={110}
          tick={{ fill: '#aaa', fontSize: 10, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.length > 14 ? v.slice(0, 14) + '…' : v}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${Number(value).toLocaleString('en-IN')} kg`, 'Sold']} />
        <Bar dataKey="quantity" fill="url(#salesGrad)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── EXPORT CSV BUTTON ────────────────────────────────────────────────────────
export function ExportCSVButton({ pnl, advanced }: { pnl: any; advanced: any }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    try {
      let csv = "RICE MILL ERP - EXPORTED REPORT\n\n";

      csv += "PROFIT & LOSS\n";
      csv += `Revenue,${pnl.revenue}\n`;
      csv += `COGS (Procurement),${pnl.cogs.procurement}\n`;
      csv += `COGS (Labor),${pnl.cogs.labor}\n`;
      csv += `Gross Profit,${pnl.grossProfit}\n`;
      csv += `Net Profit,${pnl.netProfit}\n`;
      csv += `Net Margin %,${pnl.netMarginPercentage.toFixed(2)}%\n\n`;

      csv += "ACCOUNTS RECEIVABLE (CUSTOMER DUES)\n";
      csv += "Customer,Invoice,Date,Due Amount,Days Overdue\n";
      advanced.arAging.forEach((inv: any) => {
        csv += `${inv.customer},${inv.invoiceNumber},${inv.date},${inv.dueAmount},${inv.ageDays}\n`;
      });

      csv += "\nINVENTORY VALUATION BY GODOWN\n";
      csv += "Godown,Product,Category,Quantity (kg),Estimated Value (Rs)\n";
      advanced.valuation.forEach((v: any) => {
        csv += `${v.godownName || 'Main Storage'},${v.product},${v.category},${v.quantity},${v.estimatedValue}\n`;
      });
      csv += `TOTAL VALUATION,,,,${advanced.totalValuation}\n`;

      csv += "\nSALES VELOCITY (TOP PRODUCTS)\n";
      csv += "Product,Quantity Sold (kg)\n";
      advanced.salesVelocity.forEach((v: any) => {
        csv += `${v.product},${v.quantity}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Mill_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2.5 bg-[#F5A623] hover:bg-[#d98e19] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border-2 border-black active:scale-95 transition-all min-h-[44px] disabled:opacity-60"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export CSV'}</span>
    </button>
  );
}

// ─── MONTHLY SALES AREA CHART ─────────────────────────────────────────────────
export function MonthlySalesAreaChart({ data }: { data: any[] }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-xs font-bold uppercase">
        No sales data for the last 6 months
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F5A623" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: any) =>
            [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']
          }
        />
        <Area type="monotone" dataKey="revenue" stroke="#F5A623" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 4, fill: '#F5A623', strokeWidth: 0 }} activeDot={{ r: 6 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── PAYMENT MODE BAR CHART ───────────────────────────────────────────────────
export function PaymentModeBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-xs font-bold uppercase">
        No payment receipts recorded
      </div>
    );

  const COLORS: Record<string, string> = {
    CASH: '#10b981',
    BANK: '#3b82f6',
    UPI: '#8b5cf6',
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="mode" tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Received']} />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.mode] || '#aaa'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  Users, Activity, Truck, PackageOpen,
  ShoppingCart, Landmark, PieChart,
  Settings, LogOut, AlertTriangle,
  Wheat, ChevronRight, TrendingUp, TrendingDown,
  ClipboardList, Factory
} from "lucide-react";
import { ReportService } from "@/services/reportService";
import { AppHeader } from "@/components/ui/AppHeader";
import { getServerSession as gss } from "next-auth";

export const metadata = {
  title: 'Dashboard — Rice Mill ERP',
  description: 'Central command center for the Rice Mill ERP system.',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const role = session.user?.role;

  const modules = [
    {
      title: "Master Data",
      desc: "Suppliers, customers & setup",
      href: "/admin/master-data",
      icon: Settings,
      accentColor: "#64748b",
      glowColor: "rgba(100,116,139,0.15)",
      borderColor: "rgba(100,116,139,0.4)",
      allowedRoles: ['ADMIN', 'MANAGER']
    },
    {
      title: "Procurement",
      desc: "Inbound paddy & weighbridge",
      href: "/operator/procurement",
      icon: Truck,
      accentColor: "#d97706",
      glowColor: "rgba(217,119,6,0.15)",
      borderColor: "rgba(217,119,6,0.4)",
      allowedRoles: ['ADMIN', 'MANAGER', 'WEIGHBRIDGE_OPERATOR', 'ACCOUNTANT']
    },
    {
      title: "Inventory",
      desc: "Godowns & stock levels",
      href: "/admin/inventory",
      icon: PackageOpen,
      accentColor: "#0284c7",
      glowColor: "rgba(2,132,199,0.15)",
      borderColor: "rgba(2,132,199,0.4)",
      allowedRoles: ['ADMIN', 'MANAGER', 'FLOOR_MANAGER']
    },
    {
      title: "Sales & Dispatch",
      desc: "Invoicing & outbound",
      href: "/operator/sales",
      icon: ShoppingCart,
      accentColor: "#4f46e5",
      glowColor: "rgba(79,70,229,0.15)",
      borderColor: "rgba(79,70,229,0.4)",
      allowedRoles: ['ADMIN', 'MANAGER', 'WEIGHBRIDGE_OPERATOR', 'ACCOUNTANT']
    },
    {
      title: "Cashier",
      desc: "Accounting & payments",
      href: "/operator/accounting",
      icon: Landmark,
      accentColor: "#dc2626",
      glowColor: "rgba(220,38,38,0.15)",
      borderColor: "rgba(220,38,38,0.4)",
      allowedRoles: ['ADMIN', 'MANAGER', 'ACCOUNTANT']
    },
    {
      title: "Hamali & Payroll",
      desc: "Wages & labor ledgers",
      href: "/operator/payroll",
      icon: Users,
      accentColor: "#7c3aed",
      glowColor: "rgba(124,58,237,0.15)",
      borderColor: "rgba(124,58,237,0.4)",
      allowedRoles: ['ADMIN', 'MANAGER', 'ACCOUNTANT']
    },
    {
      title: "Reports & P&L",
      desc: "Financial analytics",
      href: "/admin/reports",
      icon: PieChart,
      accentColor: "#059669",
      glowColor: "rgba(5,150,105,0.15)",
      borderColor: "rgba(5,150,105,0.4)",
      allowedRoles: ['ADMIN', 'MANAGER']
    },
    {
      title: "Fleet & Vehicles",
      desc: "Vehicle compliance & costs",
      href: "/operator/vehicles",
      icon: Truck,
      accentColor: "#0d9488",
      glowColor: "rgba(13,148,136,0.15)",
      borderColor: "rgba(13,148,136,0.4)",
      allowedRoles: ['ADMIN', 'MANAGER', 'WEIGHBRIDGE_OPERATOR']
    },
    {
      title: "User Management",
      desc: "Roles & access control",
      href: "/admin/users",
      icon: Users,
      accentColor: "#9333ea",
      glowColor: "rgba(147,51,234,0.15)",
      borderColor: "rgba(147,51,234,0.4)",
      allowedRoles: ['ADMIN']
    },
  ];

  const allowedModules = modules.filter(m => m.allowedRoles.includes(role));

  const in15Days = new Date();
  in15Days.setDate(in15Days.getDate() + 15);

  const [expiringVehicles, pnl, pendingPayments, laborCount] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        ownershipType: 'OWNED',
        OR: [
          { insuranceExpiry: { lte: in15Days } },
          { fitnessExpiry: { lte: in15Days } },
          { pollutionExpiry: { lte: in15Days } }
        ]
      },
      select: { licensePlate: true }
    }),
    ReportService.generatePnL().catch(() => null),
    prisma.salesInvoice.count({
      where: { status: { in: ['FINALIZED', 'PARTIALLY_PAID'] } }
    }),
    prisma.laborer.count(),
  ]);

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = session.user?.name?.split(' ')[0] ?? 'User';

  return (
    <div className="min-h-screen bg-[#0A0A0A]">

      {/* Unified AppHeader — logo mode, no back button */}
      <AppHeader
        title=""
        showBack={false}
        showLogo={true}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* ── ALERT BANNER ── */}
        {expiringVehicles.length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-red-950/50 border border-red-900/50 rounded-2xl">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-black text-red-300 text-sm">Vehicle Documents Expiring Soon</p>
              <p className="text-red-400/70 text-xs mt-0.5 truncate">
                {expiringVehicles.map(v => v.licensePlate).join(', ')} — within 15 days
              </p>
            </div>
            <Link href="/operator/vehicles"
              className="shrink-0 px-3 py-1.5 bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-black uppercase rounded-xl hover:bg-red-900 transition-colors">
              Fix →
            </Link>
          </div>
        )}

        {/* ── GREETING ── */}
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-neutral-600 mb-1">{dateStr}</p>
          <h2 className="font-black text-2xl sm:text-4xl text-white leading-tight">
            {greeting},<br />
            <span className="text-[#F5A623]">{firstName}.</span>
          </h2>
        </div>

        {/* ── KPI STRIP ── */}
        {pnl && (role === 'ADMIN' || role === 'MANAGER') && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Revenue',
                value: `₹${(pnl.revenue / 100000).toFixed(1)}L`,
                icon: TrendingUp,
                color: '#0284c7',
                bg: 'rgba(2,132,199,0.12)',
                border: 'rgba(2,132,199,0.25)'
              },
              {
                label: 'Net Profit',
                value: `₹${(pnl.netProfit / 100000).toFixed(1)}L`,
                icon: pnl.netProfit >= 0 ? TrendingUp : TrendingDown,
                color: pnl.netProfit >= 0 ? '#059669' : '#dc2626',
                bg: pnl.netProfit >= 0 ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.12)',
                border: pnl.netProfit >= 0 ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'
              },
              {
                label: 'Pending Dues',
                value: `${pendingPayments} inv`,
                icon: ClipboardList,
                color: '#d97706',
                bg: 'rgba(217,119,6,0.12)',
                border: 'rgba(217,119,6,0.25)'
              },
              {
                label: 'Active Labor',
                value: `${laborCount}`,
                icon: Users,
                color: '#7c3aed',
                bg: 'rgba(124,58,237,0.12)',
                border: 'rgba(124,58,237,0.25)'
              },
            ].map(kpi => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label}
                  className="rounded-2xl p-4 border flex flex-col justify-between gap-3"
                  style={{ background: kpi.bg, borderColor: kpi.border }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${kpi.color}25` }}>
                    <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">{kpi.label}</p>
                    <p className="font-mono font-black text-xl leading-none" style={{ color: kpi.color }}>{kpi.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MODULE GRID ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-600">
              Modules
            </p>
            <span className="text-[10px] text-neutral-700 font-black uppercase">{allowedModules.length} available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {allowedModules.map(mod => {
              const Icon = mod.icon;
              return (
                <Link key={mod.href} href={mod.href}
                  className="group block no-underline"
                  style={{ '--glow': mod.glowColor, '--border-hover': mod.borderColor } as React.CSSProperties}>
                  <div
                    className="relative flex items-center gap-4 p-4 sm:p-5 min-h-[64px] bg-[#141414] rounded-2xl border border-neutral-800 transition-all duration-200 hover:border-[var(--border-hover)] hover:shadow-[0_0_24px_var(--glow)] active:scale-[0.98] active:opacity-80"
                  >
                    {/* Icon box */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ background: mod.glowColor, border: `1px solid ${mod.borderColor}` }}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: mod.accentColor }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm sm:text-base leading-tight truncate">{mod.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">{mod.desc}</p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight
                      className="w-4 h-4 text-neutral-700 group-hover:text-[#F5A623] transition-colors shrink-0"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="pt-4 border-t border-neutral-900 flex items-center justify-between">
          <p className="text-[11px] text-neutral-700 font-semibold">Rice Mill ERP · All rights reserved</p>
          <p className="text-[11px] text-neutral-700">v2.0</p>
        </div>

      </div>
    </div>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { IndianRupee, FileText, Landmark } from "lucide-react";
import Link from 'next/link';
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = {
  title: 'Sales & Revenue Analytics - Rice Mill ERP',
};

export default async function SalesDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER')) {
    redirect('/dashboard');
  }

  // Fetch recent invoices
  const invoices = await prisma.salesInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      customer: true,
      user: true,
    }
  });

  // Calculate high-level aggregates
  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.grandTotal), 0);
  const totalGst = invoices.reduce((sum, i) => sum + Number(i.taxTotal), 0);
  const totalInvoices = invoices.length;
  
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AppHeader title="Sales & Revenue Analytics" subtitle="Recent dispatches and revenue data" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Sales'}]} />
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger">
          <div className="card-brutal p-6 bg-[var(--surface-2)] animate-fade-up">
            <div className="flex items-center text-[var(--green)] font-display font-bold uppercase tracking-widest mb-2">
              <IndianRupee className="h-5 w-5 mr-2" /> <span>Gross Revenue (Recent)</span>
            </div>
            <p className="text-3xl font-black text-[var(--text)] tabular-nums mt-2">
              ₹ {totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card-brutal p-6 bg-[var(--surface-2)] animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center text-[var(--rust)] font-display font-bold uppercase tracking-widest mb-2">
              <Landmark className="h-5 w-5 mr-2" /> <span>GST Liability</span>
            </div>
            <p className="text-3xl font-black text-[var(--text)] tabular-nums mt-2">
              ₹ {totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card-brutal p-6 bg-[var(--surface-2)] animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center text-[var(--gold)] font-display font-bold uppercase tracking-widest mb-2">
              <FileText className="h-5 w-5 mr-2" /> <span>Invoices Generated</span>
            </div>
            <p className="text-3xl font-black text-[var(--text)] tabular-nums mt-2">
              {totalInvoices}
            </p>
          </div>
        </div>
        
        <div className="card-brutal p-0 overflow-hidden bg-[var(--surface)] animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="p-6 border-b-2 border-[var(--border)] bg-[var(--charcoal)] text-white">
            <h2 className="font-display font-black text-xl uppercase tracking-widest">Recent Dispatches</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-[var(--border)]">
              <thead className="bg-[var(--dust)]">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Invoice No.</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Subtotal</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">GST</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[var(--dust)]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--surface-2)] transition-colors relative group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[var(--muted)] tabular-nums">
                      <Link href={`/invoice/${inv.id}`} className="absolute inset-0 z-10" aria-label={`View Invoice ${inv.invoiceNumber}`}></Link>
                      {format(new Date(inv.createdAt), "MMM dd, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[var(--green)] font-mono uppercase">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[var(--text)]">
                      {inv.customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-[var(--muted)] tabular-nums">
                      ₹{Number(inv.subtotal).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-[var(--rust)] tabular-nums">
                      +₹{Number(inv.taxTotal).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-[var(--text)] tabular-nums text-lg group-hover:text-[var(--accent)] transition-colors">
                      ₹{Number(inv.grandTotal).toFixed(2)} <span className="text-xs opacity-0 group-hover:opacity-100 ml-2">VIEW &rarr;</span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-[var(--muted)]">
                      No invoices generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

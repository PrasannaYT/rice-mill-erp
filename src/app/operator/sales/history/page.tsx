import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";
import { format } from "date-fns";
import { FileText, ArrowLeft, ArrowRight } from "lucide-react";

export const metadata = {
  title: 'Invoice History - Rice Mill ERP',
};

export default async function InvoiceHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const invoices = await prisma.salesInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      invoiceNumber: true,
      grandTotal: true,
      status: true,
      createdAt: true,
      customer: { select: { name: true } },
    }
  });

  return (
    <div className="min-h-screen pb-32">
      <AppHeader title="Invoice History" subtitle="Recent Sales & Dispatches" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Sales', href: '/operator/sales'}, {label: 'History'}]} />
      
      <div className="page-wrapper">
        <div className="mb-4">
          <Link href="/operator/sales" className="text-[var(--accent)] font-bold flex items-center mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to New Sale
          </Link>
        </div>

        <div className="grid gap-4">
          {invoices.length === 0 ? (
            <div className="bg-[var(--surface-1)] border-2 border-[var(--ink)] shadow-brutal-sm p-8 text-center font-bold">
              No invoices found.
            </div>
          ) : (
            invoices.map((invoice) => (
              <Link key={invoice.id} href={`/invoice/${invoice.id}`}>
                <div className="bg-[var(--surface-1)] border-2 border-[var(--ink)] shadow-brutal-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:translate-y-[-2px] transition-transform cursor-pointer">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="bg-[var(--accent)] text-white p-3 border-2 border-[var(--ink)]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{invoice.customer.name}</h3>
                      <div className="text-sm font-medium opacity-80 flex flex-wrap gap-x-4">
                        <span>Inv: {invoice.invoiceNumber}</span>
                        <span>Date: {format(new Date(invoice.createdAt), 'dd-MMM-yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t-2 sm:border-t-0 border-[var(--ink)] sm:border-transparent pt-4 sm:pt-0">
                    <div className="text-right">
                      <div className="text-xs font-bold opacity-70">TOTAL</div>
                      <div className="font-black text-xl text-[var(--green)]">₹{Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-50 hidden sm:block" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

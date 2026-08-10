import Link from 'next/link';
import { AppHeader } from "@/components/ui/AppHeader";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

export const metadata = {
  title: 'Procurement Dashboard - Rice Mill ERP',
};

export default async function AdminProcurementPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER')) {
    redirect('/dashboard');
  }

  // Fetch recent batches including supplier data
  const batches = await prisma.procurementBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      supplier: true,
    }
  });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AppHeader title="Executive Procurement Dashboard" subtitle="Recent procurement batches and statuses" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Procurement'}]} />
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        
        {/* Desktop Table View */}
        <div className="card-brutal p-0 overflow-hidden hidden md:block animate-fade-up">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead className="bg-[var(--surface-2)] border-b-2 border-[var(--border)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Gross (kg)</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Moisture (B/A)</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Shortage (kg)</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Liability</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 ">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-[var(--surface)] transition-colors group">
                    <td className="p-4 whitespace-nowrap text-sm font-bold text-[var(--muted)] tabular-nums border-t-2 border-dashed border-[var(--dust)]">
                      {format(new Date(batch.createdAt), "MMM dd, yyyy")}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm font-black text-[var(--text)] uppercase border-t-2 border-dashed border-[var(--dust)]">
                      {batch.supplier.name}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-right font-bold text-[var(--muted)] tabular-nums border-t-2 border-dashed border-[var(--dust)]">
                      {batch.grossWeight.toString()}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-right font-bold text-[var(--muted)] tabular-nums border-t-2 border-dashed border-[var(--dust)]">
                      {batch.beforeDryingMoisture ? `${batch.beforeDryingMoisture.toString()}% / ${batch.afterDryingMoisture?.toString()}%` : '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-right font-black text-[var(--orange)] tabular-nums border-t-2 border-dashed border-[var(--dust)]">
                      {batch.dryingShortage ? batch.dryingShortage.toString() : '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-right font-black text-[var(--text)] tabular-nums border-t-2 border-dashed border-[var(--dust)]">
                      {batch.totalPayable ? `₹${batch.totalPayable.toString()}` : '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm border-t-2 border-dashed border-[var(--dust)]">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border-2 border-[var(--border)] shadow-[2px_2px_0px_#0D0D0B] ${
                        batch.status === 'FINALIZED' ? 'bg-[var(--green)] text-white' :
                        batch.status === 'PAID' ? 'bg-[var(--blue)] text-white' :
                        'bg-[var(--gold)] text-[var(--ink)]'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-t-2 border-dashed border-[var(--dust)]">
                      No procurement batches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden grid grid-cols-1 gap-4 animate-fade-up">
          {batches.map((batch) => (
            <div key={batch.id} className="card-brutal p-3 sm:p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-base uppercase truncate">{batch.supplier.name}</div>
                  <div className="text-[10px] font-bold text-[var(--muted)] truncate">
                    {format(new Date(batch.createdAt), "MMM dd, yyyy")}
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border-2 border-[var(--border)] shadow-[2px_2px_0px_#0D0D0B] ${
                  batch.status === 'FINALIZED' ? 'bg-[var(--green)] text-white' :
                  batch.status === 'PAID' ? 'bg-[var(--blue)] text-white' :
                  'bg-[var(--gold)] text-[var(--ink)]'
                }`}>
                  {batch.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t-2 border-dashed border-[var(--dust)]">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Gross Wt</div>
                  <div className="font-bold tabular-nums">{batch.grossWeight.toString()} kg</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Moisture</div>
                  <div className="font-bold tabular-nums">{batch.beforeDryingMoisture ? `${batch.beforeDryingMoisture.toString()}% / ${batch.afterDryingMoisture?.toString()}%` : '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--orange)]">Shortage</div>
                  <div className="font-bold tabular-nums text-[var(--orange)]">{batch.dryingShortage ? batch.dryingShortage.toString() : '-'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Liability</div>
                  <div className="font-bold tabular-nums">{batch.totalPayable ? `₹${batch.totalPayable.toString()}` : '-'}</div>
                </div>
              </div>
            </div>
          ))}
          {batches.length === 0 && (
            <div className="p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-4 border-dashed border-[var(--dust)]">
              No procurement batches found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

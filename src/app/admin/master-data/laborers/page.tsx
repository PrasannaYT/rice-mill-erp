import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LaborerRepository } from "@/repositories/masterDataRepository";
import { createLaborerAction, updateLaborerAction, deleteLaborerAction } from "@/app/actions/masterData";
import Link from "next/link";
import { Plus, Trash2, Edit2, HardHat } from "lucide-react";
import SubmitWithConfirm from "@/components/SubmitWithConfirm";
import SearchInput from "@/components/SearchInput";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ServerActionForm } from "@/components/ui/ServerActionForm";
import AddLaborerFAB from "@/components/AddLaborerFAB";

export const metadata = {
  title: 'Laborers & Gangs - Rice Mill ERP',
};

export default async function LaborerMasterDataPage({ searchParams }: { searchParams: Promise<{ edit?: string, q?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  let laborers = await LaborerRepository.list();

  if (params?.q) {
    const q = params.q.toLowerCase();
    laborers = laborers.filter(l => 
      l.name.toLowerCase().includes(q) || 
      (l.contact && l.contact.toLowerCase().includes(q))
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Laborers & Gangs" subtitle="Manage gang-based and monthly laborers" backHref="/admin/master-data" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Master Data', href: '/admin/master-data'}, {label: 'Laborers'}]} />
      
      <div className="page-wrapper pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mobile FAB */}
          <AddLaborerFAB createAction={createLaborerAction as unknown as (formData: FormData) => void} />

          {/* Create Form (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 card-brutal p-6 bg-[var(--surface-2)] h-fit animate-fade-up">
            <h2 className="font-display font-black text-xl uppercase tracking-widest mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-3" style={{ color: '#7c3aed' }} aria-hidden="true" /> Add Laborer/Gang
            </h2>
            <ServerActionForm action={createLaborerAction} submitLabel="Save Laborer">
              <Select label="Type *" name="type" required>
                <option value="GANG_BASED">Gang Based (Piece-Rate / Hamali)</option>
                <option value="MONTHLY">Monthly / Salary Worker</option>
              </Select>
              <Input label="Name / Gang Leader *" type="text" name="name" required placeholder="e.g. Ramesh Gang" />
              <Input label="Contact Phone" type="text" name="contact" placeholder="e.g. 9876543210" />
              <Input label="Opening Balance (₹)" type="number" step="0.01" name="balance" placeholder="e.g. 0.00" />
            </ServerActionForm>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <SearchInput placeholder="Search laborers by name or contact..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
              {laborers.map((laborer) => (
                <div key={laborer.id} className="card-brutal p-3 sm:p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {params?.edit === laborer.id ? (
                    <form action={updateLaborerAction} className="flex flex-col gap-4 w-full">
                      <input type="hidden" name="id" value={laborer.id} />
                      <Input type="text" label="Name" name="name" defaultValue={laborer.name} required />
                      <Select label="Type" name="type" defaultValue={laborer.type} required>
                        <option value="GANG_BASED">Gang Based</option>
                        <option value="MONTHLY">Monthly</option>
                      </Select>
                      <Input type="text" label="Contact" name="contact" defaultValue={laborer.contact || ''} />
                      <div className="flex gap-2 justify-end mt-2">
                        <Link href="/admin/master-data/laborers" className="btn btn-ghost h-10 px-4">CANCEL</Link>
                        <Button type="submit" variant="green" className="h-10 px-4">SAVE</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--purple)] flex items-center justify-center text-white font-black shrink-0">
                          <HardHat className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base uppercase truncate">{laborer.name}</div>
                          <div className="text-[10px] font-bold text-[var(--muted)] truncate">
                            {laborer.type.replace('_', ' ')} • {laborer.contact || 'No contact'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 border-t-2 border-dashed border-[var(--dust)] pt-2 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right mr-2 flex-1 sm:flex-none">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] sm:hidden">Balance</div>
                          <div className="font-black text-sm tabular-nums text-[var(--purple)]">₹{laborer.balance.toString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/master-data/laborers?edit=${laborer.id}`} className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--blue)] hover:text-white transition-colors rounded-full" title="Edit Laborer">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <form action={deleteLaborerAction}>
                            <input type="hidden" name="id" value={laborer.id} />
                            <SubmitWithConfirm 
                              confirmMessage="Are you sure you want to delete this laborer/gang?"
                              className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--red)] hover:text-white transition-colors text-[var(--red)] rounded-full"
                            >
                              <Trash2 className="w-4 h-4" />
                            </SubmitWithConfirm>
                          </form>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              {laborers.length === 0 && (
                <div className="col-span-full p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-4 border-dashed border-[var(--dust)]">
                  No laborers found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

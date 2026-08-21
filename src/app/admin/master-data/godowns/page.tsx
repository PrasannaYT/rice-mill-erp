import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GodownRepository } from "@/repositories/masterDataRepository";
import { createGodownAction, updateGodownAction, deleteGodownAction } from "@/app/actions/masterData";
import { Warehouse, Plus, Trash2, Edit2 } from "lucide-react";
import Link from 'next/link';
import SubmitWithConfirm from "@/components/SubmitWithConfirm";
import SearchInput from "@/components/SearchInput";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ServerActionForm } from "@/components/ui/ServerActionForm";
import AddGodownFAB from "@/components/AddGodownFAB";

export default async function GodownsPage({ searchParams }: { searchParams: Promise<{ edit?: string, q?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) redirect('/dashboard');

  let godowns = await GodownRepository.list();
  
  if (params?.q) {
    const q = params.q.toLowerCase();
    godowns = godowns.filter(g => 
      g.name.toLowerCase().includes(q) || 
      (g.location && g.location.toLowerCase().includes(q))
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Godowns & Warehouses" subtitle="Manage storage locations and track warehouse capacity" backHref="/admin/master-data" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Master Data', href: '/admin/master-data'}, {label: 'Godowns'}]} />
      
      <div className="page-wrapper pb-32">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mobile FAB */}
          <AddGodownFAB createAction={createGodownAction as unknown as (formData: FormData) => void} />

          {/* Create Form (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 card-brutal p-6 bg-[var(--surface-2)] h-fit animate-fade-up">
            <h2 className="font-display font-black text-xl uppercase tracking-widest mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-3 text-[var(--gold)]" aria-hidden="true" /> Add Godown
            </h2>
            <ServerActionForm action={createGodownAction} submitLabel="Save Godown">
              <Input label="Godown Name *" type="text" name="name" required placeholder="e.g. Primary Storage" />
              <Select label="Godown Type *" name="type" required>
                <option value="PADDY">Paddy Storage</option>
                <option value="RICE">Rice / Finished Goods</option>
                <option value="PACKAGING">Packaging Material</option>
                <option value="OTHER">Other</option>
              </Select>
              <Input label="Location" type="text" name="location" placeholder="e.g. Unit 1" />
              <Input label="Capacity (KG)" type="number" step="0.01" name="capacity" placeholder="e.g. 5000" />
            </ServerActionForm>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <SearchInput placeholder="Search godowns by name or location..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
              {godowns.map((g) => (
                <div key={g.id} className="card-brutal p-3 sm:p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {params?.edit === g.id ? (
                    <form action={updateGodownAction} className="flex flex-col gap-4 w-full">
                      <input type="hidden" name="id" value={g.id} />
                      <Input type="text" label="Godown Name" name="name" defaultValue={g.name} required />
                      <Select label="Godown Type *" name="type" defaultValue={(g as any).type || 'PADDY'} required>
                        <option value="PADDY">Paddy Storage</option>
                        <option value="RICE">Rice / Finished Goods</option>
                        <option value="PACKAGING">Packaging Material</option>
                        <option value="OTHER">Other</option>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="text" label="Location" name="location" defaultValue={g.location || ''} />
                        <Input type="number" label="Capacity (KG)" step="0.01" name="capacity" defaultValue={g.capacity?.toString() || ''} className="text-right" />
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <Link href="/admin/master-data/godowns" className="btn btn-ghost h-10 px-4">CANCEL</Link>
                        <Button type="submit" variant="green" className="h-10 px-4">SAVE</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--gold)] flex items-center justify-center text-[var(--ink)] font-black shrink-0">
                          <Warehouse className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base uppercase truncate">{g.name}</div>
                          <div className="text-[10px] font-bold text-[var(--muted)] truncate">
                            {g.location || 'No Location specified'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 border-t-2 border-dashed border-[var(--dust)] pt-2 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right mr-2 flex-1 sm:flex-none">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] sm:hidden">Capacity</div>
                          <div className="font-black text-sm tabular-nums text-[var(--blue)]">{g.capacity ? `${g.capacity.toString()} kg` : '-'}</div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/master-data/godowns?edit=${g.id}`} className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--blue)] hover:text-white transition-colors rounded-full" title="Edit Godown">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <form action={deleteGodownAction}>
                            <input type="hidden" name="id" value={g.id} />
                            <SubmitWithConfirm 
                              confirmMessage="Are you sure you want to delete this godown?"
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
              
              {godowns.length === 0 && (
                <div className="col-span-full p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-4 border-dashed border-[var(--dust)]">
                  No godowns found.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

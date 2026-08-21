import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FarmerRepository, SupplierRepository } from "@/repositories/masterDataRepository";
import { createFarmerAction, updateFarmerAction, deleteFarmerAction } from "@/app/actions/masterData";
import { Plus, Trash2, Edit2 } from "lucide-react";
import Link from "next/link";
import SubmitWithConfirm from "@/components/SubmitWithConfirm";
import SearchInput from "@/components/SearchInput";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ServerActionForm } from "@/components/ui/ServerActionForm";
import AddFarmerFAB from "@/components/AddFarmerFAB";

export const metadata = {
  title: 'Farmers - Master Data',
};

export default async function FarmersPage({ searchParams }: { searchParams: Promise<{ edit?: string, q?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  let farmers = await FarmerRepository.list();
  const brokers = await SupplierRepository.list();

  if (params?.q) {
    const q = params.q.toLowerCase();
    farmers = farmers.filter(f => 
      f.name.toLowerCase().includes(q) || 
      (f.contact && f.contact.toLowerCase().includes(q)) || 
      (f.village && f.village.toLowerCase().includes(q)) ||
      (f.broker.name.toLowerCase().includes(q))
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Farmers Directory" subtitle="Manage farmers linked to your brokers" backHref="/admin/master-data" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Master Data', href: '/admin/master-data'}, {label: 'Farmers'}]} />
      
      <div className="page-wrapper pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mobile FAB */}
          <AddFarmerFAB createAction={createFarmerAction as unknown as (formData: FormData) => void} brokers={brokers} />

          {/* Create Form (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 card-brutal p-6 bg-[var(--surface-2)] h-fit animate-fade-up">
            <h2 className="font-display font-black text-xl uppercase tracking-widest mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-3 text-[var(--green)]" aria-hidden="true" /> Add Farmer
            </h2>
            <ServerActionForm action={createFarmerAction} submitLabel="Save Farmer">
              <Input label="Full Name *" type="text" name="name" required placeholder="e.g. Ramesh Kumar" />
              <Select label="Associated Broker *" name="brokerId" required>
                <option value="">Select a Broker...</option>
                {brokers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
              <Input label="Contact Number" type="text" name="contact" placeholder="e.g. 9876543210" />
              <Input label="Village / Address" type="text" name="village" placeholder="e.g. Guntur" />
            </ServerActionForm>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <SearchInput placeholder="Search farmers by name, contact, village or broker..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
              {farmers.map((farmer) => (
                <div key={farmer.id} className="card-brutal p-3 sm:p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {params?.edit === farmer.id ? (
                    <form action={updateFarmerAction} className="flex flex-col gap-4 w-full">
                      <input type="hidden" name="id" value={farmer.id} />
                      <Input type="text" label="Farmer Name" name="name" defaultValue={farmer.name} required />
                      <Select label="Broker" name="brokerId" defaultValue={farmer.brokerId} required>
                        {brokers.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="text" label="Contact" name="contact" defaultValue={farmer.contact || ''} />
                        <Input type="text" label="Village" name="village" defaultValue={farmer.village || ''} />
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <Link href="/admin/master-data/farmers" className="btn btn-ghost h-10 px-4">CANCEL</Link>
                        <Button type="submit" variant="green" className="h-10 px-4">SAVE</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--green)] flex items-center justify-center text-[var(--ink)] font-black shrink-0">
                          {farmer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base uppercase truncate">{farmer.name}</div>
                          <div className="text-[10px] font-bold text-[var(--muted)] truncate">
                            Broker: {farmer.broker.name}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 border-t-2 border-dashed border-[var(--dust)] pt-2 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right mr-2 flex-1 sm:flex-none">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] sm:hidden">Location</div>
                          <div className="font-black text-xs">{farmer.village || 'N/A'}</div>
                          <div className="text-[10px] font-bold text-[var(--muted)]">{farmer.contact || 'No contact'}</div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/master-data/farmers?edit=${farmer.id}`} className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--blue)] hover:text-white transition-colors rounded-full" title="Edit Farmer">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <form action={deleteFarmerAction}>
                            <input type="hidden" name="id" value={farmer.id} />
                            <SubmitWithConfirm 
                              confirmMessage="Are you sure you want to delete this farmer?"
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
              
              {farmers.length === 0 && (
                <div className="col-span-full p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-4 border-dashed border-[var(--dust)]">
                  No farmers found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

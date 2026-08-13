import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SupplierRepository, CustomerRepository } from "@/repositories/masterDataRepository";
import { 
  createSupplierAction, 
  createCustomerAction, 
  updateSupplierAction,
  updateCustomerAction,
  deleteSupplierAction, 
  deleteCustomerAction 
} from "@/app/actions/masterData";
import Link from "next/link";
import { Plus, Trash2, Edit2, Check, X, Users } from "lucide-react";
import SubmitWithConfirm from "@/components/SubmitWithConfirm";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import SearchInput from "@/components/SearchInput";
import AddPersonFAB from "@/components/AddPersonFAB";

export const metadata = {
  title: 'Customers & Suppliers - Rice Mill ERP',
};

async function handleCreateAction(formData: FormData): Promise<void> {
  "use server";
  const role = formData.get('role') as string;
  if (role === 'CUSTOMER') {
    await createCustomerAction(formData);
  } else {
    const categoryMap: Record<string, string> = {
      'BAG_VENDOR': 'BAG_VENDOR',
      'SUPPLIER': 'PADDY_BROKER',
      'RICE_MILL': 'RICE_MILL',
    };
    formData.set('category', categoryMap[role] || 'PADDY_BROKER');
    await createSupplierAction(formData);
  }
}

async function handleUpdateAction(formData: FormData): Promise<void> {
  "use server";
  const role = formData.get('role') as string;
  if (role === 'CUSTOMER') {
    await updateCustomerAction(formData);
  } else {
    const categoryMap: Record<string, string> = {
      'BAG_VENDOR': 'BAG_VENDOR',
      'SUPPLIER': 'PADDY_BROKER',
      'RICE_MILL': 'RICE_MILL',
    };
    formData.set('category', categoryMap[role] || 'PADDY_BROKER');
    await updateSupplierAction(formData);
  }
}

export default async function PeopleMasterDataPage({ searchParams }: { searchParams: Promise<{ edit?: string, q?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  const suppliers = await SupplierRepository.list();
  const customers = await CustomerRepository.list();

  let allPeople = [
    ...suppliers.map(s => ({ ...s, role: ((s as any).category === 'BAG_VENDOR' ? 'BAG_VENDOR' : (s as any).category === 'RICE_MILL' ? 'RICE_MILL' : 'SUPPLIER') as string })),
    ...customers.map(c => ({ ...c, role: 'CUSTOMER' as string }))
  ].sort((a, b) => a.name.localeCompare(b.name));

  if (params?.q) {
    const q = params.q.toLowerCase();
    allPeople = allPeople.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.contact && p.contact.toLowerCase().includes(q)) || 
      (p.gstin && p.gstin.toLowerCase().includes(q))
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Customers & Suppliers" subtitle="Manage master data for sales, procurement, and packaging vendors" backHref="/admin/master-data" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Master Data', href: '/admin/master-data'}, {label: 'People'}]} />
      
      <div className="page-wrapper pb-32">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mobile FAB */}
          <AddPersonFAB createAction={handleCreateAction} />

          {/* Create Form (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 card-brutal p-6 bg-[var(--surface-2)] h-fit animate-fade-up">
            <h2 className="font-display font-black text-xl uppercase tracking-widest mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-3 text-[var(--blue)]" /> Add Person/Company
            </h2>
            <form action={handleCreateAction} className="space-y-6">
              <Select label="Role *" name="role" required>
                <option value="CUSTOMER">Customer (Sales)</option>
                <option value="SUPPLIER">Paddy Broker (Procurement)</option>
                <option value="BAG_VENDOR">Bag Vendor / Packaging Supplier</option>
                <option value="RICE_MILL">Rice Mill Owner</option>
              </Select>
              
              <Input label="Company / Name *" type="text" name="name" required placeholder="e.g. Acme Farms" />
              <Input label="Contact Phone" type="text" name="contact" />
              <Input label="GSTIN" type="text" name="gstin" className="uppercase" />
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">Address</label>
                <textarea name="address" rows={2} className="w-full p-3 font-bold border-2 border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-[var(--border)] shadow-[2px_2px_0px_#0D0D0B] transition-all"></textarea>
              </div>
              
              <Input label="Opening Balance (₹)" type="number" step="0.01" name="balance" placeholder="e.g. 0.00" />
              
              <Button type="submit" variant="primary" className="w-full bg-[var(--ink)] text-white mt-4">
                SAVE CONTACT
              </Button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <SearchInput placeholder="Search customers and suppliers..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
              {allPeople.map((person) => (
                <div key={person.id} className="card-brutal p-3 sm:p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {params?.edit === person.id ? (
                    <form action={handleUpdateAction} className="flex flex-col gap-4 w-full">
                      <input type="hidden" name="id" value={person.id} />
                      <input type="hidden" name="role" value={person.role} />
                      <Badge variant="outline" className="w-fit">{person.role}</Badge>
                      <Input type="text" label="Name" name="name" defaultValue={person.name} required />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="text" label="Contact" name="contact" defaultValue={person.contact || ''} />
                        <Input type="text" label="GSTIN" name="gstin" defaultValue={person.gstin || ''} className="uppercase" />
                      </div>
                      <Input type="number" label="Balance" step="0.01" name="balance" defaultValue={person.balance.toString()} className="text-right" />
                      <div className="flex gap-2 justify-end mt-2">
                        <Link href="/admin/master-data/people" className="btn btn-ghost h-10 px-4">CANCEL</Link>
                        <Button type="submit" variant="green" className="h-10 px-4">SAVE</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black shrink-0 ${person.role === 'CUSTOMER' ? 'bg-[var(--blue)]' : person.role === 'BAG_VENDOR' ? 'bg-[var(--red)]' : 'bg-orange-500'}`}>
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base uppercase truncate">{person.name}</div>
                          <div className="text-[10px] font-bold text-[var(--muted)] truncate">
                            {person.role === 'BAG_VENDOR' ? 'BAG VENDOR' : person.role === 'RICE_MILL' ? 'RICE MILL OWNER' : person.role === 'SUPPLIER' ? 'PADDY BROKER' : person.role} • {person.contact || 'No Contact'} {person.gstin ? `• ${person.gstin.toUpperCase()}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 border-t-2 border-dashed border-[var(--dust)] pt-2 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right mr-2 flex-1 sm:flex-none">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] sm:hidden">Balance</div>
                          <div className="font-black text-sm tabular-nums">₹{person.balance.toString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/master-data/people?edit=${person.id}`} className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--blue)] hover:text-white transition-colors" title="Edit Contact">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <form action={person.role === 'CUSTOMER' ? deleteCustomerAction : deleteSupplierAction}>
                            <input type="hidden" name="id" value={person.id} />
                            <SubmitWithConfirm 
                              confirmMessage={`Are you sure you want to delete this ${person.role.toLowerCase()}?`}
                              className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--red)] hover:text-white transition-colors text-[var(--red)]"
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
              
              {allPeople.length === 0 && (
                <div className="col-span-full p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-4 border-dashed border-[var(--dust)]">
                  No customers or suppliers found.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

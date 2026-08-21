import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BankRepository } from "@/repositories/masterDataRepository";
import { createBankAction, updateBankAction, deleteBankAction } from "@/app/actions/masterData";
import { Coins, Plus, Trash2, Edit2 } from "lucide-react";
import Link from 'next/link';
import SubmitWithConfirm from "@/components/SubmitWithConfirm";
import SearchInput from "@/components/SearchInput";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ServerActionForm } from "@/components/ui/ServerActionForm";
import AddBankFAB from "@/components/AddBankFAB";

export const metadata = {
  title: 'Bank Accounts & Finance - Rice Mill ERP',
};

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ edit?: string, q?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  let banks = await BankRepository.list();

  if (params?.q) {
    const q = params.q.toLowerCase();
    banks = banks.filter(b => 
      b.bankName.toLowerCase().includes(q) || 
      (b.accountNumber && b.accountNumber.toLowerCase().includes(q)) ||
      (b.ifscCode && b.ifscCode.toLowerCase().includes(q))
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Bank Accounts & Finance" subtitle="Manage bank accounts and opening balances" backHref="/admin/master-data" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Master Data', href: '/admin/master-data'}, {label: 'Finance'}]} />
      
      <div className="page-wrapper pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mobile FAB */}
          <AddBankFAB createAction={createBankAction as unknown as (formData: FormData) => void} />

          {/* Create Form (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 card-brutal p-6 bg-[var(--surface-2)] h-fit animate-fade-up">
            <h2 className="font-display font-black text-xl uppercase tracking-widest mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-3 text-[var(--rust)]" aria-hidden="true" /> Add Bank Account
            </h2>
            <ServerActionForm action={createBankAction} submitLabel="Save Bank Account">
              <Input label="Bank Name *" type="text" name="bankName" required placeholder="e.g. State Bank of India" />
              <Input label="Account Number *" type="text" name="accountNumber" required placeholder="e.g. 1234567890" />
              <Input label="IFSC Code" type="text" name="ifscCode" className="uppercase" placeholder="e.g. SBIN0001234" />
              <Input label="Opening Balance (₹)" type="number" step="0.01" name="balance" placeholder="e.g. 500000" />
            </ServerActionForm>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <SearchInput placeholder="Search banks by name, A/C number, or IFSC..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
              {banks.map((b) => (
                <div key={b.id} className="card-brutal p-3 sm:p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {params?.edit === b.id ? (
                    <form action={updateBankAction} className="flex flex-col gap-4 w-full">
                      <input type="hidden" name="id" value={b.id} />
                      <Input type="text" label="Bank Name" name="bankName" defaultValue={b.bankName} required />
                      <Input type="text" label="A/C Number" name="accountNumber" defaultValue={b.accountNumber} required />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="text" label="IFSC Code" name="ifscCode" defaultValue={b.ifscCode || ''} className="uppercase" />
                        <Input type="number" label="Balance" step="0.01" name="balance" defaultValue={b.balance.toString()} className="text-right" />
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <Link href="/admin/master-data/finance" className="btn btn-ghost h-10 px-4">CANCEL</Link>
                        <Button type="submit" variant="green" className="h-10 px-4">SAVE</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--red)] flex items-center justify-center text-[var(--ink)] font-black shrink-0">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base uppercase truncate">{b.bankName}</div>
                          <div className="text-[10px] font-bold text-[var(--muted)] truncate">
                            A/C: {b.accountNumber} {b.ifscCode ? `• IFSC: ${b.ifscCode.toUpperCase()}` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 border-t-2 border-dashed border-[var(--dust)] pt-2 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right mr-2 flex-1 sm:flex-none">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] sm:hidden">Balance</div>
                          <div className="font-black text-sm tabular-nums text-[var(--blue)]">₹{b.balance.toString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/master-data/finance?edit=${b.id}`} className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--blue)] hover:text-white transition-colors rounded-full" title="Edit Bank">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <form action={deleteBankAction}>
                            <input type="hidden" name="id" value={b.id} />
                            <SubmitWithConfirm 
                              confirmMessage="Are you sure you want to delete this bank account?"
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
              
              {banks.length === 0 && (
                <div className="col-span-full p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-4 border-dashed border-[var(--dust)]">
                  No bank accounts found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { ProductRepository } from "@/repositories/masterDataRepository";
import { createProductAction, updateProductAction, deleteProductAction } from "@/app/actions/masterData";
import Link from "next/link";
import { Plus, Trash2, Edit2, Check, X, Package } from "lucide-react";
import SubmitWithConfirm from "@/components/SubmitWithConfirm";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import SearchInput from "@/components/SearchInput";
import { ServerActionForm } from "@/components/ui/ServerActionForm";
import AddProductFAB from "@/components/AddProductFAB";

export const metadata = {
  title: 'Products & Items - Rice Mill ERP',
};



export default async function ProductsMasterDataPage({ searchParams }: { searchParams: Promise<{ edit?: string, q?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER')) {
    redirect('/dashboard');
  }

  let products = await ProductRepository.list();
  
  if (params?.q) {
    const q = params.q.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.hsnCode && p.hsnCode.toLowerCase().includes(q))
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Products & Items" subtitle="Manage raw materials, finished goods, and packaging items" backHref="/admin/master-data" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Master Data', href: '/admin/master-data'}, {label: 'Products'}]} />
      
      <div className="page-wrapper pb-32">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mobile FAB */}
          <AddProductFAB createAction={createProductAction as unknown as (formData: FormData) => void} />

          {/* Create Form (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 card-brutal p-6 bg-[var(--surface-2)] h-fit animate-fade-up">
            <h2 className="font-display font-black text-xl uppercase tracking-widest mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-3 text-[var(--green)]" aria-hidden="true" /> Add Product
            </h2>
            <ServerActionForm action={createProductAction} submitLabel="Save Product">
              <Input label="Product Name *" type="text" name="name" required placeholder="e.g. Fine Rice 25kg" />
              <Select label="Category *" name="category" required>
                <option value="RAW_MATERIAL">Raw Material (Paddy)</option>
                <option value="FINISHED_GOOD">Finished Good (Rice)</option>
                <option value="BYPRODUCT">Byproduct (Bran/Husk)</option>
                <option value="PACKING_MATERIAL">Packing Material (Gunny/Branded Bags)</option>
              </Select>
              <Select label="Unit of Measure *" name="unit" required>
                <option value="KG">Kilogram (KG)</option>
                <option value="QUINTAL">Quintal</option>
                <option value="TONNE">Tonne</option>
                <option value="BAG">Bag</option>
              </Select>
              <Input label="HSN Code" type="text" name="hsnCode" placeholder="e.g. 1006" />
              <Input label="GST Rate (%)" type="number" step="0.01" name="gstRate" placeholder="e.g. 5.00" />
            </ServerActionForm>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <SearchInput placeholder="Search products by name or HSN code..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
              {products.map((product) => (
                <div key={product.id} className="card-brutal p-3 sm:p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {params?.edit === product.id ? (
                    <form action={updateProductAction} className="flex flex-col gap-4 w-full">
                      <input type="hidden" name="id" value={product.id} />
                      <Input type="text" label="Product Name" name="name" defaultValue={product.name} required />
                      <div className="grid grid-cols-2 gap-2">
                        <Select label="Category" name="category" defaultValue={product.category} required>
                          <option value="RAW_MATERIAL">Raw Material</option>
                          <option value="FINISHED_GOOD">Finished Good</option>
                          <option value="BYPRODUCT">Byproduct</option>
                          <option value="PACKING_MATERIAL">Packing Material</option>
                        </Select>
                        <Select label="Unit" name="unit" defaultValue={product.unit} required>
                          <option value="KG">KG</option>
                          <option value="QUINTAL">Quintal</option>
                          <option value="TONNE">Tonne</option>
                          <option value="BAG">Bag</option>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="text" label="HSN Code" name="hsnCode" defaultValue={product.hsnCode || ''} />
                        <Input type="number" label="GST %" step="0.01" name="gstRate" defaultValue={product.gstRate?.toString() || '0'} className="text-right" />
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <Link href="/admin/master-data/products" className="btn btn-ghost h-10 px-4">CANCEL</Link>
                        <Button type="submit" variant="green" className="h-10 px-4">SAVE</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black shrink-0 ${product.category === 'RAW_MATERIAL' ? 'bg-[var(--gold)]' : product.category === 'FINISHED_GOOD' ? 'bg-[var(--green)]' : 'bg-[var(--charcoal)]'}`}>
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base uppercase truncate">{product.name}</div>
                          <div className="text-[10px] font-bold text-[var(--muted)] truncate">
                            {product.category.replace('_', ' ')} • {product.unit} {product.hsnCode ? `• HSN: ${product.hsnCode}` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 border-t-2 border-dashed border-[var(--dust)] pt-2 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right mr-2 flex-1 sm:flex-none">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] sm:hidden">GST Rate</div>
                          <div className="font-black text-sm tabular-nums">{product.gstRate?.toString() || "0"}%</div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/master-data/products?edit=${product.id}`} className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--charcoal)] hover:text-white transition-colors rounded-full" title="Edit Product">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={product.id} />
                            <SubmitWithConfirm 
                              confirmMessage="Are you sure you want to delete this product?"
                              className="w-10 h-10 bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--rust)] hover:text-white transition-colors text-[var(--rust)] rounded-full"
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
              
              {products.length === 0 && (
                <div className="col-span-full p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-4 border-dashed border-[var(--dust)]">
                  No products found.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

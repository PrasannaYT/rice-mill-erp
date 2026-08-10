'use client';

import { Tags, Edit2, Trash2, ArrowRight, Check, X } from 'lucide-react';
import { Input, Select } from '@/components/ui/Input';
import Link from 'next/link';
import { updatePackingItemAction, deletePackingItemAction } from "@/app/actions/packingItem";
import SubmitWithConfirm from "@/components/SubmitWithConfirm";
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type Godown = { id: string; name: string; type?: string };
type Supplier = { id: string; name: string };

type PackingItemData = {
  id: string;
  brandName: string;
  capacityKg: number | string | { toString(): string };
  quantityBags: number | string | { toString(): string };
  perBagRate: number | string | { toString(): string };
  godownId: string;
  hsnCode?: string | null;
  status?: string;
  godown: { name: string };
  supplier?: { id: string; name: string } | null;
};

export default function PackingInventorySection({
  packingItems,
  godowns,
  editPackingId,
}: {
  packingItems: PackingItemData[];
  godowns: Godown[];
  suppliers?: Supplier[];
  editPackingId?: string;
}) {
  // Calculate totals for active paid stock
  const paidPackingItems = packingItems.filter(item => item.status === 'PAID');
  const totalBagsInStock = paidPackingItems.reduce((acc, item) => acc + Number(item.quantityBags), 0);
  const totalPackingValue = paidPackingItems.reduce((acc, item) => acc + (Number(item.quantityBags) * Number(item.perBagRate)), 0);

  return (
    <div className="mb-12 space-y-6 animate-fade-up">
      
      {/* Section Header with Stats & Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="font-display font-black text-2xl uppercase tracking-widest flex items-center text-[var(--text)]">
            <Tags className="w-6 h-6 mr-3 text-[var(--blue)]" /> Packaging Material
          </h2>
          <p className="text-sm font-bold text-[var(--muted)] mt-1 uppercase tracking-wider">
            Real-time stock of branded packaging bags. Add new stock strictly via Procurement Hub.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="card-brutal p-3 bg-[var(--surface)] text-right min-w-[140px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block">Total Bags</span>
            <span className="text-2xl font-black tabular-nums text-[var(--blue)]">
              {totalBagsInStock.toLocaleString()} <span className="text-xs font-bold text-[var(--text)]">Bags</span>
            </span>
          </div>

          <div className="card-brutal p-3 bg-[var(--surface)] text-right min-w-[140px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block">Stock Value</span>
            <span className="text-2xl font-black tabular-nums text-[var(--green)]">
              ₹ {totalPackingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <Link href="/operator/procurement?tab=packaging" className="flex-1 md:flex-none">
            <Button variant="primary" className="w-full bg-[var(--ink)] text-white">
              PROCURE BAGS <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* FULL-WIDTH STOCK TABLE */}
      <div className="lg:col-span-2 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
          {packingItems.map((item) => {
            const totalItemVal = Number(item.quantityBags) * Number(item.perBagRate);
            const isEditing = editPackingId === item.id;
            const isPendingCashier = item.status === 'FINALIZED';

            return (
              <div key={item.id} className="card-brutal p-4 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors group flex flex-col justify-between">
                {isEditing ? (
                  <form action={updatePackingItemAction} className="flex flex-col gap-4">
                    <input type="hidden" name="id" value={item.id} />
                    <Input type="text" label="Brand Name" name="brandName" defaultValue={item.brandName} required />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" label="Size (KG)" step="0.01" name="capacityKg" defaultValue={item.capacityKg.toString()} required className="text-right" />
                      <Input type="number" label="Stock Bags" step="1" name="quantityBags" defaultValue={item.quantityBags.toString()} required className="text-right" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" label="Rate/Bag" step="0.01" name="perBagRate" defaultValue={item.perBagRate.toString()} required className="text-right" />
                      <Select label="Godown" name="godownId" defaultValue={item.godownId} required>
                        {godowns
                          .filter(g => g.type === 'PACKAGING' || g.type === 'OTHER')
                          .map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <Link href="/admin/inventory" className="btn btn-ghost h-10 px-4">CANCEL</Link>
                      <Button type="submit" variant="green" className="h-10 px-4">SAVE</Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="blue">{Number(item.capacityKg)} KG</Badge>
                        <div className="flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/admin/inventory?editPackingId=${item.id}`} className="w-8 h-8 bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center shadow-[2px_2px_0px_#0D0D0B] active:translate-y-[2px] active:shadow-none hover:bg-[var(--blue)] hover:text-white transition-colors" title="Edit Item">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <form action={deletePackingItemAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <SubmitWithConfirm confirmMessage="Are you sure you want to delete this packing material item?">
                              <Trash2 className="w-4 h-4 text-[var(--red)] hover:scale-110 transition-transform" />
                            </SubmitWithConfirm>
                          </form>
                        </div>
                      </div>
                      
                      <div className="font-black text-xl uppercase tracking-wider mb-1">
                        {item.brandName}
                      </div>
                      <div className="text-sm font-bold text-[var(--muted)] flex justify-between items-center mb-4 pb-4 border-b-2 border-dashed border-[var(--dust)]">
                        <span>{item.supplier ? `Vendor: ${item.supplier.name}` : 'No Vendor'}</span>
                        <div className="text-right">
                          <span className="font-bold uppercase tracking-wider block text-xs">{item.godown.name}</span>
                          {isPendingCashier ? (
                            <Badge variant="orange" className="mt-1">Pending Cashier</Badge>
                          ) : (
                            <Badge variant="green" className="mt-1">Active Stock</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block">Stock Bags @ ₹{Number(item.perBagRate).toFixed(2)}</span>
                        <span className="font-black text-2xl tabular-nums text-[var(--blue)]">{Number(item.quantityBags).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block">Total Value</span>
                        <span className="font-black text-2xl tabular-nums text-[var(--green)]">₹ {totalItemVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          
          {packingItems.length === 0 && (
            <div className="col-span-full p-8 text-center font-bold text-[var(--muted)] uppercase tracking-wider border-4 border-dashed border-[var(--dust)]">
              No packing material stock added yet. Log new bag inventory via Procurement Hub.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

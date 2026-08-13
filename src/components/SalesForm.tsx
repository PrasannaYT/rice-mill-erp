'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Trash2, User, Phone, MapPin, FileText, Wallet, PackageCheck, Info, ArrowLeft } from 'lucide-react';
import { finalizeInvoiceAction, saveSalesDraftAction, deleteSalesDraftAction } from '@/app/actions/sales';
import QuickAddModal, { type EntityType } from './QuickAddModal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';

type Product = { id: string; name: string; category?: string; gstRate: number | string | { toString(): string } };
type Godown = { id: string; name: string; type?: string };
type Lot = { id: string; productId: string; godownId: string; currentQuantity: number | string | { toString(): string } };
type Customer = { 
  id: string; 
  name: string; 
  contact?: string | null; 
  gstin?: string | null; 
  address?: string | null; 
  balance: number | string | { toString(): string };
};
type Vehicle = { id: string; licensePlate: string };
type PackingItem = {
  id: string;
  brandName: string;
  capacityKg: number | string | { toString(): string };
  quantityBags: number | string | { toString(): string };
  perBagRate: number | string | { toString(): string };
  godownId: string;
  godownName: string;
};

type ItemState = {
  productId: string;
  godownId: string;
  packingItemId: string;
  bagCapacityKg: string; // for Paddy bulk workflow (default 75)
  numberOfBags: string;
  quantity: string;
  rate: string;
  productType?: 'rice' | 'paddy';
};

export default function SalesForm({ 
  customers, 
  vehicles,
  products,
  godowns,
  lots,
  packingItems = [],
  initialDrafts = []
}: { 
  customers: Customer[],
  vehicles: Vehicle[],
  products: Product[],
  godowns: Godown[],
  lots: Lot[],
  packingItems?: PackingItem[],
  initialDrafts?: any[]
}) {
  const router = useRouter();
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [localVehicles, setLocalVehicles] = useState(vehicles);
  const [localProducts, setLocalProducts] = useState(products);
  const [localGodowns, setLocalGodowns] = useState(godowns);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntity, setModalEntity] = useState<EntityType>('CUSTOMER');

  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  
  // Find default Rice Godown if available
  const defaultRiceGodown = useMemo(() => {
    return localGodowns.find(g => g.type === 'RICE') || localGodowns[0];
  }, [localGodowns]);

  const [items, setItems] = useState<ItemState[]>([]);
  const [generateBill, setGenerateBill] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);

  // === Queue / Draft System ===
  const [drafts, setDrafts] = useState<any[]>(initialDrafts || []);
  const [activeDraftId, setActiveDraftId] = useState<string>('');
  const [viewState, setViewState] = useState<'QUEUE_LIST' | 'DRAFT_EDITOR' | 'REVIEW_CONFIRM'>('QUEUE_LIST');

  // Load active draft into form state
  useEffect(() => {
    const draft = drafts.find(d => d.id === activeDraftId);
    if (draft) {
      setCustomerId(draft.customerId || '');
      setVehicleId(draft.vehicleId || '');
      setItems(draft.items || []);
      setGenerateBill(draft.generateBill ?? true);
    } else {
      setCustomerId('');
      setVehicleId('');
      setItems([]);
      setGenerateBill(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDraftId]);

  // Update current draft state when form fields change (debounced for auto-save)
  useEffect(() => {
    setDrafts(prev => prev.map(d => {
      if (d.id === activeDraftId) {
        return { ...d, customerId, vehicleId, items, generateBill };
      }
      return d;
    }));
  }, [customerId, vehicleId, items, generateBill]);

  // Debounced Auto-Save
  useEffect(() => {
    const currentDraft = drafts.find(d => d.id === activeDraftId);
    if (!currentDraft || !currentDraft.customerId || currentDraft.items?.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const result = await saveSalesDraftAction({
          draftId: !currentDraft.id.startsWith('NEW') ? currentDraft.id : undefined,
          customerId: currentDraft.customerId,
          vehicleId: currentDraft.vehicleId,
          items: currentDraft.items,
          generateBill: currentDraft.generateBill
        });
        
        if (currentDraft.id.startsWith('NEW')) {
          // Update the ID of the new draft
          setDrafts(prev => prev.map(d => d.id === currentDraft.id ? { ...d, id: result.id, invoiceNumber: 'Draft Saved' } : d));
          setActiveDraftId(result.id);
          toast.success("Draft auto-saved", { duration: 2000 });
        }
      } catch (error) {
        console.error("Auto-save failed", error);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [drafts, activeDraftId]);

  const createNewDraft = () => {
    const tempId = 'NEW-' + Date.now();
    setDrafts([{ id: tempId, customerId: '', vehicleId: '', items: [], generateBill: true }, ...drafts]);
    setActiveDraftId(tempId);
    setViewState('DRAFT_EDITOR');
    setMobileStep(1);
  };

  const openEditor = (id: string) => {
    setActiveDraftId(id);
    setViewState('DRAFT_EDITOR');
  };

  const openReview = (id: string) => {
    setActiveDraftId(id);
    setViewState('REVIEW_CONFIRM');
  };

  const saveAndReturnToQueue = () => {
    setViewState('QUEUE_LIST');
    setActiveDraftId('');
  };

  const removeDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id.startsWith('NEW')) {
      try {
        await deleteSalesDraftAction(id);
        toast.success("Draft discarded");
      } catch (err) {
        toast.error("Failed to discard draft");
        return;
      }
    }
    
    const newDrafts = drafts.filter(d => d.id !== id);
    setDrafts(newDrafts);
    if (activeDraftId === id) {
      setActiveDraftId('');
      setViewState('QUEUE_LIST');
    }
  };

  // Selected Customer object
  const selectedCustomer = useMemo(() => {
    return localCustomers.find(c => c.id === customerId);
  }, [customerId, localCustomers]);

  const addItem = () => {
    const defaultGodownId = defaultRiceGodown ? defaultRiceGodown.id : '';
    const defaultGodownName = (defaultRiceGodown?.name || '').toLowerCase();
    const isPaddyDefault = !defaultGodownName.includes('rice');

    setItems([...items, { 
      productId: '', 
      godownId: defaultGodownId, 
      packingItemId: '', 
      bagCapacityKg: '75', 
      numberOfBags: '', 
      quantity: '', 
      rate: '',
      productType: isPaddyDefault ? 'paddy' : 'rice'
    }]);
  };

  const updateItem = (index: number, field: keyof ItemState, value: string) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Reset product & packing if godown changes
    if (field === 'godownId') {
      item.productId = '';
      item.packingItemId = '';
    }

    const selectedGodown = localGodowns.find(g => g.id === item.godownId);
    
    const isRiceGodown = selectedGodown?.type === 'RICE';
    const isPaddy = selectedGodown?.type === 'PADDY';
    item.productType = isPaddy ? 'paddy' : 'rice';

    if (isPaddy) {
      // Paddy Bulk Sale: Total Weight = NO. OF BAGS * BAG CAPACITY (KG)
      item.packingItemId = '';
      const cap = parseFloat(item.bagCapacityKg) || 75;
      const bagCount = parseFloat(field === 'numberOfBags' ? value : item.numberOfBags) || 0;
      if (cap > 0 && bagCount > 0) {
        item.quantity = (cap * bagCount).toString();
      }
    } else {
      // Rice Packaged Sale: Total Weight = NO. OF BAGS * [Weight of Selected Brand Bag]
      const selectedBag = packingItems.find(p => p.id === (field === 'packingItemId' ? value : item.packingItemId));
      const bagCount = parseFloat(field === 'numberOfBags' ? value : item.numberOfBags) || 0;

      if (selectedBag && bagCount > 0) {
        const bagCap = parseFloat(String(selectedBag.capacityKg)) || 0;
        item.quantity = (bagCount * bagCap).toString();
      }
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const adjustBags = (index: number, amount: number) => {
    const item = items[index];
    const current = parseFloat(item.numberOfBags) || 0;
    const newCount = Math.max(0, current + amount);
    updateItem(index, 'numberOfBags', newCount.toString());
  };

  // Real-time invoice calculations: Line Total = Number of Bags × Rate per Bag
  const invoiceTotals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    
    items.forEach(item => {
      const p = localProducts.find(prod => prod.id === item.productId);
      const bags = parseFloat(item.numberOfBags) || 0;
      const ratePerBag = parseFloat(item.rate) || 0;
      const gst = p && generateBill ? parseFloat(String(p.gstRate)) || 0 : 0;
      
      const lineTotal = bags * ratePerBag;
      const tax = lineTotal * (gst / 100);
      
      subtotal += lineTotal;
      taxTotal += tax;
    });

    return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
  }, [items, localProducts, generateBill]);

  const handleAddSuccess = (newItem: { id: string; name: string; licensePlate?: string }) => {
    setModalOpen(false);
    if (modalEntity === 'CUSTOMER') {
      const newCust: Customer = {
        id: newItem.id,
        name: newItem.name,
        balance: 0,
      };
      setLocalCustomers([...localCustomers, newCust]);
      setCustomerId(newItem.id);
    } else if (modalEntity === 'VEHICLE') {
      const newVeh: Vehicle = {
        id: newItem.id,
        licensePlate: newItem.licensePlate || newItem.name,
      };
      setLocalVehicles([...localVehicles, newVeh]);
      setVehicleId(newItem.id);
    } else if (modalEntity === 'PRODUCT') {
      const newProd: Product = {
        id: newItem.id,
        name: newItem.name,
        gstRate: 0,
      };
      setLocalProducts([...localProducts, newProd]);
    } else if (modalEntity === 'GODOWN') {
      const newGodown: Godown = {
        id: newItem.id,
        name: newItem.name,
      };
      setLocalGodowns([...localGodowns, newGodown]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    // Validate packing bag stock and mandatory fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.godownId) {
        toast.error(`Item #${i + 1}: Please select a Dispatch Godown.`);
        return;
      }
      if (!item.productId) {
        toast.error(`Item #${i + 1}: Please select a Product / Variety.`);
        return;
      }

      const selectedGodown = localGodowns.find(g => g.id === item.godownId);
      const isRiceGodown = selectedGodown?.type === 'RICE';
      const isPaddy = selectedGodown?.type === 'PADDY';

      if (!isPaddy && !item.packingItemId) {
        toast.error(`Item #${i + 1}: Please select a Packing Brand Bag for Rice dispatch.`);
        return;
      }
      if (!item.numberOfBags || parseFloat(item.numberOfBags) <= 0) {
        toast.error(`Item #${i + 1}: Please enter a valid number of bags.`);
        return;
      }
      if (!item.rate || parseFloat(item.rate) <= 0) {
        toast.error(`Item #${i + 1}: Please enter a valid rate per bag.`);
        return;
      }

      if (!isPaddy && item.packingItemId) {
        const bag = packingItems.find(p => p.id === item.packingItemId);
        const reqBags = parseFloat(item.numberOfBags) || 0;
        const availBags = bag ? parseFloat(String(bag.quantityBags)) || 0 : 0;
        if (reqBags > availBags) {
          toast.error(`Item #${i + 1}: Requested ${reqBags} bags of "${bag?.brandName}", but only ${availBags} bags are available in stock.`);
          return;
        }
      }
    }
    
    setIsSubmitting(true);
    try {
      const sanitizedItems = items.map(item => ({
        ...item,
        packingItemId: item.packingItemId ? item.packingItemId : undefined,
        bagCapacityKg: item.bagCapacityKg ? item.bagCapacityKg : '75'
      }));

      const result = await finalizeInvoiceAction({
        customerId,
        vehicleId: vehicleId || undefined,
        items: sanitizedItems,
        generateBill
      });

      // If this was an existing draft, delete it since it's finalized
      if (!activeDraftId.startsWith('NEW')) {
        await deleteSalesDraftAction(activeDraftId);
      }

      toast.success('Invoice Finalized & Inventory Dispatched Successfully!');
      
      if (generateBill) {
        // Auto-redirect to printable invoice page
        router.push(`/invoice/${result.id}`);
      } else {
        // Redirect to sales history
        router.push(`/operator/sales/history`);
      }
      
    } catch (error) {
      toast.error('Error finalizing invoice: ' + (error instanceof Error ? error.message : String(error)));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-4">
      {/* ===== 1. QUEUE LIST VIEW ===== */}
      {viewState === 'QUEUE_LIST' && (
        <div className="space-y-6 fade-in">
          <div className="flex justify-between items-center bg-[#111] p-6 rounded-3xl border border-neutral-800 shadow-xl">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <div className="p-2 bg-[#F5A623]/20 rounded-xl">
                  <ShoppingCart className="h-6 w-6 text-[#F5A623]" />
                </div>
                Sales Queue
              </h2>
              <p className="text-neutral-500 text-sm mt-1">Manage outbound drafts and confirm sales</p>
            </div>
            <button onClick={createNewDraft} className="bg-[#F5A623] text-black px-5 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-[#e0961b] active:scale-95 transition-all shadow-lg shadow-[#F5A623]/20">
              <Plus className="w-5 h-5" /> Start New Sale
            </button>
          </div>

          {drafts.filter(d => !d.id.startsWith('NEW')).length === 0 ? (
            <div 
              onClick={createNewDraft}
              className="py-20 text-center bg-[#1A1A1A] rounded-3xl border border-dashed border-neutral-700 cursor-pointer hover:border-[#F5A623] hover:bg-neutral-900/50 transition-all group"
            >
               <PackageCheck className="w-12 h-12 text-neutral-700 mx-auto mb-4 group-hover:text-[#F5A623] transition-colors" />
               <p className="text-neutral-500 font-black uppercase text-base group-hover:text-white transition-colors">No pending sales</p>
               <p className="text-neutral-600 text-sm mt-2">Click here to start a new sale</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
               {drafts.filter(d => !d.id.startsWith('NEW')).map(d => {
                 const cust = localCustomers.find(c => c.id === d.customerId);
                 const displayName = cust ? cust.name : (d.customerName || 'Unknown Customer');
                 
                 return (
                 <div key={d.id} className="bg-[#1A1A1A] rounded-2xl border border-neutral-800 overflow-hidden hover:border-neutral-600 transition-colors shadow-lg flex flex-col">
                   <div className="p-5 flex-1">
                     <div className="flex justify-between items-start mb-4">
                       <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-black text-white text-lg">
                         {displayName.charAt(0).toUpperCase()}
                       </div>
                       <div className="flex gap-2 items-center">
                         <Badge variant="outline" className="text-[10px] bg-amber-950/30 text-amber-500 border-amber-900/50 h-[22px]">DRAFT</Badge>
                         <button onClick={(e) => removeDraft(d.id, e)} className="p-1 hover:bg-red-950/50 rounded-lg text-neutral-500 hover:text-red-400 transition-colors" title="Discard Draft">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </div>
                     <h3 className="font-black text-white text-lg line-clamp-1">{displayName}</h3>
                     <p className="text-xs text-neutral-500 font-mono mt-1">{d.invoiceNumber}</p>
                     
                     <div className="mt-4 pt-4 border-t border-neutral-800/50 grid grid-cols-2 gap-2 text-sm">
                       <div>
                         <p className="text-[10px] font-black uppercase text-neutral-500">Items</p>
                         <p className="font-bold text-neutral-300">{d.items?.length || 0}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black uppercase text-neutral-500">Est. Total</p>
                         <p className="font-bold text-emerald-400 font-mono">₹{d.items?.reduce((sum: number, i: any) => sum + ((Number(i.numberOfBags) || 0) * (Number(i.rate) || 0)), 0).toLocaleString('en-IN')}</p>
                       </div>
                     </div>
                   </div>
                   <div className="bg-[#111] border-t border-neutral-800 p-3 grid grid-cols-2 gap-3">
                     <button onClick={() => openEditor(d.id)} className="py-2.5 text-xs font-black uppercase tracking-wider text-neutral-400 hover:text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors">
                       Edit Details
                     </button>
                     <button onClick={() => openReview(d.id)} className="py-2.5 text-xs font-black uppercase tracking-wider text-[#F5A623] hover:text-black bg-[#F5A623]/10 rounded-lg hover:bg-[#F5A623] transition-colors">
                       Review & Confirm
                     </button>
                   </div>
                 </div>
               )})}
            </div>
          )}
        </div>
      )}

      {/* ===== 2. DRAFT EDITOR VIEW (STEPS 1 & 2) ===== */}
      {viewState === 'DRAFT_EDITOR' && (
        <div className="bg-[#111111] rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl fade-in">
          <div className="bg-gradient-to-r from-[#0E0E0E] to-[#1a1400] px-5 py-5 sm:px-8 sm:py-7 border-b border-neutral-800 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-black text-xl sm:text-3xl text-white flex items-center gap-3 tracking-tight">
                <button type="button" onClick={saveAndReturnToQueue} className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white">
                  <span className="text-xl">←</span>
                </button>
                Draft Editor
              </h2>
              <p className="text-neutral-500 text-xs sm:text-sm font-medium mt-1.5 ml-12">Edit customer and item details. Auto-saves automatically.</p>
            </div>
            {invoiceTotals.grandTotal > 0 && (
              <div className="shrink-0 bg-[#F5A623]/20 border border-[#F5A623]/40 rounded-2xl px-3 py-2 text-right">
                <p className="text-[9px] font-black uppercase text-[#F5A623]/70">Total</p>
                <p className="font-mono font-black text-[#F5A623] text-base">₹{invoiceTotals.grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-8 space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Customer & Vehicle
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-2 items-end">
                <Select label="Select Customer *" value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                  <option value="">Select Customer...</option>
                  {localCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Button type="button" variant="ghost" onClick={() => { setModalEntity('CUSTOMER'); setModalOpen(true); }} className="px-3 mb-[2px]">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex gap-2 items-end">
                <Select label="Dispatch Vehicle (Optional)" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
                  <option value="">No vehicle / Customer Transport...</option>
                  {localVehicles.map(v => <option key={v.id} value={v.id}>{v.licensePlate}</option>)}
                </Select>
                <Button type="button" variant="ghost" onClick={() => { setModalEntity('VEHICLE'); setModalOpen(true); }} className="px-3 mb-[2px]">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {selectedCustomer && (
              <div className="bg-[#1A1A1A] rounded-2xl border border-neutral-800 p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F5A623]/20 flex items-center justify-center font-black text-[#F5A623] text-lg">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-white text-base">{selectedCustomer.name}</p>
                    {selectedCustomer.gstin && <p className="text-[10px] font-black uppercase text-neutral-500">GSTIN: {selectedCustomer.gstin}</p>}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] font-black uppercase text-neutral-500">Balance</p>
                    <p className={`font-mono font-black text-lg tabular-nums ${Number(selectedCustomer.balance) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      ₹{Number(selectedCustomer.balance).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs border-t border-neutral-800 pt-3">
                  {selectedCustomer.contact && (
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Phone className="w-3 h-3" />
                      <span className="font-semibold">{selectedCustomer.contact}</span>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <MapPin className="w-3 h-3" />
                      <span className="font-semibold truncate">{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                  <PackageCheck className="w-3.5 h-3.5" /> Dispatch Items
                </h3>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1A1A] border border-neutral-700 rounded-xl text-[#F5A623] font-black text-xs uppercase tracking-wider hover:border-[#F5A623] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="py-12 text-center bg-[#1A1A1A] rounded-2xl border border-dashed border-neutral-700">
                  <PackageCheck className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-500 font-black uppercase text-sm">No items yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const g = localGodowns.find(godown => godown.id === item.godownId);
                    const isPaddy = g?.type === 'PADDY';
                    const bags = parseFloat(item.numberOfBags) || 0;
                    const ratePerBag = parseFloat(item.rate) || 0;
                    const lineTotal = bags * ratePerBag;
                    const availableProductsForGodown = (() => {
                      if (!item.godownId) return localProducts;
                      const godownLots = lots.filter(l => l.godownId === item.godownId && Number(l.currentQuantity) > 0);
                      const activeProductIds = Array.from(new Set(godownLots.map(l => l.productId)));
                      const filtered = localProducts.filter(prod => activeProductIds.includes(prod.id));
                      return filtered.length > 0 ? filtered : localProducts;
                    })();

                    return (
                      <div key={index} className="bg-[#1A1A1A] rounded-2xl border border-neutral-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#F5A623]/20 text-[#F5A623] rounded-lg border border-[#F5A623]/30">#{index + 1}</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${isPaddy ? 'bg-amber-950/50 text-amber-400 border-amber-900/40' : 'bg-emerald-950/50 text-emerald-400 border-emerald-900/40'}`}>
                              {isPaddy ? '🌾 Paddy' : '🍚 Rice'}
                            </span>
                          </div>
                          <button type="button" onClick={() => removeItem(index)} className="p-1.5 bg-red-950/50 border border-red-900/40 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Select label="DISPATCH GODOWN *" required value={item.godownId} onChange={e => updateItem(index, 'godownId', e.target.value)}>
                              <option value="">Select Godown...</option>
                              {localGodowns.filter(god => god.type === 'RICE' || god.type === 'PADDY').map(god => (
                                <option key={god.id} value={god.id}>{god.name}</option>
                              ))}
                            </Select>

                            <Select label="PRODUCT / VARIETY *" required value={item.productId} onChange={e => updateItem(index, 'productId', e.target.value)} disabled={!item.godownId}>
                              {!item.godownId ? <option value="">Select Godown First...</option> : (
                                <>
                                  <option value="">Select Variety...</option>
                                  {availableProductsForGodown.map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
                                </>
                              )}
                            </Select>
                          </div>

                          {isPaddy ? (
                            <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3">
                              <label className="text-[10px] font-black text-amber-400 uppercase tracking-wider block mb-1">BAG CAPACITY (KG) *</label>
                              <input type="number" step="0.1" value={item.bagCapacityKg || '75'} onChange={e => updateItem(index, 'bagCapacityKg', e.target.value)} placeholder="75" className="w-full bg-[#111] border border-amber-800/50 rounded-lg px-3 py-2 font-mono font-bold text-white focus:border-amber-500" />
                            </div>
                          ) : (
                            <Select label="PACKING BRAND BAG *" required value={item.packingItemId} onChange={e => updateItem(index, 'packingItemId', e.target.value)}>
                              <option value="">Select Packing Bag...</option>
                              {packingItems.map(pkg => (
                                <option key={pkg.id} value={pkg.id}>{pkg.brandName} ({String(pkg.capacityKg)}kg)</option>
                              ))}
                            </Select>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end pt-3 border-t border-neutral-800">
                            <div>
                              <label className="text-[10px] font-black uppercase text-neutral-400 mb-1 block">Bags *</label>
                              <input type="number" step="1" required value={item.numberOfBags} onChange={e => updateItem(index, 'numberOfBags', e.target.value)} className="w-full bg-[#111] border border-neutral-700 rounded-xl px-3 py-2 font-mono font-bold text-white" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-neutral-400 mb-1 block">Rate ₹/Bag *</label>
                              <input type="number" step="0.01" required value={item.rate} onChange={e => updateItem(index, 'rate', e.target.value)} className="w-full bg-[#111] border border-neutral-700 rounded-xl px-3 py-2 font-mono font-bold text-emerald-400" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-neutral-400 mb-1 block">Weight (kg)</label>
                              <input type="number" step="0.01" required value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} className="w-full bg-[#111] border border-neutral-700 rounded-xl px-3 py-2 font-mono font-bold text-neutral-400" />
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">Line Total</p>
                              <p className="font-mono font-black text-xl text-[#F5A623]">₹{lineTotal.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="pt-6 mt-6 border-t border-neutral-800 flex justify-end gap-3">
              <button type="button" onClick={saveAndReturnToQueue} className="px-6 py-4 bg-[#1A1A1A] hover:bg-neutral-800 border border-neutral-700 text-white font-black uppercase tracking-wider rounded-2xl transition-colors">
                Save & Return to Queue
              </button>
              {!activeDraftId.startsWith('NEW') && items.length > 0 && customerId && (
                 <button type="button" onClick={() => setViewState('REVIEW_CONFIRM')} className="px-6 py-4 bg-[#F5A623] hover:bg-[#e0961b] text-black font-black uppercase tracking-wider rounded-2xl transition-colors shadow-lg shadow-[#F5A623]/20">
                   Review & Confirm →
                 </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 3. REVIEW & CONFIRM VIEW ===== */}
      {viewState === 'REVIEW_CONFIRM' && (
        <form className="bg-[#111111] rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl fade-in" onSubmit={handleSubmit}>
          <div className="bg-gradient-to-r from-[#0E0E0E] to-[#1a1400] px-5 py-5 sm:px-8 sm:py-7 border-b border-neutral-800 flex items-center gap-4">
             <button type="button" onClick={() => setViewState('QUEUE_LIST')} className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white">
               <span className="text-xl">←</span>
             </button>
             <div>
               <h2 className="font-black text-xl sm:text-3xl text-white">Review & Confirm Sale</h2>
               <p className="text-neutral-500 text-xs sm:text-sm mt-1">Finalize this invoice to deduct inventory</p>
             </div>
          </div>
          
          <div className="p-5 sm:p-8 space-y-6">
            <div className="bg-[#1A1A1A] rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Invoice Summary</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-neutral-400 uppercase text-xs">Subtotal</span>
                  <span className="font-mono text-white">₹{invoiceTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-neutral-400 uppercase text-xs">GST</span>
                  <span className="font-mono text-neutral-300">₹{invoiceTotals.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
                  <span className="font-black text-white uppercase text-base">Grand Total</span>
                  <span className="font-mono font-black text-2xl text-emerald-400">₹{invoiceTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer bg-[#1A1A1A] rounded-2xl border border-neutral-800 p-4">
              <input type="checkbox" checked={generateBill} onChange={e => setGenerateBill(e.target.checked)} className="w-5 h-5 accent-[#F5A623] cursor-pointer rounded" />
              <div>
                <p className="text-sm font-black text-white">Generate Official Tax Bill</p>
                <p className="text-[10px] text-neutral-500">Includes GST breakdown and bill of supply</p>
              </div>
            </label>

            <div className="flex flex-col sm:flex-row-reverse gap-3 pt-6 border-t border-neutral-800">
              <button type="submit" disabled={isSubmitting || items.length === 0} className="w-full sm:w-auto px-8 py-5 bg-[#F5A623] text-black font-black text-lg uppercase tracking-wider rounded-2xl disabled:opacity-50 shadow-lg shadow-[#F5A623]/20 hover:scale-[1.02] transition-transform">
                {isSubmitting ? 'Processing...' : '⚡ Confirm Sale'}
              </button>
              <button type="button" onClick={() => setViewState('QUEUE_LIST')} className="w-full sm:w-auto px-8 py-5 bg-[#1A1A1A] border border-neutral-700 text-neutral-300 font-black uppercase rounded-2xl hover:bg-neutral-800 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <QuickAddModal isOpen={modalOpen} onClose={() => setModalOpen(false)} entityType={modalEntity} onSuccess={handleAddSuccess} />
    </div>
  );
}

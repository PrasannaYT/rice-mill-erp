'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Trash2, User, Phone, MapPin, FileText, Wallet, PackageCheck, Info } from 'lucide-react';
import { finalizeInvoiceAction, modifySalesInvoiceAction } from '@/app/actions/sales';
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
  initialInvoice
}: { 
  customers: Customer[],
  vehicles: Vehicle[],
  products: Product[],
  godowns: Godown[],
  lots: Lot[],
  packingItems?: PackingItem[],
  initialInvoice?: any
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

  // Initialize from initialInvoice if present
  useState(() => {
    if (initialInvoice) {
      setCustomerId(initialInvoice.customerId);
      if (initialInvoice.vehicleId) setVehicleId(initialInvoice.vehicleId);
      
      const initItems = initialInvoice.items.map((item: any) => {
        const isRice = localGodowns.find(g => g.id === item.godownId)?.type !== 'PADDY';
        
        let foundPackingItemId = '';
        let bagCap = '75';
        let numBags = '0';
        
        if (isRice && item.packingItemName) {
          const match = packingItems.find(p => item.packingItemName!.toLowerCase().startsWith(p.brandName.toLowerCase()));
          if (match) {
            foundPackingItemId = match.id;
            bagCap = String(match.capacityKg);
            numBags = (Number(item.quantity) / Number(match.capacityKg)).toString();
          } else {
            bagCap = '25'; // Fallback to 25kg if not found for rice
            numBags = (Number(item.quantity) / 25).toString();
          }
        } else if (!isRice) {
          bagCap = '75';
          numBags = (Number(item.quantity) / 75).toString();
        } else {
          bagCap = '25';
          numBags = (Number(item.quantity) / 25).toString();
        }

        return {
          productId: item.productId,
          godownId: item.godownId,
          packingItemId: foundPackingItemId,
          bagCapacityKg: bagCap,
          numberOfBags: numBags,
          quantity: String(item.quantity),
          rate: String(item.rate),
          productType: isRice ? 'rice' : 'paddy'
        };
      });
      setItems(initItems);
      setGenerateBill(false); // When editing, usually we don't regenerate a bill from scratch unless needed.
    }
  });

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

      let resultId;
      if (initialInvoice) {
        const res = await modifySalesInvoiceAction(initialInvoice.id, {
          items: sanitizedItems
        });
        resultId = res.id;
        toast.success('Invoice Modified & Inventory Adjusted Successfully!');
      } else {
        const res = await finalizeInvoiceAction({
          customerId,
          vehicleId: vehicleId || undefined,
          items: sanitizedItems,
          generateBill
        });
        resultId = res.id;
        toast.success('Invoice Finalized & Inventory Dispatched Successfully!');
      }
      
      if (generateBill && !initialInvoice) {
        // Auto-redirect to printable invoice page
        router.push(`/invoice/${resultId}`);
      } else {
        // Redirect to sales history or current invoice
        router.push(`/operator/sales/history`);
      }
      
    } catch (error) {
      toast.error('Error finalizing invoice: ' + (error instanceof Error ? error.message : String(error)));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-4">

      {/* Mobile Step Progress Bar */}
      <div className="sm:hidden mb-4 px-1">
        <div className="flex items-center gap-0">
          {[
            { step: 1, label: 'Customer' },
            { step: 2, label: 'Items' },
            { step: 3, label: 'Review' }
          ].map((s, i) => (
            <div key={s.step} className="flex items-center flex-1">
              <button type="button" onClick={() => setMobileStep(s.step as 1|2|3)}
                className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${mobileStep >= s.step ? 'bg-[#F5A623] border-[#F5A623] text-black' : 'bg-[#1A1A1A] border-neutral-700 text-neutral-500'}`}>
                  {s.step}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider ${mobileStep >= s.step ? 'text-[#F5A623]' : 'text-neutral-600'}`}>{s.label}</span>
              </button>
              {i < 2 && <div className={`h-0.5 flex-1 mx-1 rounded transition-all ${mobileStep > s.step ? 'bg-[#F5A623]' : 'bg-neutral-800'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#111111] rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0E0E0E] to-[#1a1400] px-5 py-5 sm:px-8 sm:py-7 border-b border-neutral-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-black text-xl sm:text-3xl text-white flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-[#F5A623]/20 rounded-xl">
                <ShoppingCart className="h-5 w-5 sm:h-7 sm:w-7 text-[#F5A623]" />
              </div>
              Sales & Dispatch
            </h2>
            <p className="text-neutral-500 text-xs sm:text-sm font-medium mt-1.5 ml-1">
              {initialInvoice ? `Editing Invoice #${initialInvoice.invoiceNumber}` : 'Select customer · Add items · Generate invoice'}
            </p>
          </div>
          {/* Running total badge on mobile */}
          {invoiceTotals.grandTotal > 0 && (
            <div className="shrink-0 bg-[#F5A623]/20 border border-[#F5A623]/40 rounded-2xl px-3 py-2 text-right">
              <p className="text-[9px] font-black uppercase text-[#F5A623]/70">Total</p>
              <p className="font-mono font-black text-[#F5A623] text-base">₹{invoiceTotals.grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
            </div>
          )}
        </div>

        <form className="p-5 sm:p-8 space-y-6" onSubmit={handleSubmit}>

          {/* ===== STEP 1: CUSTOMER ===== */}
          <div className={`space-y-5 ${mobileStep === 1 ? 'block' : 'hidden sm:block'}`}>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Step 1 — Customer & Vehicle
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-2 items-end">
                <Select label="Select Customer *" value={customerId} onChange={e => setCustomerId(e.target.value)} required disabled={!!initialInvoice}>
                  <option value="">Select Customer...</option>
                  {localCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                {!initialInvoice && (
                  <Button type="button" variant="ghost" onClick={() => { setModalEntity('CUSTOMER'); setModalOpen(true); }} className="px-3 mb-[2px]">
                    <Plus className="w-5 h-5" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2 items-end">
                <Select label="Dispatch Vehicle (Optional)" value={vehicleId} onChange={e => setVehicleId(e.target.value)} disabled={!!initialInvoice}>
                  <option value="">No vehicle / Customer Transport...</option>
                  {localVehicles.map(v => <option key={v.id} value={v.id}>{v.licensePlate}</option>)}
                </Select>
                {!initialInvoice && (
                  <Button type="button" variant="ghost" onClick={() => { setModalEntity('VEHICLE'); setModalOpen(true); }} className="px-3 mb-[2px]">
                    <Plus className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Customer Info Card */}
            <AnimatePresence>
              {selectedCustomer && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="bg-[#1A1A1A] rounded-2xl border border-neutral-800 p-4 sm:p-5">
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
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sm:hidden">
              <button type="button" onClick={() => setMobileStep(2)}
                className="w-full py-4 bg-[#F5A623] text-black font-black uppercase tracking-wider rounded-2xl active:scale-95 transition-transform text-base">
                Next: Add Items →
              </button>
            </div>
          </div>

          {/* ===== STEP 2: ITEMS ===== */}
          <div className={`space-y-4 ${mobileStep === 2 ? 'block' : 'hidden sm:block'} sm:pt-6 sm:border-t sm:border-neutral-800`}>
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                <PackageCheck className="w-3.5 h-3.5" /> Step 2 — Dispatch Items
              </h3>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1A1A1A] border border-neutral-700 rounded-xl text-[#F5A623] font-black text-xs uppercase tracking-wider hover:border-[#F5A623] transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center bg-[#1A1A1A] rounded-2xl border border-dashed border-neutral-700">
                <PackageCheck className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                <p className="text-neutral-500 font-black uppercase text-sm">No items yet</p>
                <p className="text-neutral-600 text-xs mt-1">Tap &quot;Add Item&quot; to add dispatch items</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
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
                      <motion.div key={index}
                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#1A1A1A] rounded-2xl border border-neutral-800 overflow-hidden">

                        {/* Item header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#F5A623]/20 text-[#F5A623] rounded-lg border border-[#F5A623]/30">
                              #{index + 1}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${isPaddy ? 'bg-amber-950/50 text-amber-400 border-amber-900/40' : 'bg-emerald-950/50 text-emerald-400 border-emerald-900/40'}`}>
                              {isPaddy ? '🌾 Paddy' : '🍚 Rice'}
                            </span>
                          </div>
                          <button type="button" onClick={() => removeItem(index)}
                            className="p-1.5 bg-red-950/50 border border-red-900/40 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="p-4 space-y-4">
                          {/* Godown + Product row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex gap-2 items-end">
                              <Select label="DISPATCH GODOWN *" required value={item.godownId}
                                onChange={e => updateItem(index, 'godownId', e.target.value)}>
                                <option value="">Select Godown...</option>
                                {localGodowns
                                  .filter(god => god.type === 'RICE' || god.type === 'PADDY')
                                  .map(god => (
                                    <option key={god.id} value={god.id}>
                                      {god.name} {god.type === 'RICE' ? '(Rice)' : '(Paddy)'}
                                    </option>
                                  ))}
                              </Select>
                              <Button type="button" variant="ghost" onClick={() => { setModalEntity('GODOWN'); setModalOpen(true); }} className="px-3 mb-[2px]">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex gap-2 items-end">
                              <Select label="PRODUCT / VARIETY *" required value={item.productId}
                                onChange={e => { updateItem(index, 'productId', e.target.value); }}
                                disabled={!item.godownId}>
                                {!item.godownId ? (
                                  <option value="">Select Godown First...</option>
                                ) : (
                                  <>
                                    <option value="">Select Variety...</option>
                                    {availableProductsForGodown.map(prod => {
                                      const availStock = lots.filter(l => l.godownId === item.godownId && l.productId === prod.id).reduce((sum, l) => sum + Number(String(l.currentQuantity)), 0);
                                      return <option key={prod.id} value={prod.id}>{prod.name} ({availStock.toLocaleString('en-IN')} kg)</option>;
                                    })}
                                  </>
                                )}
                              </Select>
                              <Button type="button" variant="ghost" onClick={() => { setModalEntity('PRODUCT'); setModalOpen(true); }} className="px-3 mb-[2px]">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Paddy bag capacity or Rice packing brand */}
                          {isPaddy ? (
                            <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-center">
                              <div className="flex-1 w-full">
                                <label className="text-[10px] font-black text-amber-400 uppercase tracking-wider block mb-1">
                                  BAG CAPACITY (KG) *
                                </label>
                                <input type="number" step="0.1" value={item.bagCapacityKg || '75'}
                                  onChange={e => updateItem(index, 'bagCapacityKg', e.target.value)}
                                  placeholder="e.g. 75"
                                  className="w-full bg-[#111] border border-amber-800/50 rounded-lg px-3 py-2.5 font-mono font-bold text-white focus:outline-none focus:border-amber-500" />
                              </div>
                              <div className="flex items-center text-[10px] text-amber-400/80 font-bold gap-1.5 sm:pt-5">
                                <Info className="w-3.5 h-3.5 shrink-0" />
                                <span>Plain gunny bags @ {item.bagCapacityKg || '75'} kg each</span>
                              </div>
                            </div>
                          ) : (
                            <Select label="PACKING BRAND BAG *" required value={item.packingItemId}
                              onChange={e => updateItem(index, 'packingItemId', e.target.value)}>
                              <option value="">Select Packing Bag...</option>
                              {packingItems.map(pkg => (
                                <option key={pkg.id} value={pkg.id}>
                                  {pkg.brandName} ({String(pkg.capacityKg)}kg — {String(pkg.quantityBags)} bags in stock)
                                </option>
                              ))}
                            </Select>
                          )}

                          {/* Bags + Rate + Weight + Subtotal */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end pt-3 border-t border-neutral-800">
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">Bags *</label>
                              <div className="flex h-[44px]">
                                <button type="button" onClick={() => adjustBags(index, -10)} className="w-8 sm:w-10 shrink-0 bg-neutral-800 text-white font-black rounded-l-xl border border-r-0 border-neutral-700 active:bg-red-900 text-xl flex items-center justify-center">-</button>
                                <input type="number" step="1" required value={item.numberOfBags} onChange={e => updateItem(index, 'numberOfBags', e.target.value)} placeholder="0"
                                  className="flex-1 w-full text-center px-1 font-mono font-black text-sm sm:text-base text-white bg-[#111] border-y border-neutral-700 focus:outline-none focus:border-[#F5A623] min-w-0" />
                                <button type="button" onClick={() => adjustBags(index, 10)} className="w-8 sm:w-10 shrink-0 bg-neutral-800 text-white font-black rounded-r-xl border border-l-0 border-neutral-700 active:bg-emerald-900 text-xl flex items-center justify-center">+</button>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">Rate ₹/Bag *</label>
                              <input type="number" step="0.01" required value={item.rate} onChange={e => updateItem(index, 'rate', e.target.value)}
                                placeholder="0.00" inputMode="decimal"
                                className="w-full h-[44px] bg-[#111] border border-neutral-700 rounded-xl px-3 font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors" />
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">Weight (kg)</label>
                              <input type="number" step="0.01" required value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)}
                                placeholder="auto"
                                className="w-full h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl px-3 font-mono font-bold text-neutral-400 focus:outline-none focus:border-neutral-600" />
                            </div>

                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">Line Total</p>
                              <p className="font-mono font-black text-xl text-[#F5A623] tabular-nums">
                                ₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            <div className="sm:hidden flex gap-3 mt-2">
              <button type="button" onClick={() => setMobileStep(1)}
                className="flex-1 py-4 bg-[#1A1A1A] border border-neutral-700 text-neutral-300 font-black uppercase tracking-wider rounded-2xl active:scale-95 transition-transform">
                ← Back
              </button>
              <button type="button" onClick={() => setMobileStep(3)}
                className="flex-1 py-4 bg-[#F5A623] text-black font-black uppercase tracking-wider rounded-2xl active:scale-95 transition-transform">
                Review →
              </button>
            </div>
          </div>

          {/* ===== STEP 3: REVIEW & SUBMIT ===== */}
          <div className={`space-y-5 ${mobileStep === 3 ? 'block' : 'hidden sm:block'} sm:pt-6 sm:border-t sm:border-neutral-800`}>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Step 3 — Review & Submit
            </h3>

            {/* Invoice Summary */}
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

            {!initialInvoice && (
              <label className="flex items-center gap-3 cursor-pointer bg-[#1A1A1A] rounded-2xl border border-neutral-800 p-4">
                <input type="checkbox" checked={generateBill} onChange={e => setGenerateBill(e.target.checked)}
                  className="w-5 h-5 accent-[#F5A623] cursor-pointer rounded" />
                <div>
                  <p className="text-sm font-black text-white">Generate Official Tax Bill</p>
                  <p className="text-[10px] text-neutral-500">Includes GST breakdown and bill of supply</p>
                </div>
              </label>
            )}

            <div className="flex flex-col-reverse gap-3">
              <button type="button" onClick={() => setMobileStep(2)}
                className="sm:hidden w-full py-4 bg-[#1A1A1A] border border-neutral-700 text-neutral-300 font-black rounded-2xl active:scale-95 transition-transform">
                ← Back
              </button>
              <button type="submit" disabled={isSubmitting || items.length === 0}
                className="w-full py-4 sm:py-5 bg-[#F5A623] text-black font-black text-base sm:text-xl uppercase tracking-wider rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-[#F5A623]/20">
                {isSubmitting ? 'Processing...' : (initialInvoice ? '💾 Save Modifications' : '⚡ Confirm Sale')}
              </button>
            </div>
          </div>

        </form>
      </div>

      <QuickAddModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        entityType={modalEntity}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}

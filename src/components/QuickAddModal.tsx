'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { 
  createSupplierAction, 
  createFarmerAction, 
  createProductAction, 
  createGodownAction,
  createCustomerAction,
  createVehicleAction
} from '@/app/actions/masterData';

export type EntityType = 'SUPPLIER' | 'BAG_VENDOR' | 'FARMER' | 'PRODUCT' | 'GODOWN' | 'CUSTOMER' | 'LEDGER' | 'VEHICLE';

interface QuickAddModalProps {
  entityType: EntityType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newItem: { id: string; name: string; brokerId?: string; licensePlate?: string; category?: string }) => void;
  extraContext?: { brokerId?: string; lockedCategory?: string } & Record<string, unknown>;
}

export default function QuickAddModal({ entityType, isOpen, onClose, onSuccess, extraContext }: QuickAddModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      let newItem;
      
      switch (entityType) {
        case 'SUPPLIER':
          formData.append('category', 'PADDY_BROKER');
          newItem = await createSupplierAction(formData);
          break;
        case 'BAG_VENDOR':
          formData.append('category', 'BAG_VENDOR');
          newItem = await createSupplierAction(formData);
          break;
        case 'FARMER':
          if (extraContext?.brokerId) {
            formData.append('brokerId', extraContext.brokerId);
          }
          newItem = await createFarmerAction(formData);
          break;
        case 'PRODUCT': {
          const formDataObj = Object.fromEntries(formData.entries());
          const createdProd = await createProductAction(formData);
          newItem = { ...createdProd, category: formDataObj.category as string };
          break;
        }
        case 'GODOWN':
          newItem = await createGodownAction(formData);
          break;
        case 'CUSTOMER':
          newItem = await createCustomerAction(formData);
          break;
        case 'VEHICLE': {
          const res = await createVehicleAction(formData);
          newItem = { id: res.id, name: res.name, licensePlate: res.name };
          break;
        }
        default:
          throw new Error('Unsupported entity type');
      }
      
      onSuccess(newItem);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<EntityType, string> = {
    SUPPLIER: 'Add New Paddy Broker',
    BAG_VENDOR: 'Add New Bag Vendor / Packaging Supplier',
    FARMER: 'Add New Farmer',
    PRODUCT: 'Add New Product',
    GODOWN: 'Add New Godown',
    CUSTOMER: 'Add New Customer',
    LEDGER: 'Add New Ledger',
    VEHICLE: 'Add New Vehicle'
  };

  return (
    <div className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-xl shadow-brutal-lg border-t-4 sm:border-4 border-[var(--border)] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-[var(--dust)] rounded-full mx-auto mt-3 mb-1"></div>
        
        <div className="flex justify-between items-center p-4 sm:p-5 border-b-2 border-[var(--border)] shrink-0">
          <h3 className="font-display font-black uppercase text-lg text-[var(--text)]">{titles[entityType]}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-2)] active:scale-95 transition-all text-[var(--text)] border-2 border-transparent hover:border-[var(--border)] rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 /30  text-sm rounded-lg border border-red-200 ">
              {errorMsg}
            </div>
          )}

          {entityType !== 'VEHICLE' && (
            <div>
              <label className="label-brutal mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" required className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Enter name..." />
            </div>
          )}

          {entityType === 'VEHICLE' && (
            <>
              <div>
                <label className="label-brutal mb-1">License Plate Number <span className="text-red-500">*</span></label>
                <input type="text" name="licensePlate" required className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg uppercase focus:ring-emerald-500 focus:border-emerald-500" placeholder="e.g. AP-02-X-1234" />
              </div>
              <div>
                <label className="label-brutal mb-1">Vehicle Type <span className="text-red-500">*</span></label>
                <select name="type" required className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="TRUCK">Truck</option>
                  <option value="TRACTOR">Tractor</option>
                  <option value="LCV">Light Commercial Vehicle</option>
                </select>
              </div>
              <div>
                <label className="label-brutal mb-1">Tare Weight (Empty Qtls)</label>
                <input type="number" step="0.01" name="tareWeight" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
              </div>
            </>
          )}

          {(entityType === 'SUPPLIER' || entityType === 'BAG_VENDOR' || entityType === 'FARMER' || entityType === 'CUSTOMER') && (
            <div>
              <label className="label-brutal mb-1">Contact Number</label>
              <input type="text" name="contact" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
            </div>
          )}

          {(entityType === 'SUPPLIER' || entityType === 'BAG_VENDOR' || entityType === 'CUSTOMER') && (
            <>
              <div>
                <label className="label-brutal mb-1">GSTIN</label>
                <input type="text" name="gstin" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
              </div>
              <div>
                <label className="label-brutal mb-1">Address</label>
                <textarea name="address" rows={2} className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional"></textarea>
              </div>
              <div>
                <label className="label-brutal mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" name="balance" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
              </div>
            </>
          )}

          {entityType === 'FARMER' && (
            <div>
              <label className="label-brutal mb-1">Village/Location</label>
              <input type="text" name="village" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
            </div>
          )}

          {entityType === 'PRODUCT' && (
            <>
              <div>
                <label className="label-brutal mb-1">Category <span className="text-red-500">*</span></label>
                {extraContext?.lockedCategory ? (
                  <select name="category" defaultValue={extraContext.lockedCategory} className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg opacity-70 pointer-events-none">
                    {extraContext.lockedCategory === 'PACKAGING_MATERIAL' && <option value="PACKAGING_MATERIAL">Packaging</option>}
                    {extraContext.lockedCategory === 'RAW_MATERIAL' && <option value="RAW_MATERIAL">Raw Material (Paddy)</option>}
                  </select>
                ) : (
                  <select name="category" required className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="">Select Category...</option>
                    <option value="RAW_MATERIAL">Raw Material (Paddy)</option>
                    <option value="FINISHED_GOODS">Finished Goods (Rice)</option>
                    <option value="BYPRODUCT">Byproduct (Bran, Husk)</option>
                    <option value="PACKAGING_MATERIAL">Packaging</option>
                    <option value="OTHER">Other</option>
                  </select>
                )}
              </div>
              <div>
                <label className="label-brutal mb-1">Unit <span className="text-red-500">*</span></label>
                <select name="unit" required defaultValue="KGS" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="KGS">KGs</option>
                  <option value="QUINTALS">Quintals</option>
                  <option value="TONS">Tons</option>
                  <option value="BAGS">Bags</option>
                  <option value="PCS">Pieces</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label-brutal mb-1">HSN Code</label>
                  <input type="text" name="hsnCode" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
                </div>
                <div className="flex-1">
                  <label className="label-brutal mb-1">GST Rate (%)</label>
                  <input type="number" step="0.01" name="gstRate" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
                </div>
              </div>
            </>
          )}

          {entityType === 'GODOWN' && (
            <>
              <div>
                <label className="label-brutal mb-1">Location</label>
                <input type="text" name="location" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
              </div>
              <div>
                <label className="label-brutal mb-1">Capacity (KG)</label>
                <input type="number" step="0.01" name="capacity" className="w-full p-2.5 bg-[var(--surface-2)]  border border-[var(--border)]  rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Optional" />
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border)] ">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--text)]  hover:bg-[var(--surface-2)] :bg-neutral-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center shadow-md">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

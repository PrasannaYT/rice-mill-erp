'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Scale, Droplets, Receipt, Clock, Truck, Trash2, Package, Plus, Tags, CheckCircle, Camera, TrendingUp } from 'lucide-react';
import { createDraftBatchAction, finalizeBatchAction, cancelDraftBatchAction, autoSaveDraftAction } from '@/app/actions/procurement';
import { createPackingItemAction } from '@/app/actions/packingItem';
import QuickAddModal, { type EntityType } from './QuickAddModal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import SmartForecastView, { type PredictiveLead } from './SmartForecastView';

type Supplier = { id: string; name: string; category?: string };
type Farmer = { id: string; name: string; brokerId: string };
type Product = { id: string; name: string; category?: string };
type Godown = { id: string; name: string; type?: string };
type Draft = { 
  id: string; supplierId: string; supplierName: string; farmerId: string | null; farmerName: string | null; productId: string | null; 
  productName: string; godownId: string | null; grossWeight: string; createdAt: string; 
  tareWeight?: string; perBagWeight?: string; farmerBagRate?: string; brokerCommissionRate?: string; 
  beforeDryingMoisture?: string; afterDryingMoisture?: string;
};

export default function WeighbridgeForm({ 
  suppliers,
  farmers = [],
  products, 
  godowns,
  pendingDrafts = [],
  initialTab = 'PADDY',
  predictiveLeads = [],
  availableVarieties = []
}: { 
  suppliers: Supplier[], 
  farmers?: Farmer[],
  products: Product[], 
  godowns: Godown[],
  pendingDrafts?: Draft[],
  initialTab?: 'PADDY' | 'PACKAGING' | 'FORECAST',
  predictiveLeads?: PredictiveLead[],
  availableVarieties?: string[]
}) {
  const [procurementTab, setProcurementTab] = useState<'PADDY' | 'PACKAGING' | 'FORECAST'>(initialTab);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [showMobileQueue, setShowMobileQueue] = useState(false);

  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(suppliers);
  const [localFarmers, setLocalFarmers] = useState(farmers);
  const [localProducts, setLocalProducts] = useState(products);
  const paddyProducts = localProducts.filter(p => p.category !== 'PACKAGING_MATERIAL' && p.category !== 'PACKING_MATERIAL');
  const packagingProducts = localProducts.filter(p => p.category === 'PACKAGING_MATERIAL' || p.category === 'PACKING_MATERIAL');
  const [localGodowns, setLocalGodowns] = useState(godowns);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntity, setModalEntity] = useState<EntityType>('SUPPLIER');

  // Custom Confirm Modal State
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, action: (() => void) | null, message: string}>({isOpen: false, action: null, message: ''});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [productId, setProductId] = useState('');
  const [godownId, setGodownId] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  
  const [tareWeight, setTareWeight] = useState('');
  const [perBagWeight, setPerBagWeight] = useState('');
  const [farmerBagRate, setFarmerBagRate] = useState('');
  const [brokerCommissionRate, setBrokerCommissionRate] = useState('');
  const [weighSlip, setWeighSlip] = useState<File | null>(null);
  const [weighSlipPreview, setWeighSlipPreview] = useState<string | null>(null);
  const [beforeDryingMoisture, setBeforeDryingMoisture] = useState('');
  const [afterDryingMoisture, setAfterDryingMoisture] = useState('14.0');
  const [enableMoisture, setEnableMoisture] = useState(false);



  // Packaging form states
  const [pkgBrandName, setPkgBrandName] = useState('');
  const [pkgCapacityKg, setPkgCapacityKg] = useState('');
  const [pkgQuantityBags, setPkgQuantityBags] = useState('');
  const [pkgPerBagRate, setPkgPerBagRate] = useState('');
  const [pkgGodownId, setPkgGodownId] = useState('');
  const [pkgSupplierId, setPkgSupplierId] = useState('');
  const [pkgHsnCode, setPkgHsnCode] = useState('');
  const [isPkgSubmitting, setIsPkgSubmitting] = useState(false);

  // Separate Paddy Brokers from Bag Vendors
  const paddyBrokers = useMemo(() => {
    return localSuppliers.filter(s => s.category !== 'BAG_VENDOR');
  }, [localSuppliers]);

  const bagVendors = useMemo(() => {
    return localSuppliers.filter(s => s.category === 'BAG_VENDOR');
  }, [localSuppliers]);


  const availableFarmers = useMemo(() => {
    return localFarmers.filter(f => f.brokerId === supplierId);
  }, [localFarmers, supplierId]);
  
  // Real-time calculations
  const netWeight = useMemo(() => {
    const gross = parseFloat(grossWeight);
    const tare = parseFloat(tareWeight);
    if (!isNaN(gross) && !isNaN(tare) && gross > tare) {
      return (gross - tare).toFixed(2);
    }
    return '0.00';
  }, [grossWeight, tareWeight]);

  const dryingShortage = useMemo(() => {
    const net = parseFloat(netWeight);
    const beforeM = parseFloat(beforeDryingMoisture);
    const afterM = parseFloat(afterDryingMoisture);
    if (net > 0 && beforeM > afterM && afterM < 100) {
      const num = beforeM - afterM;
      const den = 100 - afterM;
      return (net * (num / den)).toFixed(2);
    }
    return '0.00';
  }, [netWeight, beforeDryingMoisture, afterDryingMoisture]);

  const finalGodownWeight = useMemo(() => {
    const net = parseFloat(netWeight);
    const shortage = parseFloat(dryingShortage);
    if (net > 0) {
      return (net - shortage).toFixed(2);
    }
    return '0.00';
  }, [netWeight, dryingShortage]);

  const numberOfBagsCalc = useMemo(() => {
    const net = parseFloat(netWeight);
    const pbw = parseFloat(perBagWeight);
    if (net > 0 && pbw > 0) {
      return (net / pbw).toFixed(2);
    }
    return 0;
  }, [netWeight, perBagWeight]);

  const farmerTotalPayable = useMemo(() => {
    const rate = parseFloat(farmerBagRate);
    const bags = parseFloat(String(numberOfBagsCalc));
    if (bags > 0 && rate > 0) {
      return (bags * rate).toFixed(2);
    }
    return '0.00';
  }, [numberOfBagsCalc, farmerBagRate]);

  const brokerCommissionTotal = useMemo(() => {
    const rate = parseFloat(brokerCommissionRate);
    const bags = parseFloat(String(numberOfBagsCalc));
    if (bags > 0 && rate > 0) {
      return (bags * rate).toFixed(2);
    }
    return '0.00';
  }, [numberOfBagsCalc, brokerCommissionRate]);

  const ratePerKg = useMemo(() => {
    const rate = parseFloat(farmerBagRate);
    const pbw = parseFloat(perBagWeight);
    if (rate > 0 && pbw > 0) {
      return (rate / pbw).toFixed(2);
    }
    return '0.00';
  }, [farmerBagRate, perBagWeight]);

  const clearForm = () => {
    setBatchId(null);
    setSupplierId('');
    setFarmerId('');
    setProductId('');
    setGodownId('');
    setGrossWeight('');
    setTareWeight('');
    setPerBagWeight('');
    setFarmerBagRate('');
    setBrokerCommissionRate('');
    setBeforeDryingMoisture('');
    setAfterDryingMoisture('14.0');
    setErrorMsg(null);
    setMobileStep(1);
  };

  const loadDraft = (draft: Draft) => {
    setProcurementTab('PADDY');
    setBatchId(draft.id);
    setSupplierId(draft.supplierId);
    setFarmerId(draft.farmerId || '');
    setProductId(draft.productId || '');
    setGodownId(draft.godownId || '');
    setGrossWeight(draft.grossWeight);
    setTareWeight(draft.tareWeight || '');
    setPerBagWeight(draft.perBagWeight || '');
    setFarmerBagRate(draft.farmerBagRate || '');
    setBrokerCommissionRate(draft.brokerCommissionRate || '');
    setBeforeDryingMoisture(draft.beforeDryingMoisture || '');
    setAfterDryingMoisture(draft.afterDryingMoisture || '14.0');
    setErrorMsg(null);
  };

  const handleAutoSave = async () => {
    if (!batchId) return;
    try {
      const formData = new FormData();
      formData.append('batchId', batchId);
      if (farmerId !== undefined) formData.append('farmerId', farmerId);
      if (tareWeight) formData.append('tareWeight', tareWeight);
      if (perBagWeight) formData.append('perBagWeight', perBagWeight);
      if (farmerBagRate) formData.append('farmerBagRate', farmerBagRate);
      if (brokerCommissionRate) formData.append('brokerCommissionRate', brokerCommissionRate);
      if (beforeDryingMoisture) formData.append('beforeDryingMoisture', beforeDryingMoisture);
      if (afterDryingMoisture) formData.append('afterDryingMoisture', afterDryingMoisture);
      
      await autoSaveDraftAction(formData);
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  const handleDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('supplierId', supplierId);
      if (farmerId) formData.append('farmerId', farmerId);
      formData.append('productId', productId);
      formData.append('godownId', godownId);
      formData.append('grossWeight', grossWeight);
      
      await createDraftBatchAction(formData);
      toast.success('Draft saved successfully! Truck added to queue.');
      clearForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save draft');
    }
  };

  const handleFinalizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) return;
    setErrorMsg(null);
    
    try {
      const formData = new FormData();
      formData.append('batchId', batchId);
      formData.append('tareWeight', tareWeight);
      formData.append('beforeDryingMoisture', beforeDryingMoisture);
      formData.append('afterDryingMoisture', afterDryingMoisture);
      formData.append('perBagWeight', perBagWeight);
      formData.append('farmerBagRate', farmerBagRate);
      formData.append('brokerCommissionRate', brokerCommissionRate);
      
      await finalizeBatchAction(formData);
      toast.success('Batch finalized! Sent to Cashier for Approval.');
      clearForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to finalize batch');
    }
  };

  const handlePackagingProcurementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPkgSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('brandName', pkgBrandName);
      formData.append('capacityKg', pkgCapacityKg);
      formData.append('quantityBags', pkgQuantityBags);
      formData.append('perBagRate', pkgPerBagRate);
      formData.append('godownId', pkgGodownId);
      if (pkgSupplierId) formData.append('supplierId', pkgSupplierId);
      if (pkgHsnCode) formData.append('hsnCode', pkgHsnCode);

      await createPackingItemAction(formData);
      toast.success('Packaging Bags Procured! Sent to Cashier.');
      setPkgBrandName('');
      setPkgCapacityKg('');
      setPkgQuantityBags('');
      setPkgPerBagRate('');
      setPkgSupplierId('');
      setPkgHsnCode('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to procure packaging material');
    } finally {
      setIsPkgSubmitting(false);
    }
  };

  const executeCancelDraft = async () => {
    if (!batchId) return;
    setConfirmState({ ...confirmState, isOpen: false });
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('batchId', batchId);
      await cancelDraftBatchAction(formData);
      toast.success('Truck entry cancelled successfully.');
      clearForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to cancel draft');
    }
  };

  const handleCancelDraft = () => {
    setConfirmState({
      isOpen: true,
      message: 'Are you sure you want to cancel this pending truck? This will permanently delete the draft.',
      action: executeCancelDraft
    });
  };

  const handleAddSuccess = (newItem: { id: string; name: string; brokerId?: string }) => {
    setModalOpen(false);
    if (modalEntity === 'SUPPLIER') {
      const supplierItem = { ...newItem, category: 'PADDY_BROKER' };
      setLocalSuppliers(prev => [...prev, supplierItem]);
      setSupplierId(newItem.id);
      setFarmerId('');
    } else if (modalEntity === 'BAG_VENDOR') {
      const vendorItem = { ...newItem, category: 'BAG_VENDOR' };
      setLocalSuppliers(prev => [...prev, vendorItem]);
      setPkgSupplierId(newItem.id);
    } else if (modalEntity === 'FARMER') {
      const farmerItem: Farmer = {
        id: newItem.id,
        name: newItem.name,
        brokerId: newItem.brokerId || supplierId,
      };
      setLocalFarmers([...localFarmers, farmerItem]);
      setFarmerId(newItem.id);
    } else if (modalEntity === 'PRODUCT') {
      setLocalProducts([...localProducts, newItem]);
      if (procurementTab === 'PACKAGING') {
        setPkgBrandName(newItem.name);
      } else {
        setProductId(newItem.id);
      }
    } else if (modalEntity === 'GODOWN') {
      setLocalGodowns([...localGodowns, newItem]);
      setGodownId(newItem.id);
      setPkgGodownId(newItem.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 mt-4">
      
      {/* Top Procurement Mode Selector Tabs */}
      <nav aria-label="Procurement Mode Sections" className="grid grid-cols-3 gap-2 p-1.5 bg-[#1A1A1A] border border-neutral-800 rounded-2xl shadow-xl w-full sm:w-auto relative">
        <button
          type="button"
          onClick={() => setProcurementTab('PADDY')}
          className={`py-3.5 px-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:outline-none min-h-[44px] relative z-10 ${
            procurementTab === 'PADDY'
              ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-md scale-[1.02]'
              : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span className="truncate">Paddy</span>
        </button>

        <button
          type="button"
          onClick={() => setProcurementTab('PACKAGING')}
          className={`py-3.5 px-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:outline-none min-h-[44px] relative z-10 ${
            procurementTab === 'PACKAGING'
              ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-md scale-[1.02]'
              : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
          }`}
        >
          <Tags className="w-4 h-4 shrink-0" />
          <span className="truncate">Packaging</span>
        </button>

        <button
          type="button"
          onClick={() => setProcurementTab('FORECAST')}
          className={`py-3.5 px-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:outline-none min-h-[44px] relative z-10 ${
            procurementTab === 'FORECAST'
              ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-md scale-[1.02]'
              : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span className="truncate">Forecast</span>
        </button>
      </nav>

      <AnimatePresence mode="wait">
        {procurementTab === 'PADDY' ? (
          <motion.div 
            key="paddy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col lg:flex-row gap-8"
          >
            
            {/* LEFT: Pending Drafts Queue */}
            <div className="lg:w-1/3 flex flex-col gap-4">
              <div className="bg-[#111111] rounded-2xl border border-neutral-800 flex-1 flex flex-col overflow-hidden">
                <button 
                  type="button"
                  onClick={() => setShowMobileQueue(!showMobileQueue)}
                  className="px-4 py-4 flex justify-between items-center border-b border-neutral-800 w-full text-left active:bg-neutral-900 transition-colors"
                >
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#F5A623]" /> Truck Queue
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#F5A623]/20 text-[#F5A623] rounded-lg border border-[#F5A623]/30">{pendingDrafts.length} waiting</span>
                    <span className="lg:hidden text-neutral-400 text-lg font-bold">{showMobileQueue ? '−' : '+'}</span>
                  </div>
                </button>
                <div className={`p-3 space-y-2 max-h-[500px] overflow-y-auto ${showMobileQueue ? 'block' : 'hidden lg:block'}`}>
                  {pendingDrafts.length === 0 ? (
                    <div className="py-10 text-center">
                      <Truck className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                      <p className="text-xs font-black uppercase text-neutral-600">No trucks unloading</p>
                    </div>
                  ) : (
                    <div>
                      {pendingDrafts.map(draft => (
                        <div 
                          key={draft.id} 
                          onClick={() => { loadDraft(draft); setMobileStep(1); setShowMobileQueue(false); }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all mb-2 active:scale-[0.98] ${batchId === draft.id ? 'bg-[#F5A623]/20 border-[#F5A623]/50' : 'bg-[#1A1A1A] border-neutral-800 hover:border-neutral-600'}`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-black text-sm text-white uppercase truncate flex-1 mr-2">
                              {draft.supplierName}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${batchId === draft.id ? 'bg-[#F5A623]/30 text-[#F5A623] border-[#F5A623]/40' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}>{draft.grossWeight} kg</span>
                          </div>
                          {draft.farmerName && <div className="text-[10px] font-bold text-neutral-500 mb-1">{draft.farmerName}</div>}
                          <div className="text-[10px] font-bold flex items-center text-neutral-500">
                            <Truck className="w-3 h-3 mr-1" /> {draft.productName}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`p-3 border-t border-neutral-800 ${showMobileQueue ? 'block' : 'hidden lg:block'}`}>
                   <button type="button" onClick={() => { clearForm(); setMobileStep(1); setShowMobileQueue(false); }}
                     className="w-full py-2.5 rounded-xl border border-neutral-700 text-neutral-400 font-black uppercase text-xs tracking-wider hover:border-neutral-500 hover:text-neutral-200 transition-colors flex items-center justify-center gap-2">
                     <Plus className="w-3.5 h-3.5" /> New Entry
                   </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Weighbridge Form */}
            <div className="lg:w-2/3 bg-[#111111] rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-950 to-[#0E1A0E] px-5 py-5 sm:px-8 sm:py-6 border-b border-neutral-800 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-xl sm:text-2xl text-white flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                      <Scale className="h-5 w-5 text-emerald-400" />
                    </div>
                    {batchId ? 'Finalize Unloaded Truck' : 'New Weighbridge Entry'}
                  </h2>
                  <p className="mt-1.5 text-neutral-500 text-xs sm:text-sm font-medium ml-1">
                    {batchId ? 'Enter tare weight and moisture to finalize.' : 'Log truck arrival and gross weight.'}
                  </p>
                </div>
                {batchId && (
                  <div className="shrink-0 px-3 py-2 bg-emerald-500/20 border border-emerald-700/40 rounded-2xl">
                    <p className="text-[9px] font-black uppercase text-emerald-400/70">Finalizing</p>
                    <p className="text-emerald-400 font-black text-sm">{grossWeight} kg</p>
                  </div>
                )}
              </div>
              
              <div className="p-5 sm:p-8">
                {errorMsg && (
                  <div className="mb-5 p-4 bg-red-950/50 border border-red-900/60 rounded-xl text-red-400 font-bold text-sm flex items-center gap-2">
                    <span>⚠️</span> {errorMsg}
                  </div>
                )}
                
                <form className="space-y-0 lg:space-y-8" onSubmit={batchId ? handleFinalizeSubmit : handleDraftSubmit}>
                  
                  {/* Mobile Wizard Progress */}
                  <div className="lg:hidden flex items-center gap-0 mb-6 pb-5 border-b border-neutral-800">
                    {[{n:1,l:'Inbound'},{n:2,l:'Quality'},{n:3,l:'Final'}].map((s, i) => (
                      <div key={s.n} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border-2 transition-all ${mobileStep >= s.n ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-[#1A1A1A] border-neutral-700 text-neutral-500'}`}>{s.n}</div>
                          <span className={`text-[9px] font-black uppercase tracking-wider ${mobileStep >= s.n ? 'text-emerald-400' : 'text-neutral-600'}`}>{s.l}</span>
                        </div>
                        {i < 2 && <div className={`h-0.5 flex-1 mx-1 rounded transition-all mb-4 ${mobileStep > s.n ? 'bg-emerald-500' : 'bg-neutral-800'}`} />}
                      </div>
                    ))}
                  </div>

                  {/* Section 1 */}
                  <div className={`space-y-5 ${mobileStep === 1 ? 'block' : 'hidden lg:block'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Step 1 — Physical Inbound</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
                      <div className="flex gap-2 items-end animate-fade-up">
                        <Select
                          label="Paddy Broker"
                          value={supplierId}
                          onChange={(e) => { setSupplierId(e.target.value); setFarmerId(''); }}
                          required
                          disabled={!!batchId}
                        >
                          <option value="">Select Broker...</option>
                          {paddyBrokers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        <Button type="button" variant="ghost" onClick={() => { setModalEntity('SUPPLIER'); setModalOpen(true); }} disabled={!!batchId} className="px-3 mb-[2px]">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>

                      {supplierId && (
                        <div className="flex gap-2 items-end animate-fade-up">
                          <Select
                            label="Farmer (Optional)"
                            value={farmerId}
                            onChange={(e) => setFarmerId(e.target.value)}
                            onBlur={handleAutoSave}
                            disabled={!!batchId}
                          >
                            <option value="">Select Farmer...</option>
                            {availableFarmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </Select>
                          <Button type="button" variant="ghost" onClick={() => { setModalEntity('FARMER'); setModalOpen(true); }} disabled={!!batchId} className="px-3 mb-[2px]">
                            <Plus className="w-5 h-5" />
                          </Button>
                        </div>
                      )}

                      <div className="flex gap-2 items-end animate-fade-up">
                        <Select
                          label="Paddy Type"
                          value={productId}
                          onChange={(e) => setProductId(e.target.value)}
                          required
                          disabled={!!batchId}
                        >
                          <option value="">Select Product...</option>
                          {paddyProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <Button type="button" variant="ghost" onClick={() => { setModalEntity('PRODUCT'); setModalOpen(true); }} disabled={!!batchId} className="px-3 mb-[2px]">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>

                      <div className="flex gap-2 items-end animate-fade-up">
                        <Select
                          label="Destination Godown"
                          value={godownId}
                          onChange={(e) => setGodownId(e.target.value)}
                          required
                          disabled={!!batchId}
                        >
                          <option value="">Select Godown...</option>
                          {localGodowns
                            .filter(g => g.type === 'PADDY')
                            .map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </Select>
                        <Button type="button" variant="ghost" onClick={() => { setModalEntity('GODOWN'); setModalOpen(true); }} disabled={!!batchId} className="px-3 mb-[2px]">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>

                      <div className="animate-fade-up">
                        <Input
                          label="Gross Weight (KG)"
                          type="number"
                          step="0.01"
                          required
                          disabled={!!batchId}
                          value={grossWeight}
                          onChange={(e) => setGrossWeight(e.target.value)}
                          placeholder="e.g. 250.00"
                          inputMode="decimal"
                          pattern="[0-9]*"
                        />
                      </div>

                      {batchId && (
                        <div className="animate-fade-up">
                          <Input
                            label="Tare Weight (KG)"
                            type="number"
                            step="0.01"
                            required={!!batchId}
                            value={tareWeight}
                            onChange={(e) => setTareWeight(e.target.value)}
                            onBlur={handleAutoSave}
                            placeholder="e.g. 100.00"
                            className="border-[var(--green)] focus:border-[var(--green)]"
                            inputMode="decimal"
                            pattern="[0-9]*"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Next Button for Mobile */}
                    {!!batchId && (
                      <div className="lg:hidden pt-4">
                         <Button type="button" onClick={() => setMobileStep(2)} variant="primary" className="w-full">
                           NEXT STEP <CheckCircle className="w-4 h-4 ml-2" />
                         </Button>
                      </div>
                    )}
                  </div>

                  {batchId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`space-y-6 pt-6 lg:border-t-4 border-[var(--border)] ${mobileStep === 2 ? 'block' : 'hidden lg:block'}`}>
                      <h3 className="font-display font-black text-xl text-[var(--text)] uppercase flex items-center border-b-2 border-dashed border-[var(--dust)] pb-2">
                        2. PAYMENT & QUALITY DETAILS
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
                        <div className="animate-fade-up">
                          <Input
                            label="Per Bag Weight (KG)"
                            type="number"
                            step="0.1"
                            required
                            value={perBagWeight}
                            onChange={(e) => setPerBagWeight(e.target.value)}
                            onBlur={handleAutoSave}
                            icon={<Package className="w-4 h-4" />}
                            placeholder="e.g. 70.5"
                            inputMode="decimal"
                            pattern="[0-9]*"
                          />
                        </div>

                        <div className="animate-fade-up">
                          <Input
                            label="Farmer Bag Rate (₹)"
                            type="number"
                            step="0.01"
                            required
                            value={farmerBagRate}
                            onChange={(e) => setFarmerBagRate(e.target.value)}
                            onBlur={handleAutoSave}
                            icon={<Receipt className="w-4 h-4 text-[var(--green)]" />}
                            placeholder="e.g. 2100.00"
                            inputMode="decimal"
                            pattern="[0-9]*"
                          />
                        </div>
                        
                        <div className="animate-fade-up">
                          <Input
                            label="Broker Comm. / Bag (₹)"
                            type="number"
                            step="0.01"
                            required
                            value={brokerCommissionRate}
                            onChange={(e) => setBrokerCommissionRate(e.target.value)}
                            onBlur={handleAutoSave}
                            icon={<Receipt className="w-4 h-4 text-blue-600" />}
                            placeholder="e.g. 50.00"
                            inputMode="decimal"
                            pattern="[0-9]*"
                          />
                        </div>
                      </div>

                      <div className="mt-8 space-y-4 animate-fade-up">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={enableMoisture} 
                            onChange={(e) => {
                              setEnableMoisture(e.target.checked);
                              if (!e.target.checked) {
                                setBeforeDryingMoisture('');
                                setAfterDryingMoisture('14.0');
                              }
                            }} 
                            className="w-5 h-5 border-2 border-[var(--border)] rounded-sm text-[var(--gold)] focus:ring-[var(--gold)] bg-[var(--surface)] transition-all cursor-pointer"
                          />
                          <span className="font-display font-bold uppercase tracking-wider text-sm text-[var(--text)] group-hover:text-[var(--gold)] transition-colors">
                            Enable Moisture Deduction
                          </span>
                        </label>

                        {enableMoisture && (
                          <div className="space-y-3 p-4 border-2 border-[var(--border)] bg-[var(--surface-2)] shadow-brutal-sm rounded-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <Input
                                label="Moisture (Before) %"
                                type="number"
                                step="0.1"
                                required={enableMoisture}
                                value={beforeDryingMoisture}
                                onChange={(e) => setBeforeDryingMoisture(e.target.value)}
                                onBlur={handleAutoSave}
                                icon={<Droplets className="w-4 h-4 text-blue-500" />}
                                placeholder="e.g. 21.0"
                                inputMode="decimal"
                                pattern="[0-9]*"
                              />
                              <Input
                                label="Moisture (After) %"
                                type="number"
                                step="0.1"
                                required={enableMoisture}
                                value={afterDryingMoisture}
                                onChange={(e) => setAfterDryingMoisture(e.target.value)}
                                onBlur={handleAutoSave}
                                icon={<Droplets className="w-4 h-4 text-blue-400" />}
                                placeholder="e.g. 14.0"
                                inputMode="decimal"
                                pattern="[0-9]*"
                              />
                            </div>
                            {parseFloat(dryingShortage) > 0 && (
                              <div className="flex flex-col gap-2 bg-blue-500/10 border border-blue-500/30 p-3 rounded text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="font-display font-bold text-blue-400 uppercase tracking-widest text-[10px]">Calculated Shortage</span>
                                  <span className="font-black tabular-nums text-blue-400">{dryingShortage} kg</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-blue-500/20 pt-2">
                                  <span className="font-display font-bold text-blue-400 uppercase tracking-widest text-[10px]">Net After Shortage</span>
                                  <span className="font-black tabular-nums text-blue-400">{finalGodownWeight} kg</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SUMMARY DASHBOARD inside form */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[var(--charcoal)] border-4 border-[var(--gold)] shadow-brutal-lg rounded-sm mt-8 text-white lg:sticky lg:bottom-4 z-10 sticky top-[60px]">
                        <div>
                          <p className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--gold)]">Net Weight</p>
                          <p className="text-xl font-black tabular-nums mt-1">{netWeight} <span className="text-xs font-normal">kg</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--gold)]">Bags</p>
                          <p className="text-xl font-black tabular-nums mt-1">{numberOfBagsCalc}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--gold)]">Broker</p>
                          <p className="text-xl font-black tabular-nums mt-1">₹{brokerCommissionTotal}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--green)]">{farmerId ? 'Farmer Payable' : 'Supplier (Paddy) Payable'}</p>
                          <p className="text-xl font-black tabular-nums mt-1 text-[var(--green)]">₹{farmerTotalPayable}</p>
                        </div>
                      </div>

                      <div className="lg:hidden flex gap-4 pt-4">
                        <Button type="button" onClick={() => setMobileStep(1)} variant="ghost" className="flex-1">BACK</Button>
                        <Button type="button" onClick={() => setMobileStep(3)} variant="primary" className="flex-1">NEXT STEP</Button>
                      </div>
                    </motion.div>
                  )}
                  {/* Camera Integration for Docket */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-8 mb-4 ${mobileStep === 3 || (!batchId && mobileStep === 1) ? 'block' : 'hidden lg:block'}`}>
                    <div className="relative border-2 border-dashed border-[var(--blue)] bg-[var(--surface-2)] p-4 sm:p-6 flex flex-col items-center justify-center text-center group overflow-hidden transition-all hover:bg-[var(--surface)] min-h-[120px]">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setWeighSlip(file);
                            setWeighSlipPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {weighSlipPreview ? (
                        <div className="relative w-full aspect-[2/1] sm:aspect-video bg-black flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={weighSlipPreview} alt="Weigh-slip" className="max-h-full max-w-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white mb-2" />
                            <span className="font-display font-black text-white uppercase tracking-widest text-xs">Retake Photo</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-col items-center justify-center">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[var(--blue)] text-white rounded-full flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                            <Camera className="w-6 h-6 sm:w-8 sm:h-8" />
                          </div>
                          <p className="font-display font-black text-[var(--text)] uppercase tracking-widest text-sm sm:text-base mb-1">Snap Weigh-slip Docket</p>
                          <p className="text-[10px] sm:text-xs text-[var(--muted)] font-medium">Use mobile camera to attach physical receipt</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                  {/* Action Bar */}
                  <div className={`w-full bg-[var(--surface-2)] sm:bg-transparent p-4 sm:p-0 sm:pt-8 sm:border-t-2 border-[var(--border)] flex justify-between items-center mt-8 ${mobileStep === 3 || !batchId ? 'flex' : 'hidden lg:flex'}`}>
                    <div>
                      {batchId && (
                        <Button
                          type="button"
                          variant="danger"
                          onClick={handleCancelDraft}
                          className="flex items-center w-full sm:w-auto"
                        >
                          <Trash2 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">CANCEL</span>
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2 sm:gap-4 w-full sm:w-auto justify-end">
                      {batchId && (
                        <Button type="button" variant="ghost" onClick={() => setMobileStep(2)} className="flex-1 sm:flex-none lg:hidden">
                          BACK
                        </Button>
                      )}
                      <Button type="submit" variant="primary" className="flex-1 sm:flex-none py-3 sm:py-2 text-lg sm:text-sm">
                        {batchId ? (
                          <span className="flex items-center justify-center"><CheckCircle className="w-5 h-5 mr-2" /> FINALIZE</span>
                        ) : 'SAVE ENTRY'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        ) : procurementTab === 'PACKAGING' ? (
          /* TAB 2: PACKAGING MATERIAL & BAG INBOUND PROCUREMENT FORM */
          <motion.div 
            key="pkg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-4xl mx-auto card-brutal p-0 overflow-hidden"
          >
            <div className="bg-[var(--charcoal)] p-6 sm:p-8 text-white border-b-2 border-[var(--border)]">
              <h2 className="font-display font-black text-2xl flex items-center">
                <Tags className="h-7 w-7 mr-3 text-[var(--gold)]" />
                PACKAGING PROCUREMENT
              </h2>
              <p className="mt-2 text-white/80 text-sm font-medium">
                Log new branded bag arrivals to route to Cashier for payment approval and store stock in Common Packaging Godown.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 shadow-brutal-sm text-red-700 font-bold font-display text-sm flex items-center uppercase">
                  ⚠️ {errorMsg}
                </div>
              )}

              <form className="space-y-8" onSubmit={handlePackagingProcurementSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
                  <div className="flex gap-2 items-end animate-fade-up">
                    <Select
                      label="Brand Name *"
                      required
                      value={pkgBrandName}
                      onChange={(e) => setPkgBrandName(e.target.value)}
                    >
                      <option value="">Select Brand...</option>
                      {packagingProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </Select>
                    <Button type="button" variant="ghost" onClick={() => { setModalEntity('PRODUCT'); setModalOpen(true); }} className="px-3 mb-[2px]">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="animate-fade-up">
                    <Input
                      label="Bag Capacity (KG) *"
                      type="number"
                      step="0.01"
                      required
                      value={pkgCapacityKg}
                      onChange={(e) => setPkgCapacityKg(e.target.value)}
                      placeholder="e.g. 25"
                      inputMode="decimal"
                      pattern="[0-9]*"
                    />
                  </div>

                  <div className="animate-fade-up">
                    <Input
                      label="Number of Bags *"
                      type="number"
                      step="1"
                      required
                      value={pkgQuantityBags}
                      onChange={(e) => setPkgQuantityBags(e.target.value)}
                      placeholder="e.g. 1000"
                      inputMode="decimal"
                      pattern="[0-9]*"
                    />
                  </div>

                  <div className="animate-fade-up">
                    <Input
                      label="Per Bag Rate (₹) *"
                      type="number"
                      step="0.01"
                      required
                      value={pkgPerBagRate}
                      onChange={(e) => setPkgPerBagRate(e.target.value)}
                      icon={<Receipt className="w-4 h-4" />}
                      placeholder="e.g. 15.50"
                      inputMode="decimal"
                      pattern="[0-9]*"
                    />
                  </div>

                  <div className="flex gap-2 items-end animate-fade-up">
                    <Select
                      label="Bag Vendor (Optional)"
                      value={pkgSupplierId}
                      onChange={(e) => setPkgSupplierId(e.target.value)}
                    >
                      <option value="">Select Vendor...</option>
                      {bagVendors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Button type="button" variant="ghost" onClick={() => { setModalEntity('BAG_VENDOR'); setModalOpen(true); }} className="px-3 mb-[2px]">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="flex gap-2 items-end animate-fade-up">
                    <Select
                      label="Destination Godown *"
                      value={pkgGodownId}
                      onChange={(e) => setPkgGodownId(e.target.value)}
                      required
                    >
                      <option value="">Select Godown...</option>
                      {localGodowns
                        .filter(g => g.type === 'PACKAGING' || g.type === 'OTHER')
                        .map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Select>
                    <Button type="button" variant="ghost" onClick={() => { setModalEntity('GODOWN'); setModalOpen(true); }} className="px-3 mb-[2px]">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {pkgQuantityBags && pkgPerBagRate && (
                  <div className="p-6 bg-[var(--surface-2)] border-2 border-[var(--border)] shadow-brutal-sm flex justify-between items-center animate-fade-up">
                    <span className="font-display font-black uppercase tracking-wider text-[var(--text)]">Total Outbound Cost:</span>
                    <span className="text-2xl font-black tabular-nums text-[var(--gold)]">
                      ₹ {(parseFloat(pkgQuantityBags) * parseFloat(pkgPerBagRate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Action Bar */}
                <div className="w-full sm:bg-transparent p-4 sm:p-0 sm:pt-8 sm:border-t-2 border-[var(--border)] flex justify-end mt-8">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isPkgSubmitting || !pkgBrandName || !pkgCapacityKg || !pkgQuantityBags || !pkgPerBagRate || !pkgGodownId}
                    className="w-full sm:w-auto py-4 sm:py-2 text-lg sm:text-sm"
                  >
                    {isPkgSubmitting ? 'PROCURING...' : 'PROCURE BAGS'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          /* TAB 3: SMART FORECAST — PREDICTIVE SOURCING CRM */
          <motion.div
            key="forecast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SmartForecastView leads={predictiveLeads || []} availableVarieties={availableVarieties || []} />
          </motion.div>
        )}
      </AnimatePresence>

      <Modal 
        isOpen={confirmState.isOpen} 
        onClose={() => setConfirmState({...confirmState, isOpen: false})}
        title="Confirm Action"
      >
        <p className="font-medium text-[var(--text)] mb-6">{confirmState.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmState({...confirmState, isOpen: false})}>Cancel</Button>
          <Button variant="danger" onClick={confirmState.action || undefined}>Confirm</Button>
        </div>
      </Modal>

      <QuickAddModal 
        entityType={modalEntity}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAddSuccess}
        extraContext={{ 
          brokerId: supplierId,
          lockedCategory: procurementTab === 'PACKAGING' ? 'PACKAGING_MATERIAL' : (procurementTab === 'PADDY' ? 'RAW_MATERIAL' : undefined)
        }}
      />
    </div>
  );
}

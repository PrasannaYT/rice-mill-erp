'use client';

import { useState } from 'react';
import { Package, UserCheck, Factory, Sparkles, Warehouse, User, Building2 } from 'lucide-react';
import MillingConversionModal from './MillingConversionModal';

interface InventoryGodownsClientProps {
  godowns: {
    id: string;
    name: string;
    location?: string | null;
    capacity: number | null;
    lots: {
      id: string;
      productId: string;
      godownId: string;
      currentQuantity: number;
      product: { id: string; name: string; category: string; };
      procurementBatch?: { 
        farmer?: { name: string } | null; 
        supplier?: { name: string } | null; 
      } | null;
    }[];
  }[];
  paddyProducts: {
    id: string;
    name: string;
    category: string;
    unit?: string;
    hsnCode?: string | null;
  }[];
  allLots: {
    id: string;
    productId: string;
    godownId: string;
    currentQuantity: number;
  }[];
}

export default function InventoryGodownsClient({
  godowns,
  paddyProducts,
  allLots
}: InventoryGodownsClientProps) {
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [selectedPaddyGodownId, setSelectedPaddyGodownId] = useState('');
  const [selectedPaddyProductId, setSelectedPaddyProductId] = useState('');

  // PERSISTENT GODOWNS: Filter by type/name but NEVER unmount or hide empty godowns with 0 stock
  const paddyGodowns = godowns.filter(g => {
    const name = g.name.toLowerCase();
    return !name.includes('rice') && !name.includes('packaging');
  });

  const riceGodowns = godowns.filter(g => {
    const name = g.name.toLowerCase();
    return name.includes('rice') || name.includes('finish') || name.includes('main') || name.includes('central');
  });

  const openConversionModal = (godownId?: string, productId?: string) => {
    setSelectedPaddyGodownId(godownId || '');
    setSelectedPaddyProductId(productId || '');
    setIsConversionModalOpen(true);
  };

  return (
    <div className="space-y-12">
      
      {/* ========================================================================= */}
      {/* SECTION 1: PADDY STORAGE GODOWNS (WITH SUPPLIER & FARMER PROVENANCE) */}
      {/* ========================================================================= */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="font-display font-black text-2xl uppercase tracking-widest flex items-center text-white">
              <Package className="w-6 h-6 mr-3 text-[var(--green)]" /> Paddy Storage Godowns
            </h2>
            <p className="text-sm font-bold text-[var(--muted)] mt-1 uppercase tracking-wider">
              Raw Paddy storage with Supplier & Farmer provenance breakdown per variety
            </p>
          </div>

          <button
            type="button"
            onClick={() => openConversionModal()}
            className="px-5 py-3 bg-[#F5A623] hover:bg-[#d98e19] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border-2 border-black flex items-center gap-2 transition-all active:scale-95 shrink-0"
          >
            <Factory className="w-4 h-4" />
            <span>Process Milling Batch</span>
          </button>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 lg:grid lg:grid-cols-2 lg:overflow-visible lg:gap-8 hide-scrollbar">
          {(paddyGodowns.length > 0 ? paddyGodowns : godowns).map((godown) => {
            const totalStored = godown.lots.reduce((acc: number, lot: any) => acc + Number(lot.currentQuantity), 0);
            const capacity = godown.capacity ? Number(godown.capacity) : 0;
            const percentage = capacity > 0 ? (totalStored / capacity) * 100 : 0;

            // Group by Paddy Variety with Supplier & Farmer provenance details
            const paddyGroupMap = new Map<string, {
              productId: string;
              productName: string;
              totalQuantity: number;
              sources: Array<{ farmerName: string; brokerName: string; quantity: number }>;
            }>();

            for (const lot of godown.lots) {
              const currentQty = Number(lot.currentQuantity);
              const pId = lot.productId;
              const pName = lot.product.name;

              const existing = paddyGroupMap.get(pId) || {
                productId: pId,
                productName: pName,
                totalQuantity: 0,
                sources: [] as Array<{ farmerName: string; brokerName: string; quantity: number }>
              };

              existing.totalQuantity += currentQty;
              existing.sources.push({
                farmerName: lot.procurementBatch?.farmer?.name || 'Direct Lot',
                brokerName: lot.procurementBatch?.supplier?.name || 'Direct Procurement',
                quantity: currentQty
              });
              paddyGroupMap.set(pId, existing);
            }

            const paddyTypes = Array.from(paddyGroupMap.values());

            return (
              <div key={godown.id} className="min-w-[85vw] snap-center lg:min-w-0 card-brutal p-0 overflow-hidden flex flex-col">
                <div className="p-6 bg-[var(--surface-2)] border-b-2 border-[var(--border)] relative flex justify-between items-start">
                  <div>
                    <h3 className="font-display font-black text-xl uppercase tracking-wider text-white">
                      {godown.name}
                    </h3>
                    <p className="text-sm font-bold text-[var(--muted)]">{godown.location || 'Paddy Storage Location'}</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => openConversionModal(godown.id)}
                    className="px-3 py-1.5 bg-[#F5A623]/20 hover:bg-[#F5A623] text-[#F5A623] hover:text-black border border-[#F5A623] rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    title="Send Paddy to Mill"
                  >
                    <Factory className="w-3.5 h-3.5" />
                    <span>Send to Mill</span>
                  </button>
                </div>

                {/* Storage Capacity Gauge */}
                <div className="p-6 bg-[var(--surface)] border-b-2 border-[var(--border)]">
                  <div className="flex gap-5 items-center">
                    <div className="w-12 h-20 bg-[var(--surface-2)] border-2 border-[var(--border)] flex flex-col justify-end p-1 relative rounded">
                      <div 
                        className={`w-full transition-all duration-1000 ${percentage > 90 ? 'bg-[var(--rust)]' : 'bg-[var(--green)]'}`}
                        style={{ height: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest block">Capacity Used</span>
                      <p className="text-xl font-black tabular-nums text-white mt-0.5">
                        {percentage.toFixed(1)}% <span className="text-xs font-bold text-[var(--muted)]">FULL</span>
                      </p>
                      <p className="text-xs font-bold text-[var(--muted)] mt-1">
                        <span className="text-white font-mono">{totalStored.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> / {capacity > 0 ? capacity.toLocaleString('en-IN') : 'Unlimited'} kg
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stored Paddy Varieties & Supplier / Farmer Breakdown */}
                <div className="p-6 space-y-4 bg-[var(--surface)] flex-1">
                  <h4 className="text-[10px] font-black text-[#F5A623] uppercase tracking-widest">
                    Stored Paddy Varieties & Supplier Provenance
                  </h4>

                  {paddyTypes.length > 0 ? (
                    <div className="space-y-4">
                      {paddyTypes.map(pt => (
                        <div key={pt.productId} className="p-4 bg-neutral-900 border border-[#F5A623]/30 rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-display font-black text-sm uppercase text-white flex items-center gap-1.5">
                                <span>🌾 {pt.productName}</span>
                              </h5>
                              <span className="text-[11px] font-bold text-[#F5A623]">
                                {pt.sources.length} Supplier / Farmer Lot(s) Stored
                              </span>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <span className="font-mono font-black text-base text-[#F5A623] tabular-nums">
                                {pt.totalQuantity.toLocaleString('en-IN')} kg
                              </span>
                              <button
                                type="button"
                                onClick={() => openConversionModal(godown.id, pt.productId)}
                                className="p-1.5 text-neutral-400 hover:text-[#F5A623] hover:bg-[#F5A623]/10 rounded border border-[#F5A623]/30"
                                title="Mill this variety"
                              >
                                <Factory className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* SUPPLIER & FARMER PROVENANCE DETAILS BREAKDOWN */}
                          <div className="pt-2.5 border-t border-neutral-800 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                              Supplier & Farmer Breakdown:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {pt.sources.map((src, idx) => (
                                <div key={idx} className="p-2.5 bg-black/60 border border-neutral-800 rounded-lg text-xs space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-white flex items-center gap-1.5 truncate">
                                      <Building2 className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
                                      <span className="truncate">{src.brokerName}</span>
                                    </span>
                                    <span className="font-mono font-black text-[#F5A623] text-xs shrink-0 ml-1">
                                      {src.quantity.toLocaleString('en-IN')} kg
                                    </span>
                                  </div>
                                  {src.farmerName && (
                                    <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-0.5">
                                      <User className="w-3 h-3 text-emerald-400 shrink-0" />
                                      <span className="text-neutral-300 font-semibold truncate">Farmer: {src.farmerName}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-neutral-500 border border-dashed border-neutral-800 uppercase tracking-wider font-bold">
                      0.00 kg stored — Ready for Paddy procurement
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: CENTRAL RICE STORAGE GODOWNS (PERSISTENT DISPLAY) */}
      {/* ========================================================================= */}
      <div>
        <div className="mb-6 border-t-2 border-dashed border-neutral-800 pt-8">
          <h2 className="font-display font-black text-2xl uppercase tracking-widest flex items-center text-[#F5A623]">
            <Warehouse className="w-6 h-6 mr-3 text-[#F5A623]" /> CENTRAL RICE STORAGE GODOWNS
          </h2>
          <p className="text-sm font-bold text-[var(--muted)] mt-1 uppercase tracking-wider">
            Milled products grouped by original Paddy Variety → Output Type (Fine Rice, Broken Rice, Bran)
          </p>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 lg:grid lg:grid-cols-2 lg:overflow-visible lg:gap-8 hide-scrollbar">
          {(riceGodowns.length > 0 ? riceGodowns : paddyGodowns).map((godown) => {
            const totalStored = godown.lots.reduce((acc: number, lot: any) => acc + Number(lot.currentQuantity), 0);
            const capacity = godown.capacity ? Number(godown.capacity) : 0;
            const percentage = capacity > 0 ? (totalStored / capacity) * 100 : 0;

            // Group stock in Rice Godown by Paddy Variety -> Output Type
            const varietyGroupMap = new Map<string, Array<{ outputType: string; quantityKg: number }>>();

            for (const lot of godown.lots) {
              const name = lot.product.name;
              const qty = Number(lot.currentQuantity);
              if (qty <= 0) continue;

              const parts = name.split('-');
              const variety = parts.length > 1 ? parts[0].trim() : 'General Rice';
              const type = parts.length > 1 ? parts.slice(1).join('-').trim() : name;

              const existing = varietyGroupMap.get(variety) || [];
              const typeIndex = existing.findIndex(t => t.outputType.toLowerCase() === type.toLowerCase());
              if (typeIndex >= 0) {
                existing[typeIndex].quantityKg += qty;
              } else {
                existing.push({ outputType: type, quantityKg: qty });
              }
              varietyGroupMap.set(variety, existing);
            }

            const varietyGroups = Array.from(varietyGroupMap.entries());

            return (
              <div key={godown.id} className="min-w-[85vw] snap-center lg:min-w-0 card-brutal p-0 overflow-hidden flex flex-col border-2 border-[#F5A623]/40">
                {/* Header */}
                <div className="p-6 bg-neutral-900 border-b-2 border-[#F5A623]/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-black text-xl uppercase tracking-wider text-[#F5A623] flex items-center gap-2">
                        <span>🍚</span> {godown.name}
                      </h3>
                      <p className="text-xs font-bold text-neutral-400 mt-1">{godown.location || 'Central Rice Storage Godown'}</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-[#F5A623]/20 text-[#F5A623] px-3 py-1 rounded-full border border-[#F5A623]/40">
                      CENTRAL RICE GODOWN
                    </span>
                  </div>
                </div>

                {/* Storage Capacity Battery */}
                <div className="p-6 bg-[#1A1A1A] border-b border-neutral-800">
                  <div className="flex gap-5 items-center">
                    <div className="w-12 h-20 bg-neutral-900 border-2 border-[#F5A623]/40 flex flex-col justify-end p-1 relative rounded">
                      <div 
                        className="w-full bg-[#F5A623] transition-all duration-1000 rounded-sm"
                        style={{ height: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Godown Occupancy</span>
                      <p className="text-xl font-black tabular-nums text-white mt-0.5">
                        {percentage.toFixed(1)}% <span className="text-xs font-bold text-[#F5A623]">FULL</span>
                      </p>
                      <p className="text-xs font-bold text-neutral-400 mt-1">
                        <span className="text-white font-mono">{totalStored.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> / {capacity > 0 ? capacity.toLocaleString('en-IN') : 'Unlimited'} kg
                      </p>
                    </div>
                  </div>
                </div>

                {/* Milled Product Inventory Grouped by Paddy Variety -> Output Type */}
                <div className="p-6 space-y-4 bg-[#121212] flex-1">
                  <h4 className="text-[10px] font-black text-[#F5A623] uppercase tracking-widest">
                    Milled Inventory (Variety Hierarchy)
                  </h4>

                  {varietyGroups.length > 0 ? (
                    <div className="space-y-4">
                      {varietyGroups.map(([varietyName, outputs]) => {
                        const varietyTotalKg = outputs.reduce((sum, o) => sum + o.quantityKg, 0);

                        return (
                          <div key={varietyName} className="p-4 bg-neutral-900 rounded-xl border border-[#F5A623]/30 space-y-3">
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                              <span className="font-display font-black text-sm uppercase text-[#F5A623] flex items-center gap-1.5">
                                <span>🌾 {varietyName}</span>
                              </span>
                              <span className="font-mono font-bold text-xs text-white">
                                Total: <span className="text-[#F5A623]">{varietyTotalKg.toLocaleString('en-IN')} KG</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {outputs.map((op, idx) => {
                                const isBran = op.outputType.toLowerCase().includes('bran') || op.outputType.toLowerCase().includes('husk');
                                const icon = isBran ? '🍂' : '🌾';

                                return (
                                  <div key={idx} className="p-2.5 bg-[#121212] rounded-lg border border-neutral-800">
                                    <span className="text-[10px] font-bold text-neutral-400 block mb-0.5 truncate">
                                      {icon} {op.outputType}
                                    </span>
                                    <span className="font-mono font-black text-xs text-[#F5A623] tabular-nums">
                                      {op.quantityKg.toLocaleString('en-IN')} KG
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-neutral-500 border border-dashed border-neutral-800 uppercase tracking-wider font-bold">
                      0.00 kg milled rice stored — Ready for milling batches
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MILLING CONVERSION MODAL */}
      <MillingConversionModal
        isOpen={isConversionModalOpen}
        onClose={() => setIsConversionModalOpen(false)}
        godowns={godowns}
        paddyProducts={paddyProducts}
        lots={allLots}
        initialGodownId={selectedPaddyGodownId}
        initialProductId={selectedPaddyProductId}
      />

    </div>
  );
}

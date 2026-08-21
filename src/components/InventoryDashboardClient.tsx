'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Warehouse, 
  Tags, 
  Factory, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  AlertTriangle, 
  Building2, 
  User, 
  History, 
  X, 
  ChevronRight, 
  Plus, 
  Clock, 
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  Info,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MillingConversionModal from './MillingConversionModal';
import ExistingPaddyStockModal from './ExistingPaddyStockModal';
import AddPackagingStockModal from './AddPackagingStockModal';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import SparesScrapTab from './SparesScrapTab';

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  productName: string;
  productId: string;
  productCategory?: string;
  fromGodownName: string;
  toGodownName: string;
}

interface InventoryDashboardClientProps {
  godowns: {
    id: string;
    name: string;
    location?: string | null;
    capacity: number | null;
    type?: string;
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
  suppliers?: { id: string; name: string }[];
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
  packingItems: {
    id: string;
    brandName: string;
    capacityKg: string;
    quantityBags: string;
    perBagRate: string;
    godownId: string;
    hsnCode?: string | null;
    status: string;
    godown: { name: string };
    supplier?: { id: string; name: string } | null;
  }[];
  stockMovements?: StockMovement[];
  editPackingId?: string;
  spareParts?: any[];
  scrapEntries?: any[];
}

export default function InventoryDashboardClient({
  godowns,
  suppliers = [],
  paddyProducts,
  allLots,
  packingItems,
  stockMovements = [],
  editPackingId,
  spareParts = [],
  scrapEntries = []
}: InventoryDashboardClientProps) {
  const router = useRouter();

  // Navigation state: Segmented Tabs ('paddy' | 'rice' | 'bags' | 'spares')
  const [activeTab, setActiveTab] = useState<'paddy' | 'rice' | 'bags' | 'spares'>('paddy');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Grouped Packaging Items by Brand Name and Weight Category (Capacity KG)
  const groupedPackingItems = useMemo(() => {
    const activeItems = (packingItems || []).filter(item => Number(item.quantityBags) > 0);
    
    const map = new Map<string, {
      key: string;
      brandName: string;
      capacityKg: string;
      totalBags: number;
      totalValue: number;
      godowns: string[];
      itemIds: string[];
      items: typeof activeItems;
    }>();

    for (const item of activeItems) {
      const brand = (item.brandName || 'Branded Bag').trim();
      const capacity = (item.capacityKg || '0').toString().trim();
      const groupKey = `${brand.toUpperCase()}_${capacity}`;

      const bags = Number(item.quantityBags) || 0;
      const rate = Number(item.perBagRate) || 0;
      const val = bags * rate;
      const gName = item.godown?.name || 'Main Storage';

      const existing = map.get(groupKey) || {
        key: groupKey,
        brandName: brand,
        capacityKg: capacity,
        totalBags: 0,
        totalValue: 0,
        godowns: [],
        itemIds: [],
        items: []
      };

      existing.totalBags += bags;
      existing.totalValue += val;
      if (!existing.godowns.includes(gName)) {
        existing.godowns.push(gName);
      }
      existing.itemIds.push(item.id);
      existing.items.push(item);

      map.set(groupKey, existing);
    }

    return Array.from(map.values());
  }, [packingItems]);

  // Supplier Provenance Bottom Sheet state
  const [activeSupplierSheet, setActiveSupplierSheet] = useState<{
    isOpen: boolean;
    varietyName: string;
    sources: Array<{ farmerName: string; brokerName: string; quantity: number }>;
  }>({ isOpen: false, varietyName: '', sources: [] });

  // Modal State for Milling Batch
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [selectedPaddyGodownId, setSelectedPaddyGodownId] = useState('');
  const [selectedPaddyProductId, setSelectedPaddyProductId] = useState('');

  // Bottom Sheet Audit Trail State
  const [activeAuditSheet, setActiveAuditSheet] = useState<{
    isOpen: boolean;
    title: string;
    productId?: string;
    productCategory?: string;
    subtitle?: string;
  }>({ isOpen: false, title: '' });

  // Opening Stock Modal
  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false);
  const [isAddPackagingModalOpen, setIsAddPackagingModalOpen] = useState(false);

  // Monitor Network Status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Categorize Godowns
  const paddyGodowns = useMemo(() => {
    return godowns.filter(g => {
      if ('type' in g && g.type) {
        return g.type === 'PADDY';
      }
      const name = g.name.toLowerCase();
      return !name.includes('rice') && !name.includes('packaging');
    });
  }, [godowns]);

  const riceGodowns = useMemo(() => {
    return godowns.filter(g => {
      const gType = (g.type || '').toUpperCase();
      if (gType === 'RICE') return true;
      const name = g.name.toLowerCase();
      if (name.includes('rice') || name.includes('finish') || name.includes('central') || name.includes('main')) return true;
      return g.lots.some(l => {
        const cat = (l.product?.category || '').toUpperCase();
        const pName = (l.product?.name || '').toLowerCase();
        return cat.includes('FINISHED') || cat.includes('RICE') || pName.includes('rice');
      });
    });
  }, [godowns]);

  const displayPaddyGodowns = paddyGodowns;
  const displayRiceGodowns = riceGodowns;

  // Global Totals
  const totalPaddyStockKg = useMemo(() => {
    return paddyGodowns.reduce((sum, g) => {
      return sum + g.lots.reduce((lSum: number, l: any) => lSum + Number(l.currentQuantity), 0);
    }, 0);
  }, [paddyGodowns]);

  const totalRiceStockKg = useMemo(() => {
    return godowns.reduce((sum, g) => {
      return sum + g.lots.reduce((lSum: number, l: any) => {
        const cat = (l.product?.category || '').toUpperCase();
        const pName = (l.product?.name || '').toLowerCase();
        const gType = (g.type || '').toUpperCase();
        const gName = g.name.toLowerCase();
        const isRice = cat.includes('FINISHED') || cat.includes('RICE') || pName.includes('rice') || gType === 'RICE' || gName.includes('rice') || gName.includes('finish');
        return isRice ? lSum + Number(l.currentQuantity) : lSum;
      }, 0);
    }, 0);
  }, [godowns]);

  const totalBagsInStock = useMemo(() => {
    return packingItems.reduce((sum, item) => sum + (Number(item.quantityBags) || 0), 0);
  }, [packingItems]);

  const openConversionModal = (godownId?: string, productId?: string) => {
    setSelectedPaddyGodownId(godownId || '');
    setSelectedPaddyProductId(productId || '');
    setIsConversionModalOpen(true);
  };

  const openAuditTrail = (title: string, productId?: string, subtitle?: string, productCategory?: string) => {
    setActiveAuditSheet({
      isOpen: true,
      title,
      productId,
      productCategory,
      subtitle: subtitle || 'Audit Trail & Stock Movement History'
    });
  };

  const openSupplierProvenanceSheet = (varietyName: string, sources: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSupplierSheet({
      isOpen: true,
      varietyName,
      sources
    });
  };

  return (
    <main className="min-h-screen bg-[#121212] text-[#E0E0E0] pb-36 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. ACCESSIBLE HEADER WITH SYSTEM STATUS */}
      {/* ========================================================================= */}
      <AppHeader
        title="Inventory Hub"
        subtitle="Paddy varieties, Rice Godowns, and Branded Packaging materials"
        breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Inventory'}]}
        isOnline={isOnline}
        actions={
          <button
            onClick={handleRefresh}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 hover:text-[#F5A623] active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F5A623]' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">

        {/* ========================================================================= */}
        {/* 2. SEGMENTED NAVIGATION TABS */}
        {/* ========================================================================= */}
        <nav aria-label="Inventory View Sections" className="grid grid-cols-4 gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg relative">
          <button
            onClick={() => setActiveTab('paddy')}
            className={`py-3.5 px-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:outline-none min-h-[44px] relative z-10 ${
              activeTab === 'paddy'
                ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-md scale-[1.02]'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            <span className="text-base sm:text-sm">🌾</span>
            <span className="truncate text-[10px] sm:text-xs">Paddy ({displayPaddyGodowns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rice')}
            className={`py-3.5 px-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:outline-none min-h-[44px] relative z-10 ${
              activeTab === 'rice'
                ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-md scale-[1.02]'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            <span className="text-base sm:text-sm">🍚</span>
            <span className="truncate text-[10px] sm:text-xs">Rice ({displayRiceGodowns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bags')}
            className={`py-3.5 px-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:outline-none min-h-[44px] relative z-10 ${
              activeTab === 'bags'
                ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-md scale-[1.02]'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            <Package className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="truncate text-[10px] sm:text-xs">PACKAGING</span>
          </button>

          <button
            onClick={() => setActiveTab('spares')}
            className={`py-3.5 px-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none min-h-[44px] relative z-10 ${
              activeTab === 'spares'
                ? 'bg-emerald-500 text-black border-emerald-500 shadow-md scale-[1.02]'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
            }`}
            aria-selected={activeTab === 'spares'}
            role="tab"
          >
            <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="truncate text-[10px] sm:text-xs">SPARES</span>
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* 3. HIGH-LEVEL INFOGRAPHIC SUMMARY METRICS */}
        {/* ========================================================================= */}
        <section aria-label="Global Stock Overview" className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: TOTAL PADDY */}
          <div 
            onClick={() => openAuditTrail('Global Paddy Stock Summary', undefined, 'Total stored across all Paddy Godowns', 'RAW_MATERIAL')}
            className="p-4 bg-[#1A1A1A] border-2 border-[#F5A623]/40 rounded-2xl relative overflow-hidden cursor-pointer active:scale-[0.98] hover:border-[#F5A623] transition-all shadow-xl focus-visible:ring-2 focus-visible:ring-[#F5A623]"
            tabIndex={0}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" /> TOTAL PADDY
              </span>
              <History className="w-3.5 h-3.5 text-neutral-500" />
            </div>
            <p className="font-mono font-black text-xl sm:text-2xl text-[#F5A623] tabular-nums mt-1">
              {totalPaddyStockKg.toLocaleString('en-IN')} <span className="text-xs text-neutral-400 font-normal">kg</span>
            </p>
          </div>

          {/* Card 2: TOTAL RICE */}
          <div 
            onClick={() => openAuditTrail('Global Rice Stock Summary', undefined, 'Total milled rice across Central Storage Godowns', 'FINISHED_GOOD')}
            className="p-4 bg-[#1A1A1A] border-2 border-[#F5A623]/40 rounded-2xl relative overflow-hidden cursor-pointer active:scale-[0.98] hover:border-[#F5A623] transition-all shadow-xl focus-visible:ring-2 focus-visible:ring-[#F5A623]"
            tabIndex={0}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" /> TOTAL RICE
              </span>
              <History className="w-3.5 h-3.5 text-neutral-500" />
            </div>
            <p className="font-mono font-black text-xl sm:text-2xl text-[#F5A623] tabular-nums mt-1">
              {totalRiceStockKg.toLocaleString('en-IN')} <span className="text-xs text-neutral-400 font-normal">kg</span>
            </p>
          </div>

          {/* Card 3: PACKAGING BAGS */}
          <div 
            onClick={() => openAuditTrail('Global Packaging Summary', undefined, 'Total stock of packaging bags across all Godowns', 'PACKAGING_MATERIAL')}
            className="col-span-2 sm:col-span-1 p-4 bg-[#1A1A1A] border-2 border-[#F5A623]/40 rounded-2xl relative overflow-hidden cursor-pointer active:scale-[0.98] hover:border-[#F5A623] transition-all shadow-xl focus-visible:ring-2 focus-visible:ring-[#F5A623]"
            tabIndex={0}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Tags className="w-3.5 h-3.5 text-purple-400" /> PACKAGING BAGS
              </span>
              <History className="w-3.5 h-3.5 text-neutral-500" />
            </div>
            <p className="font-mono font-black text-xl sm:text-2xl text-[#F5A623] tabular-nums mt-1">
              {totalBagsInStock.toLocaleString('en-IN')} <span className="text-xs text-neutral-400 font-normal">Bags</span>
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ANIMATED TAB CONTENT SWITCHER */}
        {/* ========================================================================= */}
        {isRefreshing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-64 bg-[#1A1A1A] rounded-2xl border border-neutral-800" />
            <div className="h-64 bg-[#1A1A1A] rounded-2xl border border-neutral-800" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ========================================================================= */}
            {/* 5. TAB CONTENT 1: PADDY STORAGE GODOWNS */}
            {/* ========================================================================= */}
            {activeTab === 'paddy' && (
              <motion.section 
                key="paddy-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                aria-label="Paddy Storage Godowns" 
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <span>🌾</span> Paddy Storage Godowns ({displayPaddyGodowns.length})
                  </h2>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsOpeningStockModalOpen(true)}
                      className="flex-1 sm:flex-none px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-display font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-xl shadow-lg border-2 border-neutral-700 flex items-center justify-center gap-2 active:scale-95 transition-all min-h-[48px] focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>[ ADD STOCK ]</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openConversionModal()}
                      className="flex-1 sm:flex-none px-4 py-3 bg-[#F5A623] hover:bg-[#d98e19] text-black font-display font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xl shadow-lg border-2 border-black flex items-center justify-center gap-2 active:scale-95 transition-all min-h-[48px] focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Factory className="w-4 h-4 shrink-0" />
                      <span>[ MILLING BATCH ]</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayPaddyGodowns.map(godown => {
                    const totalStored = godown.lots.reduce((acc: number, lot: any) => acc + Number(lot.currentQuantity), 0);
                    const capacity = godown.capacity ? Number(godown.capacity) : 0;
                    const percentage = capacity > 0 ? (totalStored / capacity) * 100 : 0;
                    const isHighCapacityAlert = percentage >= 95;
                    const isModerateCapacity = percentage >= 60 && percentage < 95;

                    // Group by Paddy Variety with Supplier provenance
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
                      <article key={godown.id} className="p-5 sm:p-6 bg-[#1A1A1A] border-2 border-[#F5A623]/40 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-xl">
                        
                        {/* WATERMARK EFFECT */}
                        <Package className="w-32 h-32 text-[#F5A623] opacity-15 pointer-events-none absolute -bottom-4 -right-4" />

                        <div>
                          {/* Card Header & Status Badge */}
                          <div className="flex justify-between items-start mb-3 relative z-10">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-display font-black text-lg uppercase tracking-wider text-white">
                                  {godown.name}
                                </h3>
                                {isHighCapacityAlert ? (
                                  <span className="text-[10px] font-mono font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/40">
                                    🔴 CRITICAL (&gt;95%)
                                  </span>
                                ) : isModerateCapacity ? (
                                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/40">
                                    🟡 MODERATE
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/40">
                                    🟢 OPTIMAL
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 font-bold">{godown.location || 'Paddy Storage Location'}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => openConversionModal(godown.id)}
                              className="px-3.5 py-2 bg-[#F5A623] text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-[#d98e19] active:scale-95 transition-all flex items-center gap-1.5 min-h-[44px]"
                            >
                              <Factory className="w-3.5 h-3.5" />
                              <span>Mill</span>
                            </button>
                          </div>

                          {/* THEMATIC PADDY HUSK OCCUPANCY PROGRESS BAR */}
                          <div className="my-4 space-y-1.5 relative z-10">
                            <div className="flex justify-between text-xs font-mono font-bold">
                              <span className="text-neutral-400 flex items-center gap-1">
                                <span>🌾</span> Paddy Occupancy
                              </span>
                              <span className={isHighCapacityAlert ? 'text-red-400' : 'text-[#F5A623]'}>
                                {totalStored.toLocaleString('en-IN')} / {capacity > 0 ? capacity.toLocaleString('en-IN') : '∞'} kg ({percentage.toFixed(1)}%)
                              </span>
                            </div>

                            <div className="w-full h-3 bg-neutral-900 border border-[#F5A623]/30 rounded-xl overflow-hidden p-0.5 relative shadow-inner">
                              <div 
                                className={`h-full transition-all duration-1000 rounded-lg relative overflow-hidden ${
                                  isHighCapacityAlert 
                                    ? 'bg-gradient-to-r from-red-600 via-amber-600 to-red-500 animate-pulse' 
                                    : 'bg-gradient-to-r from-[#D97706] via-[#F5A623] to-[#FBBF24]'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              >
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:6px_6px]" />
                              </div>
                            </div>
                          </div>

                          {/* STORED PADDY VARIETIES */}
                          <div className="space-y-3 mt-4 relative z-10">
                            <span className="text-[10px] font-black text-[#F5A623] uppercase tracking-widest block">
                              Stored Paddy Varieties
                            </span>

                            {paddyTypes.length > 0 ? (
                              <div className="space-y-3">
                                {paddyTypes.map(pt => (
                                  <div 
                                    key={pt.productId}
                                    className="p-3.5 bg-neutral-900 border border-[#F5A623]/30 rounded-2xl space-y-2.5 hover:border-[#F5A623] transition-colors"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <h4 className="font-display font-black text-sm uppercase text-white flex items-center gap-1.5">
                                          <span>🌾 {pt.productName}</span>
                                        </h4>
                                        <span className="font-mono font-black text-sm text-[#F5A623] block mt-0.5">
                                          {pt.totalQuantity.toLocaleString('en-IN')} kg
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => openSupplierProvenanceSheet(pt.productName, pt.sources, e)}
                                          className="px-3 py-2 bg-black/60 border border-[#F5A623]/40 text-[#F5A623] hover:bg-[#F5A623] hover:text-black rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 min-h-[44px]"
                                        >
                                          <Info className="w-3.5 h-3.5" />
                                          <span>{pt.sources.length} Lots</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => openConversionModal(godown.id, pt.productId)}
                                          className="p-2.5 bg-[#F5A623]/20 hover:bg-[#F5A623] text-[#F5A623] hover:text-black rounded-xl border border-[#F5A623]/40 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                                          title="Mill Variety"
                                          aria-label={`Mill ${pt.productName}`}
                                        >
                                          <Factory className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-xs text-neutral-500 border border-dashed border-neutral-800 uppercase font-bold rounded-xl">
                                0.00 kg stored — Ready for Paddy procurement
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* ========================================================================= */}
            {/* 6. TAB CONTENT 2: RICE STORAGE GODOWNS */}
            {/* ========================================================================= */}
            {activeTab === 'rice' && (
              <motion.section 
                key="rice-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                aria-label="Central Rice Storage Godowns" 
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <span>🍚</span> Central Rice Storage Godowns ({displayRiceGodowns.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayRiceGodowns.map(godown => {
                    const totalStored = godown.lots.reduce((acc: number, lot: any) => acc + Number(lot.currentQuantity), 0);
                    const capacity = godown.capacity ? Number(godown.capacity) : 0;
                    const percentage = capacity > 0 ? (totalStored / capacity) * 100 : 0;

                    // Group by Variety -> Output Type
                    const varietyGroupMap = new Map<string, Array<{ outputType: string; quantityKg: number; productId: string }>>();

                    for (const lot of godown.lots) {
                      const name = lot.product?.name;
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
                        existing.push({ outputType: type, quantityKg: qty, productId: lot.productId });
                      }
                      varietyGroupMap.set(variety, existing);
                    }

                    const varietyGroups = Array.from(varietyGroupMap.entries());

                    return (
                      <article key={godown.id} className="p-5 sm:p-6 bg-[#1A1A1A] border-2 border-sky-500/40 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-xl">
                        
                        {/* WATERMARK EFFECT */}
                        <Warehouse className="w-32 h-32 text-sky-400 opacity-15 pointer-events-none absolute -bottom-4 -right-4" />

                        <div>
                          <div className="flex justify-between items-start mb-3 relative z-10">
                            <div>
                              <h3 className="font-display font-black text-lg uppercase tracking-wider text-sky-400">
                                🍚 {godown.name}
                              </h3>
                              <p className="text-xs text-neutral-400 font-bold">{godown.location || 'Central Rice Storage'}</p>
                            </div>

                            <span className="text-[11px] font-mono font-bold bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full border border-sky-500/40">
                              CENTRAL RICE GODOWN
                            </span>
                          </div>

                          {/* THEMATIC PEARLESCENT MILLED RICE OCCUPANCY PROGRESS BAR */}
                          <div className="my-4 space-y-1.5 relative z-10">
                            <div className="flex justify-between text-xs font-mono font-bold">
                              <span className="text-neutral-400 flex items-center gap-1">
                                <span>🍚</span> Milled Rice Fill
                              </span>
                              <span className="text-sky-300">
                                {totalStored.toLocaleString('en-IN')} / {capacity > 0 ? capacity.toLocaleString('en-IN') : '∞'} kg ({percentage.toFixed(1)}%)
                              </span>
                            </div>

                            <div className="w-full h-3 bg-neutral-900 border border-sky-500/40 rounded-xl overflow-hidden p-0.5 relative shadow-inner">
                              <div 
                                className="h-full bg-gradient-to-r from-sky-400 via-emerald-300 to-white transition-all duration-1000 rounded-lg relative overflow-hidden shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                              </div>
                            </div>
                          </div>

                          {/* MILLED INVENTORY HIERARCHY */}
                          <div className="space-y-4 mt-4 relative z-10">
                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block">
                              Milled Inventory (Tap card for Audit Trail)
                            </span>

                            {varietyGroups.length > 0 ? (
                              <div className="space-y-3">
                                {varietyGroups.map(([varietyName, outputs]) => (
                                  <div key={varietyName} className="p-3.5 bg-neutral-900 border border-sky-500/30 rounded-2xl space-y-2">
                                    <h4 className="font-display font-black text-xs uppercase text-sky-400">
                                      🌾 {varietyName}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {outputs.map((op, idx) => (
                                        <div 
                                          key={idx}
                                          onClick={() => openAuditTrail(`${varietyName} ${op.outputType} History`, op.productId, `Milled stock in ${godown.name}`)}
                                          className="p-2.5 bg-[#121212] border border-neutral-800 rounded-xl cursor-pointer hover:border-sky-400 active:scale-[0.98] transition-all min-h-[48px] flex flex-col justify-center"
                                          tabIndex={0}
                                        >
                                          <span className="text-[10px] font-bold text-neutral-400 block truncate mb-0.5">
                                            {op.outputType}
                                          </span>
                                          <span className="font-mono font-black text-xs text-sky-300">
                                            {op.quantityKg.toLocaleString('en-IN')} kg
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-xs text-neutral-500 border border-dashed border-neutral-800 uppercase font-bold rounded-xl">
                                0.00 kg milled rice stored — Ready for milling batches
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* ========================================================================= */}
            {/* 7. TAB CONTENT 3: PACKAGING BAGS & LOW STOCK ALERTS */}
            {/* ========================================================================= */}
            {activeTab === 'bags' && (
              <motion.section 
                key="bags-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                aria-label="Branded Packaging Materials" 
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <span>📦</span> Branded Packaging Bags ({groupedPackingItems.length})
                  </h2>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsAddPackagingModalOpen(true)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-display font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-xl shadow-lg border-2 border-neutral-700 flex items-center justify-center gap-1.5 active:scale-95 transition-all min-h-[44px]"
                    >
                      <Plus className="w-4 h-4 shrink-0 text-[#F5A623]" />
                      <span>[ ADD PACKAGING STOCK ]</span>
                    </button>
                    <Link href="/operator/procurement?tab=packaging">
                      <button className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#F5A623] hover:bg-[#d98e19] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border-2 border-black flex items-center justify-center gap-1.5 active:scale-95 transition-all min-h-[44px]">
                        <span>Procure</span> <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedPackingItems.length === 0 ? (
                    <div className="col-span-2 p-8 bg-[#1A1A1A] border-2 border-dashed border-neutral-800 rounded-2xl text-center text-xs font-bold text-neutral-500 uppercase">
                      No active packaging bags in inventory
                    </div>
                  ) : (
                    groupedPackingItems.map((group) => {
                      const isLowStock = group.totalBags < 200;

                      return (
                        <article 
                          key={group.key}
                          onClick={() => openAuditTrail(`${group.brandName} (${group.capacityKg} KG) Packaging History`, group.itemIds[0], `Stored in ${group.godowns.join(', ')}`, 'PACKAGING_MATERIAL')}
                          className="p-5 sm:p-6 bg-[#1A1A1A] border-2 border-[#F5A623]/40 rounded-2xl relative overflow-hidden cursor-pointer hover:border-[#F5A623] active:scale-[0.98] transition-all shadow-xl"
                          tabIndex={0}
                        >
                          {/* WATERMARK EFFECT */}
                          <Tags className="w-32 h-32 text-[#F5A623] opacity-15 pointer-events-none absolute -bottom-4 -right-4" />

                          <div className="flex justify-between items-start mb-3 relative z-10">
                            <div>
                              <h3 className="font-display font-black text-lg uppercase tracking-wider text-white flex items-center gap-2">
                                <span>{group.brandName}</span>
                                <span className="text-xs px-2.5 py-0.5 bg-[#F5A623]/20 text-[#F5A623] rounded-md font-mono font-bold border border-[#F5A623]/30">
                                  {group.capacityKg} KG
                                </span>
                              </h3>
                              <p className="text-xs text-neutral-400 font-bold mt-1">
                                Godown: {group.godowns.join(', ')}
                              </p>
                            </div>

                            {/* LOW STOCK ALERT BADGE */}
                            {isLowStock ? (
                              <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded-full font-black text-xs animate-pulse flex items-center gap-1">
                                🚨 LOW STOCK
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-bold text-xs">
                                In Stock
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-800 relative z-10">
                            <div>
                              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Total Available</span>
                              <span className="font-mono font-black text-xl text-[#F5A623]">
                                {group.totalBags.toLocaleString()} <span className="text-xs text-neutral-400 font-normal">Bags</span>
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Estimated Value</span>
                              <span className="font-mono font-black text-xl text-emerald-400">
                                ₹ {group.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </motion.section>
            )}

            {activeTab === 'spares' && (
              <motion.section 
                key="spares-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                aria-label="Spares and Scrap Inventory" 
              >
                <SparesScrapTab spareParts={spareParts} scrapEntries={scrapEntries} />
              </motion.section>
            )}
          </AnimatePresence>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 9. SUPPLIER PROVENANCE MOBILE BOTTOM SHEET */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeSupplierSheet.isOpen && (
          <div className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] z-60 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSupplierSheet({ isOpen: false, varietyName: '', sources: [] })}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-full max-w-xl bg-[#1A1A1A] border-t-2 border-[#F5A623] rounded-t-3xl p-6 shadow-2xl z-10 text-white max-h-[85vh] flex flex-col transform-gpu will-change-transform"
            >
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto mb-4" />
              
              <div className="flex justify-between items-start pb-4 border-b border-neutral-800">
                <div>
                  <h3 className="font-display font-black text-lg uppercase tracking-wider text-[#F5A623] flex items-center gap-2">
                    <span>🌾</span> {activeSupplierSheet.varietyName} Provenance
                  </h3>
                  <p className="text-xs text-neutral-400 font-bold">{activeSupplierSheet.sources.length} Procurement Lots</p>
                </div>
                <button 
                  onClick={() => setActiveSupplierSheet({ isOpen: false, varietyName: '', sources: [] })}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close Sheet"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="py-4 space-y-3 overflow-y-auto flex-1">
                {activeSupplierSheet.sources.map((src, sIdx) => (
                  <div key={sIdx} className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#F5A623]" />
                        <span className="text-sm">{src.brokerName}</span>
                      </span>
                      <span className="font-mono font-black text-sm text-[#F5A623]">
                        {src.quantity.toLocaleString('en-IN')} kg
                      </span>
                    </div>

                    {src.farmerName && (
                      <div className="text-neutral-400 flex items-center gap-2 pt-1 border-t border-neutral-800/60">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-neutral-300 font-semibold">Farmer: {src.farmerName}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 10. MINI AUDIT TRAIL BOTTOM SHEET */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeAuditSheet.isOpen && (
          <div className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] z-60 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveAuditSheet({ isOpen: false, title: '' })}
              className="fixed inset-x-0 top-0 h-[100dvh] h-[100dvh] bg-black/80 backdrop-blur-sm"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-full max-w-2xl bg-[#1A1A1A] border-t-2 border-[#F5A623] rounded-t-3xl p-6 shadow-2xl z-10 text-white max-h-[80vh] flex flex-col transform-gpu will-change-transform"
            >
              {/* Sheet Drag Handle & Header */}
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto mb-4" />
              
              <div className="flex justify-between items-start pb-4 border-b border-neutral-800">
                <div>
                  <h3 className="font-display font-black text-lg uppercase tracking-wider text-[#F5A623] flex items-center gap-2">
                    <History className="w-5 h-5 text-[#F5A623]" />
                    {activeAuditSheet.title}
                  </h3>
                  <p className="text-xs text-neutral-400 font-bold">{activeAuditSheet.subtitle}</p>
                </div>
                <button 
                  onClick={() => setActiveAuditSheet({ isOpen: false, title: '' })}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close Audit Sheet"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Audit Timeline List */}
              <div className="py-4 space-y-4 overflow-y-auto flex-1">
                {stockMovements.length > 0 ? (
                  stockMovements
                    .filter(m => {
                      if (activeAuditSheet.productId) return m.productId === activeAuditSheet.productId;
                      if (activeAuditSheet.productCategory) {
                        const cat = (m.productCategory || '').toUpperCase();
                        const reqCat = activeAuditSheet.productCategory.toUpperCase();
                        const pName = (m.productName || '').toUpperCase();
                        const toGodown = (m.toGodownName || '').toUpperCase();
                        const fromGodown = (m.fromGodownName || '').toUpperCase();

                        if (reqCat.includes('FINISHED') || reqCat.includes('RICE')) {
                          return cat.includes('FINISHED') || 
                                 cat.includes('RICE') || 
                                 pName.includes('RICE') || 
                                 pName.includes('RNR') || 
                                 pName.includes('BPT') || 
                                 pName.includes('HMT') || 
                                 pName.includes('SONA') || 
                                 pName.includes('BASMATI') || 
                                 pName.includes('PARBOILED') || 
                                 pName.includes('STEAM') || 
                                 pName.includes('RAW RICE') || 
                                 toGodown.includes('RICE') || 
                                 fromGodown.includes('RICE');
                        }
                        if (reqCat.includes('RAW') || reqCat.includes('PADDY')) {
                          return cat.includes('RAW') || 
                                 cat.includes('PADDY') || 
                                 pName.includes('PADDY') || 
                                 toGodown.includes('PADDY') || 
                                 fromGodown.includes('PADDY');
                        }
                        return cat === reqCat;
                      }
                      return true;
                    })
                    .map((m, idx) => (
                      <div key={m.id || idx} className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl flex justify-between items-center text-xs font-mono">
                        <div>
                          <span className="font-bold text-[#F5A623] uppercase block">{m.type.replace(/_/g, ' ')}</span>
                          <span className="text-neutral-400 text-[11px] block">{m.productName} • {m.fromGodownName} → {m.toGodownName}</span>
                          <span className="text-[10px] text-neutral-500 block">{new Date(m.createdAt).toLocaleString('en-IN')}</span>
                        </div>
                        <span className={`font-black text-sm ${m.type.includes('SALE') || m.type.includes('ISSUE') ? 'text-red-400' : 'text-emerald-400'}`}>
                          {m.type.includes('SALE') || m.type.includes('ISSUE') ? '-' : '+'}{m.quantity.toLocaleString('en-IN')} {m.productCategory === 'PACKAGING_MATERIAL' ? 'bags' : 'kg'}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-xs text-neutral-400 border border-dashed border-neutral-800 rounded-xl space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-[#F5A623] opacity-60" />
                    <p className="font-bold uppercase">No recent movement records</p>
                    <p className="text-[10px]">Inventory remains stable with active procurement lots.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <ExistingPaddyStockModal
        isOpen={isOpeningStockModalOpen}
        onClose={() => setIsOpeningStockModalOpen(false)}
        paddyProducts={paddyProducts}
        godowns={godowns}
      />

      <AddPackagingStockModal
        isOpen={isAddPackagingModalOpen}
        onClose={() => setIsAddPackagingModalOpen(false)}
        godowns={godowns}
        suppliers={suppliers}
        existingBrandNames={Array.from(new Set((packingItems || []).map(p => p.brandName)))}
      />

    </main>
  );
}

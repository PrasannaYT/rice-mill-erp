import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SupplierRepository, ProductRepository, GodownRepository } from "@/repositories/masterDataRepository";
import WeighbridgeForm from "@/components/WeighbridgeForm";
import prisma from "@/lib/prisma";

import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = {
  title: 'Procurement - Rice Mill ERP',
};

export default async function WeighbridgePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tabParam = params?.tab?.toLowerCase();
  const initialTab = tabParam === 'packaging' ? 'PACKAGING' : 
                     tabParam === 'rice' ? 'RICE' : 'PADDY';
  
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Parallel fan-out: execute all 6 independent database queries concurrently
  const [
    allSuppliers,
    allFarmers,
    allProducts,
    allGodowns,
    pendingDrafts,
    farmersWithHistory
  ] = await Promise.all([
    SupplierRepository.list(),
    prisma.farmer.findMany({ select: { id: true, name: true, brokerId: true } }),
    ProductRepository.list(),
    GodownRepository.list(),
    prisma.procurementBatch.findMany({
      where: { status: 'DRAFT' },
      select: {
        id: true,
        supplierId: true,
        farmerId: true,
        productId: true,
        godownId: true,
        grossWeight: true,
        tareWeight: true,
        perBagWeight: true,
        farmerBagRate: true,
        brokerCommissionRate: true,
        beforeDryingMoisture: true,
        afterDryingMoisture: true,
        createdAt: true,
        supplier: { select: { name: true } },
        product: { select: { name: true } },
        farmer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.farmer.findMany({
      select: {
        id: true,
        name: true,
        contact: true,
        village: true,
        brokerId: true,
        broker: { select: { id: true, name: true } },
        batches: {
          where: { status: { in: ['FINALIZED', 'PARTIALLY_PAID', 'PAID'] } },
          select: {
            id: true,
            createdAt: true,
            netWeight: true,
            grossWeight: true,
            product: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  ]);

  const safeSuppliers = allSuppliers.map(s => ({ id: s.id, name: s.name, category: s.category || 'PADDY_BROKER' }));
  const safeFarmers = allFarmers.map(f => ({ id: f.id, name: f.name, brokerId: f.brokerId }));
  const safeProducts = allProducts
    .filter(p => p.category === 'RAW_MATERIAL' || p.category === 'PACKAGING_MATERIAL' || p.category === 'PACKING_MATERIAL')
    .map(p => ({ id: p.id, name: p.name, category: p.category }));
  const safeGodowns = allGodowns.map(g => ({ id: g.id, name: g.name, type: (g as any).type || 'PADDY' }));

  // Convert Decimals to string to avoid serialization issues
  const safeDrafts = pendingDrafts.map(d => ({
    id: d.id,
    supplierId: d.supplierId,
    supplierName: d.supplier.name,
    farmerId: d.farmerId,
    farmerName: d.farmer?.name || null,
    productId: d.productId,
    productName: d.product?.name || 'Unknown',
    godownId: d.godownId,
    grossWeight: d.grossWeight.toString(),
    tareWeight: d.tareWeight?.toString() || '',
    perBagWeight: d.perBagWeight?.toString() || '',
    farmerBagRate: d.farmerBagRate?.toString() || '',
    brokerCommissionRate: d.brokerCommissionRate?.toString() || '',
    beforeDryingMoisture: d.beforeDryingMoisture?.toString() || '',
    afterDryingMoisture: d.afterDryingMoisture?.toString() || '',
    createdAt: d.createdAt.toISOString()
  }));

  const allVarietySet = new Set<string>();

  const predictiveLeads = farmersWithHistory
    .filter(f => f.batches.length > 0)
    .map(farmer => {
      const batches = farmer.batches;
      const totalBatches = batches.length;

      // Collect all varieties and seasonal months
      const varietyCounts: Record<string, number> = {};
      const monthSet = new Set<number>();
      let totalKg = 0;

      for (const b of batches) {
        const name = b.product?.name || 'Unknown';
        varietyCounts[name] = (varietyCounts[name] || 0) + 1;
        totalKg += Number(b.grossWeight);
        monthSet.add(new Date(b.createdAt).getMonth());
        allVarietySet.add(name);
      }

      const sortedVarieties = Object.entries(varietyCounts).sort((a, b) => b[1] - a[1]);
      const predictedVariety = sortedVarieties[0][0];
      const allVarieties = sortedVarieties.map(([name]) => name);
      const historicalAvgKg = Math.round(totalKg / totalBatches);
      const seasonalMonths = Array.from(monthSet).sort((a, b) => a - b);

      // Probability score: recency (40%) + frequency (30%) + seasonal match (30%)
      const lastDate = batches[0]?.createdAt;
      const daysSinceLast = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
      const recencyScore = Math.max(0, 1 - daysSinceLast / 90);
      const frequencyScore = Math.min(1, totalBatches / 5);
      const currentMonth = new Date().getMonth();
      const seasonalScore = seasonalMonths.includes(currentMonth) ? 1.0 : 0.3;
      const probabilityScore = Math.round((recencyScore * 0.4 + frequencyScore * 0.3 + seasonalScore * 0.3) * 100) / 100;

      const confidenceLevel = probabilityScore >= 0.85 ? 'HIGH' as const
        : probabilityScore >= 0.6 ? 'MEDIUM' as const
        : 'LOW' as const;

      return {
        farmerId: farmer.id,
        farmerName: farmer.name,
        phone: farmer.contact || null,
        predictedVariety,
        allVarieties,
        probabilityScore,
        confidenceLevel,
        historicalAvgKg,
        village: farmer.village || null,
        brokerName: farmer.broker.name,
        brokerId: farmer.brokerId,
        totalBatches,
        lastProcurementDate: lastDate?.toISOString() || null,
        seasonalMonths
      };
    })
    .sort((a, b) => b.probabilityScore - a.probabilityScore);

  const availableVarieties = Array.from(allVarietySet).sort();

  return (
    <div className="min-h-screen">
      <AppHeader title="Procurement Hub" subtitle="Inbound Paddy & Bags" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Procurement'}]} />
      <div className="page-wrapper pb-32">
        <WeighbridgeForm suppliers={safeSuppliers} farmers={safeFarmers} products={safeProducts} godowns={safeGodowns} pendingDrafts={safeDrafts} initialTab={initialTab} predictiveLeads={predictiveLeads} availableVarieties={availableVarieties} />
      </div>
    </div>
  );
}


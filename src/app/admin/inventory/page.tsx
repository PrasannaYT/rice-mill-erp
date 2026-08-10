import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PackingItemRepository } from "@/repositories/packingItemRepository";
import InventoryDashboardClient from "@/components/InventoryDashboardClient";

export const metadata = {
  title: 'Inventory Hub - Rice Mill ERP',
};

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ editPackingId?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER')) {
    redirect('/dashboard');
  }

  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });

  // Fetch Godowns and active lots
  const godowns = await prisma.godown.findMany({
    include: {
      lots: {
        where: { status: 'ACTIVE' },
        include: { 
          product: true,
          procurementBatch: {
            include: {
              supplier: true,
              farmer: true
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Fetch recent stock movements for audit trail
  const stockMovements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      product: true,
      fromGodown: true,
      toGodown: true
    }
  });

  const safeStockMovements = stockMovements.map(m => ({
    id: m.id,
    type: m.type,
    quantity: Number(m.quantity),
    createdAt: m.createdAt.toISOString(),
    productName: m.product.name,
    productId: m.productId,
    productCategory: m.product.category,
    fromGodownName: m.fromGodown?.name || 'External / Supplier',
    toGodownName: m.toGodown?.name || 'Outbound / Sale'
  }));

  // Collect all active lots flat for modal usage
  const allLots = godowns.flatMap(g => g.lots.map(l => ({
    id: l.id,
    productId: l.productId,
    godownId: l.godownId,
    currentQuantity: Number(l.currentQuantity)
  })));

  // Fetch Packing Items Inventory
  const rawPackingItems = await PackingItemRepository.list();

  const packingItems = rawPackingItems.map(item => ({
    id: item.id,
    brandName: item.brandName,
    capacityKg: item.capacityKg.toString(),
    quantityBags: item.quantityBags.toString(),
    perBagRate: item.perBagRate.toString(),
    godownId: item.godownId,
    hsnCode: item.hsnCode,
    status: item.status,
    godown: { name: item.godown.name },
    supplier: item.supplier ? { id: item.supplier.id, name: item.supplier.name } : null,
  }));

  // Generate Synthetic Stock Movements for Packing Items
  const salesInvoiceItems = await prisma.salesInvoiceItem.findMany({
    where: { packingItemName: { not: null } },
    include: { invoice: true, godown: true }
  });

  const syntheticPackingMovements = salesInvoiceItems.map(item => {
    // Find matching packing item by name
    const matchingItem = rawPackingItems.find(p => `${p.brandName} ${Number(p.capacityKg)} KG` === item.packingItemName);
    let bags = 0;
    if (matchingItem && Number(matchingItem.capacityKg) > 0) {
      bags = Math.ceil(Number(item.quantity) / Number(matchingItem.capacityKg));
    }
    return {
      id: item.id,
      type: 'SALE',
      quantity: bags > 0 ? bags : Number(item.quantity),
      createdAt: item.invoice.createdAt.toISOString(),
      productName: item.packingItemName || 'Packaging Material',
      productId: matchingItem?.id || 'unknown_packing_item',
      productCategory: 'PACKAGING_MATERIAL',
      fromGodownName: item.godown?.name || 'Godown',
      toGodownName: `Invoice #${item.invoice.invoiceNumber}`
    };
  });

  const syntheticPackingProcurements = rawPackingItems.map(item => {
    const sales = syntheticPackingMovements.filter(m => m.productId === item.id);
    const totalSold = sales.reduce((sum, s) => sum + s.quantity, 0);
    const originalQuantity = Number(item.quantityBags) + totalSold;

    return {
      id: `proc_${item.id}`,
      type: 'PROCUREMENT',
      quantity: originalQuantity,
      createdAt: item.createdAt.toISOString(),
      productName: `${item.brandName} ${Number(item.capacityKg)} KG`,
      productId: item.id,
      productCategory: 'PACKAGING_MATERIAL',
      fromGodownName: item.supplier?.name || 'External / Supplier',
      toGodownName: item.godown?.name || 'Godown'
    };
  });

  const allSafeStockMovements = [...safeStockMovements, ...syntheticPackingMovements, ...syntheticPackingProcurements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const paddyProducts = products.filter(p => p.category === 'RAW_MATERIAL' || p.name.toLowerCase().includes('paddy'));

  const safeGodownsForClient = godowns.map(g => ({
    id: g.id,
    name: g.name,
    location: g.location,
    capacity: g.capacity ? Number(g.capacity) : null,
    type: (g as any).type || 'PADDY',
    lots: g.lots.map(l => ({
      id: l.id,
      productId: l.productId,
      godownId: l.godownId,
      currentQuantity: Number(l.currentQuantity),
      product: {
        id: l.product.id,
        name: l.product.name,
        category: l.product.category
      },
      procurementBatch: l.procurementBatch ? {
        farmer: l.procurementBatch.farmer ? { name: l.procurementBatch.farmer.name } : null,
        supplier: l.procurementBatch.supplier ? { name: l.procurementBatch.supplier.name } : null,
      } : null
    }))
  }));

  return (
    <div className="min-h-screen">
      <InventoryDashboardClient
      godowns={safeGodownsForClient}
      paddyProducts={paddyProducts.length > 0 ? paddyProducts : products}
      allLots={allLots}
      packingItems={packingItems}
      stockMovements={allSafeStockMovements}
      editPackingId={params?.editPackingId}
    />
    </div>
  );
}

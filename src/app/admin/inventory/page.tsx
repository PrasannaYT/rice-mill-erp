import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PackingItemRepository } from "@/repositories/packingItemRepository";
import InventoryDashboardClient from "@/components/InventoryDashboardClient";
import { withMemoryCache } from "@/lib/memoryCache";

export const metadata = {
  title: 'Inventory Hub - Rice Mill ERP',
};

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ editPackingId?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'MANAGER', 'FLOOR_MANAGER', 'MILL_OWNER', 'SUPER_ADMIN'].includes(session.user?.role || '')) {
    redirect('/dashboard');
  }

  // Rapid reload protection: wrap database queries with 3-second RAM cache
  const [
    suppliers,
    products,
    godowns,
    stockMovements,
    rawPackingItems,
    salesInvoiceItems,
    procurementBatchesForMovements,
    sparePartsRaw,
    rawScrapEntries
  ] = await withMemoryCache('admin:inventory:page-data', () => Promise.all([
    prisma.supplier.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }).catch(() => []),
    prisma.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, category: true, unit: true, hsnCode: true, gstRate: true } }).catch(() => []),
    prisma.godown.findMany({
      include: {
        lots: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            productId: true,
            godownId: true,
            currentQuantity: true,
            product: { select: { id: true, name: true, category: true } },
            procurementBatch: {
              select: {
                id: true,
                supplier: { select: { name: true } },
                farmer: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    }).catch(() => []),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        quantity: true,
        createdAt: true,
        referenceId: true,
        productId: true,
        product: { select: { name: true, category: true } },
        fromGodown: { select: { name: true } },
        toGodown: { select: { name: true } }
      }
    }).catch(() => []),
    PackingItemRepository.list().catch(() => []),
    prisma.salesInvoiceItem.findMany({
      where: { packingItemName: { not: null } },
      select: {
        id: true,
        quantity: true,
        packingItemName: true,
        invoice: { select: { createdAt: true, invoiceNumber: true } },
        godown: { select: { name: true } }
      }
    }).catch(() => []),
    prisma.procurementBatch.findMany({
      where: { status: 'FINALIZED', deletedAt: null },
      select: {
        id: true,
        netWeight: true,
        grossWeight: true,
        createdAt: true,
        godownId: true,
        productId: true,
        product: { select: { id: true, name: true, category: true } },
        godown: { select: { name: true } },
        supplier: { select: { name: true } },
        farmer: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }).catch(() => []),
    prisma.sparePart.findMany({
      where: {
        deletedAt: null,
        OR: [
          { availableQty: { gt: 0 } },
          { inUseQty: { gt: 0 } }
        ]
      },
      orderBy: { name: 'asc' }
    }).catch(() => []),
    prisma.scrapEntry.findMany({
      where: { status: 'ACCUMULATED' },
      include: { sparePart: true },
      orderBy: { createdAt: 'desc' }
    }).catch(() => [])
  ]), 3000);

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

  const allLots = godowns.flatMap(g => g.lots.map(l => ({
    id: l.id,
    productId: l.productId,
    godownId: l.godownId,
    currentQuantity: Number(l.currentQuantity)
  })));

  const packingItems = rawPackingItems.filter(item => Number(item.quantityBags) > 0).map(item => ({
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

  const syntheticPackingMovements = salesInvoiceItems.map(item => {
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
    const procuredQty = Number(item.initialQuantityBags) > 0 ? Number(item.initialQuantityBags) : Number(item.quantityBags);
    const isOpeningStock = !item.supplierId || !item.supplier;

    return {
      id: `proc_${item.id}`,
      type: isOpeningStock ? 'OPENING_STOCK' : 'PROCUREMENT',
      quantity: procuredQty,
      createdAt: item.createdAt.toISOString(),
      productName: `${item.brandName} ${Number(item.capacityKg)} KG`,
      productId: item.id,
      productCategory: 'PACKAGING_MATERIAL',
      fromGodownName: isOpeningStock ? 'Existing Opening Stock' : (item.supplier?.name || 'Supplier'),
      toGodownName: item.godown?.name || 'Godown'
    };
  });

  const existingRefIds = new Set(stockMovements.map(m => m.referenceId).filter(Boolean));

  const syntheticProcurementMovements = procurementBatchesForMovements
    .filter(b => b.product && b.godownId && !existingRefIds.has(b.id))
    .map(b => ({
      id: `proc_${b.id}`,
      type: 'PROCUREMENT',
      quantity: Number(b.netWeight || b.grossWeight || 0),
      createdAt: b.createdAt.toISOString(),
      productName: b.product?.name || 'Procured Item',
      productId: b.productId!,
      productCategory: b.product?.category || 'FINISHED_GOOD',
      fromGodownName: b.farmer ? `Farmer (${b.farmer.name})` : `Supplier (${b.supplier?.name || 'Direct'})`,
      toGodownName: b.godown?.name || 'Godown'
    }));

  const allSafeStockMovements = [...safeStockMovements, ...syntheticProcurementMovements, ...syntheticPackingMovements, ...syntheticPackingProcurements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const safeProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    hsnCode: p.hsnCode,
    gstRate: p.gstRate ? Number(p.gstRate) : 0,
  }));

  const paddyProducts = safeProducts.filter(p => p.category === 'RAW_MATERIAL' || p.name.toLowerCase().includes('paddy'));

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

  const scrapEntries = rawScrapEntries.map(entry => ({
    id: entry.id,
    sparePartName: entry.sparePart?.name || 'Unknown Part',
    sparePartId: entry.sparePartId,
    reason: entry.reason,
    estimatedWeightKg: entry.estimatedWeightKg ? Number(entry.estimatedWeightKg) : null,
    createdAt: entry.createdAt.toISOString()
  }));

  return (
    <div className="min-h-screen">
      <InventoryDashboardClient
        godowns={safeGodownsForClient}
        suppliers={suppliers}
        paddyProducts={paddyProducts.length > 0 ? paddyProducts : safeProducts}
        allLots={allLots}
        packingItems={packingItems}
        stockMovements={allSafeStockMovements}
        editPackingId={params?.editPackingId}
        spareParts={sparePartsRaw.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          availableQty: s.availableQty,
          inUseQty: s.inUseQty,
          ratePerUnit: Number(s.ratePerUnit)
        }))}
        scrapEntries={scrapEntries}
      />
    </div>
  );
}

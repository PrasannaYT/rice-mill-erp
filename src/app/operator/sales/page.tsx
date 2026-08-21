import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SalesForm from "@/components/SalesForm";
import { AppHeader } from "@/components/ui/AppHeader";
import { withMemoryCache } from "@/lib/memoryCache";

export const metadata = {
  title: 'Sales & Dispatch - Rice Mill ERP',
};

export default async function SalesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  let rawCustomers: any[] = [], vehicles: any[] = [], products: any[] = [], godowns: any[] = [], lots: any[] = [], rawPackingItems: any[] = [], pendingDraftsRaw: any[] = [];

  try {
    [
      rawCustomers,
      vehicles,
      products,
      godowns,
      lots,
      rawPackingItems,
      pendingDraftsRaw
    ] = await withMemoryCache('operator:sales:page-data', () => Promise.all([
      prisma.customer.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, contact: true, gstin: true, address: true, balance: true }
      }).catch(() => []),
      prisma.vehicle.findMany({
        orderBy: { licensePlate: 'asc' },
        select: { id: true, licensePlate: true, type: true }
      }).catch(() => []),
      prisma.product.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, gstRate: true }
      }).catch(() => []),
      prisma.godown.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, type: true }
      }).catch(() => []),
      prisma.lot.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, productId: true, godownId: true, currentQuantity: true }
      }).catch(() => []),
      prisma.packingItem.findMany({
        select: {
          id: true,
          brandName: true,
          capacityKg: true,
          quantityBags: true,
          perBagRate: true,
          godownId: true,
          godown: { select: { name: true } }
        },
        orderBy: { brandName: 'asc' }
      }).catch(() => []),
      prisma.salesInvoice.findMany({
        where: { status: 'DRAFT', userId: session.user.id },
        select: {
          id: true,
          invoiceNumber: true,
          customerId: true,
          vehicleId: true,
          deliveryNote: true,
          modeOfPayment: true,
          buyersOrderNo: true,
          dispatchDocNo: true,
          destination: true,
          termsOfDelivery: true,
          otherReferences: true,
          vehicleNo: true,
          transportFreightAmount: true,
          customer: { select: { name: true } },
          items: {
            select: {
              id: true,
              productId: true,
              godownId: true,
              quantity: true,
              rate: true,
              gstRate: true,
              lineTotal: true,
              taxAmount: true,
              packingItemName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => [])
    ]), 3000);
  } catch (err) {
    console.error("Failed to load sales page dependencies:", err);
  }

  const customers = rawCustomers.map(c => ({
    id: c.id,
    name: c.name,
    contact: c.contact,
    gstin: c.gstin,
    address: c.address,
    balance: c.balance.toString(),
  }));

  const packingItems = rawPackingItems.map(p => ({
    id: p.id,
    brandName: p.brandName,
    capacityKg: p.capacityKg.toString(),
    quantityBags: p.quantityBags.toString(),
    perBagRate: p.perBagRate.toString(),
    godownId: p.godownId,
    godownName: p.godown.name,
  }));

  const safeLots = lots.map(l => ({
    id: l.id,
    productId: l.productId,
    godownId: l.godownId,
    currentQuantity: l.currentQuantity.toString()
  }));

  const safeProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    gstRate: p.gstRate?.toString() || '0'
  }));

  const pendingDrafts = pendingDraftsRaw.map(d => ({
    id: d.id,
    invoiceNumber: d.invoiceNumber,
    customerId: d.customerId,
    customerName: d.customer.name,
    vehicleId: d.vehicleId || '',
    deliveryNote: d.deliveryNote || '',
    modeOfPayment: d.modeOfPayment || '',
    buyersOrderNo: d.buyersOrderNo || '',
    dispatchDocNo: d.dispatchDocNo || '',
    destination: d.destination || '',
    termsOfDelivery: d.termsOfDelivery || '',
    otherReferences: d.otherReferences || '',
    vehicleNo: d.vehicleNo || '',
    transportFreightAmount: d.transportFreightAmount?.toString() || '',
    items: d.items.map((i: any) => {
      // Find packing item id from name if possible
      let packingItemId = '';
      if (i.packingItemName) {
        const match = rawPackingItems.find(p => `${p.brandName} ${Number(p.capacityKg)} KG` === i.packingItemName);
        if (match) packingItemId = match.id;
      }
      return {
        productId: i.productId,
        godownId: i.godownId,
        packingItemId,
        quantity: i.quantity.toString(),
        rate: i.rate.toString(),
        numberOfBags: '', // This will be calculated in the UI or we could store it
        bagCapacityKg: '',
      };
    })
  }));

  return (
    <div className="min-h-screen">
      <AppHeader title="Sales & Dispatch" subtitle="Outbound Invoicing & Delivery" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Sales'}]} />
      <div className="page-wrapper pb-32">
        <div className="flex justify-end mb-4">
          <Link href="/operator/sales/history" className="bg-[var(--accent)] text-white px-4 py-2 font-bold border-2 border-[var(--ink)] shadow-brutal-sm hover:translate-y-[2px] transition-transform">
            View Past Bills
          </Link>
        </div>
        <SalesForm 
          customers={customers} 
          vehicles={vehicles} 
          products={safeProducts} 
          godowns={godowns} 
          lots={safeLots} 
          packingItems={packingItems}
          initialDrafts={pendingDrafts}
        />
      </div>
    </div>
  );
}

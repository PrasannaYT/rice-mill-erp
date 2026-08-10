import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SalesForm from "@/components/SalesForm";

import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = {
  title: 'Sales & Dispatch - Rice Mill ERP',
};

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ editInvoiceId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const editInvoiceId = resolvedSearchParams.editInvoiceId;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const rawCustomers = await prisma.customer.findMany({
    orderBy: { name: 'asc' }
  });
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { licensePlate: 'asc' }
  });
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' }
  });
  const godowns = await prisma.godown.findMany({
    orderBy: { name: 'asc' }
  });
  
  // Fetch active lots to know what inventory is available for sale
  const lots = await prisma.lot.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, productId: true, godownId: true, currentQuantity: true }
  });

  // Fetch packing items inventory for bag selection
  const rawPackingItems = await prisma.packingItem.findMany({
    include: { godown: true },
    orderBy: { brandName: 'asc' }
  });

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

  let initialInvoice = null;
  if (editInvoiceId) {
    const inv = await prisma.salesInvoice.findUnique({
      where: { id: editInvoiceId },
      include: { items: true }
    });
    if (inv) {
      initialInvoice = JSON.parse(JSON.stringify(inv));
    }
  }

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
          initialInvoice={initialInvoice}
        />
      </div>
    </div>
  );
}

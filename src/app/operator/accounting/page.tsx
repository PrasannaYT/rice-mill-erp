import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AccountingDashboardClient from '@/components/AccountingDashboardClient';
import { AppHeader } from '@/components/ui/AppHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Cashbook & Accounts - Rice Mill ERP',
};

export default async function AccountingDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Parallel fan-out: run all 7 initial queries concurrently
  const [
    rawCustomers,
    rawSuppliers,
    expenses,
    rawBanks,
    rawCashTransactions,
    rawProcurementsAll,
    rawPackingItemsAll,
    rawSalesAll,
    rawTransactions
  ] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, contact: true, gstin: true, address: true, balance: true } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, contact: true, gstin: true, balance: true } }),
    prisma.expenseCategory.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.bank.findMany({ orderBy: { bankName: 'asc' }, select: { id: true, bankName: true, accountNumber: true, balance: true } }),
    prisma.paymentTransaction.findMany({ where: { mode: 'CASH' }, select: { type: true, amount: true } }),
    prisma.procurementBatch.findMany({
      where: { status: { in: ['FINALIZED', 'PARTIALLY_PAID'] } },
      select: {
        id: true,
        grossWeight: true,
        netWeight: true,
        numberOfBags: true,
        perBagWeight: true,
        farmerBagRate: true,
        farmerTotalPayable: true,
        brokerCommissionRate: true,
        brokerCommissionTotal: true,
        amountPaid: true,
        createdAt: true,
        supplier: { select: { id: true, name: true, contact: true, gstin: true } },
        farmer: { select: { id: true, name: true, contact: true, village: true } },
        product: { select: { id: true, name: true } },
        godown: { select: { id: true, name: true } },
        payments: { orderBy: { createdAt: 'desc' as const }, select: { id: true, amount: true, transactionDate: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.packingItem.findMany({
      where: { status: { in: ['FINALIZED', 'PARTIALLY_PAID'] } },
      select: {
        id: true,
        brandName: true,
        capacityKg: true,
        quantityBags: true,
        initialQuantityBags: true,
        perBagRate: true,
        amountPaid: true,
        createdAt: true,
        godown: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, contact: true, gstin: true } },
        payments: { orderBy: { createdAt: 'desc' as const }, select: { id: true, amount: true, transactionDate: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.salesInvoice.findMany({
      where: { status: { in: ['FINALIZED', 'PARTIALLY_PAID'] } },
      select: {
        id: true,
        invoiceNumber: true,
        subtotal: true,
        taxTotal: true,
        grandTotal: true,
        amountPaid: true,
        status: true,
        createdAt: true,
        transportFreightAmount: true,
        customer: { select: { id: true, name: true, contact: true, gstin: true, address: true, balance: true } },
        vehicle: { select: { id: true, licensePlate: true } },
        payments: {
          orderBy: { createdAt: 'desc' as const },
          select: { id: true, amount: true, mode: true, createdAt: true, transactionDate: true },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            rate: true,
            gstRate: true,
            lineTotal: true,
            taxAmount: true,
            packingItemName: true,
            product: { select: { name: true, category: true } },
            godown: { select: { name: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.paymentTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        mode: true,
        amount: true,
        referenceNumber: true,
        notes: true,
        createdAt: true,
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
        expenseCategory: { select: { id: true, name: true } },
        bank: { select: { bankName: true } },
        user: { select: { name: true } },
        procurementBatch: { select: { id: true, status: true } },
        salesInvoice: { select: { id: true, status: true } },
        packingItem: { select: { id: true, status: true } },
      }
    })
  ]);

  const totalAR = rawCustomers.reduce((sum, c) => sum + Number(c.balance), 0);
  const totalAP = rawSuppliers.reduce((sum, s) => sum + Number(s.balance), 0);
  const totalBankBalance = rawBanks.reduce((sum, b) => sum + Number(b.balance), 0);

  const totalCashInHand = rawCashTransactions.reduce((acc, tx) => {
    if (tx.type === 'RECEIPT') return acc + Number(tx.amount);
    if (tx.type === 'PAYMENT') return acc - Number(tx.amount);
    return acc;
  }, 0);

  // Background non-blocking status updates
  const procUpdateIds: string[] = [];
  const rawProcurements = [];
  for (const b of rawProcurementsAll) {
    const total = Number(b.farmerTotalPayable || 0) + Number(b.brokerCommissionTotal || 0);
    const paid = Number(b.amountPaid || 0);
    const remaining = Math.round((total - paid) * 100) / 100;
    if (remaining <= 0) {
      procUpdateIds.push(b.id);
    } else {
      rawProcurements.push(b);
    }
  }
  if (procUpdateIds.length > 0) {
    prisma.procurementBatch.updateMany({
      where: { id: { in: procUpdateIds } },
      data: { status: 'PAID', fullyPaidAt: new Date() }
    }).catch(console.error);
  }

  const packingUpdateIds: string[] = [];
  const rawPackingItems = [];
  for (const p of rawPackingItemsAll) {
    const originalBags = Number(p.initialQuantityBags) > 0 ? Number(p.initialQuantityBags) : Number(p.quantityBags);
    const total = originalBags * Number(p.perBagRate);
    const paid = Number(p.amountPaid || 0);
    const remaining = Math.round((total - paid) * 100) / 100;
    if (remaining <= 0) {
      packingUpdateIds.push(p.id);
    } else {
      rawPackingItems.push(p);
    }
  }
  if (packingUpdateIds.length > 0) {
    prisma.packingItem.updateMany({
      where: { id: { in: packingUpdateIds } },
      data: { status: 'PAID', fullyPaidAt: new Date() }
    }).catch(console.error);
  }

  const salesUpdateIds: string[] = [];
  const rawSales = [];
  for (const s of rawSalesAll) {
    const total = Number(s.grandTotal || 0);
    const paid = Number(s.amountPaid || 0);
    const remaining = Math.round((total - paid) * 100) / 100;
    if (remaining <= 0) {
      salesUpdateIds.push(s.id);
    } else {
      rawSales.push(s);
    }
  }
  if (salesUpdateIds.length > 0) {
    prisma.salesInvoice.updateMany({
      where: { id: { in: salesUpdateIds } },
      data: { status: 'PAID', fullyPaidAt: new Date() }
    }).catch(console.error);
  }

  const transactions = rawTransactions.map(tx => ({
    id: tx.id,
    type: tx.type,
    mode: tx.mode,
    amount: tx.amount.toString(),
    referenceNumber: tx.referenceNumber,
    createdAt: tx.createdAt.toISOString(),
    customer: tx.customer ? { name: tx.customer.name } : null,
    supplier: tx.supplier ? { name: tx.supplier.name } : null,
    expenseCategory: tx.expenseCategory ? { name: tx.expenseCategory.name } : null,
    bank: tx.bank ? { bankName: tx.bank.bankName } : null,
    procurementBatch: tx.procurementBatch ? { id: tx.procurementBatch.id, status: tx.procurementBatch.status } : null,
    salesInvoice: tx.salesInvoice ? { id: tx.salesInvoice.id, status: tx.salesInvoice.status } : null,
    packingItem: tx.packingItem ? { id: tx.packingItem.id, status: tx.packingItem.status } : null,
  }));

  const customers = rawCustomers.map(c => ({
    id: c.id,
    name: c.name,
    contact: c.contact,
    gstin: c.gstin,
    address: c.address,
    balance: c.balance.toString(),
  }));

  const suppliers = rawSuppliers.map(s => ({
    id: s.id,
    name: s.name,
    contact: s.contact,
    gstin: s.gstin,
    balance: s.balance.toString(),
  }));

  const banks = rawBanks.map(b => ({
    id: b.id,
    bankName: b.bankName,
    accountNumber: b.accountNumber,
    balance: b.balance.toString(),
  }));

  const pendingProcurements = rawProcurements.map(p => ({
    id: p.id,
    createdAt: p.createdAt.toISOString(),
    grossWeight: p.grossWeight.toString(),
    netWeight: p.netWeight?.toString() || null,
    numberOfBags: p.numberOfBags?.toString() || null,
    perBagWeight: p.perBagWeight?.toString() || null,
    farmerBagRate: p.farmerBagRate?.toString() || null,
    farmerTotalPayable: p.farmerTotalPayable?.toString() || null,
    brokerCommissionRate: p.brokerCommissionRate?.toString() || null,
    brokerCommissionTotal: p.brokerCommissionTotal?.toString() || null,
    amountPaid: p.amountPaid?.toString() || "0",
      payments: p.payments.map((pt: any) => ({ id: pt.id, amount: pt.amount.toString(), date: pt.transactionDate.toISOString() })),
    supplier: {
      id: p.supplier.id,
      name: p.supplier.name,
      contact: p.supplier.contact,
      gstin: p.supplier.gstin,
    },
    farmer: p.farmer ? {
      id: p.farmer.id,
      name: p.farmer.name,
      contact: p.farmer.contact,
      village: p.farmer.village,
    } : null,
    product: p.product ? {
      id: p.product.id,
      name: p.product.name,
    } : null,
    godown: p.godown ? {
      id: p.godown.id,
      name: p.godown.name,
    } : null,
  }));

  const pendingPackingItems = rawPackingItems.map(pkg => ({
    id: pkg.id,
    brandName: pkg.brandName,
    capacityKg: pkg.capacityKg.toString(),
    quantityBags: pkg.quantityBags.toString(),
    initialQuantityBags: pkg.initialQuantityBags?.toString() || pkg.quantityBags.toString(),
    perBagRate: pkg.perBagRate.toString(),
    createdAt: pkg.createdAt.toISOString(),
    amountPaid: pkg.amountPaid?.toString() || "0",
      payments: pkg.payments.map((pt: any) => ({ id: pt.id, amount: pt.amount.toString(), date: pt.transactionDate.toISOString() })),
    godown: {
      id: pkg.godown.id,
      name: pkg.godown.name,
    },
    supplier: pkg.supplier ? {
      id: pkg.supplier.id,
      name: pkg.supplier.name,
      contact: pkg.supplier.contact,
      gstin: pkg.supplier.gstin,
    } : null,
  }));

  const pendingSales = rawSales.map(s => ({
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    createdAt: s.createdAt.toISOString(),
    subtotal: s.subtotal.toString(),
    taxTotal: s.taxTotal.toString(),
    grandTotal: s.grandTotal.toString(),
    amountPaid: s.amountPaid?.toString() || "0",
      payments: s.payments.map((pt: any) => ({ id: pt.id, amount: pt.amount.toString(), date: pt.transactionDate.toISOString() })),
    customer: {
      id: s.customer.id,
      name: s.customer.name,
      contact: s.customer.contact,
      gstin: s.customer.gstin,
      address: s.customer.address,
      balance: s.customer.balance.toString(),
    },
    vehicle: s.vehicle ? {
      id: s.vehicle.id,
      licensePlate: s.vehicle.licensePlate,
    } : null,
    items: s.items.map(item => ({
      id: item.id,
      quantity: item.quantity.toString(),
      rate: item.rate.toString(),
      lineTotal: item.lineTotal.toString(),
      gstRate: item.gstRate.toString(),
      product: { name: item.product.name },
      godown: { name: item.godown.name },
    })),
  }));

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AppHeader title="Cashbook & Accounts" subtitle="Financial Overview & Ledger" breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Accounting'}]} />
      <AccountingDashboardClient 
        totalAR={totalAR}
        totalAP={totalAP}
        totalBankBalance={totalBankBalance}
        totalCashInHand={totalCashInHand}
        banks={banks}
        customers={customers}
        suppliers={suppliers}
        expenseCategories={expenses}
        pendingProcurements={pendingProcurements}
        pendingPackingItems={pendingPackingItems}
        pendingSales={pendingSales}
        transactions={transactions}
      />
    </div>
  );
}

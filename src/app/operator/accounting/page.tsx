import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AccountingDashboardClient from '@/components/AccountingDashboardClient';
import { AppHeader } from '@/components/ui/AppHeader';

export const metadata = {
  title: 'Cashbook & Accounts - Rice Mill ERP',
};

export default async function AccountingDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch balances
  const rawCustomers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
  const rawSuppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  const expenses = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
  const rawBanks = await prisma.bank.findMany({ orderBy: { bankName: 'asc' } });

  const totalAR = rawCustomers.reduce((sum, c) => sum + Number(c.balance), 0);
  const totalAP = rawSuppliers.reduce((sum, s) => sum + Number(s.balance), 0);
  const totalBankBalance = rawBanks.reduce((sum, b) => sum + Number(b.balance), 0);

  const rawCashTransactions = await prisma.paymentTransaction.findMany({
    where: { mode: 'CASH' }
  });
  
  const totalCashInHand = rawCashTransactions.reduce((acc, tx) => {
    if (tx.type === 'RECEIPT') return acc + Number(tx.amount);
    if (tx.type === 'PAYMENT') return acc - Number(tx.amount);
    return acc;
  }, 0);

  // Fetch pending procurement batches awaiting cashier payment confirmation
  const rawProcurements = await prisma.procurementBatch.findMany({
    where: { status: { in: ['FINALIZED', 'PARTIALLY_PAID'] } },
    include: {
      supplier: true,
        farmer: true,
        payments: { orderBy: { createdAt: 'desc' } },
      product: true,
      godown: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch pending packing material procurements awaiting cashier payment confirmation
  const rawPackingItems = await prisma.packingItem.findMany({
    where: { status: { in: ['FINALIZED', 'PARTIALLY_PAID'] } },
    include: {
      godown: true,
        supplier: true,
        payments: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch pending sales invoices awaiting cashier receipt confirmation
  const rawSales = await prisma.salesInvoice.findMany({
    where: { status: { in: ['FINALIZED', 'PARTIALLY_PAID'] } },
    include: {
      customer: true,
      vehicle: true,
        payments: { orderBy: { createdAt: 'desc' } },
      items: {
        include: {
          product: true,
          godown: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch recent transactions
  const rawTransactions = await prisma.paymentTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      customer: true,
      supplier: true,
      expenseCategory: true,
      bank: true,
      user: true,
      procurementBatch: { select: { id: true, status: true } },
      salesInvoice: { select: { id: true, status: true } },
      packingItem: { select: { id: true, status: true } },
    }
  });

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

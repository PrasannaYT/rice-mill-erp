'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AccountingService } from "@/services/accountingService";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  const allowedRoles = ['ADMIN', 'MANAGER', 'ACCOUNTANT'];
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Forbidden: Insufficient privileges");
  }
  return session;
}

const paymentSchema = z.object({
  type: z.enum(['RECEIPT', 'PAYMENT', 'SELL_ITEM', 'BUY_ITEM']),
  mode: z.enum(['CASH', 'BANK', 'UPI', 'CREDIT']).optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0),
  referenceNumber: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  expenseCategoryId: z.string().optional(),
  bankId: z.string().optional(),
  notes: z.string().optional(),
  itemName: z.string().optional(),
  quantity: z.string().optional(),
  rate: z.string().optional(),
});

export async function recordTransactionAction(formData: FormData) {
  const session = await checkAuth();
  
  const data = {
    type: formData.get('type') as 'RECEIPT' | 'PAYMENT' | 'SELL_ITEM' | 'BUY_ITEM',
    mode: (formData.get('mode') as 'CASH' | 'BANK' | 'UPI' | 'CREDIT') || undefined,
    amount: formData.get('amount') as string,
    referenceNumber: (formData.get('referenceNumber') as string) || undefined,
    customerId: (formData.get('customerId') as string) || undefined,
    supplierId: (formData.get('supplierId') as string) || undefined,
    expenseCategoryId: (formData.get('expenseCategoryId') as string) || undefined,
    bankId: (formData.get('bankId') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    itemName: (formData.get('itemName') as string) || undefined,
    quantity: (formData.get('quantity') as string) || undefined,
    rate: (formData.get('rate') as string) || undefined,
  };

  const parsed = paymentSchema.parse(data);

  await AccountingService.recordTransaction({
    userId: session.user.id,
    ...parsed,
  });
  
  revalidatePath('/operator/accounting');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/reports');
}

export async function confirmProcurementPaymentAction(formData: FormData) {
  const session = await checkAuth();

  const batchId = formData.get('batchId') as string;
  const mode = formData.get('mode') as 'CASH' | 'BANK' | 'UPI';
  const bankId = (formData.get('bankId') as string) || undefined;
  const referenceNumber = (formData.get('referenceNumber') as string) || undefined;
  const notes = (formData.get('notes') as string) || undefined;

  const amountStr = formData.get('amount') as string;
  const amount = parseFloat(amountStr);

  if (!batchId || !mode || isNaN(amount) || amount <= 0) {
    throw new Error("Missing required fields for cashier procurement payment confirmation.");
  }

  await AccountingService.confirmProcurementPayment({
    batchId,
    amount,
    mode,
    bankId,
    referenceNumber,
    notes,
    userId: session.user.id,
  });

  revalidatePath('/operator/accounting');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/procurement');
  revalidatePath('/admin/reports');
}

export async function confirmSalesReceiptAction(formData: FormData) {
  const session = await checkAuth();

  const invoiceId = formData.get('invoiceId') as string;
  const mode = formData.get('mode') as 'CASH' | 'BANK' | 'UPI';
  const bankId = (formData.get('bankId') as string) || undefined;
  const referenceNumber = (formData.get('referenceNumber') as string) || undefined;
  const notes = (formData.get('notes') as string) || undefined;

  const amountStr = formData.get('amount') as string;
  const amount = parseFloat(amountStr);

  if (!invoiceId || !mode || isNaN(amount) || amount <= 0) {
    throw new Error("Missing required fields for cashier sales receipt confirmation.");
  }

  await AccountingService.confirmSalesReceipt({
    invoiceId,
    amount,
    mode,
    bankId,
    referenceNumber,
    notes,
    userId: session.user.id,
  });

  revalidatePath('/operator/accounting');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/sales');
  revalidatePath('/admin/reports');
}

export async function confirmSalesRefundAction(formData: FormData) {
  const session = await checkAuth();

  const invoiceId = formData.get('invoiceId') as string;
  const mode = formData.get('mode') as 'CASH' | 'BANK' | 'UPI';
  const bankId = (formData.get('bankId') as string) || undefined;
  const referenceNumber = (formData.get('referenceNumber') as string) || undefined;
  const notes = (formData.get('notes') as string) || undefined;

  const amountStr = formData.get('amount') as string;
  const amount = parseFloat(amountStr);

  if (!invoiceId || !mode || isNaN(amount) || amount <= 0) {
    throw new Error("Missing required fields for cashier sales refund confirmation.");
  }

  await AccountingService.confirmSalesRefund({
    invoiceId,
    amount,
    mode,
    bankId,
    referenceNumber,
    notes,
    userId: session.user.id,
  });

  revalidatePath('/operator/accounting');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/sales');
  revalidatePath('/admin/reports');
}

export async function confirmPackingItemPaymentAction(formData: FormData) {
  const session = await checkAuth();

  const packingItemId = formData.get('packingItemId') as string;
  const mode = formData.get('mode') as 'CASH' | 'BANK' | 'UPI';
  const bankId = (formData.get('bankId') as string) || undefined;
  const referenceNumber = (formData.get('referenceNumber') as string) || undefined;
  const notes = (formData.get('notes') as string) || undefined;

  const amountStr = formData.get('amount') as string;
  const amount = parseFloat(amountStr);

  if (!packingItemId || !mode || isNaN(amount) || amount <= 0) {
    throw new Error("Missing required fields for cashier packing item payment confirmation.");
  }

  await AccountingService.confirmPackingItemPayment({
    packingItemId,
    amount,
    mode,
    bankId,
    referenceNumber,
    notes,
    userId: session.user.id,
  });

  revalidatePath('/operator/accounting');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/inventory');
  revalidatePath('/operator/procurement');
  revalidatePath('/admin/reports');
}

export async function deleteTransactionAction(formData: FormData) {
  await checkAuth();
  const transactionId = formData.get('transactionId') as string;
  if (!transactionId) {
    throw new Error("Transaction ID is required for deletion.");
  }
  await AccountingService.deleteTransaction(transactionId);
  revalidatePath('/operator/accounting');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/reports');
}


'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PayrollService } from "@/services/payrollService";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";

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

const wageSchema = z.object({
  laborerId: z.string().min(1),
  workType: z.string().optional(),
  quantity: z.string().optional(),
  rate: z.string().optional(),
  totalWage: z.string().optional()
});

export async function recordWageAction(formData: FormData) {
  await checkAuth();
  
  const data = {
    laborerId: formData.get('laborerId') as string,
    workType: (formData.get('workType') as string) || undefined,
    quantity: (formData.get('quantity') as string) || undefined,
    rate: (formData.get('rate') as string) || undefined,
    totalWage: (formData.get('totalWage') as string) || undefined,
  };

  const parsed = wageSchema.parse(data);

  await PayrollService.recordWage(parsed);
  
  revalidatePath('/operator/payroll');
  revalidatePath('/admin/reports');
}

export async function issueAdvanceAction(formData: FormData) {
  const session = await checkAuth();
  const laborerId = formData.get('laborerId') as string;
  const amountStr = formData.get('amount') as string;
  const bankId = formData.get('bankId') as string;
  const description = formData.get('description') as string;

  if (!laborerId || !amountStr || !description) throw new Error("Missing required fields");
  const amount = parseFloat(amountStr);

  await prisma.$transaction(async (tx) => {
    // 1. Record Ledger Entry (Debit to Laborer)
    await tx.ledgerEntry.create({
      data: {
        laborerId,
        transactionType: 'DEBIT',
        amount,
        description: `Advance/Khata: ${description}`,
      }
    });

    // 2. Reduce Laborer Balance
    await tx.laborer.update({
      where: { id: laborerId },
      data: { balance: { decrement: amount } }
    });

    // 3. Record Payment if bank selected
    if (bankId) {
      await tx.paymentTransaction.create({
        data: {
          type: 'PAYMENT',
          mode: 'BANK',
          amount,
          laborerId,
          bankId,
          notes: `Advance to Laborer: ${description}`,
          userId: session.user.id
        }
      });
      await tx.bank.update({
        where: { id: bankId },
        data: { balance: { decrement: amount } }
      });
    }
  });

  revalidatePath('/operator/payroll');
}

export async function settleLaborerPaymentAction(formData: FormData) {
  const session = await checkAuth();
  const laborerId = formData.get('laborerId') as string;
  const amountStr = formData.get('amount') as string;
  const bankId = formData.get('bankId') as string;

  if (!laborerId || !amountStr) throw new Error("Missing required fields");
  const amount = parseFloat(amountStr);

  await prisma.$transaction(async (tx) => {
    // 1. Record Ledger Entry (Debit to Laborer)
    await tx.ledgerEntry.create({
      data: {
        laborerId,
        transactionType: 'DEBIT',
        amount,
        description: `Payment Settlement`,
      }
    });

    // 2. Reduce Laborer Balance
    await tx.laborer.update({
      where: { id: laborerId },
      data: { balance: { decrement: amount } }
    });

    // 3. Record Payment
    if (bankId) {
      await tx.paymentTransaction.create({
        data: {
          type: 'PAYMENT',
          mode: 'BANK',
          amount,
          laborerId,
          bankId,
          notes: `Settlement to Laborer`,
          userId: session.user.id
        }
      });
      await tx.bank.update({
        where: { id: bankId },
        data: { balance: { decrement: amount } }
      });
    }
  });

  revalidatePath('/operator/payroll');
}

export async function getLaborerHistoryAction(laborerId: string) {
  await checkAuth();
  
  if (!laborerId) return [];
  
  const wages = await prisma.laborWage.findMany({
    where: { laborerId },
    orderBy: { date: 'desc' },
    take: 5,
    select: { id: true, date: true, workType: true, totalWage: true }
  });
  
  const ledgers = await prisma.ledgerEntry.findMany({
    where: { laborerId, transactionType: 'DEBIT' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, description: true, amount: true }
  });
  
  // Combine and sort
  const history = [
    ...wages.map(w => ({ id: w.id, date: w.date, type: 'WAGE (CREDIT)', desc: w.workType || 'Wage', amount: Number(w.totalWage) })),
    ...ledgers.map(l => ({ id: l.id, date: l.createdAt, type: 'PAYMENT/ADVANCE (DEBIT)', desc: l.description, amount: -Number(l.amount) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  
  return history;
}

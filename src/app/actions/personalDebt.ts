'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PersonalDebtRepository } from '@/repositories/personalDebtRepository';
import { Prisma } from '@prisma/client';

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    throw new Error('Unauthorized');
  }
  return session;
}

const loanCreateSchema = z.object({
  lenderName: z.string().min(1, 'Lender name is required'),
  loanType: z.string().min(1, 'Loan type is required'),
  principalAmount: z.coerce.number().min(1, 'Principal amount must be greater than 0'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  tenureMonths: z.coerce.number().min(1, 'Tenure must be at least 1 month'),
  startDate: z.string().min(1, 'Start date is required'),
  isPrivate: z.coerce.boolean().default(false),
});

export async function createPersonalLoanAction(formData: FormData) {
  await checkAuth();
  
  const parsed = loanCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  try {
    const data = parsed.data;
    await PersonalDebtRepository.createLoan({
      ...data,
      startDate: new Date(data.startDate),
    });
    revalidatePath('/admin/personal-debt');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create personal loan');
  }
}

const transactionSchema = z.object({
  loanId: z.string().min(1, 'Loan ID is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amountPaid: z.coerce.number().min(1, 'Amount paid must be greater than 0'),
  principalComponent: z.coerce.number().default(0),
  interestComponent: z.coerce.number().default(0),
  paymentType: z.enum(['EMI', 'PREPAYMENT']),
});

export async function recordPersonalLoanTransactionAction(formData: FormData) {
  await checkAuth();

  const parsed = transactionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  try {
    const data = parsed.data;
    await PersonalDebtRepository.recordTransaction({
      ...data,
      paymentDate: new Date(data.paymentDate),
    });
    revalidatePath(`/admin/personal-debt/${data.loanId}`);
    revalidatePath('/admin/personal-debt');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to record transaction');
  }
}

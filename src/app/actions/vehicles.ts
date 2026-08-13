'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { z } from "zod";

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  const allowedRoles = ['ADMIN', 'MANAGER', 'WEIGHBRIDGE_OPERATOR', 'MILL_OWNER', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Forbidden: Insufficient privileges");
  }
  return session;
}

const commissionSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Commission amount must be greater than zero"),
  description: z.string().optional().nullable().transform(v => v || 'Freight Commission Earned'),
});

const expenseSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  categoryId: z.string().min(1, "Category ID is required"),
  bankId: z.string().optional().nullable().transform(v => v || null),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Expense amount must be greater than zero"),
  description: z.string().optional().nullable().transform(v => v || 'Vehicle Expense'),
});

const settleSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  bankId: z.string().optional().nullable().transform(v => v || null),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Payment amount must be greater than zero"),
});

const assignDriverSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  driverId: z.string().optional().nullable().transform(v => v || null),
});

export async function recordVehicleCommissionAction(formData: FormData) {
  const _session = await checkAuth(); // auth enforced; user context not needed here
  
  const parsed = commissionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  
  const amount = new Decimal(parsed.data.amount);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.create({
        data: {
          vehicleId: parsed.data.vehicleId,
          transactionType: 'CREDIT',
          amount: amount.toNumber(),
          description: parsed.data.description
        }
      });
      
      await tx.vehicle.update({
        where: { id: parsed.data.vehicleId },
        data: { balance: { increment: amount.toNumber() } }
      });
    });
    
    revalidatePath('/operator/vehicles');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to record commission");
  }
}

export async function logVehicleExpenseAction(formData: FormData) {
  const session = await checkAuth();
  
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  
  const amount = new Decimal(parsed.data.amount);

  try {
    await prisma.$transaction(async (tx) => {
      let finalCategoryId = parsed.data.categoryId;

      // If categoryId starts with NEW:, create a new expense category on the fly
      if (finalCategoryId.startsWith('NEW:')) {
        const newCategoryName = finalCategoryId.replace('NEW:', '').trim();
        const newCat = await tx.expenseCategory.create({
          data: {
            name: newCategoryName,
            type: 'EXPENSE',
          }
        });
        finalCategoryId = newCat.id;
      }

      await tx.paymentTransaction.create({
        data: {
          vehicleId: parsed.data.vehicleId,
          expenseCategoryId: finalCategoryId,
          bankId: parsed.data.bankId,
          mode: parsed.data.bankId ? 'BANK' : 'CASH',
          type: 'PAYMENT',
          amount: amount.toNumber(),
          notes: parsed.data.description,
          userId: session.user.id
        }
      });
      
      if (parsed.data.bankId) {
        await tx.bank.update({
          where: { id: parsed.data.bankId },
          data: { balance: { decrement: amount.toNumber() } }
        });
      }
    });
    
    revalidatePath('/operator/vehicles');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to log expense");
  }
}

export async function settleVehiclePaymentAction(formData: FormData) {
  const session = await checkAuth();
  
  const parsed = settleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  
  const amount = new Decimal(parsed.data.amount);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.create({
        data: {
          vehicleId: parsed.data.vehicleId,
          transactionType: 'DEBIT',
          amount: amount.toNumber(),
          description: 'Payment Settled'
        }
      });
      
      await tx.vehicle.update({
        where: { id: parsed.data.vehicleId },
        data: { balance: { decrement: amount.toNumber() } }
      });
      
      await tx.paymentTransaction.create({
        data: {
          vehicleId: parsed.data.vehicleId,
          bankId: parsed.data.bankId,
          mode: parsed.data.bankId ? 'BANK' : 'CASH',
          type: 'PAYMENT',
          amount: amount.toNumber(),
          notes: 'Settled Third-Party Commission',
          userId: session.user.id
        }
      });
      
      if (parsed.data.bankId) {
        await tx.bank.update({
          where: { id: parsed.data.bankId },
          data: { balance: { decrement: amount.toNumber() } }
        });
      }
    });
    
    revalidatePath('/operator/vehicles');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to settle payment");
  }
}

export async function assignDriverAction(formData: FormData) {
  await checkAuth();
  
  const parsed = assignDriverSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  
  try {
    await prisma.vehicle.update({
      where: { id: parsed.data.vehicleId },
      data: { assignedDriverId: parsed.data.driverId }
    });
    
    revalidatePath('/operator/vehicles');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to assign driver");
  }
}

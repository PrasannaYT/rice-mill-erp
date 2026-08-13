'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function addSparePartAction(formData: FormData) {
  const session = await checkAuth();
  
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const quantity = parseInt(formData.get('quantity') as string) || 0;
  const ratePerUnit = parseFloat(formData.get('ratePerUnit') as string) || 0;

  if (!name || quantity <= 0 || ratePerUnit <= 0) {
    throw new Error("Invalid inputs for Spare Part");
  }

  const totalExpense = quantity * ratePerUnit;

  await prisma.$transaction(async (tx: any) => {
    // Upsert Expense Category
    let expenseCat = await tx.expenseCategory.findFirst({
      where: { name: 'Spares & Machinery' }
    });

    if (!expenseCat) {
      expenseCat = await tx.expenseCategory.create({
        data: { name: 'Spares & Machinery', type: 'EXPENSE', description: 'Purchases of machinery spares and parts' }
      });
    }

    // Upsert Spare Part
    const existing = await tx.sparePart.findUnique({
      where: { name }
    });

    if (existing) {
      await tx.sparePart.update({
        where: { id: existing.id },
        data: {
          availableQty: (existing.deletedAt ? 0 : existing.availableQty) + quantity,
          inUseQty: existing.deletedAt ? 0 : existing.inUseQty,
          ratePerUnit, // update to latest rate
          deletedAt: null // Restore if previously soft deleted
        }
      });
    } else {
      await tx.sparePart.create({
        data: {
          name,
          category,
          ratePerUnit,
          availableQty: quantity,
        }
      });
    }

    // Accounting - create payment transaction
    await tx.paymentTransaction.create({
      data: {
        type: 'PAYMENT',
        mode: 'CASH', // default to cash for simplicity
        amount: totalExpense,
        expenseCategoryId: expenseCat.id,
        notes: `Expense: Hardware/Spares - ${name}`,
        userId: session.user.id
      }
    });
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/operator/inventory');
  revalidatePath('/admin/accounting');
  revalidatePath('/operator/accounting');
}

export async function assignSpareToMillAction(formData: FormData) {
  await checkAuth();

  const sparePartId = formData.get('sparePartId') as string;
  const machineName = formData.get('machineName') as string;

  if (!sparePartId || !machineName) throw new Error("Invalid inputs");

  await prisma.$transaction(async (tx: any) => {
    const spare = await tx.sparePart.findUnique({ where: { id: sparePartId } });
    if (!spare || spare.availableQty < 1) {
      throw new Error("Not enough available quantity to assign.");
    }

    await tx.sparePart.update({
      where: { id: sparePartId },
      data: {
        availableQty: spare.availableQty - 1,
        inUseQty: spare.inUseQty + 1
      }
    });

    await tx.spareAssignment.create({
      data: {
        sparePartId,
        machineName,
        quantity: 1
      }
    });
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/operator/inventory');
}

export async function sendToScrapAction(formData: FormData) {
  await checkAuth();

  const sparePartId = formData.get('sparePartId') as string;
  const source = formData.get('source') as 'AVAILABLE' | 'IN_USE';
  const reason = formData.get('reason') as string;
  const estimatedWeightKg = parseFloat(formData.get('estimatedWeightKg') as string) || null;
  const quantity = Math.max(1, parseInt(formData.get('quantity') as string || '1', 10));

  if (!sparePartId || !reason) throw new Error("Invalid inputs");

  await prisma.$transaction(async (tx: any) => {
    const spare = await tx.sparePart.findUnique({ where: { id: sparePartId } });
    if (!spare) throw new Error("Spare part not found");

    if (source === 'AVAILABLE' && spare.availableQty < quantity) {
      throw new Error(`Only ${spare.availableQty} available in stock to scrap.`);
    }
    if (source === 'IN_USE' && spare.inUseQty < quantity) {
      throw new Error(`Only ${spare.inUseQty} in machine use to scrap.`);
    }

    const newAvailable = source === 'AVAILABLE' ? spare.availableQty - quantity : spare.availableQty;
    const newInUse = source === 'IN_USE' ? spare.inUseQty - quantity : spare.inUseQty;

    if (newAvailable <= 0 && newInUse <= 0) {
      await tx.sparePart.update({
        where: { id: sparePartId },
        data: {
          availableQty: 0,
          inUseQty: 0,
          deletedAt: new Date()
        }
      });
    } else {
      await tx.sparePart.update({
        where: { id: sparePartId },
        data: {
          availableQty: Math.max(0, newAvailable),
          inUseQty: Math.max(0, newInUse)
        }
      });
    }

    const existingScrap = await tx.scrapEntry.findFirst({
      where: {
        sparePartId,
        status: 'ACCUMULATED'
      }
    });

    if (existingScrap) {
      const addedWeight = estimatedWeightKg || 0;
      const totalWeight = (existingScrap.estimatedWeightKg || 0) + addedWeight;
      const combinedReason = existingScrap.reason.includes(reason)
        ? existingScrap.reason
        : `${existingScrap.reason} · ${reason}`;

      await tx.scrapEntry.update({
        where: { id: existingScrap.id },
        data: {
          estimatedWeightKg: totalWeight > 0 ? totalWeight : null,
          reason: combinedReason,
          updatedAt: new Date()
        }
      });
    } else {
      await tx.scrapEntry.create({
        data: {
          sparePartId,
          reason,
          estimatedWeightKg: estimatedWeightKg || null,
          status: 'ACCUMULATED'
        }
      });
    }
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/operator/inventory');
}

export async function sellBulkScrapAction(formData: FormData) {
  const session = await checkAuth();

  const weightSold = parseFloat(formData.get('weightSold') as string) || 0;
  const ratePerKg = parseFloat(formData.get('ratePerKg') as string) || 0;

  if (weightSold <= 0 || ratePerKg <= 0) {
    throw new Error("Weight and Rate must be positive.");
  }

  const totalIncome = weightSold * ratePerKg;

  await prisma.$transaction(async (tx: any) => {
    // 1. Find all ACCUMULATED scrap entries
    const accumulated = await tx.scrapEntry.findMany({
      where: { status: 'ACCUMULATED' }
    });

    if (accumulated.length === 0) {
      throw new Error("No scrap accumulated to sell.");
    }

    // 2. Mark them as SOLD
    await tx.scrapEntry.updateMany({
      where: { status: 'ACCUMULATED' },
      data: { status: 'SOLD', soldAt: new Date() }
    });

    // 3. Create Income Transaction
    await tx.paymentTransaction.create({
      data: {
        type: 'RECEIPT',
        mode: 'CASH', // default
        amount: totalIncome,
        notes: `Income: Bulk Scrap Sale - ${weightSold} KG`,
        userId: session.user.id
      }
    });
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/operator/inventory');
  revalidatePath('/admin/accounting');
  revalidatePath('/operator/accounting');
}

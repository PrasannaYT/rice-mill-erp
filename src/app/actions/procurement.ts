'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { procurementDraftSchema, procurementFinalizeSchema } from "@/validators/procurementValidators";
import { ProcurementService } from "@/services/procurementService";
import { revalidatePath } from "next/cache";

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

export async function createDraftBatchAction(formData: FormData) {
  await checkAuth();
  
  const data = {
    supplierId: formData.get('supplierId') as string,
    farmerId: (formData.get('farmerId') as string) || undefined,
    productId: formData.get('productId') as string,
    vehicleId: (formData.get('vehicleId') as string) || undefined,
    godownId: formData.get('godownId') as string,
    grossWeight: formData.get('grossWeight') as string,
  };

  const parsed = procurementDraftSchema.parse(data);

  await prisma.procurementBatch.create({
    data: {
      supplierId: parsed.supplierId,
      farmerId: parsed.farmerId,
      productId: parsed.productId,
      vehicleId: parsed.vehicleId,
      godownId: parsed.godownId,
      grossWeight: Number(parsed.grossWeight),
      status: 'DRAFT',
    }
  });

  revalidatePath('/operator/procurement');
  
}

export async function finalizeBatchAction(formData: FormData) {
  const session = await checkAuth();
  
  const data = {
    batchId: formData.get('batchId') as string,
    tareWeight: formData.get('tareWeight') as string,
    beforeDryingMoisture: formData.get('beforeDryingMoisture') as string,
    afterDryingMoisture: formData.get('afterDryingMoisture') as string,
    perBagWeight: formData.get('perBagWeight') as string,
    farmerBagRate: formData.get('farmerBagRate') as string,
    brokerCommissionRate: formData.get('brokerCommissionRate') as string,
    transportFreightAmount: (formData.get('transportFreightAmount') as string) || "0",
  };

  const parsed = procurementFinalizeSchema.parse(data);

  await ProcurementService.finalizeBatch(
    parsed.batchId,
    parsed.tareWeight,
    parsed.beforeDryingMoisture,
    parsed.afterDryingMoisture,
    parsed.perBagWeight,
    parsed.farmerBagRate,
    parsed.brokerCommissionRate,
    parsed.transportFreightAmount,
    session.user.id
  );

  revalidatePath('/operator/procurement');
  
  revalidatePath('/admin/reports'); // bust analytics cache (P&L, yield, broker stats)
}

export async function cancelDraftBatchAction(formData: FormData) {
  const session = await checkAuth();
  const batchId = formData.get('batchId') as string;
  
  if (!batchId) {
    throw new Error("Batch ID is required");
  }

  await ProcurementService.cancelBatch(batchId, session.user.id);
  
  revalidatePath('/operator/procurement');
  
}

export async function autoSaveDraftAction(formData: FormData) {
  await checkAuth();
  const batchId = formData.get('batchId') as string;
  
  if (!batchId) return; // Silent return for auto-save

  const data: Record<string, number | string | null> = {};
  if (formData.has('tareWeight')) data.tareWeight = parseFloat(formData.get('tareWeight') as string) || null;
  if (formData.has('perBagWeight')) data.perBagWeight = parseFloat(formData.get('perBagWeight') as string) || null;
  if (formData.has('farmerBagRate')) data.farmerBagRate = parseFloat(formData.get('farmerBagRate') as string) || null;
  if (formData.has('brokerCommissionRate')) data.brokerCommissionRate = parseFloat(formData.get('brokerCommissionRate') as string) || null;
  if (formData.has('beforeDryingMoisture')) data.beforeDryingMoisture = parseFloat(formData.get('beforeDryingMoisture') as string) || null;
  if (formData.has('afterDryingMoisture')) data.afterDryingMoisture = parseFloat(formData.get('afterDryingMoisture') as string) || null;
  if (formData.has('farmerId')) {
    const fId = formData.get('farmerId') as string;
    data.farmerId = fId === '' ? null : fId;
  }

  await prisma.procurementBatch.update({
    where: { id: batchId },
    data
  });
  
  revalidatePath('/operator/procurement');
}

export async function createRiceProcurementAction(formData: FormData) {
  const session = await checkAuth();

  const supplierId = formData.get('supplierId') as string;
  const productId = formData.get('productId') as string;
  const godownId = formData.get('godownId') as string;
  const measureMode = formData.get('measureMode') as string;
  
  const rate = Number(formData.get('rate') || 0);
  
  let grossWeight = 0;
  let tareWeight = 0;
  let netWeight = 0;
  let numberOfBags = 0;
  let perBagWeight = 0;
  let totalPayable = 0;

  if (measureMode === 'WEIGHBRIDGE') {
    grossWeight = Number(formData.get('grossWeight') || 0);
    tareWeight = Number(formData.get('tareWeight') || 0);
    netWeight = grossWeight - tareWeight;
    totalPayable = (netWeight / 100) * rate; // Rate is per quintal
  } else {
    numberOfBags = Number(formData.get('numberOfBags') || 0);
    perBagWeight = Number(formData.get('perBagWeight') || 0);
    netWeight = numberOfBags * perBagWeight;
    grossWeight = netWeight; // For bags, gross is same as net
    totalPayable = numberOfBags * rate; // Rate is per bag
  }

  // Create the procurement batch and add to supplier ledger
  await prisma.$transaction(async (tx) => {
    const batch = await tx.procurementBatch.create({
      data: {
        supplierId,
        productId,
        godownId,
        grossWeight,
        tareWeight: tareWeight > 0 ? tareWeight : null,
        netWeight,
        normalizedWeight: netWeight, // No drying shortage for rice
        totalPayable,
        farmerTotalPayable: totalPayable,
        status: 'FINALIZED',
        numberOfBags: numberOfBags > 0 ? numberOfBags : null,
        perBagWeight: perBagWeight > 0 ? perBagWeight : null,
        farmerBagRate: measureMode === 'BAGS' ? rate : null,
      }
    });

    // Update Supplier Balance
    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        balance: {
          increment: totalPayable
        }
      }
    });

    // Record Ledger Entry
    await tx.ledgerEntry.create({
      data: {
        supplierId,
        transactionType: 'CREDIT',
        amount: totalPayable,
        description: `Rice Procurement (Batch ${batch.id.slice(-6).toUpperCase()})`,
        referenceId: batch.id,
      }
    });

    // Add Lot to Godown Inventory
    if (productId && godownId) {
      await tx.lot.create({
        data: {
          productId,
          godownId,
          procurementId: batch.id,
          initialQuantity: netWeight,
          currentQuantity: netWeight,
          status: 'ACTIVE'
        }
      });

      await tx.stockMovement.create({
        data: {
          productId,
          toGodownId: godownId,
          quantity: netWeight,
          type: 'PROCUREMENT',
          referenceId: batch.id,
          userId: session.user.id
        }
      });
    }
  });

  revalidatePath('/operator/procurement');
  revalidatePath('/admin/procurement');
  revalidatePath('/admin/inventory');
  revalidatePath('/admin/accounting');
  revalidatePath('/admin/reports');
}

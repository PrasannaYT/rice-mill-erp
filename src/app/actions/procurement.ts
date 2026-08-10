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
  const allowedRoles = ['ADMIN', 'MANAGER', 'WEIGHBRIDGE_OPERATOR'];
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
  revalidatePath('/admin/procurement');
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
  revalidatePath('/admin/procurement');
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
  revalidatePath('/admin/procurement');
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

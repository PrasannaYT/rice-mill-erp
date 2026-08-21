'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { InventoryService } from "@/services/inventoryService";
import { revalidatePath } from "next/cache";

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  const allowedRoles = ['ADMIN', 'MANAGER', 'FLOOR_MANAGER', 'MILL_OWNER', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Forbidden: Insufficient privileges");
  }
  return session;
}

export async function convertPaddyToRiceAction(formData: FormData) {
  const session = await checkAuth();

  const sourceGodownId = formData.get('sourceGodownId') as string;
  const destinationGodownId = formData.get('destinationGodownId') as string;
  const productId = formData.get('productId') as string;
  const paddyQuantityKg = parseFloat(formData.get('paddyQuantityKg') as string) || 0;
  const milledOutputsStr = formData.get('milledOutputs') as string;

  if (!sourceGodownId) throw new Error("Source Paddy Godown is required");
  if (!destinationGodownId) throw new Error("Destination Rice Godown is required");
  if (!productId) throw new Error("Paddy product is required");
  if (paddyQuantityKg <= 0) throw new Error("Paddy quantity must be positive");
  if (!milledOutputsStr) throw new Error("Milled output rows are required");

  let milledOutputs: Array<{ outputType: string; bagCapacityKg: number; numberOfBags: number; quantityKg: number }> = [];
  try {
    milledOutputs = JSON.parse(milledOutputsStr) as Array<{ outputType: string; bagCapacityKg: number; numberOfBags: number; quantityKg: number }>;
  } catch (_e) {
    throw new Error("Invalid milled outputs format");
  }

  await InventoryService.convertPaddyToRice({
    sourceGodownId,
    destinationGodownId,
    productId,
    paddyQuantityKg,
    milledOutputs,
    userId: session.user.id
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/operator/milling');
  revalidatePath('/dashboard');
  revalidatePath('/admin/reports');
}

export async function addPaddyOpeningStockAction(formData: FormData) {
  const session = await checkAuth();

  const productId = formData.get('productId') as string;
  const godownId = formData.get('godownId') as string;
  const numberOfBags = parseFloat(formData.get('numberOfBags') as string) || 0;
  const perBagWeight = parseFloat(formData.get('perBagWeight') as string) || 0;
  const ratePerBag = parseFloat(formData.get('ratePerBag') as string) || 0;

  if (!productId) throw new Error("Product is required");
  if (!godownId) throw new Error("Godown is required");
  if (numberOfBags <= 0) throw new Error("Number of bags must be positive");
  if (perBagWeight <= 0) throw new Error("Weight per bag must be positive");
  if (ratePerBag <= 0) throw new Error("Rate per bag must be positive");

  await InventoryService.addOpeningStock({
    productId,
    godownId,
    numberOfBags,
    perBagWeight,
    ratePerBag,
    userId: session.user.id
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/dashboard');
  revalidatePath('/admin/reports');
}

export async function addPackagingOpeningStockAction(formData: FormData) {
  const session = await checkAuth();

  const brandName = (formData.get('brandName') as string || '').trim();
  const capacityKg = parseFloat(formData.get('capacityKg') as string) || 0;
  const quantityBags = parseFloat(formData.get('quantityBags') as string) || 0;
  const perBagRate = parseFloat(formData.get('perBagRate') as string) || 0;
  const godownId = formData.get('godownId') as string;
  const supplierId = (formData.get('supplierId') as string) || null;
  const hsnCode = (formData.get('hsnCode') as string) || null;

  if (!brandName) throw new Error("Brand/Bag name is required");
  if (capacityKg <= 0) throw new Error("Capacity in KG must be positive");
  if (quantityBags <= 0) throw new Error("Quantity of bags must be positive");
  if (perBagRate < 0) throw new Error("Rate per bag cannot be negative");
  if (!godownId) throw new Error("Target Godown is required");

  const { PackingItemRepository } = await import("@/repositories/packingItemRepository");
  const { invalidateCache } = await import("@/lib/memoryCache");

  await PackingItemRepository.create({
    brandName,
    capacityKg,
    quantityBags,
    perBagRate,
    godownId,
    supplierId,
    hsnCode,
    status: 'PAID'
  });

  invalidateCache('admin:inventory');
  revalidatePath('/admin/inventory');
  revalidatePath('/operator/procurement');
  revalidatePath('/dashboard');
  revalidatePath('/admin/reports');
}

'use server';

import { PackingItemRepository } from "@/repositories/packingItemRepository";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    throw new Error("Forbidden: Insufficient privileges");
  }
  return session;
}

const createSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  capacityKg: z.coerce.number().min(0, "Capacity must be positive"),
  quantityBags: z.coerce.number().min(0, "Quantity must be positive"),
  perBagRate: z.coerce.number().min(0, "Rate must be positive"),
  godownId: z.string().min(1, "Godown is required"),
  supplierId: z.string().optional().nullable().transform(val => val || undefined),
  hsnCode: z.string().optional().nullable().transform(val => val || null),
});

const updateSchema = createSchema.extend({
  id: z.string().min(1, "ID is required"),
});

const deleteSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export async function createPackingItemAction(formData: FormData): Promise<{ id: string; name: string }> {
  await checkAuth();
  
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
  
  try {
    const item = await PackingItemRepository.create({
      brandName: parsed.data.brandName,
      capacityKg: parsed.data.capacityKg,
      quantityBags: parsed.data.quantityBags,
      perBagRate: parsed.data.perBagRate,
      godownId: parsed.data.godownId,
      supplierId: parsed.data.supplierId,
      hsnCode: parsed.data.hsnCode,
      status: 'FINALIZED',
    });

    revalidatePath('/operator/procurement');
    revalidatePath('/admin/procurement');
    revalidatePath('/operator/accounting');
    revalidatePath('/admin/accounting');
    revalidatePath('/admin/inventory');
    return { id: item.id, name: item.brandName };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create packing material stock");
  }
}

export async function updatePackingItemAction(formData: FormData): Promise<never> {
  await checkAuth();
  
  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  try {
    await PackingItemRepository.update(parsed.data.id, {
      brandName: parsed.data.brandName,
      capacityKg: parsed.data.capacityKg,
      quantityBags: parsed.data.quantityBags,
      perBagRate: parsed.data.perBagRate,
      godownId: parsed.data.godownId,
      supplierId: parsed.data.supplierId,
      hsnCode: parsed.data.hsnCode,
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update packing item");
  }

  revalidatePath('/admin/inventory');
  redirect('/admin/inventory');
}

export async function deletePackingItemAction(formData: FormData): Promise<void> {
  await checkAuth();
  
  const parsed = deleteSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
  
  try {
    await PackingItemRepository.delete(parsed.data.id);
    revalidatePath('/admin/inventory');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete packing item");
  }
}

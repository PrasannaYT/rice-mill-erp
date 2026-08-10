'use server';

import { type Prisma } from '@prisma/client';
import { 
  GodownRepository, 
  VehicleRepository,
  BankRepository,
  SupplierRepository,
  ProductRepository,
  CustomerRepository,
  LaborerRepository,
  FarmerRepository
} from "@/repositories/masterDataRepository";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";

// --- AUTHENTICATION ---
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

// --- SCHEMAS ---

const idSchema = z.object({ id: z.string().min(1, "ID is required") });

const godownCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional().nullable().transform(v => v || null),
  capacity: z.coerce.number().optional().nullable().transform(v => v || null),
  type: z.string().min(1, "Type is required").default("PADDY"),
});
const godownUpdateSchema = godownCreateSchema.extend({ id: z.string().min(1, "ID is required") });

const vehicleCreateSchema = z.object({
  licensePlate: z.string().min(1, "License plate is required"),
  type: z.string().min(1, "Type is required"),
  tareWeight: z.coerce.number().optional().nullable().transform(v => v || null),
  ownershipType: z.string().default('OWNED'),
  insuranceExpiry: z.string().optional().nullable().transform(v => v ? new Date(v) : null),
  fitnessExpiry: z.string().optional().nullable().transform(v => v ? new Date(v) : null),
  pollutionExpiry: z.string().optional().nullable().transform(v => v ? new Date(v) : null),
  ownerName: z.string().optional().nullable().transform(v => v || null),
  contactNumber: z.string().optional().nullable().transform(v => v || null),
});
const vehicleUpdateSchema = vehicleCreateSchema.extend({ id: z.string().min(1, "ID is required") });

const bankCreateSchema = z.object({
  bankName: z.string().min(1, "Bank Name is required"),
  accountNumber: z.string().min(1, "Account Number is required"),
  ifscCode: z.string().optional().nullable().transform(v => v || null),
  balance: z.coerce.number().optional().default(0),
});
const bankUpdateSchema = bankCreateSchema.extend({ id: z.string().min(1, "ID is required") });

const productCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  hsnCode: z.string().optional().nullable().transform(v => v || null),
  gstRate: z.coerce.number().optional().default(0),
});
const productUpdateSchema = productCreateSchema.extend({ id: z.string().min(1, "ID is required") });

const supplierCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string().optional().nullable().transform(v => v || null),
  gstin: z.string().optional().nullable().transform(v => v || null),
  address: z.string().optional().nullable().transform(v => v || null),
  category: z.string().optional().default("PADDY_BROKER"),
  balance: z.coerce.number().optional().default(0),
});
const supplierUpdateSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  contact: z.string().optional().nullable().transform(v => v || null),
  gstin: z.string().optional().nullable().transform(v => v || null),
  address: z.string().optional().nullable().transform(v => v || null),
  category: z.string().optional().nullable().transform(v => v || null),
  balance: z.coerce.number().optional().default(0),
});

const customerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string().optional().nullable().transform(v => v || null),
  gstin: z.string().optional().nullable().transform(v => v || null),
  address: z.string().optional().nullable().transform(v => v || null),
  balance: z.coerce.number().optional().default(0),
});
const customerUpdateSchema = customerCreateSchema.extend({ id: z.string().min(1, "ID is required") });

const laborerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string().optional().nullable().transform(v => v || null),
  type: z.string().min(1, "Type is required"),
});
const laborerUpdateSchema = laborerCreateSchema.extend({ id: z.string().min(1, "ID is required") });

const farmerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string().optional().nullable().transform(v => v || null),
  village: z.string().optional().nullable().transform(v => v || null),
  brokerId: z.string().min(1, "Broker is required"),
});
const farmerUpdateSchema = farmerCreateSchema.extend({ id: z.string().min(1, "ID is required") });


// --- GODOWN ACTIONS ---

export async function createGodownAction(formData: FormData): Promise<{ id: string; name: string }> {
  await checkAuth();
  const parsed = godownCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const item = await GodownRepository.create(parsed.data);
    revalidatePath('/admin/master-data/godowns');
    revalidatePath('/admin/master-data');
    return { id: item.id, name: item.name };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create godown");
  }
}

export async function updateGodownAction(formData: FormData): Promise<never> {
  await checkAuth();
  const parsed = godownUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const { id, ...data } = parsed.data;
    await GodownRepository.update(id, data);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update godown");
  }

  revalidatePath('/admin/master-data/godowns');
  revalidatePath('/admin/master-data');
  redirect('/admin/master-data/godowns');
}

export async function deleteGodownAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await GodownRepository.delete(parsed.data.id);
    revalidatePath('/admin/master-data/godowns');
    revalidatePath('/admin/master-data');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete godown");
  }
}

// --- VEHICLE ACTIONS ---

export async function createVehicleAction(formData: FormData): Promise<{ id: string; name: string }> {
  await checkAuth();
  const parsed = vehicleCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const item = await VehicleRepository.create(parsed.data);
    revalidatePath('/admin/master-data/vehicles');
    revalidatePath('/admin/master-data');
    return { id: item.id, name: item.licensePlate };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create vehicle");
  }
}

export async function updateVehicleAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = vehicleUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const { id, ...data } = parsed.data;
    await VehicleRepository.update(id, data);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update vehicle");
  }

  revalidatePath('/admin/master-data/vehicles');
  revalidatePath('/admin/master-data');
  revalidatePath('/operator/vehicles');
}

export async function deleteVehicleAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await VehicleRepository.delete(parsed.data.id);
    revalidatePath('/admin/master-data/vehicles');
    revalidatePath('/admin/master-data');
    revalidatePath('/operator/vehicles');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete vehicle");
  }
}

// --- BANK ACTIONS ---

export async function createBankAction(formData: FormData): Promise<{ id: string; name: string }> {
  await checkAuth();
  const parsed = bankCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const item = await BankRepository.create(parsed.data);
    revalidatePath('/admin/master-data/finance');
    revalidatePath('/admin/master-data');
    return { id: item.id, name: item.bankName };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create bank");
  }
}

export async function updateBankAction(formData: FormData): Promise<never> {
  await checkAuth();
  const parsed = bankUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const { id, ...data } = parsed.data;
    await BankRepository.update(id, data);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update bank");
  }

  revalidatePath('/admin/master-data/finance');
  revalidatePath('/admin/master-data');
  redirect('/admin/master-data/finance');
}

export async function deleteBankAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await BankRepository.delete(parsed.data.id);
    revalidatePath('/admin/master-data/finance');
    revalidatePath('/admin/master-data');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete bank");
  }
}

// --- PRODUCT ACTIONS ---

export async function createProductAction(formData: FormData): Promise<{ id: string; name: string }> {
  await checkAuth();
  const parsed = productCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const item = await ProductRepository.create(parsed.data);
    revalidatePath('/admin/master-data/products');
    revalidatePath('/admin/master-data');
    return { id: item.id, name: item.name };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create product");
  }
}

export async function updateProductAction(formData: FormData): Promise<never> {
  await checkAuth();
  const parsed = productUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const { id, ...data } = parsed.data;
    await ProductRepository.update(id, data);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update product");
  }

  revalidatePath('/admin/master-data/products');
  revalidatePath('/admin/master-data');
  redirect('/admin/master-data/products');
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await ProductRepository.delete(parsed.data.id);
    revalidatePath('/admin/master-data/products');
    revalidatePath('/admin/master-data');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete product");
  }
}

// --- SUPPLIER ACTIONS ---

export async function createSupplierAction(formData: FormData): Promise<{ id: string; name: string }> {
  await checkAuth();
  const parsed = supplierCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const item = await SupplierRepository.create(parsed.data);
    revalidatePath('/admin/master-data/people');
    revalidatePath('/admin/master-data');
    revalidatePath('/operator/procurement');
    revalidatePath('/admin/procurement');
    return { id: item.id, name: item.name };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create supplier");
  }
}

export async function updateSupplierAction(formData: FormData): Promise<never> {
  await checkAuth();
  const parsed = supplierUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const { id, category, ...updateData } = parsed.data;
    const finalUpdate: Prisma.SupplierUpdateInput = { ...updateData };
    if (category) finalUpdate.category = category;
    
    await SupplierRepository.update(id, finalUpdate);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update supplier");
  }

  revalidatePath('/admin/master-data/people');
  revalidatePath('/admin/master-data');
  redirect('/admin/master-data/people');
}

export async function deleteSupplierAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await SupplierRepository.delete(parsed.data.id);
    revalidatePath('/admin/master-data/people');
    revalidatePath('/admin/master-data');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete supplier");
  }
}

// --- CUSTOMER ACTIONS ---

export async function createCustomerAction(formData: FormData): Promise<{ id: string; name: string }> {
  await checkAuth();
  const parsed = customerCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const item = await CustomerRepository.create(parsed.data);
    revalidatePath('/admin/master-data/people');
    revalidatePath('/admin/master-data');
    return { id: item.id, name: item.name };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create customer");
  }
}

export async function updateCustomerAction(formData: FormData): Promise<never> {
  await checkAuth();
  const parsed = customerUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const { id, ...data } = parsed.data;
    await CustomerRepository.update(id, data);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update customer");
  }

  revalidatePath('/admin/master-data/people');
  revalidatePath('/admin/master-data');
  redirect('/admin/master-data/people');
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await CustomerRepository.delete(parsed.data.id);
    revalidatePath('/admin/master-data/people');
    revalidatePath('/admin/master-data');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete customer");
  }
}

// --- LABORER ACTIONS ---

export async function createLaborerAction(formData: FormData): Promise<{ id: string; name: string }> {
  await checkAuth();
  const parsed = laborerCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const item = await LaborerRepository.create(parsed.data);
    revalidatePath('/admin/master-data/laborers');
    revalidatePath('/admin/master-data');
    return { id: item.id, name: item.name };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create laborer");
  }
}

export async function updateLaborerAction(formData: FormData): Promise<never> {
  await checkAuth();
  const parsed = laborerUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const { id, ...data } = parsed.data;
    await LaborerRepository.update(id, data);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update laborer");
  }

  revalidatePath('/admin/master-data/laborers');
  revalidatePath('/admin/master-data');
  redirect('/admin/master-data/laborers');
}

export async function deleteLaborerAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await LaborerRepository.delete(parsed.data.id);
    revalidatePath('/admin/master-data/laborers');
    revalidatePath('/admin/master-data');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete laborer");
  }
}

// --- FARMER ACTIONS ---

export async function createFarmerAction(formData: FormData): Promise<{ id: string; name: string; brokerId: string }> {
  await checkAuth();
  const parsed = farmerCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const item = await FarmerRepository.create(parsed.data);
    revalidatePath('/admin/master-data/farmers');
    revalidatePath('/admin/master-data');
    return { id: item.id, name: item.name, brokerId: item.brokerId };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to create farmer");
  }
}

export async function updateFarmerAction(formData: FormData): Promise<never> {
  await checkAuth();
  const parsed = farmerUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    const { id, brokerId, ...data } = parsed.data;
    await FarmerRepository.update(id, {
      ...data,
      broker: { connect: { id: brokerId } },
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to update farmer");
  }

  revalidatePath('/admin/master-data/farmers');
  revalidatePath('/admin/master-data');
  redirect('/admin/master-data/farmers');
}

export async function deleteFarmerAction(formData: FormData): Promise<void> {
  await checkAuth();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await FarmerRepository.delete(parsed.data.id);
    revalidatePath('/admin/master-data/farmers');
    revalidatePath('/admin/master-data');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete farmer");
  }
}

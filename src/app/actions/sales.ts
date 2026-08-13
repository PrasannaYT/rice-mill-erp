'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SalesService, type InvoiceItemInput } from "@/services/salesService";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  const allowedRoles = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'OPERATOR', 'FLOOR_MANAGER', 'MILL_OWNER', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Forbidden: Insufficient privileges");
  }
  return session;
}

const invoiceItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  godownId: z.string().min(1, "Godown is required"),
  packingItemId: z.string().nullable().optional().transform(v => v || undefined),
  bagCapacityKg: z.string().nullable().optional().transform(v => v || '75'),
  numberOfBags: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Bags must be greater than zero"),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Weight must be greater than zero"),
  rate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Rate must be greater than zero"),
  productType: z.enum(['rice', 'paddy']).optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().optional(),
  transportFreightAmount: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  generateBill: z.boolean().default(true),
  
  // Invoice Editable Document Fields
  deliveryNote: z.string().optional(),
  modeOfPayment: z.string().optional(),
  buyersOrderNo: z.string().optional(),
  dispatchDocNo: z.string().optional(),
  destination: z.string().optional(),
  termsOfDelivery: z.string().optional(),
  otherReferences: z.string().optional(),
  vehicleNo: z.string().optional(),
});

export async function finalizeInvoiceAction(data: {
  customerId: string;
  vehicleId?: string;
  transportFreightAmount?: string;
  items: InvoiceItemInput[];
  generateBill?: boolean;
  deliveryNote?: string;
  modeOfPayment?: string;
  buyersOrderNo?: string;
  dispatchDocNo?: string;
  destination?: string;
  termsOfDelivery?: string;
  otherReferences?: string;
  vehicleNo?: string;
}) {
  const session = await checkAuth();
  
  const parsed = invoiceSchema.parse(data);

  const invoice = await SalesService.finalizeInvoice({
    userId: session.user.id,
    customerId: parsed.customerId,
    vehicleId: parsed.vehicleId,
    transportFreightAmount: parsed.transportFreightAmount ? Number(parsed.transportFreightAmount) : 0,
    items: parsed.items,
    generateBill: parsed.generateBill,
    deliveryNote: parsed.deliveryNote,
    modeOfPayment: parsed.modeOfPayment,
    buyersOrderNo: parsed.buyersOrderNo,
    dispatchDocNo: parsed.dispatchDocNo,
    destination: parsed.destination,
    termsOfDelivery: parsed.termsOfDelivery,
    otherReferences: parsed.otherReferences,
    vehicleNo: parsed.vehicleNo,
  });
  
  revalidatePath('/operator/sales');
  
  revalidatePath('/admin/inventory');
  revalidatePath('/admin/reports'); // bust analytics cache
  
  return { id: invoice.id };
}

export async function updateInvoiceDetailsAction(invoiceId: string, data: {
  deliveryNote?: string;
  modeOfPayment?: string;
  buyersOrderNo?: string;
  dispatchDocNo?: string;
  destination?: string;
  termsOfDelivery?: string;
  otherReferences?: string;
  vehicleNo?: string;
  items?: Array<{ id: string; description: string }>;
}) {
  await checkAuth();

  return SalesService.updateInvoiceDetails(invoiceId, data);
}

export async function saveSalesDraftAction(data: any & { draftId?: string }) {
  const session = await checkAuth();
  
  const parsed = invoiceSchema.parse(data);

  const draft = await SalesService.saveDraft({
    id: data.draftId,
    userId: session.user.id,
    customerId: parsed.customerId,
    vehicleId: parsed.vehicleId,
    transportFreightAmount: parsed.transportFreightAmount ? Number(parsed.transportFreightAmount) : 0,
    items: parsed.items,
    generateBill: parsed.generateBill,
    deliveryNote: parsed.deliveryNote,
    modeOfPayment: parsed.modeOfPayment,
    buyersOrderNo: parsed.buyersOrderNo,
    dispatchDocNo: parsed.dispatchDocNo,
    destination: parsed.destination,
    termsOfDelivery: parsed.termsOfDelivery,
    otherReferences: parsed.otherReferences,
    vehicleNo: parsed.vehicleNo,
  });
  
  revalidatePath('/operator/sales');
  return { id: draft.id };
}

export async function deleteSalesDraftAction(id: string) {
  await checkAuth();
  await SalesService.deleteDraft(id);
  revalidatePath('/operator/sales');
}

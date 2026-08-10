import { z } from 'zod';

const decimalString = z.string().refine((val) => !isNaN(Number(val)), {
  message: "Must be a valid number",
});

export const procurementDraftSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  farmerId: z.string().optional(),
  productId: z.string().min(1, "Paddy Type is required"),
  vehicleId: z.string().optional(),
  godownId: z.string().min(1, "Godown is required"),
  grossWeight: decimalString,
  tareWeight: z.string().regex(/^\d+(\.\d+)?$/, "Must be a valid number").optional(),
  beforeDryingMoisture: z.string().regex(/^\d+(\.\d+)?$/, "Must be a valid number").optional(),
  afterDryingMoisture: z.string().regex(/^\d+(\.\d+)?$/, "Must be a valid number").optional(),
  perBagWeight: z.string().regex(/^\d+(\.\d+)?$/, "Must be a valid number").optional(),
});

export const procurementFinalizeSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  tareWeight: decimalString,
  beforeDryingMoisture: decimalString,
  afterDryingMoisture: decimalString,
  perBagWeight: decimalString,
  farmerBagRate: decimalString,
  brokerCommissionRate: decimalString,
  transportFreightAmount: decimalString,
});

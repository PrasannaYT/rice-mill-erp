import { z } from 'zod';

// Helper for decimal parsing/validation from forms
const decimalString = z.string().refine((val) => !isNaN(Number(val)), {
  message: "Must be a valid number",
});

export const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contact: z.string().optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN").optional().or(z.literal('')),
  address: z.string().optional(),
});

export const customerSchema = supplierSchema; // Reusing the same base schema

export const productSchema = z.object({
  name: z.string().min(2, "Name required"),
  category: z.enum(['RAW_MATERIAL', 'FINISHED_GOOD', 'BYPRODUCT']),
  unit: z.enum(['QUINTAL', 'KG', 'TONNE']),
  hsnCode: z.string().optional(),
  gstRate: decimalString,
});

export const godownSchema = z.object({
  name: z.string().min(2, "Name required"),
  location: z.string().optional(),
  capacity: decimalString.optional(),
});

export const vehicleSchema = z.object({
  licensePlate: z.string().min(4, "Invalid license plate"),
  type: z.enum(['TRACTOR', 'TRUCK', 'OTHER']),
  tareWeight: decimalString.optional(),
});


export const laborerSchema = z.object({
  name: z.string().min(2, "Name required"),
  type: z.enum(['HAMALI', 'DRIVER', 'OTHER']),
  contact: z.string().optional(),
});

export const bankSchema = z.object({
  bankName: z.string().min(2, "Bank name required"),
  accountNumber: z.string().min(6, "Invalid account number"),
  ifscCode: z.string().optional(),
});

export const expenseCategorySchema = z.object({
  name: z.string().min(2, "Category name required"),
  description: z.string().optional(),
});

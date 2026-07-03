import { z } from "zod";

export const postOpeningStockSchema = z.object({
  warehouseId: z.string().uuid("Invalid Warehouse ID"),
  productId: z.string().uuid("Invalid Product ID"),
  variantId: z.string().uuid("Invalid Variant ID").nullable().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unitCost: z.number().min(0).default(0.0000),
  batchNumber: z.string().max(100).optional(),
  serialNumbers: z.array(z.string().min(1)).optional()
});

export const postAdjustmentSchema = z.object({
  warehouseId: z.string().uuid("Invalid Warehouse ID"),
  productId: z.string().uuid("Invalid Product ID"),
  variantId: z.string().uuid("Invalid Variant ID").nullable().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unitCost: z.number().min(0).default(0.0000),
  reason: z.string().min(1, "Reason is required").max(100),
  remarks: z.string().max(500).optional(),
  type: z.enum(["adjustment_increase", "adjustment_decrease"])
});

export const shipTransferSchema = z.object({
  sourceWarehouseId: z.string().uuid("Invalid Source Warehouse ID"),
  targetWarehouseId: z.string().uuid("Invalid Target Warehouse ID"),
  productId: z.string().uuid("Invalid Product ID"),
  variantId: z.string().uuid("Invalid Variant ID").nullable().optional(),
  quantity: z.number().positive("Transfer quantity must be positive"),
  transferNumber: z.string().max(50).optional()
});

export const receiveTransferSchema = z.object({
  productId: z.string().uuid("Invalid Product ID"),
  variantId: z.string().uuid("Invalid Variant ID").nullable().optional(),
  quantity: z.number().positive("Receive quantity must be positive")
});

export const createReservationSchema = z.object({
  warehouseId: z.string().uuid("Invalid Warehouse ID"),
  productId: z.string().uuid("Invalid Product ID"),
  variantId: z.string().uuid("Invalid Variant ID").nullable().optional(),
  quantity: z.number().positive("Reservation quantity must be positive"),
  expiresMinutes: z.number().int().positive().default(60),
  referenceType: z.enum(["draft_invoice", "sales_order", "hold"]),
  referenceId: z.string().uuid("Invalid Reference ID")
});

import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gstin: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
});

export const inventorySchema = z.object({
  name: z.string().min(2, "Product name is required"),
  cost_price: z.number().min(0, "Cost price cannot be negative").optional(),
  price: z.number().min(0, "Selling price cannot be negative").optional(),
  stock: z.number().min(0, "Stock cannot be negative").optional(),
  gst_percent: z.number().min(0).max(100).optional(),
});

export const saleSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID").nullable().optional().or(z.literal("")),
  customer_name: z.string().min(2, "Customer name is required if not selecting existing").nullable().optional().or(z.literal("")),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    batchId: z.string().uuid().optional(),
    inventory_id: z.string().uuid().optional(),
    quantity: z.number().min(1),
    price: z.number().min(0),
    product_name: z.string().optional()
  })).min(1, "At least one item is required for a sale"),
  amount_paid: z.number().min(0).optional(),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  discount_percent: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
});

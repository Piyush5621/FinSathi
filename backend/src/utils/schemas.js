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
  customer_gstin: z.string().optional().nullable().or(z.literal("")),
  place_of_supply: z.string().optional().nullable().or(z.literal("")),
  store_id: z.string().uuid().nullable().optional().or(z.literal("")),

  invoice_no: z.string().nullable().optional(),
  idempotency_key: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  client_id: z.string().nullable().optional(),
  items: z.array(z.object({
    productId: z.string().uuid().nullable().optional().or(z.literal("")),
    product_id: z.string().uuid().nullable().optional().or(z.literal("")),
    id: z.string().uuid().nullable().optional().or(z.literal("")),
    batchId: z.string().uuid().nullable().optional().or(z.literal("")),
    batch_id: z.string().uuid().nullable().optional().or(z.literal("")),
    variantId: z.string().uuid().nullable().optional().or(z.literal("")),
    variant_id: z.string().uuid().nullable().optional().or(z.literal("")),
    inventory_id: z.string().uuid().nullable().optional().or(z.literal("")),
    quantity: z.number().min(0.001, "Quantity must be greater than zero"),
    price: z.number().min(0, "Price cannot be negative"),
    product_name: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    gst_percent: z.number().min(0).max(100).nullable().optional(),
    cost_price: z.number().min(0).nullable().optional(),
    discount_amount: z.number().min(0).nullable().optional(),
    unit: z.string().nullable().optional(),
    total: z.number().min(0).nullable().optional()
  })).min(1, "At least one item is required for a sale"),
  amount_paid: z.number().min(0).nullable().optional(),
  payment_method: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  subtotal: z.number().min(0).nullable().optional(),
  tax_amount: z.number().min(0).nullable().optional(),
  discount_percent: z.number().min(0).nullable().optional(),
  discount_amount: z.number().min(0).nullable().optional(),
  discount: z.number().min(0).nullable().optional(),
  total: z.number().min(0).nullable().optional(),
  split_details: z.object({
    cash: z.number().min(0).optional(),
    upi: z.number().min(0).optional(),
    card: z.number().min(0).optional()
  }).optional().nullable(),
  notes: z.string().optional().nullable(),
  date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional()
});

export const updateProfileSchema = z.object({
  about_text: z.string().optional().nullable(),
  year_established: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  website_url: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  trade_volume_bracket: z.string().optional().nullable(),
});

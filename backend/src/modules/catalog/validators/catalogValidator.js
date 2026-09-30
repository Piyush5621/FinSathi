import { z } from "zod";

export const barcodeSchema = z.object({
  type: z.enum(["EAN-13", "UPC", "Code128", "QR", "GS1-ready"]).default("EAN-13"),
  value: z.string().min(1, "Barcode value is required"),
  isPrimary: z.boolean().default(false),
  generatedManually: z.boolean().default(true)
});

export const mediaSchema = z.object({
  type: z.enum(["image", "pdf", "warranty", "manual", "certificate", "video"]),
  url: z.string().url("Invalid media URL"),
  name: z.string().min(1, "Name is required"),
  sortOrder: z.number().int().default(0),
  isPrimary: z.boolean().default(false)
});

export const bundleComponentSchema = z.object({
  componentProductId: z.string().uuid("Invalid component product ID"),
  quantity: z.number().positive("Quantity must be positive")
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  shortName: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  sku: z.string().max(100).optional(),
  productType: z.enum(["simple", "variant", "bundle", "service", "digital", "composite"]).default("simple"),
  trackingType: z.enum(["none", "serialized", "batch_expiry"]).default("none"),
  valuationMethod: z.enum(["FIFO", "WAC", "LIFO", "FEFO"]).default("FIFO"),
  status: z.enum(["draft", "active", "inactive", "archived", "deleted"]).default("draft"),
  lifecycleState: z.enum(["active", "end_of_life", "discontinued"]).default("active"),
  categoryId: z.string().uuid("Invalid category ID").nullable().optional(),
  brandId: z.string().uuid("Invalid brand ID").nullable().optional(),
  companyId: z.string().uuid("Invalid company ID").nullable().optional(),
  sellingUomId: z.string().optional().nullable(),
  purchaseUomId: z.string().optional().nullable(),
  gstRateId: z.string().uuid("Invalid GST rate ID").nullable().optional(),
  hsnCodeId: z.string().uuid("Invalid HSN ID").nullable().optional(),
  mrp: z.number().min(0).default(0.00),
  sellingPrice: z.number().min(0).default(0.00),
  price: z.number().min(0).optional(),
  costPrice: z.number().min(0).default(0.0000),
  cost_price: z.number().min(0).optional(),
  stock: z.number().min(0).optional().default(0),
  storeId: z.string().optional().nullable(),
  units: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  gst_percent: z.number().min(0).optional().default(0),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  }).nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  specifications: z.record(z.any()).optional(),
  barcodes: z.array(barcodeSchema).optional(),
  media: z.array(mediaSchema).optional(),
  components: z.array(bundleComponentSchema).optional()
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().max(100).optional(),
  attributes: z.record(z.any()).optional().default({}), // e.g. { color: "Red", size: "M" }
  sellingPrice: z.number().min(0).nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  cost_price: z.number().min(0).nullable().optional(),
  stock: z.number().min(0).optional().default(0),
  storeId: z.string().optional().nullable(),
  gstRateId: z.string().uuid().nullable().optional(),
  hsnCodeId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  companyId: z.string().uuid().nullable().optional(),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  }).nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  barcodes: z.array(barcodeSchema).optional()
});

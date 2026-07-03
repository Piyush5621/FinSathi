import { z } from "zod";

export const createUomGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(50)
});

export const updateUomGroupSchema = createUomGroupSchema.partial();

export const createUomSchema = z.object({
  uomGroupId: z.string().uuid("Invalid UOM Group ID"),
  code: z.string().min(1, "UOM Code is required").max(15),
  name: z.string().min(1, "UOM Name is required").max(50),
  isBase: z.boolean().default(true),
  baseUnitId: z.string().uuid("Invalid base UOM ID").nullable().optional(),
  conversionFactor: z.number().positive("Conversion factor must be positive").default(1.0)
});

export const updateUomSchema = createUomSchema.partial();

export const createCompanySchema = z.object({
  name: z.string().min(1, "Manufacturer name is required").max(100),
  manufacturerLicense: z.string().max(100).nullable().optional()
});

export const updateCompanySchema = createCompanySchema.partial();

export const createBrandSchema = z.object({
  companyId: z.string().uuid("Invalid Company ID").nullable().optional(),
  name: z.string().min(1, "Brand name is required").max(100)
});

export const updateBrandSchema = createBrandSchema.partial();

export const createCategorySchema = z.object({
  parentId: z.string().uuid("Invalid Parent ID").nullable().optional(),
  name: z.string().min(1, "Category name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(120),
  sortOrder: z.number().int().default(0)
});

export const updateCategorySchema = createCategorySchema.partial();

// Category attribute properties schema validation
export const attributePropertySchema = z.object({
  display_name: z.string().min(1, "display_name is required"),
  field_type: z.enum(["string", "number", "boolean", "select", "date"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  default_value: z.any().optional(),
  validation: z.string().optional(),
  regex: z.string().optional(),
  options: z.array(z.string()).optional(),
  searchable: z.boolean().default(false),
  filterable: z.boolean().default(false),
  sort_order: z.number().int().default(0)
});

export const categoryTemplateSchema = z.object({
  properties: z.record(attributePropertySchema)
});

export const createTaxCategorySchema = z.object({
  name: z.string().min(1, "Tax category name is required").max(50)
});

export const createGstRateSchema = z.object({
  taxCategoryId: z.string().uuid("Invalid Tax Category ID"),
  rate: z.number().min(0, "GST rate must be positive"),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional()
});

export const createHsnSchema = z.object({
  hsnCode: z.string().regex(/^\d{2,10}$/, "HSN code must be 2 to 10 numeric digits"),
  gstRateId: z.string().uuid("Invalid GST Rate ID").nullable().optional(),
  description: z.string().max(500).optional()
});

export const createFinancialYearSchema = z.object({
  name: z.string().regex(/^FY\d{2}-\d{2}$/, "Name must match format FYYY-YY (e.g. FY26-27)"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  isActive: z.boolean().default(false)
});

export const createNumberingSeriesSchema = z.object({
  documentType: z.enum(["invoice", "purchase_order", "grn", "sales_return", "purchase_return"]),
  prefix: z.string().min(1, "Prefix is required").max(10),
  suffix: z.string().max(10).nullable().optional(),
  nextNumber: z.number().int().positive().default(1),
  paddingZeroes: z.number().int().min(1).max(10).default(5),
  fiscalYear: z.string().min(1, "Fiscal Year is required"),
  resetPolicy: z.enum(["never", "yearly", "monthly"]).default("never"),
  branchId: z.string().uuid().nullable().optional(),
  warehouseId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().default(true)
});

export const updatePreferencesSchema = z.object({
  currencyCode: z.string().length(3).default("INR"),
  currencySymbol: z.string().max(5).default("₹"),
  timezone: z.string().min(1).default("Asia/Kolkata"),
  billingPreferences: z.record(z.any()).optional(),
  inventoryPreferences: z.record(z.any()).optional()
});

export const createWarehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required").max(100),
  warehouseType: z.string().default("general"),
  address: z.string().max(500).nullable().optional(),
  contactPhone: z.string().max(20).nullable().optional(),
  isMainHub: z.boolean().default(false)
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

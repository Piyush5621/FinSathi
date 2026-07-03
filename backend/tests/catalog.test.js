import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { ProductService } from "../src/modules/catalog/services/ProductService.js";
import { CategoryService } from "../src/modules/masters/services/CategoryService.js";
import { ProductRepository } from "../src/modules/catalog/repositories/ProductRepository.js";
import { VariantRepository } from "../src/modules/catalog/repositories/VariantRepository.js";
import { BarcodeRepository } from "../src/modules/catalog/repositories/BarcodeRepository.js";
import { CategoryRepository } from "../src/modules/masters/repositories/CategoryRepository.js";
import { PreferenceRepository } from "../src/modules/masters/repositories/PreferenceRepository.js";
import { BaseRepository } from "../src/modules/masters/repositories/BaseRepository.js";
import { ProductDto, VariantDto } from "../src/modules/catalog/dto/catalogDto.js";
import { ValidationError, ConflictError, NotFoundError } from "../src/modules/masters/errors/appErrors.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";

// Mock Database Memory Arrays
let mockProducts = [];
let mockVariants = [];
let mockBarcodes = [];
let mockMedia = [];
let mockSpecs = [];
let mockBundles = [];
let mockCategories = [];
let mockTemplates = [];
let mockSkuRegistry = [];

describe("Product Catalog Module Unit & Integration Tests", () => {
  before(() => {
    // 1. Mock BaseRepository CRUD
    BaseRepository.findById = async (table, id, organizationId) => {
      if (table === "inventory") {
        return mockProducts.find(p => p.id === id && p.organization_id === organizationId && !p.deleted_at) || null;
      }
      if (table === "product_variants") {
        return mockVariants.find(v => v.id === id && v.organization_id === organizationId && !v.deleted_at) || null;
      }
      return null;
    };

    BaseRepository.create = async (table, data) => {
      const record = { id: `${table}-id-${Math.random()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
      if (table === "inventory") mockProducts.push(record);
      else if (table === "product_variants") mockVariants.push(record);
      else if (table === "product_barcodes") mockBarcodes.push(record);
      else if (table === "product_media") mockMedia.push(record);
      return record;
    };

    BaseRepository.update = async (table, id, organizationId, updates) => {
      let list = [];
      if (table === "inventory") list = mockProducts;
      else if (table === "product_variants") list = mockVariants;

      const idx = list.findIndex(r => r.id === id && r.organization_id === organizationId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
        return list[idx];
      }
      return null;
    };

    BaseRepository.restore = async (table, id, organizationId) => {
      let list = [];
      if (table === "inventory") list = mockProducts;
      else if (table === "product_variants") list = mockVariants;

      const idx = list.findIndex(r => r.id === id && r.organization_id === organizationId);
      if (idx !== -1) {
        list[idx].deleted_at = null;
        list[idx].deleted_by = null;
        return list[idx];
      }
      return null;
    };

    // 2. Mock ProductRepository custom methods
    ProductRepository.findBySku = async (sku, organizationId) => {
      return mockProducts.find(p => p.sku === sku && p.organization_id === organizationId && !p.deleted_at) || null;
    };

    ProductRepository.findByBarcode = async (barcode, organizationId) => {
      const bc = mockBarcodes.find(b => b.barcode_value === barcode && b.organization_id === organizationId && !b.deleted_at);
      if (!bc) return null;
      const product = mockProducts.find(p => p.id === bc.product_id && !p.deleted_at);
      return { product, variantId: bc.variant_id };
    };

    ProductRepository.findSpecifications = async (productId, organizationId) => {
      return mockSpecs.find(s => s.product_id === productId && s.organization_id === organizationId) || null;
    };

    ProductRepository.saveSpecifications = async (productId, organizationId, specifications, actorUserId) => {
      const idx = mockSpecs.findIndex(s => s.product_id === productId);
      const record = { product_id: productId, organization_id: organizationId, attributes: specifications, updated_at: new Date().toISOString() };
      if (idx !== -1) {
        mockSpecs[idx] = record;
      } else {
        mockSpecs.push(record);
      }
      return record;
    };

    ProductRepository.findBundleComponents = async (parentProductId, organizationId) => {
      return mockBundles.filter(b => b.parent_product_id === parentProductId && b.organization_id === organizationId);
    };

    ProductRepository.saveBundleComponents = async (parentProductId, organizationId, components) => {
      mockBundles = mockBundles.filter(b => b.parent_product_id !== parentProductId);
      const rows = components.map(c => ({
        parent_product_id: parentProductId,
        component_product_id: c.componentProductId,
        quantity: c.quantity,
        organization_id: organizationId
      }));
      mockBundles.push(...rows);
      return rows;
    };

    // 3. Mock VariantRepository custom methods
    VariantRepository.findBySku = async (sku, organizationId) => {
      return mockVariants.find(v => v.sku === sku && v.organization_id === organizationId && !v.deleted_at) || null;
    };

    VariantRepository.findProductVariants = async (productId, organizationId) => {
      return mockVariants.filter(v => v.product_id === productId && v.organization_id === organizationId && !v.deleted_at);
    };

    // 4. Mock BarcodeRepository custom methods
    BarcodeRepository.findByBarcodeValue = async (barcodeValue, organizationId) => {
      return mockBarcodes.find(b => b.barcode_value === barcodeValue && b.organization_id === organizationId && !b.deleted_at) || null;
    };

    BarcodeRepository.findProductBarcodes = async (productId, organizationId) => {
      return mockBarcodes.filter(b => b.product_id === productId && b.organization_id === organizationId && !b.deleted_at);
    };

    // 5. Mock CategoryRepository custom methods
    CategoryRepository.findCategoryTemplate = async (categoryId, organizationId) => {
      return mockTemplates.find(t => t.category_id === categoryId && t.organization_id === organizationId) || null;
    };

    // 6. Mock adminSupabase for SkuRegistry lookup and inserts
    adminSupabase.from = (table) => {
      return {
        select: (selectStr, options) => {
          let list = [];
          if (table === "sku_registry") list = mockSkuRegistry;
          else if (table === "categories") list = mockCategories;
          else if (table === "brands") list = [];
          else if (table === "product_media") list = mockMedia;

          const queryHelper = {
            eq: (field, val) => {
              list = list.filter(r => r[field] === val);
              return queryHelper;
            },
            is: (field, val) => {
              if (val === null) {
                list = list.filter(r => r[field] === null || r[field] === undefined);
              } else {
                list = list.filter(r => r[field] === val);
              }
              return queryHelper;
            },
            or: (expression) => {
              return queryHelper;
            },
            range: () => queryHelper,
            order: () => queryHelper,
            maybeSingle: async () => ({ data: list[0] || null, error: null }),
            single: async () => {
              if (list.length === 0) return { data: null, error: new Error("Not found") };
              return { data: list[0], error: null };
            },
            then: (resolve) => resolve({ data: list, error: null })
          };
          return queryHelper;
        },
        insert: (data) => {
          const arr = Array.isArray(data) ? data : [data];
          const records = arr.map(d => {
            const record = { id: `${table}-id-${Math.random()}`, created_at: new Date().toISOString(), ...d };
            if (table === "sku_registry") mockSkuRegistry.push(record);
            if (table === "product_barcodes") mockBarcodes.push(record);
            if (table === "product_media") mockMedia.push(record);
            return record;
          });
          const returnRecord = Array.isArray(data) ? records : records[0];
          return {
            select: () => ({
              single: async () => returnRecord,
              maybeSingle: async () => ({ data: returnRecord, error: null }),
              then: (resolve) => resolve({ data: records, error: null })
            })
          };
        }
      };
    };
  });

  beforeEach(() => {
    mockProducts = [];
    mockVariants = [];
    mockBarcodes = [];
    mockMedia = [];
    mockSpecs = [];
    mockBundles = [];
    mockCategories = [];
    mockTemplates = [];
    mockSkuRegistry = [];
  });

  test("1. SKU Engine - Configurable Generation and Duplicate Block", async () => {
    const orgId = "org-1";

    // Setup Category mock
    mockCategories.push({ id: "cat-1", name: "Groceries", slug: "groceries" });

    // 1. Auto generate SKU
    const product = await ProductService.createProduct(orgId, {
      name: "Maggie Noodles Masala",
      categoryId: "cat-1",
      sellingUomId: "uom-1",
      price: 15.00
    }, "user-1");

    assert.ok(product.sku.startsWith("FS-GRO-"));

    // 2. Override SKU with duplicate check
    await assert.rejects(
      async () => ProductService.createProduct(orgId, {
        name: "Maggie Masala 2",
        sku: product.sku,
        sellingUomId: "uom-1"
      }, "user-1"),
      ConflictError
    );
  });

  test("2. Barcode Engine - Multiple Barcodes Scanning Lookup", async () => {
    const orgId = "org-1";

    const product = await ProductService.createProduct(orgId, {
      name: "Lays Chips Classic",
      sellingUomId: "uom-1",
      barcodes: [
        { value: "8901491101851", type: "EAN-13", isPrimary: true },
        { value: "1111222233334", type: "Code128", isPrimary: false }
      ]
    }, "user-1");

    // 1. Scan primary barcode
    const match1 = await ProductService.search(orgId, { barcode: "8901491101851" });
    assert.equal(match1.data.length, 1);
    assert.equal(match1.data[0].name, "Lays Chips Classic");

    // 2. Scan alternate barcode
    const match2 = await ProductService.search(orgId, { barcode: "1111222233334" });
    assert.equal(match2.data.length, 1);
    assert.equal(match2.data[0].id, product.id);

    // 3. Uniqueness check
    await assert.rejects(
      async () => ProductService.createProduct(orgId, {
        name: "Lays Tomato",
        sellingUomId: "uom-1",
        barcodes: [{ value: "8901491101851" }]
      }, "user-1"),
      ConflictError
    );
  });

  test("3. Variant Price and Spec Inheritance Fallbacks", async () => {
    const orgId = "org-1";

    // Setup Parent Product
    const parent = await ProductService.createProduct(orgId, {
      name: "Levis Jeans 501",
      sellingUomId: "uom-1",
      sellingPrice: 1999.00,
      costPrice: 800.00
    }, "user-1");

    // Create Variant 1: Overrides Selling Price
    const var1 = await ProductService.createVariant(parent.id, orgId, {
      name: "Levis Jeans 501 - Blue - 32",
      sellingPrice: 2199.00,
      attributes: { color: "Blue", size: "32" }
    }, "user-1");

    // Create Variant 2: Inherits Selling Price
    const var2 = await ProductService.createVariant(parent.id, orgId, {
      name: "Levis Jeans 501 - Black - 30",
      attributes: { color: "Black", size: "30" }
    }, "user-1");

    // Verify DTO Serialization and Fallback Inheritance
    const dto1 = new VariantDto(var1, parent);
    const dto2 = new VariantDto(var2, parent);

    assert.equal(dto1.sellingPrice, 2199.00); // overridden
    assert.equal(dto2.sellingPrice, 1999.00); // inherited from parent
    assert.equal(dto2.purchasePrice, 800.00); // inherited cost price
  });

  test("4. Dynamic Specifications Category Validations", async () => {
    const orgId = "org-1";

    // Setup Category with constraints
    mockCategories.push({ id: "cat-1", name: "Pharmacy", slug: "pharmacy" });
    mockTemplates.push({
      category_id: "cat-1",
      organization_id: orgId,
      attribute_schema: {
        properties: {
          drug_schedule: { display_name: "Schedule", field_type: "select", options: ["H", "H1"], required: true }
        }
      }
    });

    // 1. Valid Specifications
    const product = await ProductService.createProduct(orgId, {
      name: "Cough Syrup",
      categoryId: "cat-1",
      sellingUomId: "uom-1",
      specifications: { drug_schedule: "H" }
    }, "user-1");
    assert.ok(product);

    // 2. Mismatching value type
    await assert.rejects(
      async () => ProductService.createProduct(orgId, {
        name: "Cough Syrup 2",
        categoryId: "cat-1",
        sellingUomId: "uom-1",
        specifications: { drug_schedule: "Z" }
      }, "user-1"),
      ValidationError
    );
  });
});

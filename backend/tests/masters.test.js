import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { UomService } from "../src/modules/masters/services/UomService.js";
import { CategoryService } from "../src/modules/masters/services/CategoryService.js";
import { WarehouseService } from "../src/modules/masters/services/WarehouseService.js";
import { SettingService } from "../src/modules/masters/services/SettingService.js";
import { BaseMasterService } from "../src/modules/masters/services/BaseMasterService.js";
import { UomRepository } from "../src/modules/masters/repositories/UomRepository.js";
import { CategoryRepository } from "../src/modules/masters/repositories/CategoryRepository.js";
import { WarehouseRepository } from "../src/modules/masters/repositories/WarehouseRepository.js";
import { BrandRepository } from "../src/modules/masters/repositories/BrandRepository.js";
import { CompanyRepository } from "../src/modules/masters/repositories/CompanyRepository.js";
import { TaxRepository } from "../src/modules/masters/repositories/TaxRepository.js";
import { NumberingRepository } from "../src/modules/masters/repositories/NumberingRepository.js";
import { PreferenceRepository } from "../src/modules/masters/repositories/PreferenceRepository.js";
import { BaseRepository } from "../src/modules/masters/repositories/BaseRepository.js";
import { ValidationError, ConflictError, NotFoundError } from "../src/modules/masters/errors/appErrors.js";

// Mock Database Memory Arrays
let mockUomGroups = [];
let mockUoms = [];
let mockCompanies = [];
let mockBrands = [];
let mockCategories = [];
let mockTemplates = [];
let mockTaxCategories = [];
let mockGstRates = [];
let mockHsn = [];
let mockFys = [];
let mockSeries = [];
let mockPrefs = [];
let mockWarehouses = [];

describe("Master Data Module Unit & Integration Tests", () => {
  before(() => {
    // 1. Mock BaseRepository CRUD
    BaseRepository.find = async (table, { organizationId, filters }) => {
      let list = [];
      if (table === "uom_groups") list = mockUomGroups;
      else if (table === "units_of_measure") list = mockUoms;
      else if (table === "companies") list = mockCompanies;
      else if (table === "brands") list = mockBrands;
      else if (table === "categories") list = mockCategories;
      else if (table === "tax_categories") list = mockTaxCategories;
      else if (table === "gst_rates") list = mockGstRates;
      else if (table === "hsn_masters") list = mockHsn;
      else if (table === "financial_years") list = mockFys;
      else if (table === "numbering_series") list = mockSeries;
      else if (table === "warehouses") list = mockWarehouses;

      // Filter by org and soft-delete
      let result = list.filter(r => r.organization_id === organizationId);
      if (!filters?.includeDeleted) {
        result = result.filter(r => !r.deleted_at);
      }
      return { data: result, count: result.length };
    };

    BaseRepository.findById = async (table, id, organizationId) => {
      let list = [];
      if (table === "uom_groups") list = mockUomGroups;
      else if (table === "units_of_measure") list = mockUoms;
      else if (table === "companies") list = mockCompanies;
      else if (table === "brands") list = mockBrands;
      else if (table === "categories") list = mockCategories;
      else if (table === "tax_categories") list = mockTaxCategories;
      else if (table === "gst_rates") list = mockGstRates;
      else if (table === "hsn_masters") list = mockHsn;
      else if (table === "financial_years") list = mockFys;
      else if (table === "numbering_series") list = mockSeries;
      else if (table === "warehouses") list = mockWarehouses;

      return list.find(r => r.id === id && r.organization_id === organizationId && !r.deleted_at) || null;
    };

    BaseRepository.create = async (table, data) => {
      const record = { id: `${table}-id-${Math.random()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
      if (table === "uom_groups") mockUomGroups.push(record);
      else if (table === "units_of_measure") mockUoms.push(record);
      else if (table === "companies") mockCompanies.push(record);
      else if (table === "brands") mockBrands.push(record);
      else if (table === "categories") mockCategories.push(record);
      else if (table === "tax_categories") mockTaxCategories.push(record);
      else if (table === "gst_rates") mockGstRates.push(record);
      else if (table === "hsn_masters") mockHsn.push(record);
      else if (table === "financial_years") mockFys.push(record);
      else if (table === "numbering_series") mockSeries.push(record);
      else if (table === "warehouses") mockWarehouses.push(record);
      return record;
    };

    BaseRepository.update = async (table, id, organizationId, updates) => {
      let list = [];
      if (table === "uom_groups") list = mockUomGroups;
      else if (table === "units_of_measure") list = mockUoms;
      else if (table === "companies") list = mockCompanies;
      else if (table === "brands") list = mockBrands;
      else if (table === "categories") list = mockCategories;
      else if (table === "tax_categories") list = mockTaxCategories;
      else if (table === "gst_rates") list = mockGstRates;
      else if (table === "hsn_masters") list = mockHsn;
      else if (table === "financial_years") list = mockFys;
      else if (table === "numbering_series") list = mockSeries;
      else if (table === "warehouses") list = mockWarehouses;

      const idx = list.findIndex(r => r.id === id && r.organization_id === organizationId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
        return list[idx];
      }
      return null;
    };

    BaseRepository.softDelete = async (table, id, organizationId, deletedBy) => {
      return BaseRepository.update(table, id, organizationId, {
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy
      });
    };

    BaseRepository.restore = async (table, id, organizationId) => {
      return BaseRepository.update(table, id, organizationId, {
        deleted_at: null,
        deleted_by: null
      });
    };

    // 2. Mock UomRepository custom methods
    UomRepository.findGroupByCodeOrName = async (name, organizationId) => {
      return mockUomGroups.find(g => g.name === name && g.organization_id === organizationId && !g.deleted_at) || null;
    };
    UomRepository.findUomByCode = async (code, organizationId) => {
      return mockUoms.find(u => u.code === code && u.organization_id === organizationId && !u.deleted_at) || null;
    };

    // 3. Mock CategoryRepository custom methods
    CategoryRepository.findCategoryBySlug = async (slug, organizationId) => {
      return mockCategories.find(c => c.slug === slug && c.organization_id === organizationId && !c.deleted_at) || null;
    };
    CategoryRepository.findCategoryTemplate = async (categoryId, organizationId) => {
      return mockTemplates.find(t => t.category_id === categoryId && t.organization_id === organizationId) || null;
    };
    CategoryRepository.upsertCategoryTemplate = async (categoryId, organizationId, schema, actorUserId) => {
      const record = { category_id: categoryId, organization_id: organizationId, attribute_schema: schema, updated_at: new Date().toISOString() };
      const idx = mockTemplates.findIndex(t => t.category_id === categoryId);
      if (idx !== -1) {
        mockTemplates[idx] = record;
      } else {
        mockTemplates.push(record);
      }
      return record;
    };

    // 4. Mock WarehouseRepository custom methods
    WarehouseRepository.findByName = async (name, organizationId) => {
      return mockWarehouses.find(w => w.name === name && w.organization_id === organizationId && !w.deleted_at) || null;
    };
    WarehouseRepository.clearMainHubStatus = async (organizationId) => {
      mockWarehouses = mockWarehouses.map(w => w.organization_id === organizationId ? { ...w, is_main_hub: false } : w);
    };

    // 5. Mock TaxRepository custom methods
    TaxRepository.findTaxCategoryByName = async (name, organizationId) => {
      return mockTaxCategories.find(tc => tc.name === name && tc.organization_id === organizationId && !tc.deleted_at) || null;
    };
    TaxRepository.findGstRateByTaxCategoryAndRate = async (taxCategoryId, rate, organizationId) => {
      return mockGstRates.find(r => r.tax_category_id === taxCategoryId && Number(r.rate) === Number(rate) && r.organization_id === organizationId && !r.deleted_at) || null;
    };
    TaxRepository.findHsnByCode = async (hsnCode, organizationId) => {
      return mockHsn.find(h => h.hsn_code === hsnCode && h.organization_id === organizationId && !h.deleted_at) || null;
    };

    // 6. Mock NumberingRepository custom methods
    NumberingRepository.findSeries = async (documentType, fiscalYear, prefix, organizationId) => {
      return mockSeries.find(s => s.document_type === documentType && s.fiscal_year === fiscalYear && s.prefix === prefix && s.organization_id === organizationId && !s.deleted_at) || null;
    };
    NumberingRepository.findActiveSeriesForDoc = async (documentType, fiscalYear, organizationId) => {
      return mockSeries.find(s => s.document_type === documentType && s.fiscal_year === fiscalYear && s.organization_id === organizationId && s.is_active && !s.deleted_at) || null;
    };
    NumberingRepository.incrementSeries = async (id, nextNumber) => {
      const idx = mockSeries.findIndex(s => s.id === id);
      if (idx !== -1) {
        mockSeries[idx].next_number = nextNumber;
        return mockSeries[idx];
      }
      return null;
    };

    // 7. Mock PreferenceRepository custom methods
    PreferenceRepository.findPreferences = async (organizationId) => {
      return mockPrefs.find(p => p.organization_id === organizationId) || null;
    };
    PreferenceRepository.upsertPreferences = async (organizationId, prefData) => {
      const idx = mockPrefs.findIndex(p => p.organization_id === organizationId);
      const record = { organization_id: organizationId, ...prefData, updated_at: new Date().toISOString() };
      if (idx !== -1) {
        mockPrefs[idx] = record;
      } else {
        mockPrefs.push(record);
      }
      return record;
    };
    PreferenceRepository.findFinancialYearByName = async (name, organizationId) => {
      return mockFys.find(fy => fy.name === name && fy.organization_id === organizationId && !fy.deleted_at) || null;
    };
    PreferenceRepository.findActiveFinancialYear = async (organizationId) => {
      return mockFys.find(fy => fy.organization_id === organizationId && fy.is_active && !fy.deleted_at) || null;
    };
    PreferenceRepository.deactivateAllFinancialYears = async (organizationId) => {
      mockFys = mockFys.map(fy => fy.organization_id === organizationId ? { ...fy, is_active: false } : fy);
    };
  });

  beforeEach(() => {
    mockUomGroups = [];
    mockUoms = [];
    mockCompanies = [];
    mockBrands = [];
    mockCategories = [];
    mockTemplates = [];
    mockTaxCategories = [];
    mockGstRates = [];
    mockHsn = [];
    mockFys = [];
    mockSeries = [];
    mockPrefs = [];
    mockWarehouses = [];
  });

  test("1. UOM Engine - Group-scoped conversions and validation", async () => {
    const orgId = "org-1";

    // Create UOM Groups
    const wtGroup = await UomService.createGroup(orgId, { name: "Weight" });
    const qtyGroup = await UomService.createGroup(orgId, { name: "Quantity" });

    // Create UOM units in Weight Group
    const kg = await UomService.createUnit(orgId, {
      uomGroupId: wtGroup.id,
      code: "KG",
      name: "Kilogram",
      isBase: true
    });
    const gm = await UomService.createUnit(orgId, {
      uomGroupId: wtGroup.id,
      code: "GM",
      name: "Gram",
      isBase: false,
      baseUnitId: kg.id,
      conversionFactor: 0.001
    });

    // Create UOM units in Quantity Group
    const pcs = await UomService.createUnit(orgId, {
      uomGroupId: qtyGroup.id,
      code: "PCS",
      name: "Pieces",
      isBase: true
    });
    const box = await UomService.createUnit(orgId, {
      uomGroupId: qtyGroup.id,
      code: "BOX",
      name: "Box of 10",
      isBase: false,
      baseUnitId: pcs.id,
      conversionFactor: 10.0
    });

    // 1. Convert within Weight Group: 2 KG to GM
    const conv1 = await UomService.convert(orgId, {
      fromCode: "KG",
      toCode: "GM",
      quantity: 2
    });
    assert.equal(conv1.outputQuantity, 2000);

    // 2. Convert within Quantity Group: 5 BOX to PCS
    const conv2 = await UomService.convert(orgId, {
      fromCode: "BOX",
      toCode: "PCS",
      quantity: 5
    });
    assert.equal(conv2.outputQuantity, 50);

    // 3. Attempt invalid cross-group conversion (KG to PCS)
    await assert.rejects(
      async () => UomService.convert(orgId, { fromCode: "KG", toCode: "PCS", quantity: 5 }),
      ValidationError
    );
  });

  test("2. Category Engine - Materialized Path & Depth Calculation", async () => {
    const orgId = "org-1";

    // Root Category
    const root = await CategoryService.createCategory(orgId, {
      name: "Electronics",
      slug: "electronics"
    });
    assert.equal(root.depth, 0);
    assert.equal(root.materialized_path, "/electronics/");

    // Child Category
    const child = await CategoryService.createCategory(orgId, {
      parentId: root.id,
      name: "Computers",
      slug: "computers"
    });
    assert.equal(child.depth, 1);
    assert.equal(child.materialized_path, "/electronics/computers/");
  });

  test("3. Dynamic Category Attributes Schema Validation", async () => {
    const orgId = "org-1";
    const cat = await CategoryService.createCategory(orgId, { name: "Medical", slug: "medical" });

    // Set Attribute template validation schema
    const schema = {
      properties: {
        salt_composition: { display_name: "Salt Composition", field_type: "string", required: true },
        drug_schedule: { display_name: "Schedule", field_type: "select", options: ["H", "X"], required: false }
      }
    };

    await CategoryService.setAttributeTemplate(cat.id, orgId, schema, "user-1");

    // 1. Valid attributes
    const validAttrs = { salt_composition: "Paracetamol 500mg", drug_schedule: "H" };
    const isValid = await CategoryService.validateAttributes(cat.id, orgId, validAttrs);
    assert.equal(isValid, true);

    // 2. Missing required attribute
    const invalidAttrs1 = { drug_schedule: "H" };
    await assert.rejects(
      async () => CategoryService.validateAttributes(cat.id, orgId, invalidAttrs1),
      ValidationError
    );

    // 3. Invalid select options value
    const invalidAttrs2 = { salt_composition: "Ibuprofen", drug_schedule: "Z" };
    await assert.rejects(
      async () => CategoryService.validateAttributes(cat.id, orgId, invalidAttrs2),
      ValidationError
    );
  });

  test("4. Numbering Series Generation", async () => {
    const orgId = "org-1";

    // Setup active fiscal year
    const fy = await SettingService.createFinancialYear(orgId, {
      name: "FY26-27",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
      isActive: true
    });

    // Create numbering series configuration
    await SettingService.createNumberingSeries(orgId, {
      documentType: "invoice",
      prefix: "INV-",
      suffix: "-FY26",
      nextNumber: 1,
      paddingZeroes: 4,
      fiscalYear: "FY26-27"
    });

    // Generate first invoice number
    const num1 = await SettingService.generateNextNumber("invoice", orgId);
    assert.equal(num1, "INV-0001-FY26");

    // Next number increments
    const num2 = await SettingService.generateNextNumber("invoice", orgId);
    assert.equal(num2, "INV-0002-FY26");
  });

  test("5. Warehouse Main Hub Locking", async () => {
    const orgId = "org-1";

    // Create Warehouse 1 as main hub
    const wh1 = await WarehouseService.createWarehouse(orgId, {
      name: "Central Warehouse",
      isMainHub: true
    });
    assert.equal(wh1.is_main_hub, true);

    // Create Warehouse 2 as main hub (must clear Warehouse 1 status)
    const wh2 = await WarehouseService.createWarehouse(orgId, {
      name: "Secondary Warehouse",
      isMainHub: true
    });
    
    assert.equal(wh2.is_main_hub, true);
    
    // Fetch warehouse 1 again to verify isMainHub is false
    const wh1Fetched = await WarehouseRepository.findById("warehouses", wh1.id, orgId);
    assert.equal(wh1Fetched.is_main_hub, false);
  });

  test("6. Tenant Isolation", async () => {
    const org1 = "org-1";
    const org2 = "org-2";

    // Create UOM Group in org1
    await UomService.createGroup(org1, { name: "Weight" });

    // Try finding UOM group from org2
    const { data: dataOrg2 } = await BaseMasterService.find("uom_groups", org2);
    assert.equal(dataOrg2.length, 0);

    // Find from org1
    const { data: dataOrg1 } = await BaseMasterService.find("uom_groups", org1);
    assert.equal(dataOrg1.length, 1);
  });

  test("7. Soft Delete and Restore Cycle", async () => {
    const orgId = "org-1";
    const cat = await CategoryService.createCategory(orgId, { name: "Food", slug: "food" });

    // Verify exists
    const beforeDel = await BaseMasterService.findById("categories", cat.id, orgId);
    assert.ok(beforeDel);

    // Soft delete
    await BaseMasterService.softDelete("categories", cat.id, orgId, "user-1");

    // Fetching by id normally should fail (throws NotFound)
    await assert.rejects(
      async () => BaseMasterService.findById("categories", cat.id, orgId),
      NotFoundError
    );

    // Restore
    await BaseMasterService.restore("categories", cat.id, orgId);

    // Fetching succeeds
    const restored = await BaseMasterService.findById("categories", cat.id, orgId);
    assert.equal(restored.deleted_at, null);
  });
});

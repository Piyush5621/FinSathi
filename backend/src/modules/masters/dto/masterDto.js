export class UomGroupDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.name = record.name;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class UomDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.uomGroupId = record.uom_group_id;
    this.code = record.code;
    this.name = record.name;
    this.isBase = record.is_base;
    this.baseUnitId = record.base_unit_id;
    this.conversionFactor = Number(record.conversion_factor);
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class CompanyDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.name = record.name;
    this.manufacturerLicense = record.manufacturer_license;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class BrandDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.companyId = record.company_id;
    this.name = record.name;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class CategoryDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.parentId = record.parent_id;
    this.name = record.name;
    this.slug = record.slug;
    this.materializedPath = record.materialized_path;
    this.depth = record.depth;
    this.sortOrder = record.sort_order;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class TaxCategoryDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.name = record.name;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class GstRateDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.taxCategoryId = record.tax_category_id;
    this.rate = Number(record.rate);
    this.effectiveFrom = record.effective_from;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class HsnDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.hsnCode = record.hsn_code;
    this.gstRateId = record.gst_rate_id;
    this.description = record.description;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
    if (record.gst_rates) {
      this.gstRate = new GstRateDto(record.gst_rates);
    }
  }
}

export class FinancialYearDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.name = record.name;
    this.startDate = record.start_date;
    this.endDate = record.end_date;
    this.isActive = record.is_active;
    this.isClosed = record.is_closed;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class NumberingSeriesDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.documentType = record.document_type;
    this.prefix = record.prefix;
    this.suffix = record.suffix;
    this.nextNumber = record.next_number;
    this.paddingZeroes = record.padding_zeroes;
    this.fiscalYear = record.fiscal_year;
    this.resetPolicy = record.reset_policy;
    this.branchId = record.branch_id;
    this.warehouseId = record.warehouse_id;
    this.isActive = record.is_active;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class PreferencesDto {
  constructor(record) {
    this.organizationId = record.organization_id;
    this.currencyCode = record.currency_code;
    this.currencySymbol = record.currency_symbol;
    this.timezone = record.timezone;
    this.billingPreferences = record.billing_preferences;
    this.inventoryPreferences = record.inventory_preferences;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

export class WarehouseDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.name = record.name;
    this.warehouseType = record.warehouse_type;
    this.address = record.address;
    this.contactPhone = record.contact_phone;
    this.isMainHub = record.is_main_hub;
    this.createdAt = record.created_at;
    this.updatedAt = record.updated_at;
  }
}

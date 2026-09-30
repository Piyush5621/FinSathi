export class ProductDto {
  constructor(record) {
    this.id = record.id;
    this.organizationId = record.organization_id;
    this.name = record.name;
    this.shortName = record.short_name;
    this.description = record.description;
    this.sku = record.sku;
    this.productType = record.product_type;
    this.trackingType = record.tracking_type;
    this.valuationMethod = record.valuation_method;
    this.status = record.status;
    this.lifecycleState = record.lifecycle_state;
    this.categoryId = record.category_id;
    this.brandId = record.brand_id;
    this.companyId = record.company_id; // manufacturer
    this.sellingUomId = record.selling_uom_id;
    this.purchaseUomId = record.purchase_uom_id;
    this.gstRateId = record.gst_rate_id;
    this.hsnCodeId = record.hsn_code_id;
    this.mrp = Number(record.mrp || 0);
    this.sellingPrice = Number(record.selling_price || record.price || 0);
    this.price = this.sellingPrice;
    this.costPrice = Number(record.cost_price || 0);
    this.cost_price = this.costPrice;
    this.stock = Number(record.stock !== undefined ? record.stock : (record.inventory_stock || 0));
    this.units = record.units || 'pcs';
    this.unit = this.units;
    this.company = record.company || '';
    this.category = record.category || record.company || 'General';
    this.gst_percent = Number(record.gst_percent || 0);
    this.store_id = record.store_id || null;
    this.dimensions = record.dimensions;
    this.weight = record.weight ? Number(record.weight) : null;
    this.specifications = record.specifications || {};
    this.barcodes = record.barcodes ? record.barcodes.map(b => new BarcodeDto(b)) : [];
    this.media = record.media ? record.media.map(m => new MediaDto(m)) : [];
    this.components = record.components ? record.components.map(c => new BundleComponentDto(c)) : [];
    this.variants = record.variants ? record.variants.map(v => new VariantDto(v, record)) : [];
    this.inventory_batches = record.inventory_batches || [];
  }
}

export class VariantDto {
  constructor(record, parentProduct = {}) {
    this.id = record.id;
    this.productId = record.product_id;
    this.organizationId = record.organization_id;
    this.name = record.name;
    this.sku = record.sku;
    this.attributes = record.attributes || {};
    
    // --- Variant Inheritance Logic ---
    this.sellingPrice = record.selling_price !== null && record.selling_price !== undefined
      ? Number(record.selling_price)
      : Number(parentProduct.selling_price || 0.00);
    this.price = this.sellingPrice;

    this.purchasePrice = record.purchase_price !== null && record.purchase_price !== undefined
      ? Number(record.purchase_price)
      : Number(parentProduct.cost_price || 0.0000);
    this.cost_price = this.purchasePrice;

    this.stock = Number(record.stock || 0);

    this.gstRateId = record.gst_rate_id || parentProduct.gst_rate_id || null;
    this.hsnCodeId = record.hsn_code_id || parentProduct.hsn_code_id || null;
    this.brandId = record.brand_id || parentProduct.brand_id || null;
    this.companyId = record.company_id || parentProduct.company_id || null;
    this.dimensions = record.dimensions || parentProduct.dimensions || null;
    this.weight = record.weight !== null && record.weight !== undefined
      ? Number(record.weight)
      : (parentProduct.weight ? Number(parentProduct.weight) : null);
  }
}

export class BarcodeDto {
  constructor(record) {
    this.id = record.id;
    this.productId = record.product_id;
    this.variantId = record.variant_id;
    this.barcodeType = record.barcode_type;
    this.barcodeValue = record.barcode_value;
    this.isPrimary = record.is_primary;
    this.status = record.status;
    this.generatedManually = record.generated_manually;
  }
}

export class MediaDto {
  constructor(record) {
    this.id = record.id;
    this.productId = record.product_id;
    this.mediaType = record.media_type;
    this.url = record.url;
    this.name = record.name;
    this.sortOrder = record.sort_order;
    this.isPrimary = record.is_primary;
  }
}

export class BundleComponentDto {
  constructor(record) {
    this.parentProductId = record.parent_product_id;
    this.componentProductId = record.component_product_id;
    this.quantity = Number(record.quantity);
    if (record.component) {
      this.name = record.component.name;
      this.sku = record.component.sku;
    }
  }
}

import { ProductRepository } from "../repositories/ProductRepository.js";
import { VariantRepository } from "../repositories/VariantRepository.js";
import { BarcodeRepository } from "../repositories/BarcodeRepository.js";
import { CategoryService } from "../../masters/services/CategoryService.js";
import { SkuGenerator } from "../validators/skuGenerator.js";
import { ValidationError, ConflictError, NotFoundError } from "../../masters/errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

const publisher = initEventPublisher();

export class ProductService {
  static async createProduct(organizationId, data, actorUserId) {
    // 1. Validate category attributes
    if (data.categoryId && data.specifications) {
      await CategoryService.validateAttributes(data.categoryId, organizationId, data.specifications);
    }

    // 2. Fetch category and brand names for SKU generator
    let catName = "GEN";
    let brandName = "FS";
    
    if (data.categoryId) {
      const cat = await adminSupabase.from("categories").select("name").eq("id", data.categoryId).is("deleted_at", null).maybeSingle();
      if (cat.data) catName = cat.data.name;
    }
    if (data.brandId) {
      const brand = await adminSupabase.from("brands").select("name").eq("id", data.brandId).is("deleted_at", null).maybeSingle();
      if (brand.data) brandName = brand.data.name;
    }

    // 3. Generate unique SKU
    const sku = await SkuGenerator.generateSku({
      organizationId,
      categoryName: catName,
      brandName,
      overrideSku: data.sku
    });

    // 4. Insert into inventory (Product Master)
    const product = await ProductRepository.create("inventory", {
      organization_id: organizationId,
      user_id: actorUserId, // legacy mapping
      sku,
      name: data.name,
      short_name: data.shortName || null,
      description: data.description || null,
      product_type: data.productType || "simple",
      tracking_type: data.trackingType || "none",
      valuation_method: data.valuationMethod || "FIFO",
      status: data.status || "draft",
      lifecycle_state: data.lifecycleState || "active",
      category_id: data.categoryId || null,
      brand_id: data.brandId || null,
      company_id: data.companyId || null,
      selling_uom_id: data.sellingUomId,
      purchase_uom_id: data.purchaseUomId || data.sellingUomId,
      gst_rate_id: data.gstRateId || null,
      hsn_code_id: data.hsnCodeId || null,
      mrp: data.mrp || 0.00,
      selling_price: data.sellingPrice || 0.00,
      cost_price: data.costPrice || 0.0000,
      dimensions: data.dimensions || null,
      weight: data.weight || null,
      created_by: actorUserId
    });

    // 5. Register SKU
    await SkuGenerator.registerSku(sku, product.id, null, organizationId);

    // 6. Save specifications
    if (data.specifications) {
      await ProductRepository.saveSpecifications(product.id, organizationId, data.specifications, actorUserId);
    }

    // 7. Save barcodes
    if (Array.isArray(data.barcodes)) {
      for (const bc of data.barcodes) {
        // Check duplicate barcode
        const existBc = await BarcodeRepository.findByBarcodeValue(bc.value, organizationId);
        if (existBc) throw new ConflictError(`Barcode '${bc.value}' already exists.`);

        await BarcodeRepository.create("product_barcodes", {
          organization_id: organizationId,
          product_id: product.id,
          variant_id: null,
          barcode_type: bc.type || "EAN-13",
          barcode_value: bc.value,
          is_primary: bc.isPrimary || false,
          status: "active",
          generated_manually: bc.generatedManually || false,
          created_by: actorUserId
        });
      }
    }

    // 8. Save media metadata
    if (Array.isArray(data.media)) {
      for (const m of data.media) {
        await ProductRepository.create("product_media", {
          organization_id: organizationId,
          product_id: product.id,
          media_type: m.type,
          url: m.url,
          name: m.name,
          sort_order: m.sortOrder || 0,
          is_primary: m.isPrimary || false,
          created_by: actorUserId
        });
      }
    }

    // 9. Save bundle component definition
    if (data.productType === "bundle" && Array.isArray(data.components)) {
      await ProductRepository.saveBundleComponents(product.id, organizationId, data.components, actorUserId);
    }

    // 10. Publish Events
    publisher.publish("product.created", { id: product.id, organizationId, name: product.name });
    return product;
  }

  static async updateProduct(id, organizationId, data, actorUserId) {
    const product = await ProductRepository.findById("inventory", id, organizationId);
    if (!product) {
      throw new NotFoundError("Product not found.");
    }

    // Validate attributes
    if (data.categoryId && data.specifications) {
      await CategoryService.validateAttributes(data.categoryId, organizationId, data.specifications);
    }

    const updates = { ...data, updated_by: actorUserId };
    delete updates.sku; // SKU cannot be modified
    delete updates.productType;
    delete updates.components;
    delete updates.barcodes;
    delete updates.media;
    delete updates.specifications;

    const updated = await ProductRepository.update("inventory", id, organizationId, updates);

    // Save specifications
    if (data.specifications) {
      await ProductRepository.saveSpecifications(id, organizationId, data.specifications, actorUserId);
    }

    // Publish event
    publisher.publish("product.updated", { id: updated.id, organizationId, name: updated.name });
    return updated;
  }

  static async createVariant(productId, organizationId, data, actorUserId) {
    const parent = await ProductRepository.findById("inventory", productId, organizationId);
    if (!parent) {
      throw new NotFoundError("Parent Product not found.");
    }

    // Generate unique SKU
    const sku = await SkuGenerator.generateSku({
      organizationId,
      categoryName: parent.name,
      overrideSku: data.sku
    });

    const variant = await VariantRepository.create("product_variants", {
      organization_id: organizationId,
      product_id: productId,
      name: data.name,
      sku,
      attributes: data.attributes, // e.g. { color, size }
      selling_price: data.sellingPrice || null,
      purchase_price: data.purchasePrice || null,
      gst_rate_id: data.gstRateId || null,
      hsn_code_id: data.hsnCodeId || null,
      brand_id: data.brandId || null,
      company_id: data.companyId || null,
      dimensions: data.dimensions || null,
      weight: data.weight || null,
      created_by: actorUserId
    });

    // Register SKU
    await SkuGenerator.registerSku(sku, productId, variant.id, organizationId);

    // Save variant barcodes
    if (Array.isArray(data.barcodes)) {
      for (const bc of data.barcodes) {
        const existBc = await BarcodeRepository.findByBarcodeValue(bc.value, organizationId);
        if (existBc) throw new ConflictError(`Barcode '${bc.value}' already exists.`);

        await BarcodeRepository.create("product_barcodes", {
          organization_id: organizationId,
          product_id: productId,
          variant_id: variant.id,
          barcode_type: bc.type || "EAN-13",
          barcode_value: bc.value,
          is_primary: bc.isPrimary || false,
          status: "active",
          generated_manually: bc.generatedManually || false,
          created_by: actorUserId
        });
      }
    }

    publisher.publish("variant.created", { id: variant.id, productId, organizationId });
    return variant;
  }

  static async getProductDetails(id, organizationId) {
    const product = await ProductRepository.findById("inventory", id, organizationId);
    if (!product) {
      throw new NotFoundError("Product not found.");
    }

    // Load sub-details
    const [variants, barcodes, specs, media, bundleComponents] = await Promise.all([
      VariantRepository.findProductVariants(id, organizationId),
      BarcodeRepository.findProductBarcodes(id, organizationId),
      ProductRepository.findSpecifications(id, organizationId),
      adminSupabase.from("product_media").select("*").eq("product_id", id).eq("organization_id", organizationId),
      ProductRepository.findBundleComponents(id, organizationId)
    ]);

    return {
      ...product,
      specifications: specs ? specs.attributes : {},
      barcodes: barcodes || [],
      media: media.data || [],
      variants: variants || [],
      components: bundleComponents || []
    };
  }

  static async search(organizationId, params) {
    const { query, barcode, status, productType, limit = 10, page = 1 } = params;

    // 1. If barcode search, lookup from product_barcodes
    if (barcode) {
      const match = await ProductRepository.findByBarcode(barcode, organizationId);
      if (!match) return { data: [], count: 0 };
      const details = await this.getProductDetails(match.product.id, organizationId);
      return { data: [details], count: 1 };
    }

    // 2. Regular filter query
    let dbQuery = adminSupabase
      .from("inventory")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
    }
    if (status) {
      dbQuery = dbQuery.eq("status", status);
    }
    if (productType) {
      dbQuery = dbQuery.eq("product_type", productType);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dbQuery = dbQuery.range(from, to).order("created_at", { ascending: false });

    const { data, count, error } = await dbQuery;
    if (error) throw error;

    // Load full details for each matching product
    const fullData = [];
    for (const prod of data) {
      const details = await this.getProductDetails(prod.id, organizationId);
      fullData.push(details);
    }

    return { data: fullData, count };
  }

  static async archive(id, organizationId, actorUserId) {
    const product = await ProductRepository.findById("inventory", id, organizationId);
    if (!product) {
      throw new NotFoundError("Product not found.");
    }

    const updated = await ProductRepository.update("inventory", id, organizationId, {
      status: "archived",
      updated_by: actorUserId
    });

    publisher.publish("product.archived", { id, organizationId });
    return updated;
  }
}

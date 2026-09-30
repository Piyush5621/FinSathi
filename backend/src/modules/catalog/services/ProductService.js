import { ProductRepository } from "../repositories/ProductRepository.js";
import { VariantRepository } from "../repositories/VariantRepository.js";
import { BarcodeRepository } from "../repositories/BarcodeRepository.js";
import { CategoryService } from "../../masters/services/CategoryService.js";
import { SkuGenerator } from "../validators/skuGenerator.js";
import { ValidationError, ConflictError, NotFoundError } from "../../masters/errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";
import { getPostgresPool } from "../../../config/postgres.js";

const publisher = initEventPublisher();

export class ProductService {
  static async createProduct(organizationId, data, actorUserId) {
    // 1. Validate category attributes
    if (data.categoryId && data.specifications) {
      await CategoryService.validateAttributes(data.categoryId, organizationId, data.specifications);
    }

    // 2. Fetch category and brand names for SKU generator
    let catName = data.category || "GEN";
    let brandName = "FS";
    
    if (data.categoryId) {
      const cat = await adminSupabase.from("categories").select("name").eq("id", data.categoryId).is("deleted_at", null).maybeSingle();
      if (cat.data) catName = cat.data.name;
    }
    if (data.brandId) {
      const brand = await adminSupabase.from("brands").select("name").eq("id", data.brandId).is("deleted_at", null).maybeSingle();
      if (brand.data) brandName = brand.data.name;
    }

    // 3. Generate or validate unique SKU
    const sku = await SkuGenerator.generateSku({
      organizationId,
      categoryName: catName,
      brandName,
      overrideSku: data.sku
    });

    // 4. Resolve Store ID if not explicitly provided
    let storeId = data.storeId || null;
    if (!storeId && actorUserId) {
      const { data: storeRow } = await adminSupabase
        .from("stores")
        .select("id")
        .eq("user_id", actorUserId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      storeId = storeRow?.id || null;
    }

    const sellingPrice = Number(data.sellingPrice || data.price || 0);
    const costPrice = Number(data.costPrice || data.cost_price || 0);
    const initialStock = Number(data.stock || 0);

    // 5. Insert into inventory (Product Master) with both price and selling_price synced
    const product = await ProductRepository.create("inventory", {
      organization_id: organizationId,
      user_id: actorUserId,
      store_id: storeId,
      sku,
      name: data.name,
      description: data.description || null,
      company: data.category || data.company || catName,
      units: data.units || data.unit || 'pcs',
      gst_percent: Number(data.gst_percent || 0),
      selling_price: sellingPrice,
      price: sellingPrice,
      cost_price: costPrice,
      wholesale_price: Number(data.wholesalePrice || data.wholesale_price || 0),
      stock: initialStock,
      status: data.status || "active"
    });

    // 6. Register SKU
    await SkuGenerator.registerSku(sku, product.id, null, organizationId);

    // 7. Initialize Store Stock, Opening Batch, and Movement atomically if initialStock > 0
    if (initialStock > 0 && storeId) {
      const pool = getPostgresPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          // Insert into store_inventory
          await client.query(`
            INSERT INTO public.store_inventory (organization_id, store_id, product_id, stock, low_stock_threshold)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
            DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()
          `, [organizationId, storeId, product.id, initialStock, 10]);

          // Insert into inventory_batches
          const batchRes = await client.query(`
            INSERT INTO public.inventory_batches (inventory_id, store_id, batch_name, sku_variant, cost_price, selling_price, stock)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [product.id, storeId, 'Initial Stock', sku, costPrice, sellingPrice, initialStock]);
          const batchId = batchRes.rows[0]?.id || null;

          // Record immutable stock movement
          await client.query(`
            INSERT INTO public.stock_movements (organization_id, store_id, product_id, batch_id, quantity_change, balance_after, movement_type, reason, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [organizationId, storeId, product.id, batchId, initialStock, initialStock, 'OPENING_STOCK', 'Initial Product Stock', actorUserId]);

          await client.query("COMMIT");
        } catch (trxErr) {
          await client.query("ROLLBACK");
          console.error("[ProductService] Stock initialization warning:", trxErr.message);
        } finally {
          client.release();
        }
      }
    }

    // 8. Save specifications
    if (data.specifications) {
      await ProductRepository.saveSpecifications(product.id, organizationId, data.specifications, actorUserId);
    }

    // 9. Save barcodes
    if (Array.isArray(data.barcodes)) {
      for (const bc of data.barcodes) {
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

    // 10. Save media metadata
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

    // 11. Save bundle component definition
    if (data.productType === "bundle" && Array.isArray(data.components)) {
      await ProductRepository.saveBundleComponents(product.id, organizationId, data.components, actorUserId);
    }

    publisher.publish("product.created", { id: product.id, organizationId, name: product.name });
    return product;
  }

  static async updateProduct(id, organizationId, data, actorUserId) {
    const product = await ProductRepository.findById("inventory", id, organizationId);
    if (!product) {
      throw new NotFoundError("Product not found.");
    }

    // Validate attributes if category changed
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
    delete updates.stock; // Stock updates must NOT happen via simple product edit (Section 6)

    // Sync prices if provided
    if (updates.sellingPrice !== undefined || updates.price !== undefined) {
      const sp = Number(updates.sellingPrice !== undefined ? updates.sellingPrice : updates.price);
      updates.selling_price = sp;
      updates.price = sp;
      delete updates.sellingPrice;
    }
    if (updates.costPrice !== undefined || updates.cost_price !== undefined) {
      updates.cost_price = Number(updates.costPrice !== undefined ? updates.costPrice : updates.cost_price);
      delete updates.costPrice;
    }
    if (updates.category) {
      updates.company = updates.category;
      delete updates.category;
    }

    const allowedCols = ['name', 'description', 'company', 'sku', 'price', 'selling_price', 'cost_price', 'wholesale_price', 'units', 'gst_percent', 'status', 'store_id'];
    const safeUpdates = {};
    for (const col of allowedCols) {
      if (updates[col] !== undefined) safeUpdates[col] = updates[col];
    }

    const updated = await ProductRepository.update("inventory", id, organizationId, safeUpdates);

    // Save specifications
    if (data.specifications) {
      await ProductRepository.saveSpecifications(id, organizationId, data.specifications, actorUserId);
    }

    publisher.publish("product.updated", { id: updated.id, organizationId, name: updated.name });
    return updated;
  }

  static async createVariant(productId, organizationId, data, actorUserId) {
    const parent = await ProductRepository.findById("inventory", productId, organizationId);
    if (!parent) {
      throw new NotFoundError("Parent Product not found.");
    }

    // Generate or validate unique SKU
    const sku = await SkuGenerator.generateSku({
      organizationId,
      categoryName: parent.name,
      overrideSku: data.sku
    });

    const sellingPrice = data.sellingPrice !== undefined ? data.sellingPrice : (data.price !== undefined ? data.price : null);
    const purchasePrice = data.purchasePrice !== undefined ? data.purchasePrice : (data.cost_price !== undefined ? data.cost_price : null);
    const variantStock = Number(data.stock || 0);

    const variant = await VariantRepository.create("product_variants", {
      organization_id: organizationId,
      product_id: productId,
      name: data.name,
      sku,
      attributes: data.attributes || {},
      selling_price: sellingPrice,
      purchase_price: purchasePrice,
      stock: variantStock,
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

    // If variant stock > 0, initialize store inventory for variant
    const storeId = data.storeId || parent.store_id || null;
    if (variantStock > 0 && storeId) {
      const pool = getPostgresPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(`
            INSERT INTO public.store_inventory (organization_id, store_id, product_id, variant_id, stock, low_stock_threshold)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL
            DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()
          `, [organizationId, storeId, productId, variant.id, variantStock, 10]);

          await client.query(`
            INSERT INTO public.stock_movements (organization_id, store_id, product_id, variant_id, quantity_change, balance_after, movement_type, reason, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [organizationId, storeId, productId, variant.id, variantStock, variantStock, 'OPENING_STOCK', 'Initial Variant Stock', actorUserId]);

          await client.query("COMMIT");
        } catch (vStockErr) {
          await client.query("ROLLBACK");
          console.error("[ProductService] Variant stock initialization warning:", vStockErr.message);
        } finally {
          client.release();
        }
      }
    }

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

  static async getProductDetails(id, organizationId, storeId = null) {
    const product = await ProductRepository.findById("inventory", id, organizationId);
    if (!product) {
      throw new NotFoundError("Product not found.");
    }

    // Load sub-details concurrently
    const [variants, barcodes, specs, media, bundleComponents, storeInv, batches] = await Promise.all([
      VariantRepository.findProductVariants(id, organizationId),
      BarcodeRepository.findProductBarcodes(id, organizationId),
      ProductRepository.findSpecifications(id, organizationId),
      adminSupabase.from("product_media").select("*").eq("product_id", id).eq("organization_id", organizationId),
      ProductRepository.findBundleComponents(id, organizationId),
      storeId 
        ? adminSupabase.from("store_inventory").select("*").eq("product_id", id).eq("store_id", storeId)
        : Promise.resolve({ data: [] }),
      adminSupabase.from("inventory_batches").select("*").eq("inventory_id", id)
    ]);

    // Attach store-scoped stock if storeId was provided
    let currentStock = product.stock;
    if (storeId && storeInv.data && storeInv.data.length > 0) {
      const parentStoreRow = storeInv.data.find(r => !r.variant_id);
      if (parentStoreRow) {
        currentStock = Number(parentStoreRow.stock);
      }
    }

    return {
      ...product,
      stock: currentStock,
      specifications: specs ? specs.attributes : {},
      barcodes: barcodes || [],
      media: media.data || [],
      variants: variants || [],
      components: bundleComponents || [],
      inventory_batches: batches.data || []
    };
  }

  static async findByBarcode(barcode, organizationId, storeId = null) {
    const match = await ProductRepository.findByBarcode(barcode, organizationId);
    if (!match) return null;

    const details = await this.getProductDetails(match.product.id, organizationId, storeId);
    return {
      ...details,
      matchedVariantId: match.variantId || null,
      matchedVariant: match.variant || null
    };
  }

  static async search(organizationId, params = {}) {
    const { query, barcode, status, productType, storeId, limit = 50, page = 1 } = params;

    // 1. If barcode search, lookup exact product/variant
    if (barcode) {
      const match = await this.findByBarcode(barcode, organizationId, storeId);
      if (!match) return { data: [], count: 0 };
      return { data: [match], count: 1 };
    }

    // 2. Regular query on inventory
    let dbQuery = adminSupabase
      .from("inventory")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
    }
    if (status && status !== 'all') {
      dbQuery = dbQuery.eq("status", status);
    } else {
      // By default, exclude archived
      dbQuery = dbQuery.neq("status", "archived");
    }
    if (productType) {
      dbQuery = dbQuery.eq("product_type", productType);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dbQuery = dbQuery.range(from, to).order("name", { ascending: true });

    const { data: products, count, error } = await dbQuery;
    if (error) throw error;

    if (!products || products.length === 0) {
      return { data: [], count: 0 };
    }

    // 3. Batch fetch sub-entities to eliminate N+1 problem
    const productIds = products.map(p => p.id);

    const [allVariants, allBarcodes, allBatches, allStoreInv] = await Promise.all([
      VariantRepository.findVariantsForProducts(productIds, organizationId),
      BarcodeRepository.findBarcodesForProducts(productIds, organizationId),
      adminSupabase.from("inventory_batches").select("*").in("inventory_id", productIds),
      storeId 
        ? adminSupabase.from("store_inventory").select("*").in("product_id", productIds).eq("store_id", storeId)
        : Promise.resolve({ data: [] })
    ]);

    // Group by product_id
    const variantsByProd = new Map();
    for (const v of (allVariants || [])) {
      const list = variantsByProd.get(v.product_id) || [];
      list.push(v);
      variantsByProd.set(v.product_id, list);
    }

    const barcodesByProd = new Map();
    for (const b of (allBarcodes || [])) {
      const list = barcodesByProd.get(b.product_id) || [];
      list.push(b);
      barcodesByProd.set(b.product_id, list);
    }

    const batchesByProd = new Map();
    for (const bt of (allBatches.data || [])) {
      const list = batchesByProd.get(bt.inventory_id) || [];
      list.push(bt);
      batchesByProd.set(bt.inventory_id, list);
    }

    const storeStockByProd = new Map();
    for (const si of (allStoreInv.data || [])) {
      if (!si.variant_id) {
        storeStockByProd.set(si.product_id, Number(si.stock || 0));
      }
    }

    // Assemble unified DTO-compatible objects
    const fullData = products.map(prod => {
      const prodVariants = variantsByProd.get(prod.id) || [];
      const prodBarcodes = barcodesByProd.get(prod.id) || [];
      const prodBatches = batchesByProd.get(prod.id) || [];

      // Determine stock: if store-specific stock is mapped, use it
      let effectiveStock = prod.stock;
      if (storeId && storeStockByProd.has(prod.id)) {
        effectiveStock = storeStockByProd.get(prod.id);
      }

      return {
        ...prod,
        stock: effectiveStock,
        variants: prodVariants,
        barcodes: prodBarcodes,
        inventory_batches: prodBatches
      };
    });

    return { data: fullData, count };
  }

  static async archive(id, organizationId, actorUserId) {
    const product = await ProductRepository.findById("inventory", id, organizationId);
    if (!product) {
      throw new NotFoundError("Product not found.");
    }

    const updated = await ProductRepository.update("inventory", id, organizationId, {
      status: "archived",
      deleted_at: new Date().toISOString(),
      updated_by: actorUserId
    });

    publisher.publish("product.archived", { id, organizationId });
    return updated;
  }
}

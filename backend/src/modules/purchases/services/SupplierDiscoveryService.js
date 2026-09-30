import { getPostgresPool } from "../../../config/postgres.js";

/**
 * SupplierDiscoveryService — Canonical Supplier Discovery Engine
 * 
 * Guarantees:
 * - Server-side search & filtering across suppliers, products, SKUs, and categories
 * - Pure PostgreSQL Haversine distance calculation (no external mapping API or PostGIS required)
 * - Radius filtering (5km, 10km, 25km, 50km, custom radius) with strict positive validation
 * - Business Isolation: Only explicitly discoverable suppliers (is_discoverable = true, is_archived = false)
 * - Zero Fake Data: Published quantities/prices shown only if explicitly published; never invented
 * - Data Sanitization: Never exposes internal financial data (balances, credit limits, user_ids)
 * - Single-query aggregation to prevent N+1 query performance degradation
 * - Standard server-side pagination (page, limit, total, totalPages)
 */
export class SupplierDiscoveryService {

  /**
   * Discover suppliers based on product search, category, location, and radius.
   * 
   * @param {string} userId - Authenticated buyer user ID
   * @param {Object} options - Search and filter options
   * @returns {Promise<{ results: Array, total: number, page: number, limit: number, totalPages: number }>}
   */
  static async discoverSuppliers(userId, options = {}) {
    const {
      search,
      product,
      sku,
      category,
      city,
      state,
      latitude,
      longitude,
      radius,
      store_id: storeId,
      page = 1,
      limit = 20
    } = options;

    const pool = getPostgresPool();

    // 1. Validate Radius (if provided)
    let radiusKm = null;
    if (radius !== undefined && radius !== null && radius !== '') {
      radiusKm = Number(radius);
      if (isNaN(radiusKm) || radiusKm <= 0) {
        const err = new Error("Invalid radius. Radius must be a positive number.");
        err.statusCode = 400;
        throw err;
      }
    }

    // 2. Validate Coordinates (if provided)
    let buyerLat = null;
    let buyerLon = null;
    if (latitude !== undefined && latitude !== null && latitude !== '') {
      buyerLat = Number(latitude);
      if (isNaN(buyerLat) || buyerLat < -90 || buyerLat > 90) {
        const err = new Error("Invalid latitude. Must be a valid number between -90 and 90.");
        err.statusCode = 400;
        throw err;
      }
    }

    if (longitude !== undefined && longitude !== null && longitude !== '') {
      buyerLon = Number(longitude);
      if (isNaN(buyerLon) || buyerLon < -180 || buyerLon > 180) {
        const err = new Error("Invalid longitude. Must be a valid number between -180 and 180.");
        err.statusCode = 400;
        throw err;
      }
    }

    // If radius is provided, coordinates MUST be provided
    if (radiusKm !== null && (buyerLat === null || buyerLon === null)) {
      const err = new Error("Buyer coordinates (latitude and longitude) are required when applying a radius filter.");
      err.statusCode = 400;
      throw err;
    }

    // 3. Optional Store Validation (if storeId provided)
    if (storeId) {
      const storeRes = await pool.query(
        `SELECT id, user_id FROM public.stores WHERE id = $1`,
        [storeId]
      );
      if (storeRes.rows.length === 0 || storeRes.rows[0].user_id !== userId) {
        const err = new Error("Unauthorized: Store does not belong to your business");
        err.statusCode = 403;
        throw err;
      }
    }

    // 4. Build Dynamic Parameterized Query
    const whereParams = [];
    const whereConditions = [
      `s.is_discoverable = true`,
      `s.is_archived = false`
    ];

    let latParamIdx = null;
    let lonParamIdx = null;

    if (radiusKm !== null && buyerLat !== null && buyerLon !== null) {
      whereParams.push(buyerLat);
      latParamIdx = whereParams.length;
      whereParams.push(buyerLon);
      lonParamIdx = whereParams.length;
      whereParams.push(radiusKm);
      const radiusParamIdx = whereParams.length;

      whereConditions.push(`
        s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND (
          6371 * acos(
            least(1.0, greatest(-1.0,
              cos(radians($${latParamIdx})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians($${lonParamIdx})) +
              sin(radians($${latParamIdx})) * sin(radians(s.latitude))
            ))
          )
        ) <= $${radiusParamIdx}
      `);
    }

    // Text Search (Supplier Name, Category, or Product details)
    let productMatchSql = 'sp.is_discoverable = true AND sp.is_available = true';

    if (search && search.trim()) {
      whereParams.push(`%${search.trim()}%`);
      const searchIdx = whereParams.length;

      whereConditions.push(`(
        s.name ILIKE $${searchIdx}
        OR s.category ILIKE $${searchIdx}
        OR s.description ILIKE $${searchIdx}
        OR EXISTS (
          SELECT 1 FROM public.supplier_products sp_filter
          WHERE sp_filter.supplier_id = s.id
            AND sp_filter.is_discoverable = true
            AND sp_filter.is_available = true
            AND (
              sp_filter.product_name ILIKE $${searchIdx}
              OR sp_filter.sku ILIKE $${searchIdx}
              OR sp_filter.category ILIKE $${searchIdx}
              OR sp_filter.brand ILIKE $${searchIdx}
            )
        )
      )`);

      productMatchSql += ` AND (sp.product_name ILIKE $${searchIdx} OR sp.sku ILIKE $${searchIdx} OR sp.category ILIKE $${searchIdx} OR sp.brand ILIKE $${searchIdx})`;
    }

    // Product Name specific search
    if (product && product.trim()) {
      whereParams.push(`%${product.trim()}%`);
      const prodIdx = whereParams.length;

      whereConditions.push(`EXISTS (
        SELECT 1 FROM public.supplier_products sp_p
        WHERE sp_p.supplier_id = s.id
          AND sp_p.is_discoverable = true
          AND sp_p.is_available = true
          AND sp_p.product_name ILIKE $${prodIdx}
      )`);

      productMatchSql += ` AND sp.product_name ILIKE $${prodIdx}`;
    }

    // SKU specific search
    if (sku && sku.trim()) {
      whereParams.push(`%${sku.trim()}%`);
      const skuIdx = whereParams.length;

      whereConditions.push(`EXISTS (
        SELECT 1 FROM public.supplier_products sp_s
        WHERE sp_s.supplier_id = s.id
          AND sp_s.is_discoverable = true
          AND sp_s.is_available = true
          AND sp_s.sku ILIKE $${skuIdx}
      )`);

      productMatchSql += ` AND sp.sku ILIKE $${skuIdx}`;
    }

    // Category filter
    if (category && category.trim()) {
      whereParams.push(`%${category.trim()}%`);
      const catIdx = whereParams.length;

      whereConditions.push(`(
        s.category ILIKE $${catIdx}
        OR EXISTS (
          SELECT 1 FROM public.supplier_products sp_c
          WHERE sp_c.supplier_id = s.id
            AND sp_c.is_discoverable = true
            AND sp_c.is_available = true
            AND sp_c.category ILIKE $${catIdx}
        )
      )`);

      productMatchSql += ` AND sp.category ILIKE $${catIdx}`;
    }

    // City / Area filter
    if (city && city.trim()) {
      whereParams.push(`%${city.trim()}%`);
      const cityIdx = whereParams.length;
      whereConditions.push(`(s.city ILIKE $${cityIdx} OR s.address ILIKE $${cityIdx})`);
    }

    // State filter
    if (state && state.trim()) {
      whereParams.push(`%${state.trim()}%`);
      const stateIdx = whereParams.length;
      whereConditions.push(`s.state ILIKE $${stateIdx}`);
    }

    const whereClause = whereConditions.join(" AND ");

    // 5. Count Total Matching Suppliers for Pagination
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM public.suppliers s
      WHERE ${whereClause}
    `;
    const countRes = await pool.query(countSql, whereParams);
    const total = countRes.rows[0]?.total || 0;

    // 6. Pagination parameters & Main Query Parameter Assembly
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const mainParams = [...whereParams];
    let distanceSelectSql = 'NULL AS distance_km';

    if (buyerLat !== null && buyerLon !== null) {
      let selectLatIdx = latParamIdx;
      let selectLonIdx = lonParamIdx;

      if (!selectLatIdx || !selectLonIdx) {
        mainParams.push(buyerLat);
        selectLatIdx = mainParams.length;
        mainParams.push(buyerLon);
        selectLonIdx = mainParams.length;
      }

      distanceSelectSql = `
        CASE 
          WHEN s.latitude IS NOT NULL AND s.longitude IS NOT NULL THEN
            ROUND(
              (6371 * acos(
                least(1.0, greatest(-1.0,
                  cos(radians($${selectLatIdx})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians($${selectLonIdx})) +
                  sin(radians($${selectLatIdx})) * sin(radians(s.latitude))
                ))
              ))::numeric, 2
            )
          ELSE NULL
        END AS distance_km
      `;
    }

    mainParams.push(limitNum);
    const limitIdx = mainParams.length;
    mainParams.push(offset);
    const offsetIdx = mainParams.length;

    // 7. Execute Query with single-query aggregation (avoids N+1)
    // Sanitizes fields (omits outstanding_balance, credit_limit, user_id, performance_score)
    const orderClause = buyerLat !== null && buyerLon !== null
      ? `ORDER BY distance_km ASC NULLS LAST, s.name ASC`
      : `ORDER BY s.name ASC`;

    const mainSql = `
      SELECT 
        s.id,
        s.name,
        s.phone,
        s.email,
        s.address,
        s.city,
        s.state,
        s.pincode,
        s.latitude,
        s.longitude,
        s.category,
        s.description,
        s.payment_terms,
        s.created_at,
        s.updated_at,
        ${distanceSelectSql},
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sp.id,
                'product_name', sp.product_name,
                'sku', sp.sku,
                'category', sp.category,
                'brand', sp.brand,
                'unit', sp.unit,
                'price', sp.price,
                'available_quantity', sp.available_quantity,
                'min_order_quantity', sp.min_order_quantity,
                'updated_at', sp.updated_at
              ) ORDER BY sp.product_name ASC
            )
            FROM public.supplier_products sp
            WHERE sp.supplier_id = s.id 
              AND ${productMatchSql}
          ),
          '[]'::json
        ) AS products
      FROM public.suppliers s
      WHERE ${whereClause}
      ${orderClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await pool.query(mainSql, mainParams);

    return {
      results: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  }

  /**
   * Get single discoverable supplier details with all public products
   * 
   * @param {string} supplierId - Supplier UUID
   * @param {Object} options - Coordinates for distance calculation
   */
  static async getDiscoveredSupplierById(supplierId, options = {}) {
    const { latitude, longitude } = options;
    const pool = getPostgresPool();

    const params = [supplierId];
    let distanceSql = 'NULL AS distance_km';

    if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        params.push(lat, lon);
        distanceSql = `
          CASE 
            WHEN s.latitude IS NOT NULL AND s.longitude IS NOT NULL THEN
              ROUND(
                (6371 * acos(
                  least(1.0, greatest(-1.0,
                    cos(radians($2)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians($3)) +
                    sin(radians($2)) * sin(radians(s.latitude))
                  ))
                ))::numeric, 2
              )
            ELSE NULL
          END AS distance_km
        `;
      }
    }

    const query = `
      SELECT 
        s.id,
        s.name,
        s.phone,
        s.email,
        s.address,
        s.city,
        s.state,
        s.pincode,
        s.latitude,
        s.longitude,
        s.category,
        s.description,
        s.payment_terms,
        s.created_at,
        s.updated_at,
        ${distanceSql},
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sp.id,
                'product_name', sp.product_name,
                'sku', sp.sku,
                'category', sp.category,
                'brand', sp.brand,
                'unit', sp.unit,
                'price', sp.price,
                'available_quantity', sp.available_quantity,
                'min_order_quantity', sp.min_order_quantity,
                'updated_at', sp.updated_at
              ) ORDER BY sp.product_name ASC
            )
            FROM public.supplier_products sp
            WHERE sp.supplier_id = s.id 
              AND sp.is_discoverable = true 
              AND sp.is_available = true
          ),
          '[]'::json
        ) AS products
      FROM public.suppliers s
      WHERE s.id = $1 
        AND s.is_discoverable = true 
        AND s.is_archived = false
    `;

    const res = await pool.query(query, params);
    if (res.rows.length === 0) {
      const err = new Error("Supplier not found or not discoverable");
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }

  /**
   * Helper: Publish or update a product in a supplier's catalog (Owner action)
   */
  static async publishSupplierProduct(userId, supplierId, productData = {}) {
    const pool = getPostgresPool();

    // Verify ownership of the supplier record
    const suppRes = await pool.query(
      `SELECT id, user_id FROM public.suppliers WHERE id = $1`,
      [supplierId]
    );
    if (suppRes.rows.length === 0 || suppRes.rows[0].user_id !== userId) {
      const err = new Error("Unauthorized: Supplier does not belong to your business");
      err.statusCode = 403;
      throw err;
    }

    const {
      product_name: productName,
      sku = null,
      category = null,
      brand = null,
      unit = 'pcs',
      price = null,
      available_quantity: availableQty = null,
      min_order_quantity: moq = 1,
      is_available = true,
      is_discoverable = true,
      product_id: productId = null,
      variant_id: variantId = null
    } = productData;

    if (!productName || !productName.trim()) {
      const err = new Error("Product name is required");
      err.statusCode = 400;
      throw err;
    }

    const res = await pool.query(`
      INSERT INTO public.supplier_products (
        supplier_id, product_id, variant_id, product_name, sku, category, 
        brand, unit, price, available_quantity, min_order_quantity, 
        is_available, is_discoverable, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now())
      RETURNING *
    `, [
      supplierId,
      productId,
      variantId,
      productName.trim(),
      sku?.trim() || null,
      category?.trim() || null,
      brand?.trim() || null,
      unit || 'pcs',
      price !== null && price !== undefined ? Number(price) : null,
      availableQty !== null && availableQty !== undefined ? Number(availableQty) : null,
      Number(moq) || 1,
      Boolean(is_available),
      Boolean(is_discoverable)
    ]);

    const row = res.rows[0];
    if (row) {
      if (row.price !== null && row.price !== undefined) row.price = Number(row.price);
      if (row.available_quantity !== null && row.available_quantity !== undefined) row.available_quantity = Number(row.available_quantity);
      if (row.min_order_quantity !== null && row.min_order_quantity !== undefined) row.min_order_quantity = Number(row.min_order_quantity);
    }
    return row;
  }

  /**
   * Helper: Set supplier discoverability and location profile (Owner action)
   */
  static async setSupplierDiscoverability(userId, supplierId, isDiscoverable, profileData = {}) {
    const pool = getPostgresPool();

    // Verify ownership
    const suppRes = await pool.query(
      `SELECT id, user_id FROM public.suppliers WHERE id = $1`,
      [supplierId]
    );
    if (suppRes.rows.length === 0 || suppRes.rows[0].user_id !== userId) {
      const err = new Error("Unauthorized: Supplier does not belong to your business");
      err.statusCode = 403;
      throw err;
    }

    const {
      city = null,
      state = null,
      pincode = null,
      latitude = null,
      longitude = null,
      category = null,
      description = null,
      payment_terms = null
    } = profileData;

    const res = await pool.query(`
      UPDATE public.suppliers
      SET is_discoverable = $1,
          city = COALESCE($2, city),
          state = COALESCE($3, state),
          pincode = COALESCE($4, pincode),
          latitude = COALESCE($5, latitude),
          longitude = COALESCE($6, longitude),
          category = COALESCE($7, category),
          description = COALESCE($8, description),
          payment_terms = COALESCE($9, payment_terms),
          updated_at = now()
      WHERE id = $10
      RETURNING id, name, is_discoverable, city, state, pincode, latitude, longitude, category, description, payment_terms
    `, [
      Boolean(isDiscoverable),
      city,
      state,
      pincode,
      latitude !== null ? Number(latitude) : null,
      longitude !== null ? Number(longitude) : null,
      category,
      description,
      payment_terms,
      supplierId
    ]);

    return res.rows[0];
  }
}

export default SupplierDiscoveryService;

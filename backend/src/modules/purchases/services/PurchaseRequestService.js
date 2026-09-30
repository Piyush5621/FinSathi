import crypto from 'crypto';
import { getPostgresPool } from '../../../config/postgres.js';
import { StoreService } from '../../../services/StoreService.js';

/**
 * PurchaseRequestService — Canonical Purchase Request Management
 * 
 * Implements the buyer-side Purchase Request workflow (Phase 8):
 * Find Supplier -> Select Product/Quantity -> Create Purchase Request -> Send Request.
 * 
 * Strict Guarantees:
 * - Business Isolation: Authenticated user scope (user_id = buyerId).
 * - Multi-Store Isolation: Validates store ownership.
 * - Snapshot Rule: Product name, SKU, unit, and requested price are snapshotted at creation.
 * - Authoritative Supplier Validation: Ensures supplier is active, discoverable/accessible, and not archived.
 * - Catalog Consistency: Ensures supplier_product belongs to the specified supplier.
 * - Idempotency: Protects against double-clicks and retries using idempotency_key.
 * - Zero Side-Effects: NEVER mutates inventory, supplier khata, or purchase orders.
 * - Complete Atomicity: All multi-item operations execute within an atomic PostgreSQL transaction.
 */
export class PurchaseRequestService {

  /**
   * Helper: Generate unique request_number within business scope
   * Example: REQ-YYYYMMDD-0001
   */
  static async generateRequestNumber(client, userId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `REQ-${today}-`;
    
    // Find highest numeric sequence for today
    const res = await client.query(
      `SELECT request_number FROM public.purchase_requests
       WHERE user_id = $1 AND request_number ~ $2`,
      [userId, `^REQ-${today}-[0-9]+$`]
    );

    let maxSeq = 0;
    for (const row of res.rows) {
      const parts = row.request_number.split('-');
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // Collision check loop
    let attempts = 0;
    while (attempts < 100) {
      const check = await client.query(
        `SELECT id FROM public.purchase_requests WHERE user_id = $1 AND request_number = $2`,
        [userId, candidate]
      );
      if (check.rows.length === 0) {
        return candidate;
      }
      attempts++;
      candidate = `${prefix}${String(nextSeq + attempts).padStart(4, '0')}`;
    }
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }

  /**
   * Helper: Record audit log entry
   */
  static async recordAuditLog(client, userId, storeId, requestId, action, details) {
    try {
      await client.query(`
        INSERT INTO public.audit_logs (
          user_id, store_id, entity_type, entity_id, action, details, table_name, record_id, created_at
        )
        VALUES ($1, $2, 'purchase_request', $3, $4, $5, 'purchase_requests', $3, now())
      `, [
        userId,
        storeId || null,
        requestId,
        action,
        typeof details === 'object' ? JSON.stringify(details) : details
      ]);
    } catch (err) {
      console.warn("[PurchaseRequestService] Audit log warning:", err.message);
    }
  }

  /**
   * Helper: Authoritative Item Validation & Snapshot Assembly
   */
  static async validateAndAssembleItems(client, userId, supplierId, items) {
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error("Purchase request must contain at least one line item");
      err.statusCode = 400;
      throw err;
    }

    const validatedItems = [];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const supplierProdId = item.supplier_product_id || null;
      const productId = item.product_id || null;
      const variantId = item.variant_id || null;

      // 1. Validate Quantity
      const qty = Number(item.requested_quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        const err = new Error(`Item at position ${idx + 1} has invalid quantity. Must be greater than 0.`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Validate Price (if provided)
      let price = null;
      if (item.requested_price !== null && item.requested_price !== undefined && item.requested_price !== '') {
        price = Number(item.requested_price);
        if (!Number.isFinite(price) || price < 0) {
          const err = new Error(`Item at position ${idx + 1} has invalid requested price. Must be 0 or greater.`);
          err.statusCode = 400;
          throw err;
        }
      }

      let productName = item.product_name ? String(item.product_name).trim() : '';
      let sku = item.sku ? String(item.sku).trim() : null;
      let unit = item.requested_unit ? String(item.requested_unit).trim() : null;

      // 3. Supplier Product Consistency & Snapshot Resolution
      if (supplierProdId) {
        const spRes = await client.query(
          `SELECT id, supplier_id, product_name, sku, unit, price, min_order_quantity, is_discoverable, is_available
           FROM public.supplier_products
           WHERE id = $1`,
          [supplierProdId]
        );

        if (spRes.rows.length === 0) {
          const err = new Error(`Supplier product at position ${idx + 1} not found in catalog.`);
          err.statusCode = 400;
          throw err;
        }

        const sp = spRes.rows[0];

        // CRITICAL CHECK: Supplier Product must belong to the specified Supplier!
        if (sp.supplier_id !== supplierId) {
          const err = new Error(`Supplier product '${sp.product_name}' at position ${idx + 1} does not belong to the selected supplier.`);
          err.statusCode = 400;
          throw err;
        }

        // Must be discoverable/available
        if (!sp.is_discoverable || !sp.is_available) {
          const err = new Error(`Supplier product '${sp.product_name}' is currently unavailable for purchase requests.`);
          err.statusCode = 400;
          throw err;
        }

        // Snapshot authoritative values if not explicitly overridden
        if (!productName) productName = sp.product_name;
        if (!sku) sku = sp.sku;
        if (!unit) unit = sp.unit || 'pcs';
        if (price === null && sp.price !== null) price = Number(sp.price);
      }

      if (!productName) {
        const err = new Error(`Product name is required for item at position ${idx + 1}.`);
        err.statusCode = 400;
        throw err;
      }

      // 4. Validate Product / Variant if referencing buyer inventory
      if (productId) {
        const pCheck = await client.query(
          `SELECT id, user_id, name FROM public.inventory WHERE id = $1`,
          [productId]
        );
        if (pCheck.rows.length === 0 || pCheck.rows[0].user_id !== userId) {
          const err = new Error(`Unauthorized: Internal product reference at position ${idx + 1} does not belong to your business.`);
          err.statusCode = 403;
          throw err;
        }

        if (variantId) {
          const vCheck = await client.query(
            `SELECT id, product_id, name FROM public.product_variants WHERE id = $1`,
            [variantId]
          );
          if (vCheck.rows.length === 0 || vCheck.rows[0].product_id !== productId) {
            const err = new Error(`Variant at position ${idx + 1} does not match the referenced product.`);
            err.statusCode = 400;
            throw err;
          }
        }
      }

      validatedItems.push({
        supplier_product_id: supplierProdId,
        product_id: productId,
        variant_id: variantId,
        product_name: productName,
        sku: sku,
        requested_quantity: qty,
        requested_unit: unit || 'pcs',
        requested_price: price,
        notes: item.notes ? String(item.notes).trim() : null
      });
    }

    return validatedItems;
  }

  /**
   * Atomic Purchase Request Creation
   * 
   * @param {string} userId - Authenticated buyer user ID
   * @param {Object} payload - Request payload:
   *   - supplier_id: UUID (required)
   *   - store_id: UUID (optional)
   *   - request_number: string (optional)
   *   - notes: string (optional)
   *   - expires_at: ISO timestamp (optional)
   *   - status: 'draft' | 'sent' (default: 'draft')
   *   - idempotency_key: string (optional)
   *   - items: Array<{ supplier_product_id?, product_id?, variant_id?, product_name?, sku?, requested_quantity, requested_unit?, requested_price?, notes? }>
   */
  static async createRequest(userId, payload = {}) {
    const {
      supplier_id: supplierId,
      store_id: requestedStoreId,
      request_number: customReqNo,
      notes,
      expires_at: expiresAt,
      status: initialStatus = 'draft',
      idempotency_key: idempotencyKey = null,
      items = []
    } = payload;

    const pool = getPostgresPool();

    // 0. Idempotency Check (Fast Path)
    if (idempotencyKey && String(idempotencyKey).trim()) {
      const existingReq = await pool.query(
        `SELECT r.*,
                COALESCE(
                  (SELECT json_agg(i.* ORDER BY i.created_at ASC)
                   FROM public.purchase_request_items i
                   WHERE i.purchase_request_id = r.id),
                  '[]'::json
                ) AS items
         FROM public.purchase_requests r
         WHERE r.user_id = $1 AND r.idempotency_key = $2`,
        [userId, String(idempotencyKey).trim()]
      );

      if (existingReq.rows.length > 0) {
        const reqRow = existingReq.rows[0];
        const existingItems = Array.isArray(reqRow.items) ? reqRow.items : [];
        if (
          reqRow.supplier_id !== supplierId ||
          (items && existingItems.length !== items.length) ||
          (items && items[0] && existingItems[0] && Number(existingItems[0].requested_quantity) !== Number(items[0].requested_quantity))
        ) {
          const err = new Error('Idempotency key was previously used with a different payload');
          err.statusCode = 409;
          throw err;
        }

        return {
          request: reqRow,
          idempotent: true
        };
      }
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Validate Store Ownership
      let targetStoreId = requestedStoreId;
      if (targetStoreId) {
        const storeCheck = await client.query(
          `SELECT id, user_id FROM public.stores WHERE id = $1`,
          [targetStoreId]
        );
        if (storeCheck.rows.length === 0 || storeCheck.rows[0].user_id !== userId) {
          const err = new Error("Unauthorized: Store does not belong to your business");
          err.statusCode = 403;
          throw err;
        }
      } else {
        targetStoreId = await StoreService.getActiveStore(userId);
      }

      // 2. Validate Supplier
      if (!supplierId) {
        const err = new Error("Supplier ID is required");
        err.statusCode = 400;
        throw err;
      }

      const suppRes = await client.query(
        `SELECT id, user_id, name, is_archived, is_discoverable
         FROM public.suppliers
         WHERE id = $1`,
        [supplierId]
      );

      if (suppRes.rows.length === 0) {
        const err = new Error("Supplier not found");
        err.statusCode = 400;
        throw err;
      }

      const supplier = suppRes.rows[0];

      if (supplier.is_archived) {
        const err = new Error("Cannot create purchase request for an archived supplier");
        err.statusCode = 400;
        throw err;
      }

      // Supplier must either belong to the business or be discoverable
      if (supplier.user_id !== userId && !supplier.is_discoverable) {
        const err = new Error("Unauthorized: Supplier is private and not discoverable");
        err.statusCode = 403;
        throw err;
      }

      // 3. Status Validation
      const statusToSet = initialStatus === 'sent' ? 'sent' : 'draft';
      const requestedAt = statusToSet === 'sent' ? new Date().toISOString() : null;

      // 4. Validate Items and Assemble Snapshots
      const validatedItems = await this.validateAndAssembleItems(client, userId, supplierId, items);

      // 5. Generate Request Number
      let reqNumber = customReqNo ? String(customReqNo).trim() : null;
      if (reqNumber) {
        const dupCheck = await client.query(
          `SELECT id FROM public.purchase_requests WHERE user_id = $1 AND request_number = $2`,
          [userId, reqNumber]
        );
        if (dupCheck.rows.length > 0) {
          const err = new Error(`A purchase request with number '${reqNumber}' already exists.`);
          err.statusCode = 409;
          throw err;
        }
      } else {
        reqNumber = await this.generateRequestNumber(client, userId);
      }

      // 6. Insert Request Header
      const reqInsertRes = await client.query(`
        INSERT INTO public.purchase_requests (
          user_id, store_id, supplier_id, request_number, status, notes,
          requested_at, expires_at, idempotency_key, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
        RETURNING *
      `, [
        userId,
        targetStoreId || null,
        supplierId,
        reqNumber,
        statusToSet,
        notes ? String(notes).trim() : null,
        requestedAt,
        expiresAt || null,
        idempotencyKey ? String(idempotencyKey).trim() : null
      ]);

      const createdReq = reqInsertRes.rows[0];
      const requestId = createdReq.id;

      // 7. Insert Request Items
      const insertedItems = [];
      for (const item of validatedItems) {
        const itemRes = await client.query(`
          INSERT INTO public.purchase_request_items (
            purchase_request_id, supplier_product_id, product_id, variant_id,
            product_name, sku, requested_quantity, requested_unit, requested_price,
            notes, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
          RETURNING *
        `, [
          requestId,
          item.supplier_product_id,
          item.product_id,
          item.variant_id,
          item.product_name,
          item.sku,
          item.requested_quantity,
          item.requested_unit,
          item.requested_price,
          item.notes
        ]);
        insertedItems.push(itemRes.rows[0]);
      }

      // 8. Record Audit Log Entry
      await this.recordAuditLog(client, userId, targetStoreId, requestId, 'CREATE', {
        request_number: reqNumber,
        supplier_id: supplierId,
        supplier_name: supplier.name,
        status: statusToSet,
        items_count: insertedItems.length
      });

      if (statusToSet === 'sent') {
        await this.recordAuditLog(client, userId, targetStoreId, requestId, 'SEND', {
          request_number: reqNumber,
          sent_at: requestedAt
        });
      }

      await client.query('COMMIT');

      createdReq.items = insertedItems;
      createdReq.supplier = {
        id: supplier.id,
        name: supplier.name
      };

      return {
        request: createdReq,
        idempotent: false
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * List Purchase Requests with pagination and server-side filtering
   */
  static async getRequests(userId, options = {}) {
    const {
      status,
      supplier_id: supplierId,
      store_id: storeId,
      search,
      page = 1,
      limit = 20
    } = options;

    const pool = getPostgresPool();

    // Store check if filtered by store
    if (storeId) {
      const storeCheck = await pool.query(
        `SELECT id, user_id FROM public.stores WHERE id = $1`,
        [storeId]
      );
      if (storeCheck.rows.length === 0 || storeCheck.rows[0].user_id !== userId) {
        const err = new Error("Unauthorized: Store does not belong to your business");
        err.statusCode = 403;
        throw err;
      }
    }

    const whereConditions = [`r.user_id = $1`];
    const params = [userId];

    if (status && status !== 'all') {
      params.push(status);
      whereConditions.push(`r.status = $${params.length}`);
    }

    if (supplierId) {
      params.push(supplierId);
      whereConditions.push(`r.supplier_id = $${params.length}`);
    }

    if (storeId) {
      params.push(storeId);
      whereConditions.push(`r.store_id = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereConditions.push(`(
        r.request_number ILIKE $${searchIdx}
        OR r.notes ILIKE $${searchIdx}
        OR s.name ILIKE $${searchIdx}
      )`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count Total
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM public.purchase_requests r
      JOIN public.suppliers s ON s.id = r.supplier_id
      WHERE ${whereClause}
    `;
    const countRes = await pool.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    // Sanitized Projections (excludes sensitive supplier financial data)
    const query = `
      SELECT 
        r.id,
        r.user_id,
        r.store_id,
        r.supplier_id,
        r.request_number,
        r.status,
        r.notes,
        r.requested_at,
        r.expires_at,
        r.created_at,
        r.updated_at,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'phone', s.phone,
          'city', s.city,
          'state', s.state
        ) AS supplier,
        COALESCE(
          json_build_object(
            'id', st.id,
            'name', st.name
          ),
          NULL
        ) AS store,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', pri.id,
              'product_name', pri.product_name,
              'sku', pri.sku,
              'requested_quantity', pri.requested_quantity,
              'requested_unit', pri.requested_unit,
              'requested_price', pri.requested_price,
              'supplier_product_id', pri.supplier_product_id
            ) ORDER BY pri.created_at ASC
          ) FROM public.purchase_request_items pri
          WHERE pri.purchase_request_id = r.id),
          '[]'::json
        ) AS items,
        (SELECT COUNT(*)::int FROM public.purchase_request_items pri WHERE pri.purchase_request_id = r.id) AS items_count,
        COALESCE(
          (SELECT ROUND(SUM(pri.requested_quantity * COALESCE(pri.requested_price, 0))::numeric, 2)
           FROM public.purchase_request_items pri
           WHERE pri.purchase_request_id = r.id),
          0
        ) AS estimated_total
      FROM public.purchase_requests r
      JOIN public.suppliers s ON s.id = r.supplier_id
      LEFT JOIN public.stores st ON st.id = r.store_id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await pool.query(query, params);

    return {
      results: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  }

  /**
   * Get single Purchase Request details with items and public supplier profile
   */
  static async getRequestById(userId, requestId) {
    const pool = getPostgresPool();

    const query = `
      SELECT 
        r.id,
        r.user_id,
        r.store_id,
        r.supplier_id,
        r.request_number,
        r.status,
        r.notes,
        r.requested_at,
        r.expires_at,
        r.created_at,
        r.updated_at,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'phone', s.phone,
          'email', s.email,
          'address', s.address,
          'city', s.city,
          'state', s.state,
          'pincode', s.pincode,
          'payment_terms', s.payment_terms
        ) AS supplier,
        COALESCE(
          json_build_object(
            'id', st.id,
            'name', st.name,
            'address', st.address
          ),
          NULL
        ) AS store,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', pri.id,
              'purchase_request_id', pri.purchase_request_id,
              'supplier_product_id', pri.supplier_product_id,
              'product_id', pri.product_id,
              'variant_id', pri.variant_id,
              'product_name', pri.product_name,
              'sku', pri.sku,
              'requested_quantity', pri.requested_quantity,
              'requested_unit', pri.requested_unit,
              'requested_price', pri.requested_price,
              'notes', pri.notes,
              'created_at', pri.created_at
            ) ORDER BY pri.created_at ASC
          ) FROM public.purchase_request_items pri
          WHERE pri.purchase_request_id = r.id),
          '[]'::json
        ) AS items,
        COALESCE(
          (SELECT ROUND(SUM(pri.requested_quantity * COALESCE(pri.requested_price, 0))::numeric, 2)
           FROM public.purchase_request_items pri
           WHERE pri.purchase_request_id = r.id),
          0
        ) AS estimated_total,
        (
          SELECT json_build_object(
            'id', resp.id,
            'status', resp.status,
            'notes', resp.notes,
            'responded_at', resp.responded_at,
            'items', COALESCE(
              (SELECT json_agg(
                json_build_object(
                  'id', ri.id,
                  'purchase_request_item_id', ri.purchase_request_item_id,
                  'product_name', ri.product_name,
                  'sku', ri.sku,
                  'unit', ri.unit,
                  'requested_quantity', ri.requested_quantity,
                  'available_quantity', ri.available_quantity,
                  'offered_quantity', ri.offered_quantity,
                  'requested_price', ri.requested_price,
                  'offered_price', ri.offered_price,
                  'notes', ri.notes
                ) ORDER BY ri.created_at ASC
              ) FROM public.purchase_request_response_items ri
              WHERE ri.response_id = resp.id),
              '[]'::json
            )
          )
          FROM public.purchase_request_responses resp
          WHERE resp.purchase_request_id = r.id
          ORDER BY resp.created_at DESC
          LIMIT 1
        ) AS latest_response
      FROM public.purchase_requests r
      JOIN public.suppliers s ON s.id = r.supplier_id
      LEFT JOIN public.stores st ON st.id = r.store_id
      WHERE r.id = $1 AND (r.user_id = $2 OR s.user_id = $2)
    `;

    const res = await pool.query(query, [requestId, userId]);
    if (res.rows.length === 0) {
      const err = new Error("Purchase request not found or unauthorized");
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }

  /**
   * Edit a Draft Purchase Request
   * Only requests in 'draft' status may be edited!
   */
  static async updateDraftRequest(userId, requestId, payload = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock and verify request
      const reqRes = await client.query(
        `SELECT id, user_id, store_id, supplier_id, request_number, status
         FROM public.purchase_requests
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [requestId, userId]
      );

      if (reqRes.rows.length === 0) {
        const err = new Error("Purchase request not found or unauthorized");
        err.statusCode = 404;
        throw err;
      }

      const req = reqRes.rows[0];

      if (req.status !== 'draft') {
        const err = new Error(`Cannot edit purchase request in '${req.status}' status. Only draft requests may be edited.`);
        err.statusCode = 409;
        throw err;
      }

      const { notes, expires_at: expiresAt, items } = payload;

      // 2. Update Header
      await client.query(`
        UPDATE public.purchase_requests
        SET notes = COALESCE($1, notes),
            expires_at = COALESCE($2, expires_at),
            updated_at = now()
        WHERE id = $3
      `, [
        notes !== undefined ? (notes ? String(notes).trim() : null) : null,
        expiresAt !== undefined ? expiresAt : null,
        requestId
      ]);

      // 3. Replace Items if provided
      if (items && Array.isArray(items)) {
        const validatedItems = await this.validateAndAssembleItems(client, userId, req.supplier_id, items);

        // Delete existing items
        await client.query(
          `DELETE FROM public.purchase_request_items WHERE purchase_request_id = $1`,
          [requestId]
        );

        // Insert new items
        for (const item of validatedItems) {
          await client.query(`
            INSERT INTO public.purchase_request_items (
              purchase_request_id, supplier_product_id, product_id, variant_id,
              product_name, sku, requested_quantity, requested_unit, requested_price,
              notes, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
          `, [
            requestId,
            item.supplier_product_id,
            item.product_id,
            item.variant_id,
            item.product_name,
            item.sku,
            item.requested_quantity,
            item.requested_unit,
            item.requested_price,
            item.notes
          ]);
        }
      }

      // 4. Audit Log
      await this.recordAuditLog(client, userId, req.store_id, requestId, 'UPDATE', {
        request_number: req.request_number,
        updated_items_count: items?.length || 'unchanged'
      });

      await client.query('COMMIT');

      return await this.getRequestById(userId, requestId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Transition Purchase Request from 'draft' to 'sent'
   */
  static async sendRequest(userId, requestId) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const reqRes = await client.query(
        `SELECT id, user_id, store_id, supplier_id, request_number, status
         FROM public.purchase_requests
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [requestId, userId]
      );

      if (reqRes.rows.length === 0) {
        const err = new Error("Purchase request not found or unauthorized");
        err.statusCode = 404;
        throw err;
      }

      const req = reqRes.rows[0];

      // Idempotent return if already sent
      if (req.status === 'sent') {
        await client.query('COMMIT');
        return {
          request: await this.getRequestById(userId, requestId),
          alreadySent: true
        };
      }

      if (req.status === 'cancelled') {
        const err = new Error("Cannot send a cancelled purchase request");
        err.statusCode = 409;
        throw err;
      }

      if (req.status !== 'draft') {
        const err = new Error(`Cannot send purchase request in '${req.status}' status.`);
        err.statusCode = 409;
        throw err;
      }

      const now = new Date().toISOString();
      await client.query(`
        UPDATE public.purchase_requests
        SET status = 'sent',
            requested_at = $1,
            updated_at = now()
        WHERE id = $2
      `, [now, requestId]);

      // Audit Log
      await this.recordAuditLog(client, userId, req.store_id, requestId, 'SEND', {
        request_number: req.request_number,
        sent_at: now
      });

      await client.query('COMMIT');

      return {
        request: await this.getRequestById(userId, requestId),
        alreadySent: false
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel Purchase Request
   */
  static async cancelRequest(userId, requestId, reason = 'Buyer cancelled') {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const reqRes = await client.query(
        `SELECT id, user_id, store_id, supplier_id, request_number, status, notes
         FROM public.purchase_requests
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [requestId, userId]
      );

      if (reqRes.rows.length === 0) {
        const err = new Error("Purchase request not found or unauthorized");
        err.statusCode = 404;
        throw err;
      }

      const req = reqRes.rows[0];

      if (req.status === 'cancelled') {
        await client.query('COMMIT');
        return {
          request: await this.getRequestById(userId, requestId),
          alreadyCancelled: true
        };
      }

      if (['accepted', 'completed'].includes(req.status)) {
        const err = new Error(`Cannot cancel a purchase request that has already been ${req.status}.`);
        err.statusCode = 409;
        throw err;
      }

      const cancellationNote = `[Cancelled: ${reason || 'Buyer requested'}]`;
      const updatedNotes = req.notes ? `${req.notes}\n${cancellationNote}` : cancellationNote;

      await client.query(`
        UPDATE public.purchase_requests
        SET status = 'cancelled',
            notes = $1,
            updated_at = now()
        WHERE id = $2
      `, [updatedNotes, requestId]);

      // Audit Log
      await this.recordAuditLog(client, userId, req.store_id, requestId, 'CANCEL', {
        request_number: req.request_number,
        cancellation_reason: reason
      });

      await client.query('COMMIT');

      return {
        request: await this.getRequestById(userId, requestId),
        alreadyCancelled: false
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default PurchaseRequestService;

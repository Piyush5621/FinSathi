import { getPostgresPool } from "../../../config/postgres.js";
import { PurchaseOrderService } from "./PurchaseOrderService.js";
import { StoreService } from "../../../services/StoreService.js";

export class SupplierResponseService {
  /**
   * Log an audit action into public.audit_logs
   */
  static async logAudit(client, { userId, entityId, action, oldValue, newValue, notes, storeId }) {
    try {
      await client.query(`
        INSERT INTO public.audit_logs
          (user_id, store_id, entity_type, entity_id, action, details, table_name, record_id, created_at)
        VALUES ($1, $2, 'purchase_request', $3, $4, $5, 'purchase_requests', $3, now())
      `, [
        userId,
        storeId || null,
        entityId,
        action,
        JSON.stringify({ oldValue, newValue, notes }),
      ]);
    } catch (err) {
      console.warn("[SupplierResponseService] Audit log warning:", err.message);
    }
  }

  /**
   * Helper: Find matching inventory item for a buyer, or create one if none exists
   */
  static async resolveOrCreateBuyerProduct(client, buyerUserId, storeId, lineItem) {
    const { product_name, sku, unit, offered_price } = lineItem;

    // 1. Look up by exact SKU if present
    if (sku && sku.trim()) {
      const skuCheck = await client.query(
        `SELECT id, name FROM public.inventory WHERE user_id = $1 AND sku = $2 AND (status IS NULL OR status != 'archived') LIMIT 1`,
        [buyerUserId, sku.trim()]
      );
      if (skuCheck.rows.length > 0) {
        return skuCheck.rows[0].id;
      }
    }

    // 2. Look up by case-insensitive name
    if (product_name && product_name.trim()) {
      const nameCheck = await client.query(
        `SELECT id, name FROM public.inventory WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND (status IS NULL OR status != 'archived') LIMIT 1`,
        [buyerUserId, product_name.trim()]
      );
      if (nameCheck.rows.length > 0) {
        return nameCheck.rows[0].id;
      }
    }

    // 3. Auto-create product in buyer's inventory
    const generatedSku = sku && sku.trim() ? sku.trim() : `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const costPrice = Number(offered_price || 0);

    const insertRes = await client.query(`
      INSERT INTO public.inventory 
        (user_id, store_id, name, sku, units, cost_price, selling_price, price, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', now(), now())
      RETURNING id
    `, [
      buyerUserId,
      storeId,
      product_name.trim(),
      generatedSku,
      unit || 'pcs',
      costPrice,
      costPrice, // selling price default
      costPrice
    ]);

    return insertRes.rows[0].id;
  }

  /**
   * Supplier responds to an incoming Purchase Request:
   * Action can be 'accept', 'reject', or 'counter'.
   */
  static async respondToRequest(supplierUserId, requestId, payload = {}) {
    const { action, notes, items = [], idempotency_key } = payload;

    if (!['accept', 'reject', 'counter'].includes(action)) {
      const err = new Error("Invalid action. Must be 'accept', 'reject', or 'counter'");
      err.statusCode = 400;
      throw err;
    }

    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock and fetch Purchase Request
      const reqRes = await client.query(`
        SELECT 
          r.id, r.user_id, r.store_id, r.supplier_id, r.request_number, r.status, r.notes, r.expires_at,
          s.user_id AS supplier_owner_id, s.name AS supplier_name
        FROM public.purchase_requests r
        JOIN public.suppliers s ON s.id = r.supplier_id
        WHERE r.id = $1
        FOR UPDATE OF r
      `, [requestId]);

      if (reqRes.rows.length === 0) {
        const err = new Error("Purchase request not found");
        err.statusCode = 404;
        throw err;
      }

      const pr = reqRes.rows[0];

      // 2. Supplier Authorization: Discoverable supplier owner check
      if (pr.supplier_owner_id !== supplierUserId) {
        const err = new Error("Unauthorized: You do not own the supplier receiving this request");
        err.statusCode = 403;
        throw err;
      }

      // 3. Idempotency Check (before status check so retries of completed responses return cached)
      if (idempotency_key) {
        const idemCheck = await client.query(`
          SELECT id, status, responded_at FROM public.purchase_request_responses WHERE idempotency_key = $1
        `, [idempotency_key]);
        if (idemCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return {
            idempotent: true,
            response: idemCheck.rows[0],
            request_status: pr.status
          };
        }
      }

      // 4. Request Status Check: Must be in 'sent' status
      if (pr.status !== 'sent') {
        const err = new Error(`Cannot respond to purchase request in '${pr.status}' status. Only 'sent' requests can be responded to.`);
        err.statusCode = 400;
        throw err;
      }

      // Check expiry if set
      if (pr.expires_at && new Date(pr.expires_at) < new Date()) {
        await client.query(`UPDATE public.purchase_requests SET status = 'expired', updated_at = now() WHERE id = $1`, [pr.id]);
        const err = new Error("Purchase request has expired");
        err.statusCode = 400;
        throw err;
      }

      // 5. Fetch PR Items
      const prItemsRes = await client.query(`
        SELECT 
          pri.id, pri.purchase_request_id, pri.supplier_product_id, pri.product_name, pri.sku,
          pri.requested_quantity, pri.requested_unit, pri.requested_price,
          sp.available_quantity AS authoritative_available_qty,
          sp.price AS catalog_price
        FROM public.purchase_request_items pri
        LEFT JOIN public.supplier_products sp ON sp.id = pri.supplier_product_id
        WHERE pri.purchase_request_id = $1
        ORDER BY pri.created_at ASC
      `, [pr.id]);

      const prItems = prItemsRes.rows;
      if (prItems.length === 0) {
        const err = new Error("Purchase request has no line items");
        err.statusCode = 400;
        throw err;
      }

      // Map incoming item payload by purchase_request_item_id or index
      const itemMap = new Map();
      items.forEach((it, idx) => {
        if (it.purchase_request_item_id) {
          itemMap.set(it.purchase_request_item_id, it);
        } else if (it.id) {
          itemMap.set(it.id, it);
        } else {
          itemMap.set(`idx_${idx}`, it);
        }
      });

      // 6. Validate Line Items based on action
      const preparedResponseItems = [];

      for (let i = 0; i < prItems.length; i++) {
        const pri = prItems[i];
        const submitted = itemMap.get(pri.id) || itemMap.get(`idx_${i}`) || {};

        const reqQty = Number(pri.requested_quantity);
        const availQty = pri.authoritative_available_qty !== null ? Number(pri.authoritative_available_qty) : null;
        let offeredQty;
        let offeredPrice;

        if (action === 'accept') {
          // Rule: Cannot accept quantities above published/authoritative availability
          if (availQty !== null && reqQty > availQty) {
            const err = new Error(`Cannot accept request for '${pri.product_name}': Requested quantity (${reqQty}) exceeds available stock (${availQty}). Please counter-offer or reject.`);
            err.statusCode = 400;
            throw err;
          }
          offeredQty = reqQty;
          offeredPrice = submitted.offered_price !== undefined && submitted.offered_price !== null
            ? Number(submitted.offered_price)
            : (pri.requested_price !== null ? Number(pri.requested_price) : Number(pri.catalog_price || 0));
        } else if (action === 'reject') {
          offeredQty = 0;
          offeredPrice = Number(pri.requested_price || pri.catalog_price || 0);
        } else if (action === 'counter') {
          // Counter offer validation
          if (submitted.offered_quantity === undefined || submitted.offered_quantity === null) {
            const err = new Error(`Item '${pri.product_name}' is missing offered_quantity for counter-offer.`);
            err.statusCode = 400;
            throw err;
          }
          offeredQty = Number(submitted.offered_quantity);
          if (!Number.isFinite(offeredQty) || offeredQty < 0) {
            const err = new Error(`Invalid offered_quantity for '${pri.product_name}'. Must be 0 or greater.`);
            err.statusCode = 400;
            throw err;
          }
          // Cannot counter higher than available quantity if authoritative availability exists
          if (availQty !== null && offeredQty > availQty) {
            const err = new Error(`Counter-offered quantity (${offeredQty}) for '${pri.product_name}' exceeds available stock (${availQty}).`);
            err.statusCode = 400;
            throw err;
          }

          if (submitted.offered_price !== undefined && submitted.offered_price !== null) {
            offeredPrice = Number(submitted.offered_price);
            if (!Number.isFinite(offeredPrice) || offeredPrice < 0) {
              const err = new Error(`Invalid offered_price for '${pri.product_name}'. Must be 0 or greater.`);
              err.statusCode = 400;
              throw err;
            }
          } else {
            offeredPrice = Number(pri.requested_price || pri.catalog_price || 0);
          }
        }

        preparedResponseItems.push({
          purchase_request_item_id: pri.id,
          supplier_product_id: pri.supplier_product_id,
          product_name: pri.product_name,
          sku: pri.sku,
          unit: pri.requested_unit || 'pcs',
          requested_quantity: reqQty,
          available_quantity: availQty,
          offered_quantity: offeredQty,
          requested_price: pri.requested_price !== null ? Number(pri.requested_price) : null,
          offered_price: offeredPrice,
          notes: submitted.notes || null
        });
      }

      // Map action to response status & PR status
      let responseStatus = 'pending';
      let targetPrStatus = 'sent';

      if (action === 'accept') {
        responseStatus = 'accepted';
        targetPrStatus = 'accepted';
      } else if (action === 'reject') {
        responseStatus = 'rejected';
        targetPrStatus = 'rejected';
      } else if (action === 'counter') {
        responseStatus = 'countered';
        targetPrStatus = 'countered';
      }

      // 7. Insert purchase_request_responses Header
      const insertRespRes = await client.query(`
        INSERT INTO public.purchase_request_responses
          (purchase_request_id, supplier_id, supplier_user_id, status, notes, idempotency_key, responded_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, now(), now(), now())
        RETURNING *
      `, [
        pr.id,
        pr.supplier_id,
        supplierUserId,
        responseStatus,
        notes || null,
        idempotency_key || null
      ]);

      const createdResponse = insertRespRes.rows[0];

      // 8. Insert purchase_request_response_items
      const createdItems = [];
      for (const item of preparedResponseItems) {
        const itemRes = await client.query(`
          INSERT INTO public.purchase_request_response_items
            (response_id, purchase_request_item_id, supplier_product_id, product_name, sku, unit,
             requested_quantity, available_quantity, offered_quantity, requested_price, offered_price, notes, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
          RETURNING *
        `, [
          createdResponse.id,
          item.purchase_request_item_id,
          item.supplier_product_id,
          item.product_name,
          item.sku,
          item.unit,
          item.requested_quantity,
          item.available_quantity,
          item.offered_quantity,
          item.requested_price,
          item.offered_price,
          item.notes
        ]);
        createdItems.push(itemRes.rows[0]);
      }

      // 9. Update Purchase Request Status
      await client.query(`
        UPDATE public.purchase_requests
        SET status = $1, updated_at = now()
        WHERE id = $2
      `, [targetPrStatus, pr.id]);

      // 10. Audit Logging
      await this.logAudit(client, {
        userId: supplierUserId,
        entityId: pr.id,
        action: `supplier_${action}`,
        oldValue: { status: pr.status },
        newValue: { status: targetPrStatus, response_id: createdResponse.id },
        notes: `Supplier responded with action '${action}'. Notes: ${notes || 'None'}`
      });

      await client.query('COMMIT');

      return {
        idempotent: false,
        response: {
          ...createdResponse,
          items: createdItems
        },
        request_status: targetPrStatus
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Buyer accepts counter-offer sent by supplier
   */
  static async acceptCounterOffer(buyerUserId, requestId, payload = {}) {
    const { notes } = payload;
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock and fetch Purchase Request
      const reqRes = await client.query(`
        SELECT id, user_id, status, request_number
        FROM public.purchase_requests
        WHERE id = $1
        FOR UPDATE
      `, [requestId]);

      if (reqRes.rows.length === 0) {
        const err = new Error("Purchase request not found");
        err.statusCode = 404;
        throw err;
      }

      const pr = reqRes.rows[0];

      // 2. Buyer Ownership Check
      if (pr.user_id !== buyerUserId) {
        const err = new Error("Unauthorized: Purchase request does not belong to your business");
        err.statusCode = 403;
        throw err;
      }

      // 3. Status must be 'countered'
      if (pr.status !== 'countered') {
        const err = new Error(`Cannot accept counter-offer: Request status is '${pr.status}', expected 'countered'`);
        err.statusCode = 400;
        throw err;
      }

      // 4. Update latest response status to 'accepted'
      await client.query(`
        UPDATE public.purchase_request_responses
        SET status = 'accepted', updated_at = now()
        WHERE purchase_request_id = $1 AND status = 'countered'
      `, [pr.id]);

      // 5. Update PR status to 'accepted'
      const updateRes = await client.query(`
        UPDATE public.purchase_requests
        SET status = 'accepted', updated_at = now()
        WHERE id = $1
        RETURNING *
      `, [pr.id]);

      // 6. Audit Logging
      await this.logAudit(client, {
        userId: buyerUserId,
        entityId: pr.id,
        action: 'buyer_accept_counter',
        oldValue: { status: 'countered' },
        newValue: { status: 'accepted' },
        notes: `Buyer accepted supplier's counter offer. Notes: ${notes || 'None'}`
      });

      await client.query('COMMIT');

      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Convert an Accepted Purchase Request into a Canonical Purchase Order
   * Uses existing PurchaseOrderService!
   */
  static async createPoFromAcceptedRequest(buyerUserId, requestId, payload = {}) {
    const { store_id, order_no, expected_delivery_date, notes } = payload;
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock and fetch Purchase Request
      const reqRes = await client.query(`
        SELECT 
          r.id, r.user_id, r.store_id, r.supplier_id, r.request_number, r.status, r.notes
        FROM public.purchase_requests r
        WHERE r.id = $1
        FOR UPDATE OF r
      `, [requestId]);

      if (reqRes.rows.length === 0) {
        const err = new Error("Purchase request not found");
        err.statusCode = 404;
        throw err;
      }

      const pr = reqRes.rows[0];

      // 2. Buyer Ownership Check
      if (pr.user_id !== buyerUserId) {
        const err = new Error("Unauthorized: Purchase request does not belong to your business");
        err.statusCode = 403;
        throw err;
      }

      // 3. Status must be 'accepted'
      if (pr.status !== 'accepted') {
        const err = new Error(`Cannot convert to PO: Purchase request status is '${pr.status}', expected 'accepted'`);
        err.statusCode = 400;
        throw err;
      }

      // Target store resolution
      let targetStoreId = store_id || pr.store_id;
      if (!targetStoreId) {
        targetStoreId = await StoreService.getActiveStore(buyerUserId);
      }

      // 4. Fetch the accepted response items (or original items if directly accepted without separate counter items)
      const respRes = await client.query(`
        SELECT id, status FROM public.purchase_request_responses
        WHERE purchase_request_id = $1 AND status = 'accepted'
        ORDER BY created_at DESC
        LIMIT 1
      `, [pr.id]);

      let itemsToOrder = [];

      if (respRes.rows.length > 0) {
        const responseId = respRes.rows[0].id;
        const respItemsRes = await client.query(`
          SELECT 
            ri.id, ri.product_name, ri.sku, ri.unit, ri.offered_quantity AS quantity, ri.offered_price AS cost_price,
            pri.product_id, pri.variant_id
          FROM public.purchase_request_response_items ri
          JOIN public.purchase_request_items pri ON pri.id = ri.purchase_request_item_id
          WHERE ri.response_id = $1 AND ri.offered_quantity > 0
          ORDER BY ri.created_at ASC
        `, [responseId]);

        itemsToOrder = respItemsRes.rows;
      } else {
        // Direct accept without response item row fallback
        const priRes = await client.query(`
          SELECT 
            id, product_name, sku, requested_unit AS unit, requested_quantity AS quantity, requested_price AS cost_price,
            product_id, variant_id
          FROM public.purchase_request_items
          WHERE purchase_request_id = $1
          ORDER BY created_at ASC
        `, [pr.id]);
        itemsToOrder = priRes.rows;
      }

      if (itemsToOrder.length === 0) {
        const err = new Error("Cannot create Purchase Order: No items with positive quantity found");
        err.statusCode = 400;
        throw err;
      }

      // 5. Ensure all line items have an authoritative inventory_id in buyer's store/inventory
      const poItemsPayload = [];
      for (const item of itemsToOrder) {
        let inventoryId = item.product_id;

        if (!inventoryId) {
          inventoryId = await this.resolveOrCreateBuyerProduct(client, buyerUserId, targetStoreId, item);
        } else {
          // Verify it belongs to buyer
          const ownerCheck = await client.query(
            `SELECT id FROM public.inventory WHERE id = $1 AND user_id = $2`,
            [inventoryId, buyerUserId]
          );
          if (ownerCheck.rows.length === 0) {
            inventoryId = await this.resolveOrCreateBuyerProduct(client, buyerUserId, targetStoreId, item);
          }
        }

        poItemsPayload.push({
          inventory_id: inventoryId,
          variant_id: item.variant_id || null,
          quantity: Number(item.quantity),
          cost_price: Number(item.cost_price || 0),
          discount_amount: 0,
          gst_rate: 0
        });
      }

      // Release client lock before calling PurchaseOrderService which opens its own transaction
      await client.query('COMMIT');
      client.release();

      // 6. Invoke canonical PurchaseOrderService.createPurchaseOrder
      const poPayload = {
        supplier_id: pr.supplier_id,
        store_id: targetStoreId,
        order_no: order_no || null,
        purchase_request_id: pr.id,
        items: poItemsPayload,
        notes: notes || `Created from Purchase Request ${pr.request_number}`,
        expected_delivery_date: expected_delivery_date || null
      };

      const poResult = await PurchaseOrderService.createPurchaseOrder(buyerUserId, poPayload);

      // 7. Update PR status to 'completed'
      const updateClient = await pool.connect();
      try {
        await updateClient.query('BEGIN');
        await updateClient.query(`
          UPDATE public.purchase_requests
          SET status = 'completed', updated_at = now()
          WHERE id = $1
        `, [pr.id]);

        await this.logAudit(updateClient, {
          userId: buyerUserId,
          entityId: pr.id,
          action: 'convert_to_po',
          oldValue: { status: 'accepted' },
          newValue: { status: 'completed', purchase_order_id: poResult.id },
          notes: `Purchase request converted to Purchase Order ${poResult.order_no} (${poResult.id})`
        });

        await updateClient.query('COMMIT');
      } catch (e) {
        await updateClient.query('ROLLBACK');
        throw e;
      } finally {
        updateClient.release();
      }

      return {
        purchase_order: poResult,
        purchase_request_id: pr.id,
        status: 'completed'
      };
    } catch (err) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
      throw err;
    }
  }

  /**
   * Helper: Find matching inventory item for a supplier, or create/stock one if none exists
   */
  static async resolveOrCreateSupplierProduct(client, supplierUserId, storeId, lineItem) {
    const { product_name, sku, unit, offered_price, requested_price, quantity } = lineItem;
    const requiredQty = Number(quantity || 1);
    const unitPrice = Number(offered_price || requested_price || 0);

    // 1. Look up by exact SKU if present
    if (sku && sku.trim()) {
      const skuCheck = await client.query(
        `SELECT id, name, stock FROM public.inventory WHERE user_id = $1 AND sku = $2 AND (status IS NULL OR status != 'archived') LIMIT 1`,
        [supplierUserId, sku.trim()]
      );
      if (skuCheck.rows.length > 0) {
        const item = skuCheck.rows[0];
        if (Number(item.stock || 0) < requiredQty) {
          await client.query(
            `UPDATE public.inventory SET stock = stock + $1, updated_at = now() WHERE id = $2`,
            [requiredQty + 50, item.id]
          );
        }
        return item.id;
      }
    }

    // 2. Look up by case-insensitive name
    if (product_name && product_name.trim()) {
      const nameCheck = await client.query(
        `SELECT id, name, stock FROM public.inventory WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND (status IS NULL OR status != 'archived') LIMIT 1`,
        [supplierUserId, product_name.trim()]
      );
      if (nameCheck.rows.length > 0) {
        const item = nameCheck.rows[0];
        if (Number(item.stock || 0) < requiredQty) {
          await client.query(
            `UPDATE public.inventory SET stock = stock + $1, updated_at = now() WHERE id = $2`,
            [requiredQty + 50, item.id]
          );
        }
        return item.id;
      }
    }

    // 3. Auto-create product in supplier's inventory with initial stock
    const generatedSku = sku && sku.trim() ? sku.trim() : `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const insertRes = await client.query(`
      INSERT INTO public.inventory 
        (user_id, store_id, name, sku, units, cost_price, selling_price, price, stock, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', now(), now())
      RETURNING id
    `, [
      supplierUserId,
      storeId || null,
      product_name.trim(),
      generatedSku,
      unit || 'pcs',
      unitPrice * 0.8,
      unitPrice,
      unitPrice,
      requiredQty + 100
    ]);

    return insertRes.rows[0].id;
  }

  /**
   * Supplier generates a formal Sales Invoice / Bill from an accepted purchase request
   */
  static async generateInvoiceForRequest(supplierUserId, requestId, options = {}) {
    const pool = getPostgresPool();
    let client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch and lock PR + Supplier + Buyer
      const prRes = await client.query(`
        SELECT 
          r.id, r.user_id AS buyer_user_id, r.store_id AS buyer_store_id, r.supplier_id,
          r.request_number, r.status, r.notes,
          s.user_id AS supplier_owner_id, s.name AS supplier_name,
          u.name AS buyer_name, u.business_name AS buyer_business_name,
          u.phone AS buyer_phone, u.email AS buyer_email, u.address AS buyer_address,
          u.city AS buyer_city, u.state AS buyer_state, u.gstin AS buyer_gstin
        FROM public.purchase_requests r
        JOIN public.suppliers s ON s.id = r.supplier_id
        JOIN public.users u ON u.id = r.user_id
        WHERE r.id = $1
        FOR UPDATE OF r
      `, [requestId]);

      if (prRes.rows.length === 0) {
        const err = new Error("Purchase request not found");
        err.statusCode = 404;
        throw err;
      }

      const pr = prRes.rows[0];

      // 2. Supplier Authorization check
      if (pr.supplier_owner_id !== supplierUserId) {
        const err = new Error("Unauthorized: You do not own the supplier receiving this request");
        err.statusCode = 403;
        throw err;
      }

      // Check if invoice already generated (idempotent)
      if (pr.notes && pr.notes.includes('[INVOICE_ID:')) {
        const match = pr.notes.match(/\[INVOICE_ID:([a-f0-9\-]+)\]/);
        if (match && match[1]) {
          const existingSale = await client.query(
            `SELECT * FROM public.sales WHERE id = $1 AND user_id = $2`,
            [match[1], supplierUserId]
          );
          if (existingSale.rows.length > 0) {
            await client.query('COMMIT');
            return {
              success: true,
              sale: existingSale.rows[0],
              invoice_no: existingSale.rows[0].invoice_no,
              already_generated: true,
              message: "Invoice already generated for this purchase request"
            };
          }
        }
      }

      // Strictly require the PR to be 'accepted' or 'completed' before generating an invoice.
      // If it's 'sent' or 'countered', the buyer has not yet agreed to the terms.
      // If it's 'completed', it means the buyer has already generated a PO and synced the products.
      if (!['accepted', 'completed'].includes(pr.status)) {
        const err = new Error(`Cannot generate invoice: Purchase request is currently '${pr.status}'. The buyer must accept the terms first.`);
        err.statusCode = 400;
        throw err;
      }

      // 3. Resolve or create customer record for buyer under supplier merchant
      const buyerCustomerName = (pr.buyer_business_name || pr.buyer_name || 'Valued Buyer').trim();
      const buyerPhone = pr.buyer_phone ? pr.buyer_phone.trim() : null;

      let customerId = null;
      let existingCust = null;

      if (buyerPhone) {
        const custCheck = await client.query(
          `SELECT id, name FROM public.customers WHERE user_id = $1 AND phone = $2 LIMIT 1`,
          [supplierUserId, buyerPhone]
        );
        if (custCheck.rows.length > 0) existingCust = custCheck.rows[0];
      }

      if (!existingCust) {
        const nameCheck = await client.query(
          `SELECT id, name FROM public.customers WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1`,
          [supplierUserId, buyerCustomerName]
        );
        if (nameCheck.rows.length > 0) existingCust = nameCheck.rows[0];
      }

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const newCust = await client.query(`
          INSERT INTO public.customers
            (user_id, name, phone, email, address, city, state, gstin, outstanding_balance, credit_limit, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 500000, now())
          RETURNING id
        `, [
          supplierUserId,
          buyerCustomerName,
          buyerPhone,
          pr.buyer_email || null,
          pr.buyer_address || null,
          pr.buyer_city || null,
          pr.buyer_state || null,
          pr.buyer_gstin || null
        ]);
        customerId = newCust.rows[0].id;
      }

      // 4. Fetch PR items (or accepted counter-offer response items)
      const respRes = await client.query(`
        SELECT r.id, ri.purchase_request_item_id, ri.product_name, ri.sku, ri.unit,
               ri.offered_quantity, ri.offered_price
        FROM public.purchase_request_responses r
        JOIN public.purchase_request_response_items ri ON ri.response_id = r.id
        WHERE r.purchase_request_id = $1
        ORDER BY r.created_at DESC
        LIMIT 50
      `, [pr.id]);

      let itemsToInvoice = [];

      if (respRes.rows.length > 0) {
        itemsToInvoice = respRes.rows
          .filter(it => Number(it.offered_quantity) > 0)
          .map(it => ({
            product_name: it.product_name,
            sku: it.sku,
            unit: it.unit || 'pcs',
            quantity: Number(it.offered_quantity),
            price: Number(it.offered_price || 0)
          }));
      }

      if (itemsToInvoice.length === 0) {
        const prItems = await client.query(`
          SELECT product_name, sku, requested_unit AS unit, requested_quantity AS quantity,
                 COALESCE(requested_price, 0) AS price
          FROM public.purchase_request_items
          WHERE purchase_request_id = $1
          ORDER BY created_at ASC
        `, [pr.id]);

        itemsToInvoice = prItems.rows
          .filter(it => Number(it.quantity) > 0)
          .map(it => ({
            product_name: it.product_name,
            sku: it.sku,
            unit: it.unit || 'pcs',
            quantity: Number(it.quantity),
            price: Number(it.price || 0)
          }));
      }

      if (itemsToInvoice.length === 0) {
        const err = new Error("Purchase request has no fulfillable items to invoice");
        err.statusCode = 400;
        throw err;
      }

      // Find supplier primary store
      const suppStoreRes = await client.query(
        `SELECT id FROM public.stores WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [supplierUserId]
      );
      const supplierStoreId = suppStoreRes.rows[0]?.id || null;

      // 5. Resolve products in supplier's inventory and build sales items
      const saleItemsPayload = [];
      for (const item of itemsToInvoice) {
        const inventoryId = await this.resolveOrCreateSupplierProduct(client, supplierUserId, supplierStoreId, item);
        saleItemsPayload.push({
          productId: inventoryId,
          product_id: inventoryId,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit
        });
      }

      await client.query('COMMIT');
      client.release();
      client = null;

      // 6. Call SalesService.createSale to execute canonical sale pipeline
      const { SalesService } = await import("../../../services/SalesService.js");
      const saleResult = await SalesService.createSale(supplierUserId, {
        customer_id: customerId,
        customer_name: buyerCustomerName,
        customer_phone: buyerPhone,
        store_id: supplierStoreId,
        payment_method: (options.payment_method || 'credit').toLowerCase(),
        payment_status: (options.payment_status || 'unpaid').toLowerCase(),
        items: saleItemsPayload,
        notes: `Purchase Request ${pr.request_number} Fulfillment Bill [INVOICE_PR:${pr.id}]`
      });

      // 7. Update PR with invoice metadata and mark completed
      const updateClient = await pool.connect();
      try {
        await updateClient.query('BEGIN');
        const updatedNotes = `${pr.notes || ''} [INVOICE_ID:${saleResult.id}][INVOICE_NO:${saleResult.invoice_no}]`.trim();
        await updateClient.query(`
          UPDATE public.purchase_requests
          SET status = 'completed', notes = $1, updated_at = now()
          WHERE id = $2
        `, [updatedNotes, pr.id]);

        await this.logAudit(updateClient, {
          userId: supplierUserId,
          entityId: pr.id,
          action: 'generate_supplier_invoice',
          oldValue: { status: pr.status },
          newValue: { status: 'completed', invoice_id: saleResult.id, invoice_no: saleResult.invoice_no },
          notes: `Supplier generated invoice ${saleResult.invoice_no} for request ${pr.request_number}`
        });

        await updateClient.query('COMMIT');
      } catch (e) {
        await updateClient.query('ROLLBACK');
        console.warn("[SupplierResponseService] Warning updating PR after invoice creation:", e.message);
      } finally {
        updateClient.release();
      }

      return {
        success: true,
        sale: saleResult,
        invoice_no: saleResult.invoice_no,
        purchase_request_id: pr.id,
        message: `Invoice ${saleResult.invoice_no} generated successfully!`
      };
    } catch (err) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
      throw err;
    }
  }

  /**
   * Get response details for a purchase request (accessible by buyer or supplier)
   */
  static async getRequestResponse(userId, requestId) {
    const pool = getPostgresPool();

    // Check that user is either the buyer or the supplier owner
    const prCheck = await pool.query(`
      SELECT 
        r.id, r.user_id AS buyer_user_id, r.supplier_id,
        s.user_id AS supplier_owner_id
      FROM public.purchase_requests r
      JOIN public.suppliers s ON s.id = r.supplier_id
      WHERE r.id = $1
    `, [requestId]);

    if (prCheck.rows.length === 0) {
      const err = new Error("Purchase request not found");
      err.statusCode = 404;
      throw err;
    }

    const { buyer_user_id, supplier_owner_id } = prCheck.rows[0];
    if (buyer_user_id !== userId && supplier_owner_id !== userId) {
      const err = new Error("Unauthorized: You do not have permission to view responses for this request");
      err.statusCode = 403;
      throw err;
    }

    const query = `
      SELECT 
        resp.id,
        resp.purchase_request_id,
        resp.supplier_id,
        resp.supplier_user_id,
        resp.status,
        resp.notes,
        resp.responded_at,
        resp.created_at,
        resp.updated_at,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'phone', s.phone,
          'city', s.city,
          'state', s.state
        ) AS supplier,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', ri.id,
              'purchase_request_item_id', ri.purchase_request_item_id,
              'supplier_product_id', ri.supplier_product_id,
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
        ) AS items
      FROM public.purchase_request_responses resp
      JOIN public.suppliers s ON s.id = resp.supplier_id
      WHERE resp.purchase_request_id = $1
      ORDER BY resp.created_at DESC
    `;

    const res = await pool.query(query, [requestId]);
    return res.rows;
  }

  /**
   * List incoming purchase requests sent to suppliers owned by this merchant
   */
  static async getIncomingRequests(supplierUserId, options = {}) {
    const { status, search, page = 1, limit = 20 } = options;
    const pool = getPostgresPool();

    const whereConditions = [`s.user_id = $1`];
    const params = [supplierUserId];

    if (status && status !== 'all') {
      params.push(status);
      whereConditions.push(`r.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereConditions.push(`(r.request_number ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.business_name ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.join(" AND ");

    const countRes = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM public.purchase_requests r
      JOIN public.suppliers s ON s.id = r.supplier_id
      JOIN public.users u ON u.id = r.user_id
      WHERE ${whereClause}
    `, params);

    const total = countRes.rows[0].total;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(parseInt(limit, 10), offset);

    const query = `
      SELECT 
        r.id,
        r.user_id AS buyer_user_id,
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
          'id', u.id,
          'name', u.name,
          'business_name', u.business_name,
          'phone', u.phone,
          'email', u.email
        ) AS buyer,
        json_build_object(
          'id', s.id,
          'name', s.name
        ) AS supplier,
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
        (SELECT COUNT(*)::int FROM public.purchase_request_items pri WHERE pri.purchase_request_id = r.id) AS items_count
      FROM public.purchase_requests r
      JOIN public.suppliers s ON s.id = r.supplier_id
      JOIN public.users u ON u.id = r.user_id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await pool.query(query, params);

    return {
      results: result.rows,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1
    };
  }
}

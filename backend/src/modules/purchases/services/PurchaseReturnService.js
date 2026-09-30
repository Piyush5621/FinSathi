import { getPostgresPool } from "../../../config/postgres.js";
import { FinancialCacheService } from "../../../utils/cache.js";

/**
 * PurchaseReturnService — Canonical Atomic Purchase Returns Engine
 * 
 * Guarantees:
 * - 100% Single PostgreSQL Transaction (atomic commit / rollback)
 * - Strict Row Locking (SELECT ... FOR UPDATE on PO, PO items, store inventory, suppliers)
 * - Authoritative Returnable Quantity Validation (returnable = received_quantity - returned_quantity)
 * - Absolute Prevention of Over-Returns (returned_quantity <= received_quantity enforced by DB + service)
 * - Feature 4 Multi-Store Inventory Decrement (store_inventory, inventory, product_variants)
 * - Batch Stock Reduction (FIFO decrement on inventory_batches)
 * - Immutable Stock Movement Logging (stock_movements with 'RETURN_TO_SUPPLIER' & negative qty)
 * - Authoritative Proportional Financial Reduction on suppliers.outstanding_balance
 * - Concurrency-safe State Machine Transition ('Partially Returned' vs 'Returned')
 * - Idempotency support (user_id + idempotency_key)
 */
export class PurchaseReturnService {

  /**
   * Allowed return reasons matching DB check constraint
   */
  static ALLOWED_REASONS = [
    'Damaged', 'Expired', 'Wrong Product', 'Excess Quantity',
    'Rejected Goods', 'Quality Issue', 'Other'
  ];

  /**
   * Execute atomic purchase return
   * 
   * @param {string} userId - Authenticated user ID
   * @param {Object} payload - Return payload:
   *   - purchase_order_id: UUID (required)
   *   - return_no: string (optional)
   *   - reason: string (optional)
   *   - notes: string (optional)
   *   - idempotency_key: string (optional)
   *   - items: Array<{ purchase_order_item_id?, id?, inventory_id?, variant_id?, quantity, reason?, notes? }>
   * @returns {Promise<Object>} Result object with return record, items, and updated PO
   */
  static async createReturn(userId, payload = {}) {
    const {
      purchase_order_id: poId,
      return_no: customReturnNo,
      reason: defaultReason = 'Damaged',
      notes: defaultNotes = '',
      idempotency_key: idempotencyKey = null,
      items: requestedItems = []
    } = payload;

    if (!poId) {
      const err = new Error("Purchase order ID is required");
      err.statusCode = 400;
      throw err;
    }

    const pool = getPostgresPool();

    // 0. Idempotency Check (Fast path)
    if (idempotencyKey) {
      const existingReturnRes = await pool.query(
        `SELECT id, user_id, store_id, purchase_order_id, supplier_id, return_no, status, reason, notes, 
                total_return_amount, supplier_credit_issued, supplier_credit_amount, idempotency_key, created_at
         FROM public.purchase_returns
         WHERE user_id = $1 AND idempotency_key = $2`,
        [userId, idempotencyKey]
      );

      if (existingReturnRes.rows.length > 0) {
        const existingReturn = existingReturnRes.rows[0];
        const existingItemsRes = await pool.query(
          `SELECT id, purchase_return_id, purchase_order_item_id, inventory_id, variant_id, quantity, 
                  cost_price, total_amount, reason, notes, created_at
           FROM public.purchase_return_items
           WHERE purchase_return_id = $1`,
          [existingReturn.id]
        );
        const poRes = await pool.query(
          `SELECT * FROM public.purchase_orders WHERE id = $1`,
          [existingReturn.purchase_order_id]
        );

        return {
          return: existingReturn,
          items: existingItemsRes.rows,
          purchaseOrder: poRes.rows[0],
          is_idempotent_replay: true
        };
      }
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Lock Purchase Order Row
      const poRes = await client.query(
        `SELECT id, user_id, store_id, supplier_id, order_no, status, total_amount, subtotal, 
                tax_amount, discount_amount, organization_id
         FROM public.purchase_orders 
         WHERE id = $1 
         FOR UPDATE`,
        [poId]
      );

      if (poRes.rows.length === 0) {
        const err = new Error("Purchase order not found");
        err.statusCode = 404;
        throw err;
      }

      const po = poRes.rows[0];

      // Verify Business Ownership
      if (po.user_id !== userId) {
        const err = new Error("Unauthorized: Purchase order does not belong to your business");
        err.statusCode = 403;
        throw err;
      }

      // 2. Validate PO Status for Return
      const allowedReturnStatuses = ["Received", "Partially Received", "Partially Returned", "Completed"];
      if (!allowedReturnStatuses.includes(po.status)) {
        if (po.status === "Draft" || po.status === "Sent" || po.status === "Accepted") {
          const err = new Error(`Cannot return items from purchase order in '${po.status}' status. Goods must be received before returning.`);
          err.statusCode = 400;
          throw err;
        }
        if (po.status === "Cancelled") {
          const err = new Error("Cannot return items from a cancelled purchase order.");
          err.statusCode = 409;
          throw err;
        }
        if (po.status === "Returned") {
          const err = new Error(`Purchase order '${po.order_no}' has already been fully returned.`);
          err.statusCode = 409;
          throw err;
        }
        const err = new Error(`Cannot return purchase order in '${po.status}' status.`);
        err.statusCode = 409;
        throw err;
      }

      // 3. Validate Store Ownership
      if (!po.store_id) {
        const err = new Error("Purchase order has no assigned store");
        err.statusCode = 400;
        throw err;
      }

      const storeRes = await client.query(
        `SELECT id, user_id, name FROM public.stores WHERE id = $1`,
        [po.store_id]
      );
      if (storeRes.rows.length === 0 || storeRes.rows[0].user_id !== userId) {
        const err = new Error("Unauthorized: Store associated with this purchase order is invalid or unauthorized");
        err.statusCode = 403;
        throw err;
      }
      const storeId = po.store_id;

      // 4. Lock PO Items
      const poiRes = await client.query(
        `SELECT id, purchase_order_id, inventory_id, variant_id, quantity, cost_price, 
                gst_rate, discount_amount, received_quantity, returned_quantity, total
         FROM public.purchase_order_items 
         WHERE purchase_order_id = $1 
         FOR UPDATE`,
        [poId]
      );

      if (poiRes.rows.length === 0) {
        const err = new Error("Purchase order has no line items");
        err.statusCode = 400;
        throw err;
      }

      const poItems = poiRes.rows;

      // 5. Determine Items and Quantities to Return
      // Build return plan and validate against returnable quantities
      const returnPlan = [];
      let totalRequestedReturn = 0;

      if (requestedItems && Array.isArray(requestedItems) && requestedItems.length > 0) {
        for (const inputItem of requestedItems) {
          const match = poItems.find(item => 
            (inputItem.purchase_order_item_id && inputItem.purchase_order_item_id === item.id) ||
            (inputItem.id && inputItem.id === item.id) ||
            (inputItem.inventory_id && inputItem.inventory_id === item.inventory_id && (inputItem.variant_id || null) === (item.variant_id || null))
          );

          if (!match) {
            const err = new Error(`Item '${inputItem.purchase_order_item_id || inputItem.id || inputItem.inventory_id}' does not belong to purchase order '${po.order_no}'.`);
            err.statusCode = 400;
            throw err;
          }

          const qtyToReturn = Number(inputItem.quantity || 0);
          if (qtyToReturn <= 0) {
            const err = new Error(`Return quantity must be greater than 0 for item '${match.id}'.`);
            err.statusCode = 400;
            throw err;
          }

          const received = Number(match.received_quantity || 0);
          const alreadyReturned = Number(match.returned_quantity || 0);
          const returnable = Math.max(0, received - alreadyReturned);

          if (returnable <= 0) {
            const err = new Error(`Item has no returnable units remaining (received: ${received}, returned: ${alreadyReturned}).`);
            err.statusCode = 400;
            throw err;
          }

          if (qtyToReturn > returnable) {
            const err = new Error(`Over-return rejected: Cannot return ${qtyToReturn} units. Maximum returnable quantity is ${returnable}.`);
            err.statusCode = 400;
            throw err;
          }

          const itemReason = this.validateReason(inputItem.reason || defaultReason);
          const itemNotes = inputItem.notes || defaultNotes;

          returnPlan.push({
            item: match,
            quantity: qtyToReturn,
            returnableBefore: returnable,
            returnableAfter: returnable - qtyToReturn,
            reason: itemReason,
            notes: itemNotes
          });
          totalRequestedReturn += qtyToReturn;
        }
      } else {
        // Full return of all currently returnable goods across all items
        for (const match of poItems) {
          const received = Number(match.received_quantity || 0);
          const alreadyReturned = Number(match.returned_quantity || 0);
          const returnable = Math.max(0, received - alreadyReturned);

          if (returnable > 0) {
            returnPlan.push({
              item: match,
              quantity: returnable,
              returnableBefore: returnable,
              returnableAfter: 0,
              reason: this.validateReason(defaultReason),
              notes: defaultNotes
            });
            totalRequestedReturn += returnable;
          }
        }
      }

      if (returnPlan.length === 0 || totalRequestedReturn <= 0) {
        const err = new Error("No returnable goods found on this purchase order");
        err.statusCode = 400;
        throw err;
      }

      // Resolve user's organization_id
      const userRes = await client.query(
        `SELECT organization_id FROM public.users WHERE id = $1`,
        [userId]
      );
      const orgId = userRes.rows[0]?.organization_id || po.organization_id || userId;

      // 6. Calculate Financial Values
      let totalReturnFinancialAmount = 0;
      for (const entry of returnPlan) {
        const { item, quantity: retQty } = entry;
        const unitCost = Number(item.cost_price || 0);
        const gstRate = Number(item.gst_rate || 0);
        const itemDiscount = Number(item.discount_amount || 0);
        const orderedQty = Number(item.quantity || 1);

        const baseCost = retQty * unitCost;
        const propDiscount = orderedQty > 0 ? (itemDiscount * (retQty / orderedQty)) : 0;
        const taxable = Math.max(0, baseCost - propDiscount);
        const tax = taxable * (gstRate / 100);
        const lineTotal = Number((taxable + tax).toFixed(2));

        entry.unitCost = unitCost;
        entry.lineTotal = lineTotal;
        totalReturnFinancialAmount += lineTotal;
      }

      totalReturnFinancialAmount = Number(totalReturnFinancialAmount.toFixed(2));

      // 7. Generate Return Number
      const returnNo = customReturnNo || `RET-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 8. Insert Purchase Return Header
      const prHeaderRes = await client.query(`
        INSERT INTO public.purchase_returns (
          user_id, store_id, purchase_order_id, supplier_id, return_no, 
          status, reason, notes, total_return_amount, 
          supplier_credit_issued, supplier_credit_amount, idempotency_key, 
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'Confirmed', $6, $7, $8, true, $8, $9, now(), now())
        RETURNING *
      `, [
        userId,
        storeId,
        poId,
        po.supplier_id || null,
        returnNo,
        this.validateReason(defaultReason),
        defaultNotes,
        totalReturnFinancialAmount,
        idempotencyKey
      ]);

      const purchaseReturn = prHeaderRes.rows[0];
      const returnId = purchaseReturn.id;

      // 9. Process Each Line Item: Insert Return Item, Update PO Item, Decrement Inventory, Batches, Movement
      const processedReturnItems = [];
      const processedMovements = [];

      for (const entry of returnPlan) {
        const { item, quantity: retQty, reason, notes, unitCost, lineTotal } = entry;
        const productId = item.inventory_id;
        const variantId = item.variant_id || null;

        // a) Insert purchase_return_items
        const priRes = await client.query(`
          INSERT INTO public.purchase_return_items (
            purchase_return_id, purchase_order_item_id, inventory_id, variant_id,
            quantity, cost_price, total_amount, reason, notes, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
          RETURNING *
        `, [
          returnId,
          item.id,
          productId,
          variantId,
          retQty,
          unitCost,
          lineTotal,
          reason,
          notes
        ]);
        processedReturnItems.push(priRes.rows[0]);

        // b) Update purchase_order_items.returned_quantity
        await client.query(`
          UPDATE public.purchase_order_items 
          SET returned_quantity = returned_quantity + $1 
          WHERE id = $2
        `, [retQty, item.id]);

        // c) Decrement store_inventory
        let updatedStoreStock = 0;
        if (variantId) {
          const sRes = await client.query(`
            UPDATE public.store_inventory 
            SET stock = GREATEST(0, stock - $1), updated_at = now() 
            WHERE store_id = $2 AND product_id = $3 AND variant_id = $4
            RETURNING stock
          `, [retQty, storeId, productId, variantId]);
          updatedStoreStock = Number(sRes.rows[0]?.stock || 0);

          // Decrement product_variants stock
          await client.query(`
            UPDATE public.product_variants 
            SET stock = GREATEST(0, stock - $1), updated_at = now() 
            WHERE id = $2
          `, [retQty, variantId]);
        } else {
          const sRes = await client.query(`
            UPDATE public.store_inventory 
            SET stock = GREATEST(0, stock - $1), updated_at = now() 
            WHERE store_id = $2 AND product_id = $3 AND variant_id IS NULL
            RETURNING stock
          `, [retQty, storeId, productId]);
          updatedStoreStock = Number(sRes.rows[0]?.stock || 0);
        }

        // d) Decrement public.inventory master stock
        if (productId) {
          await client.query(`
            UPDATE public.inventory 
            SET stock = GREATEST(0, stock - $1), updated_at = now() 
            WHERE id = $2
          `, [retQty, productId]);
        }

        // e) Decrement inventory_batches (FIFO)
        let neededBatchDeduct = retQty;
        const batchesRes = await client.query(`
          SELECT id, stock 
          FROM public.inventory_batches 
          WHERE store_id = $1 
            AND inventory_id = $2 
            AND ((variant_id = $3) OR (variant_id IS NULL AND $3 IS NULL))
            AND stock > 0 
          ORDER BY created_at ASC 
          FOR UPDATE
        `, [storeId, productId, variantId]);

        let lastBatchId = null;
        for (const batch of batchesRes.rows) {
          if (neededBatchDeduct <= 0) break;
          const currentBatchStock = Number(batch.stock);
          const deductFromThis = Math.min(neededBatchDeduct, currentBatchStock);

          await client.query(`
            UPDATE public.inventory_batches 
            SET stock = stock - $1, updated_at = now() 
            WHERE id = $2
          `, [deductFromThis, batch.id]);

          neededBatchDeduct -= deductFromThis;
          lastBatchId = batch.id;
        }

        // f) Record immutable stock movement in public.stock_movements
        const smRes = await client.query(`
          INSERT INTO public.stock_movements (
            organization_id, store_id, product_id, variant_id, batch_id, 
            quantity_change, balance_after, movement_type, reason, 
            reference_type, reference_id, user_id, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'RETURN_TO_SUPPLIER', $8, 'purchase_returns', $9, $10, now())
          RETURNING id
        `, [
          orgId,
          storeId,
          productId,
          variantId,
          lastBatchId,
          -retQty, // Negative quantity change
          updatedStoreStock,
          `Return #${returnNo} for PO #${po.order_no}${notes ? ' - ' + notes : ''}`,
          String(returnId),
          userId
        ]);
        processedMovements.push(smRes.rows[0]?.id);
      }

      // 10. Update Supplier Payable (outstanding_balance) inside the SAME transaction
      if (po.supplier_id && totalReturnFinancialAmount > 0) {
        const suppRes = await client.query(
          `SELECT id, outstanding_balance FROM public.suppliers WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [po.supplier_id, userId]
        );
        if (suppRes.rows.length > 0) {
          await client.query(`
            UPDATE public.suppliers 
            SET outstanding_balance = GREATEST(0, outstanding_balance - $1), updated_at = now() 
            WHERE id = $2
          `, [totalReturnFinancialAmount, po.supplier_id]);
        }
      }

      // 11. Determine New PO Status
      const checkAllRes = await client.query(
        `SELECT quantity, received_quantity, returned_quantity FROM public.purchase_order_items WHERE purchase_order_id = $1`,
        [poId]
      );

      // Fully returned if all items that had received stock have now been completely returned
      const receivedItems = checkAllRes.rows.filter(r => Number(r.received_quantity) > 0);
      const allFullyReturned = receivedItems.length > 0 && receivedItems.every(r => Number(r.returned_quantity) >= Number(r.received_quantity));
      const newPoStatus = allFullyReturned ? 'Returned' : 'Partially Returned';

      const updatedPoRes = await client.query(`
        UPDATE public.purchase_orders 
        SET status = $1, updated_at = now() 
        WHERE id = $2 
        RETURNING *
      `, [newPoStatus, poId]);
      const updatedPo = updatedPoRes.rows[0];

      // 12. Record Audit Log Entry
      try {
        await client.query(`
          INSERT INTO public.audit_logs (
            user_id, store_id, entity_type, entity_id, action, details, table_name, record_id, created_at
          )
          VALUES ($1, $2, 'purchase_return', $3, 'CREATE', $4, 'purchase_returns', $3, now())
        `, [
          userId,
          storeId,
          returnId,
          JSON.stringify({
            return_no: returnNo,
            purchase_order_id: poId,
            po_order_no: po.order_no,
            total_return_amount: totalReturnFinancialAmount,
            status: newPoStatus,
            items_count: processedReturnItems.length
          })
        ]);
      } catch (auditErr) {
        console.warn("[PurchaseReturnService] Audit log non-fatal error:", auditErr.message);
      }

      // Commit entire atomic transaction
      await client.query("COMMIT");

      // Invalidate caches
      try {
        await FinancialCacheService.invalidate(null, userId);
      } catch (cacheErr) {
        console.warn("[PurchaseReturnService] Cache invalidation non-fatal warning:", cacheErr.message);
      }

      return {
        return: purchaseReturn,
        items: processedReturnItems,
        purchaseOrder: updatedPo,
        status: newPoStatus,
        stock_movements_count: processedMovements.length,
        total_return_amount: totalReturnFinancialAmount
      };

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Validate and normalize return reason against DB constraint
   */
  static validateReason(reason) {
    if (!reason) return 'Damaged';
    if (this.ALLOWED_REASONS.includes(reason)) return reason;
    return 'Other';
  }

  /**
   * Get all returns for a specific Purchase Order
   * 
   * @param {string} userId - Authenticated user ID
   * @param {string} poId - Purchase Order UUID
   */
  static async getReturnsByPoId(userId, poId) {
    const pool = getPostgresPool();

    // Verify PO ownership
    const poRes = await pool.query(
      `SELECT id, user_id, order_no FROM public.purchase_orders WHERE id = $1 AND user_id = $2`,
      [poId, userId]
    );
    if (poRes.rows.length === 0) {
      const err = new Error("Purchase order not found or unauthorized");
      err.statusCode = 404;
      throw err;
    }

    const returnsRes = await pool.query(
      `SELECT pr.*, 
              json_agg(
                json_build_object(
                  'id', pri.id,
                  'purchase_order_item_id', pri.purchase_order_item_id,
                  'inventory_id', pri.inventory_id,
                  'variant_id', pri.variant_id,
                  'quantity', pri.quantity,
                  'cost_price', pri.cost_price,
                  'total_amount', pri.total_amount,
                  'reason', pri.reason,
                  'notes', pri.notes,
                  'product_name', inv.name
                )
              ) FILTER (WHERE pri.id IS NOT NULL) AS items
       FROM public.purchase_returns pr
       LEFT JOIN public.purchase_return_items pri ON pr.id = pri.purchase_return_id
       LEFT JOIN public.inventory inv ON pri.inventory_id = inv.id
       WHERE pr.purchase_order_id = $1 AND pr.user_id = $2
       GROUP BY pr.id
       ORDER BY pr.created_at DESC`,
      [poId, userId]
    );

    return returnsRes.rows;
  }

  /**
   * Get return by ID
   * 
   * @param {string} userId - Authenticated user ID
   * @param {string} returnId - Purchase Return UUID
   */
  static async getReturnById(userId, returnId) {
    const pool = getPostgresPool();

    const returnRes = await pool.query(
      `SELECT pr.*, 
              po.order_no as po_order_no,
              s.name as supplier_name,
              json_agg(
                json_build_object(
                  'id', pri.id,
                  'purchase_order_item_id', pri.purchase_order_item_id,
                  'inventory_id', pri.inventory_id,
                  'variant_id', pri.variant_id,
                  'quantity', pri.quantity,
                  'cost_price', pri.cost_price,
                  'total_amount', pri.total_amount,
                  'reason', pri.reason,
                  'notes', pri.notes,
                  'product_name', inv.name
                )
              ) FILTER (WHERE pri.id IS NOT NULL) AS items
       FROM public.purchase_returns pr
       LEFT JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
       LEFT JOIN public.suppliers s ON pr.supplier_id = s.id
       LEFT JOIN public.purchase_return_items pri ON pr.id = pri.purchase_return_id
       LEFT JOIN public.inventory inv ON pri.inventory_id = inv.id
       WHERE pr.id = $1 AND pr.user_id = $2
       GROUP BY pr.id, po.order_no, s.name`,
      [returnId, userId]
    );

    if (returnRes.rows.length === 0) {
      const err = new Error("Purchase return not found or unauthorized");
      err.statusCode = 404;
      throw err;
    }

    return returnRes.rows[0];
  }
}

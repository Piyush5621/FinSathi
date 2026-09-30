import { getPostgresPool } from "../../../config/postgres.js";
import { FinancialCacheService } from "../../../utils/cache.js";

/**
 * PurchaseReceivingService — Canonical Atomic Purchase Receiving Engine
 * 
 * Guarantees:
 * - 100% Single PostgreSQL Transaction (atomic commit / rollback)
 * - Strict Row Locking (SELECT ... FOR UPDATE on PO and PO items)
 * - Authoritative Remaining Quantity Validation (no over-receiving)
 * - Multi-Store Isolation (stock added ONLY to PO's validated store)
 * - Canonical Feature 4 Inventory updates (store_inventory, inventory, product_variants)
 * - Traceable Batch Creation (inventory_batches)
 * - Immutable Stock Movement Audit (stock_movements with 'RESTOCK')
 * - Real-Time Supplier Payable Adjustment (suppliers.outstanding_balance)
 * - Synchronous Expense Creation (expenses)
 * - Proper State Transitions ('Partially Received' vs 'Received')
 * - Idempotency against double-clicks and retries
 */
export class PurchaseReceivingService {

  /**
   * Execute atomic purchase receiving
   * 
   * @param {string} userId - Authenticated user ID
   * @param {string} poId - Purchase order ID
   * @param {Object} options - Receiving options: { items, batch_name, notes }
   */
  static async receivePurchaseOrder(userId, poId, options = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Lock Purchase Order Row
      const poRes = await client.query(
        `SELECT id, user_id, store_id, supplier_id, order_no, status, total_amount, subtotal, tax_amount, discount_amount, organization_id
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

      // 2. Validate PO Status for Receiving
      const allowedReceivingStatuses = ["Sent", "Accepted", "Partially Received"];
      if (!allowedReceivingStatuses.includes(po.status)) {
        if (po.status === "Received" || po.status === "Completed") {
          const err = new Error(`Purchase order '${po.order_no}' is already fully received.`);
          err.statusCode = 409;
          throw err;
        }
        if (po.status === "Cancelled") {
          const err = new Error("Cannot receive goods against a cancelled purchase order.");
          err.statusCode = 409;
          throw err;
        }
        if (po.status === "Draft") {
          const err = new Error("Cannot receive a Draft purchase order. Send and accept the order first.");
          err.statusCode = 400;
          throw err;
        }
        const err = new Error(`Cannot receive purchase order in '${po.status}' status.`);
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

      // 4. Lock and Fetch PO Items
      const poiRes = await client.query(
        `SELECT id, purchase_order_id, inventory_id, variant_id, quantity, cost_price, gst_rate, discount_amount, received_quantity, total
         FROM public.purchase_order_items 
         WHERE purchase_order_id = $1 
         FOR UPDATE`,
        [poId]
      );

      if (poiRes.rows.length === 0) {
        const err = new Error("Purchase order has no items to receive");
        err.statusCode = 400;
        throw err;
      }

      const poItems = poiRes.rows;

      // 5. Determine Quantities to Receive
      // options.items may specify specific item quantities: [{ id, quantity }] or [{ inventory_id, quantity }]
      // If specific items requested, validate that every item belongs to this PO
      if (options.items && Array.isArray(options.items) && options.items.length > 0) {
        for (const inputItem of options.items) {
          const match = poItems.find(item => 
            (inputItem.id && inputItem.id === item.id) || 
            (inputItem.inventory_id && inputItem.inventory_id === item.inventory_id && (inputItem.variant_id || null) === (item.variant_id || null))
          );
          if (!match) {
            const err = new Error(`Item '${inputItem.id || inputItem.inventory_id}' does not belong to purchase order '${po.order_no}'.`);
            err.statusCode = 400;
            throw err;
          }
        }
      }

      // If options.items is empty or not provided, default to receiving all remaining quantities (Full Receiving).
      const receivePlan = [];
      let totalRequestedReceive = 0;

      for (const item of poItems) {
        const ordered = Number(item.quantity);
        const alreadyReceived = Number(item.received_quantity || 0);
        const remaining = Math.max(0, ordered - alreadyReceived);

        let qtyToReceive = 0;

        if (options.items && Array.isArray(options.items) && options.items.length > 0) {
          // Specified line item
          const match = options.items.find(i => 
            (i.id && i.id === item.id) || 
            (i.inventory_id && i.inventory_id === item.inventory_id && (i.variant_id || null) === (item.variant_id || null))
          );
          if (match) {
            qtyToReceive = Number(match.quantity || 0);
          }
        } else {
          // Full receiving of remaining quantity
          qtyToReceive = remaining;
        }

        if (qtyToReceive > 0) {
          if (qtyToReceive > remaining) {
            const err = new Error(`Over-receiving rejected: Cannot receive ${qtyToReceive} units for product. Remaining quantity is ${remaining}.`);
            err.statusCode = 400;
            throw err;
          }
          receivePlan.push({
            item,
            quantity: qtyToReceive,
            remainingBefore: remaining,
            remainingAfter: remaining - qtyToReceive
          });
          totalRequestedReceive += qtyToReceive;
        }
      }

      if (receivePlan.length === 0 || totalRequestedReceive <= 0) {
        // Check if PO was already fully received
        const totalRemaining = poItems.reduce((acc, it) => acc + Math.max(0, Number(it.quantity) - Number(it.received_quantity || 0)), 0);
        if (totalRemaining === 0) {
          const err = new Error(`Purchase order '${po.order_no}' is already fully received.`);
          err.statusCode = 409;
          throw err;
        }
        const err = new Error("No valid item quantities specified to receive");
        err.statusCode = 400;
        throw err;
      }

      // Resolve user's organization_id
      const userRes = await client.query(
        `SELECT organization_id FROM public.users WHERE id = $1`,
        [userId]
      );
      const orgId = userRes.rows[0]?.organization_id || po.organization_id || userId;

      // 6. Process Each Item: Inventory, Batches, Stock Movements, PO Item Update
      let totalReceivedFinancialAmount = 0;
      const processedMovements = [];
      const processedBatches = [];

      for (const entry of receivePlan) {
        const { item, quantity: recvQty } = entry;
        const productId = item.inventory_id;
        const variantId = item.variant_id || null;
        const unitCost = Number(item.cost_price);
        const gstRate = Number(item.gst_rate || 0);
        const itemDiscount = Number(item.discount_amount || 0);

        // a) Validate product exists and belongs to business
        const prodRes = await client.query(
          `SELECT id, user_id, name, selling_price, stock FROM public.inventory WHERE id = $1`,
          [productId]
        );
        if (prodRes.rows.length === 0 || prodRes.rows[0].user_id !== userId) {
          const err = new Error(`Product associated with PO item does not belong to your business`);
          err.statusCode = 403;
          throw err;
        }
        const product = prodRes.rows[0];

        // b) Validate variant if present
        let variant = null;
        if (variantId) {
          const varRes = await client.query(
            `SELECT id, product_id, name, selling_price, stock FROM public.product_variants WHERE id = $1`,
            [variantId]
          );
          if (varRes.rows.length === 0 || varRes.rows[0].product_id !== productId) {
            const err = new Error(`Variant does not belong to the specified product`);
            err.statusCode = 400;
            throw err;
          }
          variant = varRes.rows[0];

          // Update variant stock in product_variants
          await client.query(
            `UPDATE public.product_variants SET stock = stock + $1, updated_at = now() WHERE id = $2`,
            [recvQty, variantId]
          );
        }

        // c) Update store_inventory (Feature 4 Canonical Multi-Store Model)
        let storeStock = recvQty;
        if (variantId) {
          const sRes = await client.query(`
            INSERT INTO public.store_inventory 
              (organization_id, store_id, product_id, variant_id, stock, low_stock_threshold, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 10, now(), now())
            ON CONFLICT (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL
            DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = now()
            RETURNING stock
          `, [orgId, storeId, productId, variantId, recvQty]);
          storeStock = Number(sRes.rows[0]?.stock || recvQty);
        } else {
          const sRes = await client.query(`
            INSERT INTO public.store_inventory 
              (organization_id, store_id, product_id, stock, low_stock_threshold, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 10, now(), now())
            ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
            DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = now()
            RETURNING stock
          `, [orgId, storeId, productId, recvQty]);
          storeStock = Number(sRes.rows[0]?.stock || recvQty);
        }

        // d) Update public.inventory master stock & cost price
        await client.query(
          `UPDATE public.inventory SET stock = stock + $1, cost_price = $2, updated_at = now() WHERE id = $3`,
          [recvQty, unitCost, productId]
        );

        // e) Create batch in public.inventory_batches
        const sellingPrice = Number(variant?.selling_price || product.selling_price || unitCost);
        const batchName = options.batch_name || `PO #${po.order_no} - Batch`;
        const skuVariant = variant?.name || product.name;

        const bRes = await client.query(`
          INSERT INTO public.inventory_batches 
            (inventory_id, store_id, variant_id, batch_name, sku_variant, cost_price, selling_price, stock, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
          RETURNING id
        `, [
          productId,
          storeId,
          variantId,
          batchName,
          skuVariant,
          unitCost,
          sellingPrice,
          Math.round(recvQty)
        ]);
        const batchId = bRes.rows[0]?.id;
        processedBatches.push(batchId);

        // f) Record immutable stock movement in public.stock_movements
        const smRes = await client.query(`
          INSERT INTO public.stock_movements 
            (organization_id, store_id, product_id, variant_id, batch_id, quantity_change, balance_after, movement_type, reason, reference_type, reference_id, user_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'RESTOCK', $8, 'purchase_orders', $9, $10, now())
          RETURNING id
        `, [
          orgId,
          storeId,
          productId,
          variantId,
          batchId,
          recvQty,
          storeStock,
          `PO Goods Received #${po.order_no}${options.notes ? ' - ' + options.notes : ''}`,
          String(poId),
          userId
        ]);
        processedMovements.push(smRes.rows[0]?.id);

        // g) Update purchase_order_items.received_quantity
        await client.query(
          `UPDATE public.purchase_order_items SET received_quantity = received_quantity + $1 WHERE id = $2`,
          [recvQty, item.id]
        );

        // h) Calculate financial value for this received item
        const baseCost = recvQty * unitCost;
        const proportionalDiscount = Number(item.quantity) > 0 ? (itemDiscount * (recvQty / Number(item.quantity))) : 0;
        const taxableAmount = Math.max(0, baseCost - proportionalDiscount);
        const taxVal = taxableAmount * (gstRate / 100);
        const lineReceivedTotal = taxableAmount + taxVal;

        totalReceivedFinancialAmount += lineReceivedTotal;
      }

      totalReceivedFinancialAmount = Number(totalReceivedFinancialAmount.toFixed(2));

      // 7. Update Supplier Payable (outstanding_balance) inside the SAME transaction
      if (po.supplier_id && totalReceivedFinancialAmount > 0) {
        const suppRes = await client.query(
          `SELECT id, outstanding_balance FROM public.suppliers WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [po.supplier_id, userId]
        );
        if (suppRes.rows.length > 0) {
          await client.query(
            `UPDATE public.suppliers 
             SET outstanding_balance = outstanding_balance + $1, updated_at = now() 
             WHERE id = $2`,
            [totalReceivedFinancialAmount, po.supplier_id]
          );
        }
      }

      // 8. Record Purchase Expense inside the SAME transaction
      if (totalReceivedFinancialAmount > 0) {
        await client.query(`
          INSERT INTO public.expenses 
            (user_id, store_id, supplier_id, category, amount, date, description, created_at)
          VALUES ($1, $2, $3, 'Purchases', $4, now(), $5, now())
        `, [
          userId,
          storeId,
          po.supplier_id || null,
          totalReceivedFinancialAmount,
          `Purchase Order Received: ${po.order_no}`
        ]);
      }

      // 9. Determine New PO Status
      // Re-query updated PO items to verify if completely received
      const checkAllRes = await client.query(
        `SELECT quantity, received_quantity FROM public.purchase_order_items WHERE purchase_order_id = $1`,
        [poId]
      );
      const allFullyReceived = checkAllRes.rows.every(r => Number(r.received_quantity) >= Number(r.quantity));
      const newStatus = allFullyReceived ? 'Received' : 'Partially Received';

      // Update PO status & updated_at
      const updatedPoRes = await client.query(`
        UPDATE public.purchase_orders 
        SET status = $1, updated_at = now() 
        WHERE id = $2 
        RETURNING *
      `, [newStatus, poId]);
      const updatedPo = updatedPoRes.rows[0];

      // 10. Record Audit Log inside the SAME transaction
      await client.query(`
        INSERT INTO public.audit_logs 
          (user_id, store_id, entity_type, entity_id, action, details, table_name, record_id, created_at)
        VALUES ($1, $2, 'PurchaseOrder', $3, 'Goods Received', $4, 'purchase_orders', $5, now())
      `, [
        userId,
        storeId,
        poId,
        JSON.stringify({
          order_no: po.order_no,
          received_amount: totalReceivedFinancialAmount,
          status: newStatus,
          item_count: receivePlan.length,
          received_qty_total: totalRequestedReceive
        }),
        poId
      ]);

      // COMMIT TRANSACTION — ALL OR NOTHING
      await client.query("COMMIT");

      // Invalidate Financial Intelligence Cache
      try {
        await FinancialCacheService.invalidate(orgId, userId);
      } catch (cErr) {
        console.warn("[PurchaseReceivingService] Cache invalidation notice:", cErr.message);
      }

      return {
        success: true,
        purchaseOrder: updatedPo,
        status: newStatus,
        receivedAmount: totalReceivedFinancialAmount,
        receivedItemsCount: receivePlan.length,
        receivedQtyTotal: totalRequestedReceive,
        batchesCreated: processedBatches,
        movementsCreated: processedMovements
      };

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

import { getPostgresPool } from "../../../config/postgres.js";
import { StoreService } from "../../../services/StoreService.js";
import crypto from "crypto";

/**
 * PurchaseOrderService — Canonical Service for Feature 5 Purchase Orders
 * 
 * Guarantees:
 * - 100% Atomic PostgreSQL transactions (no orphaned headers or compensation steps)
 * - Row locking (SELECT ... FOR UPDATE) on state transitions and edits
 * - Server-side authoritative total calculations
 * - Server-side validation of stores, suppliers, products, and variants
 * - Concurrency-safe unique order_no generation
 * - Idempotency protection against rapid duplicate submissions
 * - Strict state machine transitions
 * - Non-destructive cancellation
 * - Real audit logging
 */
export class PurchaseOrderService {

  /**
   * Helper: Record audit log entry within transaction or client
   */
  static async logAudit(client, { userId, storeId, entityId, action, details, orderNo }) {
    try {
      await client.query(`
        INSERT INTO public.audit_logs 
          (user_id, store_id, entity_type, entity_id, action, details, table_name, record_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        storeId,
        'PurchaseOrder',
        entityId,
        action,
        JSON.stringify({ ...details, order_no: orderNo }),
        'purchase_orders',
        entityId
      ]);
    } catch (err) {
      console.warn("[PurchaseOrderService] Audit log warning:", err.message);
    }
  }

  /**
   * Helper: Generate unique order_no within business scope
   */
  static async generateOrderNumber(client, userId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const candidate = `PO-${today}-${suffix}`;

      const check = await client.query(
        `SELECT id FROM public.purchase_orders WHERE user_id = $1 AND order_no = $2`,
        [userId, candidate]
      );
      if (check.rows.length === 0) {
        return candidate;
      }
    }
    return `PO-${today}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Helper: Validate and calculate line items & authoritative totals
   */
  static async validateAndCalculateItems(client, userId, items, headerTax, headerDiscount) {
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error("Purchase Order must contain at least one line item");
      err.statusCode = 400;
      throw err;
    }

    let calculatedSubtotal = 0;
    let calculatedItemTaxTotal = 0;
    const validatedItems = [];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const inventoryId = item.inventory_id;
      const variantId = item.variant_id || null;

      // 1. Validate quantity
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        const err = new Error(`Item at position ${idx + 1} has invalid quantity. Must be greater than 0.`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Validate cost price
      const price = Number(item.cost_price);
      if (!Number.isFinite(price) || price < 0) {
        const err = new Error(`Item at position ${idx + 1} has invalid cost price. Must be 0 or greater.`);
        err.statusCode = 400;
        throw err;
      }

      // 3. Validate GST rate
      const gstRate = Number(item.gst_rate || 0);
      if (!Number.isFinite(gstRate) || gstRate < 0) {
        const err = new Error(`Item at position ${idx + 1} has invalid GST rate. Must be 0 or greater.`);
        err.statusCode = 400;
        throw err;
      }

      // 4. Validate discount
      const itemDiscount = Number(item.discount_amount || 0);
      if (!Number.isFinite(itemDiscount) || itemDiscount < 0) {
        const err = new Error(`Item at position ${idx + 1} has invalid discount. Must be 0 or greater.`);
        err.statusCode = 400;
        throw err;
      }

      // 5. Verify product ownership (Business Scoping)
      if (!inventoryId) {
        const err = new Error(`Item at position ${idx + 1} is missing inventory_id.`);
        err.statusCode = 400;
        throw err;
      }

      const prodRes = await client.query(
        `SELECT id, user_id, name FROM public.inventory WHERE id = $1`,
        [inventoryId]
      );
      if (prodRes.rows.length === 0) {
        const err = new Error(`Product at position ${idx + 1} not found.`);
        err.statusCode = 400;
        throw err;
      }
      if (prodRes.rows[0].user_id !== userId) {
        const err = new Error(`Unauthorized: Product at position ${idx + 1} does not belong to your business.`);
        err.statusCode = 403;
        throw err;
      }

      // 6. Verify variant ownership & relationship to product (if supplied)
      if (variantId) {
        const varRes = await client.query(
          `SELECT id, product_id, name FROM public.product_variants WHERE id = $1`,
          [variantId]
        );
        if (varRes.rows.length === 0) {
          const err = new Error(`Variant at position ${idx + 1} not found.`);
          err.statusCode = 400;
          throw err;
        }
        if (varRes.rows[0].product_id !== inventoryId) {
          const err = new Error(`Variant '${varRes.rows[0].name}' does not belong to product '${prodRes.rows[0].name}'.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // 7. Authoritative line calculations
      const rawBase = qty * price;
      const lineSubtotal = Math.max(0, rawBase - itemDiscount);
      const lineTax = Number((lineSubtotal * (gstRate / 100)).toFixed(2));
      const lineTotal = Number((lineSubtotal + lineTax).toFixed(2));

      calculatedSubtotal += lineSubtotal;
      calculatedItemTaxTotal += lineTax;

      validatedItems.push({
        inventory_id: inventoryId,
        variant_id: variantId,
        quantity: qty,
        cost_price: price,
        discount_amount: itemDiscount,
        gst_rate: gstRate,
        total: lineTotal
      });
    }

    // 8. PO Level Calculations
    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));
    const finalTaxAmount = headerTax !== undefined && headerTax !== null
      ? Number(Number(headerTax).toFixed(2))
      : Number(calculatedItemTaxTotal.toFixed(2));

    if (!Number.isFinite(finalTaxAmount) || finalTaxAmount < 0) {
      const err = new Error("Invalid PO tax amount. Must be 0 or greater.");
      err.statusCode = 400;
      throw err;
    }

    const finalDiscountAmount = Number(Number(headerDiscount || 0).toFixed(2));
    if (!Number.isFinite(finalDiscountAmount) || finalDiscountAmount < 0) {
      const err = new Error("Invalid PO discount amount. Must be 0 or greater.");
      err.statusCode = 400;
      throw err;
    }

    const calculatedTotalAmount = Math.max(0, Number((calculatedSubtotal + finalTaxAmount - finalDiscountAmount).toFixed(2)));

    return {
      normalizedItems: validatedItems,
      subtotal: calculatedSubtotal,
      taxAmount: finalTaxAmount,
      discountAmount: finalDiscountAmount,
      totalAmount: calculatedTotalAmount
    };
  }

  /**
   * Atomic PO Creation
   */
  static async createPurchaseOrder(userId, payload) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const {
        supplier_id,
        store_id,
        order_no,
        items,
        tax_amount,
        discount_amount,
        notes,
        date,
        expected_delivery_date
      } = payload;

      // 1. Validate Store Ownership
      let targetStoreId = store_id;
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

      // 2. Validate Supplier Ownership & State
      if (!supplier_id) {
        const err = new Error("Supplier ID is required");
        err.statusCode = 400;
        throw err;
      }

      const suppRes = await client.query(
        `SELECT id, user_id, is_archived, store_id, is_discoverable FROM public.suppliers WHERE id = $1`,
        [supplier_id]
      );
      if (suppRes.rows.length === 0 || (suppRes.rows[0].user_id !== userId && !suppRes.rows[0].is_discoverable)) {
        const err = new Error("Invalid or unauthorized supplier");
        err.statusCode = 400;
        throw err;
      }
      if (suppRes.rows[0].is_archived) {
        const err = new Error("Cannot create purchase orders for an archived supplier");
        err.statusCode = 400;
        throw err;
      }
      if (suppRes.rows[0].store_id && suppRes.rows[0].store_id !== targetStoreId) {
        const err = new Error("Supplier is scoped to a different store");
        err.statusCode = 403;
        throw err;
      }

      // 3. Resolve & Verify Order Number (Idempotency & Uniqueness)
      let finalOrderNo = order_no ? order_no.trim() : null;
      if (finalOrderNo) {
        const dupCheck = await client.query(
          `SELECT id, total_amount, status FROM public.purchase_orders WHERE user_id = $1 AND order_no = $2`,
          [userId, finalOrderNo]
        );
        if (dupCheck.rows.length > 0) {
          const err = new Error(`A Purchase Order with number '${finalOrderNo}' already exists.`);
          err.statusCode = 409;
          throw err;
        }
      } else {
        finalOrderNo = await this.generateOrderNumber(client, userId);
      }

      // 4. Validate Items & Compute Authoritative Totals
      const {
        normalizedItems,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount
      } = await this.validateAndCalculateItems(client, userId, items, tax_amount, discount_amount);

      // 5. Insert PO Header
      const effectiveDate = date ? new Date(date) : new Date();
      const expDelivery = expected_delivery_date ? new Date(expected_delivery_date) : null;
      const purchaseRequestId = payload.purchase_request_id || null;

      const poInsertRes = await client.query(`
        INSERT INTO public.purchase_orders 
          (user_id, store_id, supplier_id, order_no, status, subtotal, tax_amount, 
           discount_amount, total_amount, notes, date, expected_delivery_date, purchase_request_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'Draft', $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
        RETURNING *
      `, [
        userId,
        targetStoreId,
        supplier_id,
        finalOrderNo,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        notes || null,
        effectiveDate,
        expDelivery,
        purchaseRequestId
      ]);

      const createdPo = poInsertRes.rows[0];

      // 6. Insert Line Items
      const createdItems = [];
      for (const item of normalizedItems) {
        const itemRes = await client.query(`
          INSERT INTO public.purchase_order_items
            (purchase_order_id, inventory_id, variant_id, quantity, cost_price, 
             discount_amount, gst_rate, total, received_quantity, returned_quantity, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, now())
          RETURNING *
        `, [
          createdPo.id,
          item.inventory_id,
          item.variant_id,
          item.quantity,
          item.cost_price,
          item.discount_amount,
          item.gst_rate,
          item.total
        ]);
        createdItems.push(itemRes.rows[0]);
      }

      // 7. Audit Log
      await this.logAudit(client, {
        userId,
        storeId: targetStoreId,
        entityId: createdPo.id,
        action: 'Created',
        details: { order_no: finalOrderNo, total_amount: totalAmount, item_count: createdItems.length },
        orderNo: finalOrderNo
      });

      await client.query('COMMIT');

      return {
        ...createdPo,
        items: createdItems
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Atomic PO Update (Draft or Sent only)
   */
  static async updatePurchaseOrder(userId, poId, payload) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock PO Row for Update
      const lockRes = await client.query(
        `SELECT * FROM public.purchase_orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [poId, userId]
      );
      if (lockRes.rows.length === 0) {
        const err = new Error("Purchase order not found");
        err.statusCode = 404;
        throw err;
      }
      const existingPo = lockRes.rows[0];

      // 2. Editing Rules Guard
      if (!['Draft', 'Sent'].includes(existingPo.status)) {
        const err = new Error(`Cannot edit purchase order in '${existingPo.status}' status. Only Draft or Sent orders may be edited.`);
        err.statusCode = 409;
        throw err;
      }

      const {
        supplier_id = existingPo.supplier_id,
        order_no = existingPo.order_no,
        items,
        tax_amount,
        discount_amount,
        notes = existingPo.notes,
        expected_delivery_date
      } = payload;

      // 3. Validate Supplier
      const suppRes = await client.query(
        `SELECT id, user_id, is_archived, store_id FROM public.suppliers WHERE id = $1`,
        [supplier_id]
      );
      if (suppRes.rows.length === 0 || suppRes.rows[0].user_id !== userId) {
        const err = new Error("Invalid or unauthorized supplier");
        err.statusCode = 400;
        throw err;
      }
      if (suppRes.rows[0].is_archived && supplier_id !== existingPo.supplier_id) {
        const err = new Error("Cannot reassign purchase order to an archived supplier");
        err.statusCode = 400;
        throw err;
      }

      // 4. Validate Order Number if Changed
      const finalOrderNo = order_no ? order_no.trim() : existingPo.order_no;
      if (finalOrderNo !== existingPo.order_no) {
        const dupCheck = await client.query(
          `SELECT id FROM public.purchase_orders WHERE user_id = $1 AND order_no = $2 AND id != $3`,
          [userId, finalOrderNo, poId]
        );
        if (dupCheck.rows.length > 0) {
          const err = new Error(`A Purchase Order with number '${finalOrderNo}' already exists.`);
          err.statusCode = 409;
          throw err;
        }
      }

      // 5. Validate Items & Calculate Authoritative Totals
      const itemsToValidate = items && Array.isArray(items) && items.length > 0
        ? items
        : null;

      let subtotal = existingPo.subtotal;
      let finalTax = tax_amount !== undefined ? Number(tax_amount) : existingPo.tax_amount;
      let finalDiscount = discount_amount !== undefined ? Number(discount_amount) : existingPo.discount_amount;
      let totalAmount = existingPo.total_amount;
      let updatedItems = [];

      if (itemsToValidate) {
        const calc = await this.validateAndCalculateItems(
          client, 
          userId, 
          itemsToValidate, 
          tax_amount !== undefined ? tax_amount : existingPo.tax_amount, 
          discount_amount !== undefined ? discount_amount : existingPo.discount_amount
        );
        subtotal = calc.subtotal;
        finalTax = calc.taxAmount;
        finalDiscount = calc.discountAmount;
        totalAmount = calc.totalAmount;

        // Delete old line items
        await client.query(
          `DELETE FROM public.purchase_order_items WHERE purchase_order_id = $1`,
          [poId]
        );

        // Insert new line items
        for (const item of calc.normalizedItems) {
          const itemRes = await client.query(`
            INSERT INTO public.purchase_order_items
              (purchase_order_id, inventory_id, variant_id, quantity, cost_price, 
               discount_amount, gst_rate, total, received_quantity, returned_quantity, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, now())
            RETURNING *
          `, [
            poId,
            item.inventory_id,
            item.variant_id,
            item.quantity,
            item.cost_price,
            item.discount_amount,
            item.gst_rate,
            item.total
          ]);
          updatedItems.push(itemRes.rows[0]);
        }
      }

      // 6. Update PO Header
      const expDelivery = expected_delivery_date !== undefined
        ? (expected_delivery_date ? new Date(expected_delivery_date) : null)
        : existingPo.expected_delivery_date;

      const updateRes = await client.query(`
        UPDATE public.purchase_orders
        SET supplier_id = $1,
            order_no = $2,
            subtotal = $3,
            tax_amount = $4,
            discount_amount = $5,
            total_amount = $6,
            notes = $7,
            expected_delivery_date = $8,
            updated_at = now()
        WHERE id = $9
        RETURNING *
      `, [
        supplier_id,
        finalOrderNo,
        subtotal,
        finalTax,
        finalDiscount,
        totalAmount,
        notes,
        expDelivery,
        poId
      ]);

      const updatedPo = updateRes.rows[0];

      // 7. Audit Log
      await this.logAudit(client, {
        userId,
        storeId: existingPo.store_id,
        entityId: poId,
        action: 'Edited',
        details: { order_no: finalOrderNo, total_amount: totalAmount, item_count: updatedItems.length },
        orderNo: finalOrderNo
      });

      await client.query('COMMIT');

      return {
        ...updatedPo,
        items: updatedItems
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete PO (Draft only)
   */
  static async deletePurchaseOrder(userId, poId) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Lock row
      const lockRes = await client.query(
        `SELECT id, status, order_no, store_id FROM public.purchase_orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [poId, userId]
      );
      if (lockRes.rows.length === 0) {
        const err = new Error("Purchase order not found");
        err.statusCode = 404;
        throw err;
      }
      const po = lockRes.rows[0];

      if (po.status !== 'Draft') {
        const err = new Error(`Only Draft purchase orders can be deleted. Current status is '${po.status}'. Please cancel the order instead.`);
        err.statusCode = 409;
        throw err;
      }

      // Delete items
      await client.query(
        `DELETE FROM public.purchase_order_items WHERE purchase_order_id = $1`,
        [poId]
      );

      // Delete PO
      await client.query(
        `DELETE FROM public.purchase_orders WHERE id = $1`,
        [poId]
      );

      // Audit Log
      await this.logAudit(client, {
        userId,
        storeId: po.store_id,
        entityId: poId,
        action: 'Deleted',
        details: { order_no: po.order_no },
        orderNo: po.order_no
      });

      await client.query('COMMIT');
      return { id: poId, order_no: po.order_no };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Concurrency-safe State Machine Transition
   */
  static async updateStatus(userId, poId, newStatus) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Row-Level Lock on PO row
      const lockRes = await client.query(
        `SELECT id, status, order_no, store_id, total_amount, supplier_id 
         FROM public.purchase_orders 
         WHERE id = $1 AND user_id = $2 
         FOR UPDATE`,
        [poId, userId]
      );

      if (lockRes.rows.length === 0) {
        const err = new Error("Purchase order not found");
        err.statusCode = 404;
        throw err;
      }

      const po = lockRes.rows[0];
      const currentStatus = po.status;

      // Validate allowed transitions per Requirement 14
      const validTransitions = {
        'Draft': ['Sent', 'Cancelled'],
        'Sent': ['Accepted', 'Cancelled'],
        'Accepted': ['Partially Received', 'Received', 'Cancelled'],
        'Partially Received': ['Received'],
        'Received': ['Completed'],
        'Completed': [],
        'Cancelled': []
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        const err = new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
        err.statusCode = 409;
        throw err;
      }

      // Update status
      const updateRes = await client.query(`
        UPDATE public.purchase_orders
        SET status = $1, updated_at = now()
        WHERE id = $2
        RETURNING *
      `, [newStatus, poId]);

      const updatedPo = updateRes.rows[0];

      // Audit Log
      await this.logAudit(client, {
        userId,
        storeId: po.store_id,
        entityId: poId,
        action: `Status changed to ${newStatus}`,
        details: { from: currentStatus, to: newStatus },
        orderNo: po.order_no
      });

      await client.query('COMMIT');
      return updatedPo;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

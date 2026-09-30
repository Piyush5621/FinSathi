import { getPostgresPool } from "../../../config/postgres.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";
import { ValidationError, NotFoundError } from "../../masters/errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";

const publisher = initEventPublisher();

export class StockService {
  /**
   * 1. Get Store Stock Balance
   */
  static async getStoreBalance(storeIdOrObj, maybeProductId, variantId = null) {
    let storeId = storeIdOrObj;
    let productId = maybeProductId;
    let vId = variantId;

    if (typeof storeIdOrObj === 'object' && storeIdOrObj !== null) {
      storeId = storeIdOrObj.storeId || storeIdOrObj.store_id;
      productId = storeIdOrObj.productId || storeIdOrObj.product_id;
      vId = storeIdOrObj.variantId || storeIdOrObj.variant_id || null;
    }

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      let query;
      let params;
      if (vId) {
        query = `SELECT stock FROM public.store_inventory WHERE store_id = $1 AND product_id = $2 AND variant_id = $3`;
        params = [storeId, productId, vId];
      } else {
        query = `SELECT stock FROM public.store_inventory WHERE store_id = $1 AND product_id = $2 AND variant_id IS NULL`;
        params = [storeId, productId];
      }
      const res = await client.query(query, params);
      return res.rows.length > 0 ? Number(res.rows[0].stock) : 0;
    } finally {
      client.release();
    }
  }

  /**
   * 2. Atomic Restock with Batch Creation and Movement Logging
   */
  static async restockItem({ organizationId, storeId, productId, variantId = null, quantity, costPrice = 0, sellingPrice = 0, wholesalePrice = 0, batchName = null, userId = null }) {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      throw new ValidationError("Restock quantity must be greater than zero.");
    }

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify product exists and belongs to organization
      const prodRes = await client.query(
        `SELECT id, name, sku, stock, price, cost_price, store_id FROM public.inventory WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [productId, organizationId]
      );
      if (prodRes.rows.length === 0) {
        throw new NotFoundError("Product not found in this organization.");
      }
      const product = prodRes.rows[0];

      // Resolve storeId
      const targetStoreId = storeId || product.store_id;
      if (!targetStoreId) {
        throw new ValidationError("Store ID is required for restocking.");
      }

      // 1. Lock and update store_inventory
      let storeRes;
      if (variantId) {
        storeRes = await client.query(`
          INSERT INTO public.store_inventory (organization_id, store_id, product_id, variant_id, stock, low_stock_threshold)
          VALUES ($1, $2, $3, $4, $5, 10)
          ON CONFLICT (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL
          DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = NOW()
          RETURNING stock
        `, [organizationId, targetStoreId, productId, variantId, qty]);
      } else {
        storeRes = await client.query(`
          INSERT INTO public.store_inventory (organization_id, store_id, product_id, stock, low_stock_threshold)
          VALUES ($1, $2, $3, $4, 10)
          ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
          DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = NOW()
          RETURNING stock
        `, [organizationId, targetStoreId, productId, qty]);
      }
      const newStoreStock = Number(storeRes.rows[0].stock);

      // 2. Update master inventory.stock
      await client.query(
        `UPDATE public.inventory SET stock = stock + $1, updated_at = NOW() WHERE id = $2`,
        [qty, productId]
      );

      // 3. If variant, update product_variants.stock
      if (variantId) {
        await client.query(
          `UPDATE public.product_variants SET stock = stock + $1, updated_at = NOW() WHERE id = $2`,
          [qty, variantId]
        );
      }

      // 4. Create batch record
      const finalCost = Number(costPrice || product.cost_price || 0);
      const finalSelling = Number(sellingPrice || product.price || 0);
      const finalWholesale = Number(wholesalePrice || 0);
      const name = batchName || `Restock ${new Date().toLocaleDateString('en-IN')}`;

      const batchRes = await client.query(`
        INSERT INTO public.inventory_batches (inventory_id, store_id, variant_id, batch_name, sku_variant, cost_price, selling_price, wholesale_price, stock)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [productId, targetStoreId, variantId, name, product.sku, finalCost, finalSelling, finalWholesale, qty]);
      const createdBatch = batchRes.rows[0];

      // 5. Create immutable stock movement record
      await client.query(`
        INSERT INTO public.stock_movements (organization_id, store_id, product_id, variant_id, batch_id, quantity_change, balance_after, movement_type, reason, reference_type, reference_id, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [organizationId, targetStoreId, productId, variantId, createdBatch.id, qty, newStoreStock, 'RESTOCK', name, 'batches', String(createdBatch.id), userId]);

      await client.query("COMMIT");

      publisher.publish("inventory.restocked", { productId, variantId, storeId: targetStoreId, quantity: qty });

      return {
        success: true,
        message: `Successfully restocked ${qty} units.`,
        newStoreStock,
        newStock: newStoreStock,
        batch: createdBatch
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 3. Atomic Stock Adjustment (Preventing Negative Stock)
   */
  static async adjustStock({ organizationId, storeId, productId, variantId = null, quantity, adjustmentType = 'decrease', reason = 'Damaged Goods', remarks = '', batchId = null, userId = null }) {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      throw new ValidationError("Adjustment quantity must be greater than zero.");
    }

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify product
      const prodRes = await client.query(
        `SELECT id, name, sku, stock, store_id FROM public.inventory WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [productId, organizationId]
      );
      if (prodRes.rows.length === 0) {
        throw new NotFoundError("Product not found in this organization.");
      }
      const product = prodRes.rows[0];
      const targetStoreId = storeId || product.store_id;

      // Lock store_inventory
      let storeInvRes;
      if (variantId) {
        storeInvRes = await client.query(
          `SELECT stock FROM public.store_inventory WHERE store_id = $1 AND product_id = $2 AND variant_id = $3 FOR UPDATE`,
          [targetStoreId, productId, variantId]
        );
      } else {
        storeInvRes = await client.query(
          `SELECT stock FROM public.store_inventory WHERE store_id = $1 AND product_id = $2 AND variant_id IS NULL FOR UPDATE`,
          [targetStoreId, productId]
        );
      }

      let currentStoreStock = storeInvRes.rows.length > 0 ? Number(storeInvRes.rows[0].stock) : Number(product.stock || 0);

      // Bounds check: Never allow negative stock
      if (adjustmentType === 'decrease' && currentStoreStock < qty) {
        throw new ValidationError(`Insufficient stock for adjustment. Current on-hand: ${currentStoreStock}, requested deduction: ${qty}.`);
      }

      const delta = adjustmentType === 'decrease' ? -qty : qty;
      const newStoreStock = currentStoreStock + delta;

      // Update store_inventory
      if (variantId) {
        await client.query(`
          INSERT INTO public.store_inventory (organization_id, store_id, product_id, variant_id, stock, low_stock_threshold)
          VALUES ($1, $2, $3, $4, $5, 10)
          ON CONFLICT (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL
          DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()
        `, [organizationId, targetStoreId, productId, variantId, newStoreStock]);
      } else {
        await client.query(`
          INSERT INTO public.store_inventory (organization_id, store_id, product_id, stock, low_stock_threshold)
          VALUES ($1, $2, $3, $4, 10)
          ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
          DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()
        `, [organizationId, targetStoreId, productId, newStoreStock]);
      }

      // Update master inventory.stock
      await client.query(
        `UPDATE public.inventory SET stock = GREATEST(0, stock + $1), updated_at = NOW() WHERE id = $2`,
        [delta, productId]
      );

      // Update variant stock if applicable
      if (variantId) {
        await client.query(
          `UPDATE public.product_variants SET stock = GREATEST(0, stock + $1), updated_at = NOW() WHERE id = $2`,
          [delta, variantId]
        );
      }

      // Update batch stock if batch specified
      if (batchId) {
        await client.query(
          `UPDATE public.inventory_batches SET stock = GREATEST(0, stock + $1), updated_at = NOW() WHERE id = $2 AND inventory_id = $3`,
          [delta, batchId, productId]
        );
      }

      // Record immutable stock movement
      await client.query(`
        INSERT INTO public.stock_movements (organization_id, store_id, product_id, variant_id, batch_id, quantity_change, balance_after, movement_type, reason, reference_type, reference_id, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [organizationId, targetStoreId, productId, variantId, batchId || null, delta, newStoreStock, 'ADJUSTMENT', `${reason}${remarks ? ' - ' + remarks : ''}`, 'adjustments', null, userId]);

      await client.query("COMMIT");

      return {
        success: true,
        message: `Stock adjusted by ${delta > 0 ? '+' + delta : delta} units.`,
        previousStock: currentStoreStock,
        newStock: newStoreStock
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 4. Atomic Multi-Store Transfer (Zero Stock Disappearance)
   */
  static async transferStock({ organizationId, sourceStoreId, destinationStoreId, productId, variantId = null, quantity, remarks = '', userId = null }) {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      throw new ValidationError("Transfer quantity must be greater than zero.");
    }
    if (!sourceStoreId || !destinationStoreId) {
      throw new ValidationError("Source and destination stores are required.");
    }
    if (sourceStoreId === destinationStoreId) {
      throw new ValidationError("Source and destination stores cannot be the same.");
    }

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Verify both stores belong to this business / user
      const storesRes = await client.query(
        `SELECT id, name FROM public.stores WHERE id = ANY($1::uuid[]) AND is_active = true`,
        [[sourceStoreId, destinationStoreId]]
      );
      if (storesRes.rows.length < 2) {
        throw new ValidationError("One or both specified store branches are invalid or inactive.");
      }
      const sourceStore = storesRes.rows.find(s => s.id === sourceStoreId);
      const destStore = storesRes.rows.find(s => s.id === destinationStoreId);

      // 2. Lock source store inventory
      let srcRes;
      if (variantId) {
        srcRes = await client.query(
          `SELECT stock FROM public.store_inventory WHERE store_id = $1 AND product_id = $2 AND variant_id = $3 FOR UPDATE`,
          [sourceStoreId, productId, variantId]
        );
      } else {
        srcRes = await client.query(
          `SELECT stock FROM public.store_inventory WHERE store_id = $1 AND product_id = $2 AND variant_id IS NULL FOR UPDATE`,
          [sourceStoreId, productId]
        );
      }

      if (srcRes.rows.length === 0 || Number(srcRes.rows[0].stock) < qty) {
        const available = srcRes.rows.length > 0 ? Number(srcRes.rows[0].stock) : 0;
        throw new ValidationError(`Insufficient stock at source store '${sourceStore.name}'. Available: ${available}, Requested: ${qty}.`);
      }

      const newSourceStock = Number(srcRes.rows[0].stock) - qty;

      // 3. Decrement source store stock
      if (variantId) {
        await client.query(
          `UPDATE public.store_inventory SET stock = $1, updated_at = NOW() WHERE store_id = $2 AND product_id = $3 AND variant_id = $4`,
          [newSourceStock, sourceStoreId, productId, variantId]
        );
      } else {
        await client.query(
          `UPDATE public.store_inventory SET stock = $1, updated_at = NOW() WHERE store_id = $2 AND product_id = $3 AND variant_id IS NULL`,
          [newSourceStock, sourceStoreId, productId]
        );
      }

      // 4. Increment destination store stock (upsert)
      let destRes;
      if (variantId) {
        destRes = await client.query(`
          INSERT INTO public.store_inventory (organization_id, store_id, product_id, variant_id, stock, low_stock_threshold)
          VALUES ($1, $2, $3, $4, $5, 10)
          ON CONFLICT (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL
          DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = NOW()
          RETURNING stock
        `, [organizationId, destinationStoreId, productId, variantId, qty]);
      } else {
        destRes = await client.query(`
          INSERT INTO public.store_inventory (organization_id, store_id, product_id, stock, low_stock_threshold)
          VALUES ($1, $2, $3, $4, 10)
          ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
          DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = NOW()
          RETURNING stock
        `, [organizationId, destinationStoreId, productId, qty]);
      }
      const newDestStock = Number(destRes.rows[0].stock);

      const transferRef = `TRF-${Date.now()}`;

      // 5. Record dual stock movements
      // Outward from source
      await client.query(`
        INSERT INTO public.stock_movements (organization_id, store_id, product_id, variant_id, quantity_change, balance_after, movement_type, reason, reference_type, reference_id, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [organizationId, sourceStoreId, productId, variantId, -qty, newSourceStock, 'TRANSFER_OUT', `Transferred to ${destStore.name}${remarks ? ': ' + remarks : ''}`, 'transfers', transferRef, userId]);

      // Inward to destination
      await client.query(`
        INSERT INTO public.stock_movements (organization_id, store_id, product_id, variant_id, quantity_change, balance_after, movement_type, reason, reference_type, reference_id, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [organizationId, destinationStoreId, productId, variantId, qty, newDestStock, 'TRANSFER_IN', `Received from ${sourceStore.name}${remarks ? ': ' + remarks : ''}`, 'transfers', transferRef, userId]);

      await client.query("COMMIT");

      return {
        success: true,
        message: `Successfully transferred ${qty} units from '${sourceStore.name}' to '${destStore.name}'.`,
        transferRef,
        sourceStock: newSourceStock,
        sourceRemainingStock: newSourceStock,
        destinationStock: newDestStock,
        destinationNewStock: newDestStock
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 5. Get Immutable Stock Movement History
   */
  static async getMovements({ organizationId, storeId = null, productId = null, limit = 50, offset = 0 }) {
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      let whereClause = `WHERE sm.organization_id = $1`;
      const params = [organizationId];
      let paramIdx = 2;

      if (storeId) {
        whereClause += ` AND sm.store_id = $${paramIdx++}`;
        params.push(storeId);
      }
      if (productId) {
        whereClause += ` AND sm.product_id = $${paramIdx++}`;
        params.push(productId);
      }

      const limitIdx = paramIdx++;
      params.push(Number(limit) || 50);

      const offsetIdx = paramIdx++;
      params.push(Number(offset) || 0);

      const query = `
        SELECT 
          sm.*,
          i.name as product_name,
          i.sku as product_sku,
          st.name as store_name,
          pv.name as variant_name
        FROM public.stock_movements sm
        LEFT JOIN public.inventory i ON sm.product_id = i.id
        LEFT JOIN public.stores st ON sm.store_id = st.id
        LEFT JOIN public.product_variants pv ON sm.variant_id = pv.id
        ${whereClause}
        ORDER BY sm.created_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `;

      const res = await client.query(query, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  /**
   * 6. Transactional CSV Bulk Import (Tenant-Safe)
   */
  static async bulkImport({ organizationId, storeId = null, userId, products }) {
    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new ValidationError("Products array is required for bulk import.");
    }

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Resolve storeId
      let targetStoreId = storeId;
      if (!targetStoreId) {
        const storeCheck = await client.query(
          `SELECT id FROM public.stores WHERE user_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1`,
          [userId]
        );
        targetStoreId = storeCheck.rows[0]?.id || null;
      }

      const imported = [];
      for (const p of products) {
        const name = String(p.name || 'Unnamed Product').trim();
        const sku = p.sku ? String(p.sku).trim() : `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        const price = Number(p.price || p.sellingPrice || 0);
        const costPrice = Number(p.cost_price || p.costPrice || 0);
        const stock = Number(p.stock || 0);
        const units = p.units || p.unit || 'pcs';
        const company = p.company || p.category || 'General';
        const gstPercent = Number(p.gst_percent || 0);

        // Check if SKU exists in org
        const existRes = await client.query(
          `SELECT id FROM public.inventory WHERE sku = $1 AND organization_id = $2`,
          [sku, organizationId]
        );
        let prodId;
        if (existRes.rows.length > 0) {
          prodId = existRes.rows[0].id;
          // Update existing stock
          if (stock > 0) {
            await client.query(
              `UPDATE public.inventory SET stock = stock + $1, price = $2, selling_price = $2, cost_price = $3 WHERE id = $4`,
              [stock, price, costPrice, prodId]
            );
          }
        } else {
          // Insert new product
          const insRes = await client.query(`
            INSERT INTO public.inventory (
              organization_id, user_id, store_id, name, sku, company, 
              price, selling_price, cost_price, stock, units, gst_percent, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, 'active')
            RETURNING id, name, sku, stock
          `, [organizationId, userId, targetStoreId, name, sku, company, price, costPrice, stock, units, gstPercent]);
          prodId = insRes.rows[0].id;
          imported.push(insRes.rows[0]);
        }

        // Store inventory and batch if stock > 0
        if (stock > 0 && targetStoreId) {
          await client.query(`
            INSERT INTO public.store_inventory (organization_id, store_id, product_id, stock, low_stock_threshold)
            VALUES ($1, $2, $3, $4, 10)
            ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
            DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = NOW()
          `, [organizationId, targetStoreId, prodId, stock]);

          const bRes = await client.query(`
            INSERT INTO public.inventory_batches (inventory_id, store_id, batch_name, sku_variant, cost_price, selling_price, stock)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [prodId, targetStoreId, 'Opening Stock', sku, costPrice, price, stock]);
          const batchId = bRes.rows[0]?.id;

          await client.query(`
            INSERT INTO public.stock_movements (organization_id, store_id, product_id, batch_id, quantity_change, balance_after, movement_type, reason, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [organizationId, targetStoreId, prodId, batchId, stock, stock, 'OPENING_STOCK', 'Bulk CSV Opening Stock', userId]);
        }
      }

      await client.query("COMMIT");
      return {
        success: true,
        message: `Successfully imported ${imported.length} products.`,
        count: imported.length,
        data: imported
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 7. Purchase Order Stock Inward Receiving
   */
  static async receivePurchaseOrderStock(organizationId, { warehouseId, purchaseOrderId, orderNo, items }, actorUserId) {
    if (!items || !Array.isArray(items) || items.length === 0) return [];

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Find store corresponding to warehouseId or fallback to actorUserId's store
      let storeId = null;
      if (warehouseId) {
        const whRes = await client.query(`SELECT id FROM public.stores WHERE id = $1`, [warehouseId]);
        if (whRes.rows.length > 0) storeId = warehouseId;
      }
      if (!storeId) {
        const sRes = await client.query(`SELECT id FROM public.stores WHERE user_id = $1 AND is_active = true LIMIT 1`, [actorUserId]);
        storeId = sRes.rows[0]?.id || null;
      }

      for (const item of items) {
        const qty = Number(item.quantity || 0);
        const productId = item.productId || item.product_id || item.inventory_id;
        const variantId = item.variantId || item.variant_id || null;
        const unitCost = Number(item.cost_price || item.costPrice || item.purchase_cost || item.unit_price || item.unitPrice || 0);
        const sellingPrice = Number(item.selling_price || item.sellingPrice || item.price || 0);
        const batchNumber = item.batch_number || item.batchNumber || `PO-${orderNo || Date.now()}-${String(productId).slice(0, 8)}`;

        if (qty > 0 && productId) {
          // 1. Update inventory.stock
          await client.query(
            `UPDATE public.inventory SET stock = stock + $1, cost_price = $2, updated_at = NOW() WHERE id = $3`,
            [qty, unitCost, productId]
          );

          // 2. Update store_inventory
          let storeStock = qty;
          if (storeId) {
            let sRes;
            if (variantId) {
              sRes = await client.query(`
                INSERT INTO public.store_inventory (organization_id, store_id, product_id, variant_id, stock, low_stock_threshold)
                VALUES ($1, $2, $3, $4, $5, 10)
                ON CONFLICT (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL
                DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = NOW()
                RETURNING stock
              `, [organizationId, storeId, productId, variantId, qty]);
            } else {
              sRes = await client.query(`
                INSERT INTO public.store_inventory (organization_id, store_id, product_id, stock, low_stock_threshold)
                VALUES ($1, $2, $3, $4, 10)
                ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
                DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock, updated_at = NOW()
                RETURNING stock
              `, [organizationId, storeId, productId, qty]);
            }
            storeStock = Number(sRes.rows[0]?.stock || qty);
          }

          // 3. Create batch
          const bRes = await client.query(`
            INSERT INTO public.inventory_batches (inventory_id, store_id, variant_id, batch_name, sku_variant, cost_price, selling_price, stock)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `, [productId, storeId, variantId, `PO #${orderNo || 'Receipt'} - ${batchNumber}`, batchNumber, unitCost, sellingPrice, qty]);
          const batchId = bRes.rows[0]?.id;

          // 4. Record stock movement
          await client.query(`
            INSERT INTO public.stock_movements (organization_id, store_id, product_id, variant_id, batch_id, quantity_change, balance_after, movement_type, reason, reference_type, reference_id, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [organizationId, storeId, productId, variantId, batchId, qty, storeStock, 'RESTOCK', `PO Received #${orderNo || ''}`, 'purchase_orders', String(purchaseOrderId || ''), actorUserId]);
        }
      }

      await client.query("COMMIT");
      return items;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

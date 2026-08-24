import { StockRepository } from "../repositories/StockRepository.js";
import { BatchSelectionEngine } from "./BatchSelectionEngine.js";
import { ValidationError, NotFoundError, ConflictError } from "../../masters/errors/appErrors.js";
import { initEventPublisher } from "../../../infrastructure/events/publishers/index.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

const publisher = initEventPublisher();

export class StockService {
  static async getWarehouseBalance(warehouseId, productId, variantId, organizationId) {
    // 1. Row-level lock to ensure up-to-date reads
    const stock = await StockRepository.lockWarehouseStock(organizationId, warehouseId, productId, variantId);
    if (!stock) return { onHand: 0, reserved: 0, available: 0, incoming: 0, outgoing: 0 };
    return {
      onHand: Number(stock.on_hand),
      reserved: Number(stock.reserved),
      available: Number(stock.available),
      incoming: Number(stock.incoming),
      outgoing: Number(stock.outgoing)
    };
  }

  static async postOpeningStock(organizationId, data, actorUserId) {
    const { warehouseId, productId, variantId, quantity, unitCost = 0.0000, batchNumber, serialNumbers } = data;

    if (quantity <= 0) {
      throw new ValidationError("Quantity must be greater than zero.");
    }

    // 1. Row lock
    const stock = await StockRepository.lockWarehouseStock(organizationId, warehouseId, productId, variantId);

    // 2. Manage batches if provided
    let batchId = null;
    if (batchNumber) {
      // Find or create batch
      const { data: existBatch } = await adminSupabase
        .from("inventory_batches")
        .select("id")
        .eq("batch_number", batchNumber)
        .eq("product_id", productId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (existBatch) {
        batchId = existBatch.id;
        if (typeof existBatch.stock === 'number') {
          await adminSupabase
            .from("inventory_batches")
            .update({ stock: existBatch.stock + quantity })
            .eq("id", batchId);
        }
      } else {
        const { data: newBatch, error: bErr } = await adminSupabase
          .from("inventory_batches")
          .insert({
            organization_id: organizationId,
            product_id: productId,
            warehouse_id: warehouseId,
            batch_number: batchNumber,
            purchase_cost: unitCost,
            stock: quantity,
            created_by: actorUserId
          })
          .select()
          .single();

        if (bErr) throw bErr;
        batchId = newBatch.id;
        publisher.publish("inventory.batch.created", { id: batchId, organizationId, batchNumber });
      }
    }

    // 3. Serial validation and tracking
    if (Array.isArray(serialNumbers)) {
      for (const sn of serialNumbers) {
        const { data: existSn } = await adminSupabase
          .from("inventory_serial_numbers")
          .select("id")
          .eq("serial_number", sn)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (existSn) {
          throw new ConflictError(`Serial number '${sn}' already registered in organization.`);
        }

        await adminSupabase.from("inventory_serial_numbers").insert({
          organization_id: organizationId,
          product_id: productId,
          warehouse_id: warehouseId,
          batch_id: batchId,
          serial_number: sn,
          status: "Available",
          created_by: actorUserId
        });
      }
    }

    // 4. Update Summary Balances
    const newOnHand = Number(stock.on_hand) + quantity;
    const newAvailable = newOnHand - Number(stock.reserved);

    const updatedStock = await StockRepository.updateWarehouseStock(stock.id, organizationId, {
      on_hand: newOnHand,
      available: newAvailable
    });

    // 5. Append to Ledger (Immutable Movement)
    const movement = await StockRepository.createMovement({
      organization_id: organizationId,
      warehouse_id: warehouseId,
      product_id: productId,
      variant_id: variantId || null,
      batch_id: batchId,
      serial_number: serialNumbers ? serialNumbers[0] : null,
      quantity,
      movement_type: "opening_stock",
      reference_type: "opening_stock",
      reference_id: updatedStock.id,
      unit_cost: unitCost,
      total_cost: unitCost * quantity,
      created_by: actorUserId
    });

    publisher.publish("inventory.movement.created", { id: movement.id, organizationId });
    publisher.publish("inventory.stock.changed", { productId, warehouseId, organizationId, onHand: newOnHand });

    return { stock: updatedStock, movement };
  }

  static async postAdjustment(organizationId, data, actorUserId) {
    const { warehouseId, productId, variantId, quantity, unitCost = 0.0000, reason, remarks, type } = data;

    if (quantity <= 0) {
      throw new ValidationError("Adjustment quantity must be positive.");
    }

    // 1. Adjustment validation
    if (!reason) {
      throw new ValidationError("Reason is required for adjustments.");
    }

    // 2. Lock stock row
    const stock = await StockRepository.lockWarehouseStock(organizationId, warehouseId, productId, variantId);

    // 3. Concurrency negative stock check
    const adjustmentQty = type === "adjustment_increase" ? quantity : -quantity;
    const newOnHand = Number(stock.on_hand) + adjustmentQty;
    const newAvailable = newOnHand - Number(stock.reserved);

    if (newOnHand < 0) {
      // Check preferences to see if negative stock is allowed
      const { data: pref } = await adminSupabase
        .from("organization_preferences")
        .select("preferences")
        .eq("organization_id", organizationId)
        .maybeSingle();

      const allowNegative = pref?.preferences?.allowNegativeStock || false;
      if (!allowNegative) {
        throw new ValidationError("Insufficient stock. Adjustment leads to negative balance.");
      }
    }

    // 4. Update warehouse balance
    const updatedStock = await StockRepository.updateWarehouseStock(stock.id, organizationId, {
      on_hand: newOnHand,
      available: newAvailable
    });

    // 5. Create adjustment log
    const adjustmentNumber = `ADJ-${Date.now()}-${Math.floor(Math.random() * 100)}`;
    const adj = await StockRepository.createAdjustment({
      organization_id: organizationId,
      warehouse_id: warehouseId,
      adjustment_number: adjustmentNumber,
      reason,
      remarks,
      adjustment_type: type,
      status: "completed",
      created_by: actorUserId
    });

    // 6. Append to Ledger
    const movement = await StockRepository.createMovement({
      organization_id: organizationId,
      warehouse_id: warehouseId,
      product_id: productId,
      variant_id: variantId || null,
      quantity: adjustmentQty,
      movement_type: type,
      reference_type: "adjustments",
      reference_id: adj.id,
      unit_cost: unitCost,
      total_cost: unitCost * quantity,
      created_by: actorUserId
    });

    publisher.publish("inventory.adjustment.created", { id: adj.id, organizationId });
    publisher.publish("inventory.stock.changed", { productId, warehouseId, organizationId, onHand: newOnHand });

    return { stock: updatedStock, movement, adjustment: adj };
  }

  static async shipTransfer(organizationId, data, actorUserId) {
    const { sourceWarehouseId, targetWarehouseId, productId, variantId, quantity, transferNumber } = data;

    if (quantity <= 0) {
      throw new ValidationError("Transfer quantity must be positive.");
    }

    // 1. Lock source warehouse stock
    const sourceStock = await StockRepository.lockWarehouseStock(organizationId, sourceWarehouseId, productId, variantId);

    // 2. Insufficient check
    if (Number(sourceStock.available) < quantity) {
      throw new ValidationError("Insufficient available stock in source warehouse.");
    }

    // 3. Deduct from source warehouse
    const newSourceOnHand = Number(sourceStock.on_hand) - quantity;
    const newSourceAvailable = newSourceOnHand - Number(sourceStock.reserved);

    await StockRepository.updateWarehouseStock(sourceStock.id, organizationId, {
      on_hand: newSourceOnHand,
      available: newSourceAvailable
    });

    // 4. Create transfer record in transit
    const transferNum = transferNumber || `TRSF-${Date.now()}`;
    const transfer = await StockRepository.createTransfer({
      organization_id: organizationId,
      source_warehouse_id: sourceWarehouseId,
      target_warehouse_id: targetWarehouseId,
      transfer_number: transferNum,
      status: "shipped",
      shipped_at: new Date().toISOString(),
      created_by: actorUserId
    });

    // 5. Append Transfer Out ledger movement
    await StockRepository.createMovement({
      organization_id: organizationId,
      warehouse_id: sourceWarehouseId,
      product_id: productId,
      variant_id: variantId || null,
      quantity: -quantity,
      movement_type: "transfer_out",
      reference_type: "transfers",
      reference_id: transfer.id,
      created_by: actorUserId
    });

    // 6. Lock target warehouse to increase 'incoming' balance (In Transit state)
    const targetStock = await StockRepository.lockWarehouseStock(organizationId, targetWarehouseId, productId, variantId);
    await StockRepository.updateWarehouseStock(targetStock.id, organizationId, {
      incoming: Number(targetStock.incoming) + quantity
    });

    publisher.publish("inventory.transfer.started", { id: transfer.id, organizationId });
    return transfer;
  }

  static async receiveTransfer(id, organizationId, data, actorUserId) {
    const { productId, variantId, quantity } = data;

    const transfer = await adminSupabase
      .from("inventory_transfers")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!transfer.data) throw new NotFoundError("Transfer record not found.");
    if (transfer.data.status !== "shipped") throw new ValidationError("Transfer is not in transit / shipped state.");

    // 1. Lock target stock
    const targetStock = await StockRepository.lockWarehouseStock(organizationId, transfer.data.target_warehouse_id, productId, variantId);

    // 2. Summary update: deduct from incoming, add to on_hand
    const newTargetOnHand = Number(targetStock.on_hand) + quantity;
    const newTargetAvailable = newTargetOnHand - Number(targetStock.reserved);
    const newTargetIncoming = Math.max(0, Number(targetStock.incoming) - quantity);

    const updatedTargetStock = await StockRepository.updateWarehouseStock(targetStock.id, organizationId, {
      on_hand: newTargetOnHand,
      available: newTargetAvailable,
      incoming: newTargetIncoming
    });

    // 3. Mark completed
    const updatedTransfer = await StockRepository.updateTransfer(id, organizationId, {
      status: "completed",
      received_at: new Date().toISOString(),
      updated_by: actorUserId
    });

    // 4. Append Transfer In ledger movement
    await StockRepository.createMovement({
      organization_id: organizationId,
      warehouse_id: transfer.data.target_warehouse_id,
      product_id: productId,
      variant_id: variantId || null,
      quantity,
      movement_type: "transfer_in",
      reference_type: "transfers",
      reference_id: transfer.data.id,
      created_by: actorUserId
    });

    publisher.publish("inventory.transfer.received", { id: updatedTransfer.id, organizationId });
    return updatedTransfer;
  }

  static async createReservation(organizationId, data, actorUserId) {
    const { warehouseId, productId, variantId, quantity, expiresMinutes = 60, referenceType, referenceId } = data;

    if (quantity <= 0) {
      throw new ValidationError("Reservation quantity must be positive.");
    }

    // 1. Lock stock row
    const stock = await StockRepository.lockWarehouseStock(organizationId, warehouseId, productId, variantId);

    // 2. Validate Available stock is sufficient
    if (Number(stock.available) < quantity) {
      throw new ValidationError("Insufficient available stock for reservation.");
    }

    // 3. Deduct from available, add to reserved
    const newReserved = Number(stock.reserved) + quantity;
    const newAvailable = Number(stock.on_hand) - newReserved;

    const updatedStock = await StockRepository.updateWarehouseStock(stock.id, organizationId, {
      reserved: newReserved,
      available: newAvailable
    });

    // 4. Create Reservation row
    const expiresAt = new Date(Date.now() + expiresMinutes * 60000).toISOString();
    const res = await StockRepository.createReservation({
      organization_id: organizationId,
      warehouse_id: warehouseId,
      product_id: productId,
      variant_id: variantId || null,
      quantity,
      expires_at: expiresAt,
      status: "active",
      reference_type: referenceType,
      reference_id: referenceId,
      created_by: actorUserId
    });

    publisher.publish("inventory.reservation.created", { id: res.id, organizationId });
    return res;
  }

  static async releaseReservation(id, organizationId, actorUserId) {
    const res = await adminSupabase
      .from("inventory_reservations")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!res.data) throw new NotFoundError("Reservation not found.");
    if (res.data.status !== "active") throw new ValidationError("Reservation is already processed/released.");

    // 1. Lock stock row
    const stock = await StockRepository.lockWarehouseStock(organizationId, res.data.warehouse_id, res.data.product_id, res.data.variant_id);

    // 2. Summary update: deduct from reserved, add back to available
    const newReserved = Math.max(0, Number(stock.reserved) - Number(res.data.quantity));
    const newAvailable = Number(stock.on_hand) - newReserved;

    await StockRepository.updateWarehouseStock(stock.id, organizationId, {
      reserved: newReserved,
      available: newAvailable
    });

    // 3. Mark released
    const updatedRes = await StockRepository.updateReservation(id, organizationId, {
      status: "released",
      updated_by: actorUserId
    });

    // 4. Add reservation release log/event (doesn't change on_hand, only releases reserved hold)
    publisher.publish("inventory.reservation.released", { id: updatedRes.id, organizationId });
    return updatedRes;
  }

  static async generateDailySnapshots(organizationId, snapshotDate) {
    // Queries all warehouse stock rows and dumps into snapshots
    const { data: balances, error } = await adminSupabase
      .from("warehouse_stock")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (error) throw error;

    const rows = balances.map(b => ({
      organization_id: organizationId,
      warehouse_id: b.warehouse_id,
      product_id: b.product_id,
      variant_id: b.variant_id,
      on_hand: b.on_hand,
      reserved: b.reserved,
      available: b.available,
      snapshot_date: snapshotDate
    }));

    if (rows.length > 0) {
      const { error: insErr } = await adminSupabase
        .from("inventory_snapshots")
        .upsert(rows, { onConflict: "organization_id,warehouse_id,product_id,variant_id,snapshot_date" });

      if (insErr) throw insErr;
    }

    return rows;
  }

  /**
   * Atomically deducts stock for a POS / invoice sale.
   * Acquires SELECT FOR UPDATE locks, performs FEFO batch deduction, 
   * decrements warehouse_stock, and logs immutable inventory_movements.
   * 
   * @param {string} organizationId 
   * @param {object} params 
   * @param {string} params.warehouseId 
   * @param {string} params.saleId 
   * @param {Array} params.items 
   * @param {string} actorUserId 
   */
  static async deductSaleStock(organizationId, { warehouseId, saleId, items }, actorUserId) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }

    // 1. Validation & Pre-locking Pass:
    // Lock all items first and verify available stock.
    // If ANY item has insufficient stock, throw ValidationError before updating any balances.
    const lockedStockMap = {};
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (qty <= 0) continue;
      const productId = item.productId || item.product_id;
      const variantId = item.variantId || item.variant_id || null;

      if (!productId) {
        throw new ValidationError("Product ID is required for each sale item.");
      }

      const lockKey = `${productId}:${variantId || 'null'}`;
      let stock = lockedStockMap[lockKey];
      if (!stock) {
        stock = await StockRepository.lockWarehouseStock(organizationId, warehouseId, productId, variantId);
        if (!stock) {
          throw new ValidationError(`Warehouse stock record not found for product ${productId}.`);
        }
        lockedStockMap[lockKey] = {
          ...stock,
          on_hand: Number(stock.on_hand),
          reserved: Number(stock.reserved),
          available: Number(stock.available)
        };
      }

      if (lockedStockMap[lockKey].available < qty || lockedStockMap[lockKey].on_hand < qty) {
        throw new ValidationError(`Insufficient stock for product ${productId}. Available: ${lockedStockMap[lockKey].available}, Requested: ${qty}`);
      }

      // Decrement in-memory accumulator to handle multiple lines of the same product in a single cart
      lockedStockMap[lockKey].available -= qty;
      lockedStockMap[lockKey].on_hand -= qty;
    }

    // 2. Deduction and Movement Pass:
    const deductionResults = [];
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (qty <= 0) continue;
      const productId = item.productId || item.product_id;
      const variantId = item.variantId || item.variant_id || null;
      const lockKey = `${productId}:${variantId || 'null'}`;
      const stock = lockedStockMap[lockKey];

      // Batch allocation (FEFO / specified batch)
      let batchId = item.batchId || item.batch_id || null;
      if (!batchId) {
        try {
          const allocations = await BatchSelectionEngine.selectBatches({
            organizationId,
            productId,
            warehouseId,
            quantityToFulfill: qty
          });
          if (allocations && allocations.length > 0) {
            batchId = allocations[0].batchId;
          }
        } catch (selErr) {
          console.warn(`[StockService] Batch auto-selection notice: ${selErr.message}`);
        }
      }

      // If batchId is resolved, deduct quantity from batch if batch exists in DB
      if (batchId) {
        try {
          const { data: batch } = await adminSupabase
            .from("inventory_batches")
            .select("id, stock, purchase_cost, cost_price")
            .eq("id", batchId)
            .maybeSingle();

          if (batch && typeof batch.stock === 'number') {
            const newBatchStock = Math.max(0, batch.stock - qty);
            await adminSupabase
              .from("inventory_batches")
              .update({
                stock: newBatchStock,
                updated_at: new Date().toISOString()
              })
              .eq("id", batchId);
          }
        } catch (bErr) {
          console.warn(`[StockService] Batch update warning for ${batchId}:`, bErr.message);
        }
      }

      // Update warehouse stock in database
      const updatedStock = await StockRepository.updateWarehouseStock(stock.id, organizationId, {
        on_hand: stock.on_hand,
        available: stock.available
      });

      // Create immutable inventory movement record
      const unitCost = Number(item.cost_price || item.costPrice || 0);
      const movement = await StockRepository.createMovement({
        organization_id: organizationId,
        warehouse_id: warehouseId,
        product_id: productId,
        variant_id: variantId,
        batch_id: batchId,
        quantity: -qty,
        movement_type: "sale",
        reference_type: "sales",
        reference_id: saleId,
        unit_cost: unitCost,
        total_cost: unitCost * qty,
        valuation_method: "FIFO",
        created_by: actorUserId
      });

      publisher.publish("inventory.movement.created", { id: movement.id, organizationId });
      publisher.publish("inventory.stock.changed", { productId, warehouseId, organizationId, onHand: stock.on_hand });

      deductionResults.push({ stock: updatedStock, movement, batchId });
    }

    return deductionResults;
  }

  /**
   * Atomically receives stock from a Purchase Order.
   * Acquires SELECT FOR UPDATE locks on warehouse_stock, creates/updates inventory_batches,
   * increments warehouse_stock on_hand and available, and records immutable inward inventory_movements.
   * 
   * @param {string} organizationId 
   * @param {object} params 
   * @param {string} params.warehouseId 
   * @param {string} params.purchaseOrderId 
   * @param {string} params.orderNo 
   * @param {Array} params.items 
   * @param {string} actorUserId 
   */
  static async receivePurchaseOrderStock(organizationId, { warehouseId, purchaseOrderId, orderNo, items }, actorUserId) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }

    // 1. Pre-validation Pass: Validate all items before making any modifications
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (qty <= 0) {
        throw new ValidationError(`Received quantity must be greater than zero for all items.`);
      }
      const productId = item.productId || item.product_id || item.inventory_id;
      if (!productId) {
        throw new ValidationError("Product ID is required for each received item.");
      }
    }

    // 2. Receipt and Inward Stock Pass:
    const receiptResults = [];
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const productId = item.productId || item.product_id || item.inventory_id;
      const variantId = item.variantId || item.variant_id || null;
      const unitCost = Number(item.cost_price || item.costPrice || item.purchase_cost || item.unit_price || item.unitPrice || 0);
      const sellingPrice = Number(item.selling_price || item.sellingPrice || item.price || 0);
      const wholesalePrice = Number(item.wholesale_price || item.wholesalePrice || 0);
      const batchNumber = item.batch_number || item.batchNumber || `PO-${orderNo || Date.now()}-${String(productId).slice(0, 8)}`;
      const expiryDate = item.expiry_date || item.expiryDate || null;

      // Lock warehouse stock row
      const stock = await StockRepository.lockWarehouseStock(organizationId, warehouseId, productId, variantId);

      // Create new inventory batch
      let batchId = null;
      try {
        const { data: newBatch, error: bErr } = await adminSupabase
          .from("inventory_batches")
          .insert({
            organization_id: organizationId,
            inventory_id: productId,
            product_id: productId,
            variant_id: variantId,
            warehouse_id: warehouseId,
            batch_name: `PO #${orderNo || 'Receipt'} - ${batchNumber}`,
            batch_number: batchNumber,
            cost_price: unitCost,
            purchase_cost: unitCost,
            selling_price: sellingPrice,
            wholesale_price: wholesalePrice,
            expiry_date: expiryDate,
            stock: qty,
            created_by: actorUserId
          })
          .select()
          .single();

        if (!bErr && newBatch) {
          batchId = newBatch.id;
          publisher.publish("inventory.batch.created", { id: batchId, organizationId, batchNumber });
        }
      } catch (bCatchErr) {
        console.warn(`[StockService] Batch creation warning for product ${productId}:`, bCatchErr.message);
      }

      // Update warehouse stock balances
      const newOnHand = Number(stock.on_hand) + qty;
      const newAvailable = newOnHand - Number(stock.reserved);

      const updatedStock = await StockRepository.updateWarehouseStock(stock.id, organizationId, {
        on_hand: newOnHand,
        available: newAvailable
      });

      // Create immutable inward inventory movement record
      const movement = await StockRepository.createMovement({
        organization_id: organizationId,
        warehouse_id: warehouseId,
        product_id: productId,
        variant_id: variantId,
        batch_id: batchId,
        quantity: qty, // Positive for inward movement
        movement_type: "purchase",
        reference_type: "purchase_orders",
        reference_id: purchaseOrderId,
        unit_cost: unitCost,
        total_cost: unitCost * qty,
        valuation_method: "FIFO",
        created_by: actorUserId
      });

      // Update legacy inventory master record for backward compatibility
      try {
        const { data: legacyProd } = await adminSupabase
          .from("inventory")
          .select("id, stock, cost_price")
          .eq("id", productId)
          .maybeSingle();

        if (legacyProd) {
          const currentLegacyStock = Number(legacyProd.stock || 0);
          await adminSupabase
            .from("inventory")
            .update({
              stock: currentLegacyStock + qty,
              cost_price: unitCost > 0 ? unitCost : legacyProd.cost_price,
              updated_at: new Date().toISOString()
            })
            .eq("id", productId);
        }
      } catch {}

      publisher.publish("inventory.movement.created", { id: movement.id, organizationId });
      publisher.publish("inventory.stock.changed", { productId, warehouseId, organizationId, onHand: newOnHand });

      receiptResults.push({ stock: updatedStock, movement, batchId });
    }

    return receiptResults;
  }

  /**
   * Atomically restores stock for returned sales items.
   * Acquires SELECT FOR UPDATE locks on warehouse_stock, restores batch stock if batch exists,
   * increments warehouse_stock on_hand and available, and records immutable sales_return inventory_movements.
   * 
   * @param {string} organizationId 
   * @param {object} params 
   * @param {string} params.warehouseId 
   * @param {string} params.saleId 
   * @param {string} params.returnId 
   * @param {Array} params.items 
   * @param {string} actorUserId 
   */
  static async returnSaleStock(organizationId, { warehouseId, saleId, returnId, items }, actorUserId) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }

    // 1. Pre-validation Pass: Validate all items before modifying any balances
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (qty <= 0) {
        throw new ValidationError("Return quantity must be greater than zero for all items.");
      }
      const productId = item.productId || item.product_id || item.inventory_id;
      if (!productId) {
        throw new ValidationError("Product ID is required for each returned item.");
      }
    }

    // 2. Return and Stock Restoration Pass:
    const returnResults = [];
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const productId = item.productId || item.product_id || item.inventory_id;
      const variantId = item.variantId || item.variant_id || null;
      const batchId = item.batchId || item.batch_id || null;
      const unitCost = Number(item.cost_price || item.costPrice || item.purchase_cost || 0);

      // Lock warehouse stock row
      const stock = await StockRepository.lockWarehouseStock(organizationId, warehouseId, productId, variantId);

      // If batchId is provided, restore quantity to batch
      if (batchId) {
        try {
          const { data: batch } = await adminSupabase
            .from("inventory_batches")
            .select("id, stock")
            .eq("id", batchId)
            .maybeSingle();

          if (batch && typeof batch.stock === 'number') {
            await adminSupabase
              .from("inventory_batches")
              .update({
                stock: batch.stock + qty,
                updated_at: new Date().toISOString()
              })
              .eq("id", batchId);
          }
        } catch (bErr) {
          console.warn(`[StockService] Batch return restoration warning for batch ${batchId}:`, bErr.message);
        }
      }

      // Update warehouse stock balances (on_hand + qty, available + qty)
      const newOnHand = Number(stock.on_hand) + qty;
      const newAvailable = newOnHand - Number(stock.reserved);

      const updatedStock = await StockRepository.updateWarehouseStock(stock.id, organizationId, {
        on_hand: newOnHand,
        available: newAvailable
      });

      // Create immutable sales_return inventory movement record
      const movement = await StockRepository.createMovement({
        organization_id: organizationId,
        warehouse_id: warehouseId,
        product_id: productId,
        variant_id: variantId,
        batch_id: batchId,
        quantity: qty, // Positive for inward return
        movement_type: "sales_return",
        reference_type: "sales_returns",
        reference_id: returnId || saleId,
        unit_cost: unitCost,
        total_cost: unitCost * qty,
        valuation_method: "FIFO",
        created_by: actorUserId
      });

      // Update legacy inventory master record for backward compatibility
      try {
        const { data: legacyProd } = await adminSupabase
          .from("inventory")
          .select("id, stock")
          .eq("id", productId)
          .maybeSingle();

        if (legacyProd) {
          const currentLegacyStock = Number(legacyProd.stock || 0);
          await adminSupabase
            .from("inventory")
            .update({
              stock: currentLegacyStock + qty,
              updated_at: new Date().toISOString()
            })
            .eq("id", productId);
        }
      } catch {}

      publisher.publish("inventory.movement.created", { id: movement.id, organizationId });
      publisher.publish("inventory.stock.changed", { productId, warehouseId, organizationId, onHand: newOnHand });

      returnResults.push({ stock: updatedStock, movement, batchId });
    }

    return returnResults;
  }

  /**
   * Atomically receives stock from a B2B Trade Invoice Import.
   * Acquires SELECT FOR UPDATE locks on warehouse_stock, creates/updates inventory_batches,
   * increments warehouse_stock on_hand and available, and records immutable inward inventory_movements.
   * 
   * @param {string} organizationId 
   * @param {object} params 
   * @param {string} params.warehouseId 
   * @param {string} params.transactionId 
   * @param {string} params.importId 
   * @param {string} params.invoiceNo 
   * @param {Array} params.items 
   * @param {string} actorUserId 
   */
  static async receiveTradeImportStock(organizationId, { warehouseId, transactionId, importId, invoiceNo, items }, actorUserId) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }

    // 1. Pre-validation Pass: Validate all items before modifying any balances
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (qty <= 0) {
        throw new ValidationError("Import quantity must be greater than zero for all items.");
      }
      const productId = item.productId || item.product_id || item.inventory_id;
      if (!productId) {
        throw new ValidationError("Product ID is required for each imported item.");
      }
    }

    // 2. Receipt and Inward Stock Pass:
    const receiptResults = [];
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const productId = item.productId || item.product_id || item.inventory_id;
      const variantId = item.variantId || item.variant_id || null;
      const unitCost = Number(item.cost_price || item.costPrice || item.purchase_cost || item.purchase_price || item.unit_price || item.unitPrice || 0);
      const sellingPrice = Number(item.selling_price || item.sellingPrice || item.price || 0);
      const batchNumber = item.batch_number || item.batchNumber || item.batch_name || `B2B-${invoiceNo || Date.now()}-${String(productId).slice(0, 8)}`;
      const expiryDate = item.expiry_date || item.expiryDate || null;

      // Lock warehouse stock row
      const stock = await StockRepository.lockWarehouseStock(organizationId, warehouseId, productId, variantId);

      // Create new inventory batch
      let batchId = null;
      try {
        const { data: newBatch, error: bErr } = await adminSupabase
          .from("inventory_batches")
          .insert({
            organization_id: organizationId,
            inventory_id: productId,
            product_id: productId,
            variant_id: variantId,
            warehouse_id: warehouseId,
            batch_name: `B2B #${invoiceNo || 'Import'} - ${batchNumber}`,
            batch_number: batchNumber,
            cost_price: unitCost,
            purchase_cost: unitCost,
            selling_price: sellingPrice,
            expiry_date: expiryDate,
            stock: qty,
            created_by: actorUserId
          })
          .select()
          .single();

        if (!bErr && newBatch) {
          batchId = newBatch.id;
          publisher.publish("inventory.batch.created", { id: batchId, organizationId, batchNumber });
        }
      } catch (bCatchErr) {
        console.warn(`[StockService] Batch creation warning for product ${productId}:`, bCatchErr.message);
      }

      // Update warehouse stock balances
      const newOnHand = Number(stock.on_hand) + qty;
      const newAvailable = newOnHand - Number(stock.reserved);

      const updatedStock = await StockRepository.updateWarehouseStock(stock.id, organizationId, {
        on_hand: newOnHand,
        available: newAvailable
      });

      // Create immutable inward inventory movement record
      const movement = await StockRepository.createMovement({
        organization_id: organizationId,
        warehouse_id: warehouseId,
        product_id: productId,
        variant_id: variantId,
        batch_id: batchId,
        quantity: qty, // Positive for inward movement
        movement_type: "purchase",
        reference_type: "trade_transactions",
        reference_id: transactionId || importId,
        unit_cost: unitCost,
        total_cost: unitCost * qty,
        valuation_method: "FIFO",
        created_by: actorUserId
      });

      // Update legacy inventory master record for backward compatibility
      try {
        const { data: legacyProd } = await adminSupabase
          .from("inventory")
          .select("id, stock, cost_price")
          .eq("id", productId)
          .maybeSingle();

        if (legacyProd) {
          const currentLegacyStock = Number(legacyProd.stock || 0);
          await adminSupabase
            .from("inventory")
            .update({
              stock: currentLegacyStock + qty,
              cost_price: unitCost > 0 ? unitCost : legacyProd.cost_price,
              price: sellingPrice > 0 ? sellingPrice : legacyProd.price,
              updated_at: new Date().toISOString()
            })
            .eq("id", productId);
        }
      } catch {}

      publisher.publish("inventory.movement.created", { id: movement.id, organizationId });
      publisher.publish("inventory.stock.changed", { productId, warehouseId, organizationId, onHand: newOnHand });

      receiptResults.push({ stock: updatedStock, movement, batchId });
    }

    return receiptResults;
  }
}

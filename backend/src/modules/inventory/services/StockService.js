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
      } else {
        const { data: newBatch, error: bErr } = await adminSupabase
          .from("inventory_batches")
          .insert({
            organization_id: organizationId,
            product_id: productId,
            warehouse_id: warehouseId,
            batch_number: batchNumber,
            purchase_cost: unitCost,
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
}

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { StockService } from "../src/modules/inventory/services/StockService.js";
import { BatchSelectionEngine } from "../src/modules/inventory/services/BatchSelectionEngine.js";
import { StockRepository } from "../src/modules/inventory/repositories/StockRepository.js";
import { ValidationError, ConflictError, NotFoundError } from "../src/modules/masters/errors/appErrors.js";
import { adminSupabase } from "../src/admin/adminSupabase.js";

// Mock Database Memory Arrays
let mockWarehouseStock = [];
let mockMovements = [];
let mockBatches = [];
let mockSerials = [];
let mockAdjustments = [];
let mockTransfers = [];
let mockReservations = [];
let mockSnapshots = [];
let mockPreferences = [];

describe("Inventory Engine Module Unit & Integration Tests", () => {
  before(() => {
    const whLocks = {};

    StockRepository.lockWarehouseStock = async (orgId, warehouseId, productId, variantId) => {
      const vId = variantId || null;
      const lockKey = `${orgId}:${warehouseId}:${productId}:${vId}`;

      // Acquire lock: wait if a lock exists
      while (whLocks[lockKey]) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      whLocks[lockKey] = true;

      // Fail-safe auto-release timeout to prevent deadlocks on failures
      setTimeout(() => {
        whLocks[lockKey] = false;
      }, 15);

      let stock = mockWarehouseStock.find(
        s => s.warehouse_id === warehouseId &&
             s.product_id === productId &&
             s.variant_id === vId &&
             s.organization_id === orgId
      );

      if (!stock) {
        stock = {
          id: `wh-stock-${Math.random()}`,
          organization_id: orgId,
          warehouse_id: warehouseId,
          product_id: productId,
          variant_id: vId,
          on_hand: 0.0000,
          reserved: 0.0000,
          available: 0.0000,
          incoming: 0.0000,
          outgoing: 0.0000
        };
        mockWarehouseStock.push(stock);
      }
      return { ...stock };
    };

    StockRepository.updateWarehouseStock = async (id, orgId, updates) => {
      const idx = mockWarehouseStock.findIndex(s => s.id === id && s.organization_id === orgId);
      if (idx !== -1) {
        mockWarehouseStock[idx] = { ...mockWarehouseStock[idx], ...updates };
        
        // Release lock
        const s = mockWarehouseStock[idx];
        const lockKey = `${orgId}:${s.warehouse_id}:${s.product_id}:${s.variant_id}`;
        whLocks[lockKey] = false;

        return { ...mockWarehouseStock[idx] };
      }
      throw new Error("Warehouse stock row not found.");
    };

    StockRepository.createMovement = async (data) => {
      const record = { id: `mvt-${Math.random()}`, created_at: new Date().toISOString(), ...data };
      mockMovements.push(record);
      return record;
    };

    StockRepository.findBatches = async (productId, warehouseId, orgId) => {
      return mockBatches.filter(
        b => b.product_id === productId &&
             b.warehouse_id === warehouseId &&
             b.organization_id === orgId
      );
    };

    StockRepository.findSerialNumbers = async (productId, warehouseId, orgId) => {
      return mockSerials.filter(
        s => s.product_id === productId &&
             s.warehouse_id === warehouseId &&
             s.organization_id === orgId
      );
    };

    StockRepository.createAdjustment = async (data) => {
      const record = { id: `adj-${Math.random()}`, created_at: new Date().toISOString(), ...data };
      mockAdjustments.push(record);
      return record;
    };

    StockRepository.createTransfer = async (data) => {
      const record = { id: `tx-${Math.random()}`, created_at: new Date().toISOString(), ...data };
      mockTransfers.push(record);
      return record;
    };

    StockRepository.updateTransfer = async (id, orgId, updates) => {
      const idx = mockTransfers.findIndex(t => t.id === id && t.organization_id === orgId);
      if (idx !== -1) {
        mockTransfers[idx] = { ...mockTransfers[idx], ...updates };
        return mockTransfers[idx];
      }
      throw new Error("Transfer not found.");
    };

    StockRepository.createReservation = async (data) => {
      const record = { id: `res-${Math.random()}`, created_at: new Date().toISOString(), ...data };
      mockReservations.push(record);
      return record;
    };

    StockRepository.updateReservation = async (id, orgId, updates) => {
      const idx = mockReservations.findIndex(r => r.id === id && r.organization_id === orgId);
      if (idx !== -1) {
        mockReservations[idx] = { ...mockReservations[idx], ...updates };
        return mockReservations[idx];
      }
      throw new Error("Reservation not found.");
    };

    // 2. Mock adminSupabase for specific lookups
    adminSupabase.from = (table) => {
      return {
        select: (cols) => {
          let list = [];
          if (table === "inventory_batches") list = mockBatches;
          else if (table === "inventory_serial_numbers") list = mockSerials;
          else if (table === "inventory_transfers") list = mockTransfers;
          else if (table === "inventory_reservations") list = mockReservations;
          else if (table === "organization_preferences") list = mockPreferences;
          else if (table === "organizations") list = [{ id: "org-1", business_type: "Medical" }];

          const queryHelper = {
            eq: (field, val) => {
              list = list.filter(r => r[field] === val);
              return queryHelper;
            },
            is: (field, val) => {
              if (val === null) {
                list = list.filter(r => r[field] === null || r[field] === undefined);
              } else {
                list = list.filter(r => r[field] === val);
              }
              return queryHelper;
            },
            maybeSingle: async () => ({ data: list[0] || null, error: null }),
            single: async () => {
              if (list.length === 0) return { data: null, error: new Error("Not found") };
              return { data: list[0], error: null };
            },
            then: (resolve) => resolve({ data: list, error: null })
          };
          return queryHelper;
        },
        insert: (data) => {
          const arr = Array.isArray(data) ? data : [data];
          const records = arr.map(item => {
            const record = { id: `${table}-id-${Math.random()}`, created_at: new Date().toISOString(), ...item };
            if (table === "inventory_batches") mockBatches.push(record);
            else if (table === "inventory_serial_numbers") mockSerials.push(record);
            return record;
          });
          const returnRecord = Array.isArray(data) ? records : records[0];
          return {
            select: () => ({
              single: async () => ({ data: returnRecord, error: null }),
              maybeSingle: async () => ({ data: returnRecord, error: null }),
              then: (resolve) => resolve({ data: records, error: null })
            })
          };
        }
      };
    };
  });

  beforeEach(() => {
    mockWarehouseStock = [];
    mockMovements = [];
    mockBatches = [];
    mockSerials = [];
    mockAdjustments = [];
    mockTransfers = [];
    mockReservations = [];
    mockSnapshots = [];
    mockPreferences = [];
  });

  test("1. Opening Stock Post & Balances Verification", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const prodId = "prod-1";

    const { stock, movement } = await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 50,
      unitCost: 10.00,
      batchNumber: "BATCH-001"
    }, "user-1");

    assert.equal(stock.on_hand, 50);
    assert.equal(stock.available, 50);
    assert.equal(movement.movement_type, "opening_stock");
    assert.equal(movement.total_cost, 500);

    // Verify batch row created
    assert.equal(mockBatches.length, 1);
    assert.equal(mockBatches[0].batch_number, "BATCH-001");
  });

  test("2. Concurrency Simulation - 100 Parallel Deductions", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const prodId = "prod-1";

    // Setup initial opening stock
    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 120
    }, "user-1");

    // Perform 100 parallel deductions of 1 unit each
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        StockService.postAdjustment(orgId, {
          warehouseId: whId,
          productId: prodId,
          quantity: 1,
          reason: "Sales deduction simulation",
          type: "adjustment_decrease"
        }, "user-1")
      );
    }

    await Promise.all(promises);

    // Verify summary balance is exactly correct (120 - 100 = 20)
    const finalStock = await StockService.getWarehouseBalance(whId, prodId, null, orgId);
    assert.equal(finalStock.onHand, 20);
    assert.equal(finalStock.available, 20);
  });

  test("3. Negative Stock Prevention", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const prodId = "prod-1";

    // Setup initial stock of 10
    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 10
    }, "user-1");

    // Attempt to deduct 15 (should fail)
    await assert.rejects(
      async () => StockService.postAdjustment(orgId, {
        warehouseId: whId,
        productId: prodId,
        quantity: 15,
        reason: "Test deduction",
        type: "adjustment_decrease"
      }, "user-1"),
      ValidationError
    );
  });

  test("4. FEFO Strategy - Closest Expiry Selected First", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const prodId = "prod-1";

    // Set organization preference to default (Medical uses FEFO)
    mockPreferences.push({
      organization_id: orgId,
      preferences: { batchSelectionStrategy: "FEFO" }
    });

    // Create batches with different expiry dates
    mockBatches.push(
      { id: "b1", organization_id: orgId, product_id: prodId, warehouse_id: whId, batch_number: "EXP-LATE", expiry_date: "2026-12-31" },
      { id: "b2", organization_id: orgId, product_id: prodId, warehouse_id: whId, batch_number: "EXP-SOON", expiry_date: "2026-07-31" }
    );

    const allocations = await BatchSelectionEngine.selectBatches({
      organizationId: orgId,
      productId: prodId,
      warehouseId: whId,
      quantityToFulfill: 5
    });

    // Should prioritize closest expiry: EXP-SOON (b2)
    assert.equal(allocations[0].batchId, "b2");
    assert.equal(allocations[0].batchNumber, "EXP-SOON");
  });

  test("5. Stock Reservations Hold and Releases", async () => {
    const orgId = "org-1";
    const whId = "wh-1";
    const prodId = "prod-1";

    // Seed 10 opening stock
    await StockService.postOpeningStock(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 10
    }, "user-1");

    // Reserve 4 units
    const res = await StockService.createReservation(orgId, {
      warehouseId: whId,
      productId: prodId,
      quantity: 4,
      referenceType: "sales_order",
      referenceId: "00000000-0000-0000-0000-000000000000"
    }, "user-1");

    // Verify balances (onHand = 10, reserved = 4, available = 6)
    let balance = await StockService.getWarehouseBalance(whId, prodId, null, orgId);
    assert.equal(balance.onHand, 10);
    assert.equal(balance.reserved, 4);
    assert.equal(balance.available, 6);

    // Release reservation
    await StockService.releaseReservation(res.id, orgId, "user-1");

    // Verify balances restored (reserved = 0, available = 10)
    balance = await StockService.getWarehouseBalance(whId, prodId, null, orgId);
    assert.equal(balance.reserved, 0);
    assert.equal(balance.available, 10);
  });

  test("6. Two-Phase Stock Transfer Workflow", async () => {
    const orgId = "org-1";
    const srcWh = "wh-source";
    const destWh = "wh-destination";
    const prodId = "prod-1";

    // Seed 10 units in source warehouse
    await StockService.postOpeningStock(orgId, {
      warehouseId: srcWh,
      productId: prodId,
      quantity: 10
    }, "user-1");

    // Phase 1: Ship Transfer of 3 units
    const tx = await StockService.shipTransfer(orgId, {
      sourceWarehouseId: srcWh,
      targetWarehouseId: destWh,
      productId: prodId,
      quantity: 3
    }, "user-1");

    // Verify Source: onHand=7, available=7, outgoing=0. Destination: incoming=3, onHand=0
    let srcBal = await StockService.getWarehouseBalance(srcWh, prodId, null, orgId);
    let destBal = await StockService.getWarehouseBalance(destWh, prodId, null, orgId);

    assert.equal(srcBal.onHand, 7);
    assert.equal(destBal.onHand, 0);
    assert.equal(destBal.incoming, 3);

    // Phase 2: Receive Transfer
    await StockService.receiveTransfer(tx.id, orgId, {
      productId: prodId,
      quantity: 3
    }, "user-1");

    // Verify destination balance increased, incoming cleared
    destBal = await StockService.getWarehouseBalance(destWh, prodId, null, orgId);
    assert.equal(destBal.onHand, 3);
    assert.equal(destBal.incoming, 0);
  });
});

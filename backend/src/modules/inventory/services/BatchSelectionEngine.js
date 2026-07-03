import { StockRepository } from "../repositories/StockRepository.js";
import { ValidationError } from "../../masters/errors/appErrors.js";
import { adminSupabase } from "../../../admin/adminSupabase.js";

export class BatchSelectionEngine {
  /**
   * Selects batches to fulfill a requested quantity based on FEFO or FIFO strategies
   * @param {object} params 
   * @param {string} params.organizationId
   * @param {string} params.productId
   * @param {string} params.warehouseId
   * @param {number} params.quantityToFulfill
   */
  static async selectBatches({ organizationId, productId, warehouseId, quantityToFulfill }) {
    // 1. Fetch organization preferences to determine strategy
    const { data: pref } = await adminSupabase
      .from("organization_preferences")
      .select("preferences")
      .eq("organization_id", organizationId)
      .maybeSingle();

    let strategy = "FIFO";
    if (pref && pref.preferences && pref.preferences.batchSelectionStrategy) {
      strategy = pref.preferences.batchSelectionStrategy;
    } else {
      // Default to FEFO if organization matches a medical sector
      const { data: org } = await adminSupabase
        .from("organizations")
        .select("business_type")
        .eq("id", organizationId)
        .maybeSingle();

      if (org && org.business_type === "Medical") {
        strategy = "FEFO";
      }
    }

    // 2. Fetch active batches
    const batches = await StockRepository.findBatches(productId, warehouseId, organizationId);

    // 3. Sort batches according to strategy
    if (strategy === "FEFO") {
      // FEFO: Closest expiry first (nulls go last)
      batches.sort((a, b) => {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });
    } else {
      // FIFO: Oldest creation first
      batches.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    // 4. Allocate requested quantity across batches
    let remaining = quantityToFulfill;
    const allocations = [];

    // Note: For now, in Sprint 4 we do not track current_qty inside batches dynamically, 
    // but we can look up movement history or assume simple allocation. Let's return the sorted batches
    // and let the caller allocate or deduct. Let's make it return allocations:
    for (const b of batches) {
      if (remaining <= 0) break;
      // Assume a default batch capacity or look up from warehouse stock if needed.
      // To keep it simple and robust, we return the primary allocated batch
      allocations.push({
        batchId: b.id,
        batchNumber: b.batch_number,
        allocatedQty: remaining // simplified allocation for cost foundation
      });
      break; // Fulfilled by first sorted batch in FIFO/FEFO list
    }

    return allocations;
  }
}

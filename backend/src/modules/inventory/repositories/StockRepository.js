import { adminSupabase } from "../../../admin/adminSupabase.js";

export class StockRepository {
  static async lockWarehouseStock(orgId, warehouseId, productId, variantId) {
    const { data, error } = await adminSupabase
      .rpc("lock_warehouse_stock", {
        p_org_id: orgId,
        p_warehouse_id: warehouseId,
        p_product_id: productId,
        p_variant_id: variantId || null
      });

    if (error) throw error;
    // Returns array of locked warehouse_stock row
    return data && data.length > 0 ? data[0] : null;
  }

  static async updateWarehouseStock(id, orgId, updates) {
    const { data, error } = await adminSupabase
      .from("warehouse_stock")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createMovement(data) {
    const { data: movement, error } = await adminSupabase
      .from("inventory_movements")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return movement;
  }

  static async findBatches(productId, warehouseId, orgId) {
    const { data, error } = await adminSupabase
      .from("inventory_batches")
      .select("*")
      .eq("product_id", productId)
      .eq("warehouse_id", warehouseId)
      .eq("organization_id", orgId)
      .eq("status", "active")
      .is("deleted_at", null);

    if (error) throw error;
    return data;
  }

  static async findSerialNumbers(productId, warehouseId, orgId) {
    const { data, error } = await adminSupabase
      .from("inventory_serial_numbers")
      .select("*")
      .eq("product_id", productId)
      .eq("warehouse_id", warehouseId)
      .eq("organization_id", orgId)
      .is("deleted_at", null);

    if (error) throw error;
    return data;
  }

  static async updateSerialStatus(id, orgId, status, txClient = adminSupabase) {
    const { data, error } = await txClient
      .from("inventory_serial_numbers")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createAdjustment(data) {
    const { data: adj, error } = await adminSupabase
      .from("inventory_adjustments")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return adj;
  }

  static async createTransfer(data) {
    const { data: tx, error } = await adminSupabase
      .from("inventory_transfers")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return tx;
  }

  static async updateTransfer(id, orgId, updates) {
    const { data, error } = await adminSupabase
      .from("inventory_transfers")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createReservation(data) {
    const { data: res, error } = await adminSupabase
      .from("inventory_reservations")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return res;
  }

  static async updateReservation(id, orgId, updates) {
    const { data, error } = await adminSupabase
      .from("inventory_reservations")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

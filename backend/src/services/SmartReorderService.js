import { supabase } from "../config/db.js";

/**
 * SmartReorderService — Generates reorder suggestions for low-stock items
 * by looking at preferred suppliers and historical order quantities.
 */
export const SmartReorderService = {
  /**
   * Get reorder suggestion for a given inventory item.
   * Returns preferred supplier info + suggested quantity.
   */
  async getSuggestedReorder(userId, inventoryId) {
    try {
      // 1. Get inventory item details
      const { data: item, error: itemErr } = await supabase
        .from("inventory")
        .select("id, name, sku, stock, low_stock_threshold, user_id")
        .eq("id", inventoryId)
        .eq("user_id", userId)
        .single();

      if (itemErr || !item) {
        return { error: "Inventory item not found" };
      }

      // 2. Check if there's a supplier product link for this item
      const { data: links } = await supabase
        .from("supplier_product_links")
        .select(`
          *,
          supplier:supplier_id(id, business_name, phone, email)
        `)
        .eq("buyer_id", userId)
        .eq("buyer_inventory_id", inventoryId);

      let preferredSupplier = null;
      let supplierLink = null;

      if (links && links.length > 0) {
        // Get the preferred supplier from among linked suppliers
        const supplierIds = links.map(l => l.supplier_id);

        const { data: prefSupplier } = await supabase
          .from("preferred_suppliers")
          .select("supplier_id, is_primary, priority_order")
          .eq("buyer_id", userId)
          .in("supplier_id", supplierIds)
          .order("priority_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (prefSupplier) {
          supplierLink = links.find(l => l.supplier_id === prefSupplier.supplier_id);
          preferredSupplier = supplierLink?.supplier;
        } else {
          supplierLink = links[0];
          preferredSupplier = supplierLink?.supplier;
        }
      }

      // 3. Find last order quantity from trade_transaction_items (as a buyer)
      let lastOrderQty = null;
      let lastOrderDate = null;

      if (preferredSupplier) {
        const { data: lastItems } = await supabase
          .from("trade_transaction_items")
          .select(`
            quantity,
            trade_transactions!inner(created_at, sender_id, receiver_id, status)
          `)
          .eq("product_name", supplierLink?.supplier_product_name || item.name)
          .order("id", { ascending: false })
          .limit(5);

        if (lastItems && lastItems.length > 0) {
          lastOrderQty = lastItems[0].quantity;
          lastOrderDate = lastItems[0].trade_transactions?.created_at;
        }
      }

      // 4. Suggest reorder quantity
      const suggestedQty = lastOrderQty || Math.max(item.low_stock_threshold * 3, 10);

      return {
        inventoryId,
        itemName: item.name,
        currentStock: item.stock,
        lowStockThreshold: item.low_stock_threshold,
        preferredSupplier: preferredSupplier ? {
          id: preferredSupplier.id,
          business_name: preferredSupplier.business_name,
          phone: preferredSupplier.phone,
          email: preferredSupplier.email,
          supplierProductName: supplierLink?.supplier_product_name || item.name
        } : null,
        lastOrderQty,
        lastOrderDate,
        suggestedQty,
        hasPreferredSupplier: !!preferredSupplier
      };
    } catch (err) {
      console.error("[SmartReorderService] getSuggestedReorder error:", err.message);
      return { error: err.message };
    }
  }
};

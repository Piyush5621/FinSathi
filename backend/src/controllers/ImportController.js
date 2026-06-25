import { supabase } from "../config/db.js";
import { NetworkService } from "../services/NetworkService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * ImportController — Inventory import wizard
 * Handles: preflight match check, draft, execute import, history
 */

// Pre-flight: analyze a trade transaction and suggest product matches
export const createImportDraft = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { transaction_id } = req.body;

    if (!transaction_id) return errorResponse(res, "transaction_id is required", 400);

    // Verify buyer owns this transaction
    const { data: tx, error: txErr } = await supabase
      .from("trade_transactions")
      .select("*, sender:sender_id(id, business_name)")
      .eq("id", transaction_id)
      .eq("receiver_id", buyerId)
      .single();

    if (txErr || !tx) return errorResponse(res, "Trade transaction not found", 404);

    // Check if import draft already exists
    const { data: existingImport } = await supabase
      .from("purchase_imports")
      .select("*")
      .eq("transaction_id", transaction_id)
      .eq("buyer_id", buyerId)
      .maybeSingle();

    if (existingImport && existingImport.status !== "Draft") {
      return errorResponse(res, "This invoice has already been processed", 409);
    }

    // Fetch transaction items
    const { data: items } = await supabase
      .from("trade_transaction_items")
      .select("*")
      .eq("transaction_id", transaction_id);

    const supplierId = tx.sender_id;

    // Run fuzzy matching for each item
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const match = await NetworkService.findSimilarProduct(buyerId, item.product_name, item.sku, supplierId);
      return {
        trade_item_id: item.id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        gst_percent: item.gst_percent,
        category: item.category,
        unit: item.unit,
        expiry_date: item.expiry_date,
        batch_name: item.batch_name,
        total: item.total,
        // Match suggestion from fuzzy engine
        suggested_action: match.matchType !== "none" ? "match" : "create",
        matched_inventory: match.match,
        match_score: match.score,
        match_type: match.matchType,
        // Defaults for buyer to override
        selling_price: match.match?.price ? Number(match.match.price) * 1.15 : item.purchase_price * 1.2,
        mrp: match.match?.price || item.purchase_price * 1.3,
        inventory_id: match.match?.id || null,
        action: match.matchType !== "none" ? "match" : "create"
      };
    }));

    // Create or update import draft
    let importRecord;
    if (existingImport) {
      const { data } = await supabase
        .from("purchase_imports")
        .update({ status: "Draft" })
        .eq("id", existingImport.id)
        .select()
        .single();
      importRecord = data;
    } else {
      const { data, error: importErr } = await supabase
        .from("purchase_imports")
        .insert({ transaction_id, buyer_id: buyerId, status: "Draft" })
        .select()
        .single();
      if (importErr) throw importErr;
      importRecord = data;
    }

    return successResponse(res, {
      import: importRecord,
      transaction: tx,
      items: enrichedItems
    }, "Import draft created with product match suggestions");
  } catch (err) {
    console.error("createImportDraft error:", err);
    return errorResponse(res, err, 500, "Failed to create import draft");
  }
};

// Execute the final import — creates/updates inventory records
export const executeImport = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { import_id, items } = req.body;
    // items: [{ trade_item_id, action, inventory_id, selling_price, mrp, gst_percent, category, unit, min_stock, reorder_level, product_name, quantity, purchase_price }]

    if (!import_id || !items || !Array.isArray(items)) {
      return errorResponse(res, "import_id and items[] are required", 400);
    }

    // Verify import belongs to buyer
    const { data: importRecord, error: importErr } = await supabase
      .from("purchase_imports")
      .select("*, trade_transactions(id, sender_id, invoice_no)")
      .eq("id", import_id)
      .eq("buyer_id", buyerId)
      .eq("status", "Draft")
      .single();

    if (importErr || !importRecord) return errorResponse(res, "Import draft not found or already processed", 404);

    let createdCount = 0;
    let matchedCount = 0;
    let ignoredCount = 0;
    const savedLinks = [];

    for (const item of items) {
      if (item.action === "ignore") {
        ignoredCount++;
        continue;
      }

      const supplierId = importRecord.trade_transactions?.sender_id;

      if (item.action === "create") {
        // Create a new inventory product
        const { data: newProduct, error: createErr } = await supabase
          .from("inventory")
          .insert({
            user_id: buyerId,
            name: item.product_name,
            sku: item.sku || null,
            price: item.selling_price || item.purchase_price * 1.2,
            cost_price: item.purchase_price,
            gst_percent: item.gst_percent || 0,
            category: item.category || "General",
            unit: item.unit || "pcs",
            stock: item.quantity,
            low_stock_threshold: item.min_stock || 5,
            reorder_level: item.reorder_level || 10
          })
          .select()
          .single();

        if (createErr) {
          console.warn(`[ImportController] Failed to create product ${item.product_name}:`, createErr.message);
          continue;
        }

        // Add inventory batch for this import
        await supabase.from("inventory_batches").insert({
          inventory_id: newProduct.id,
          batch_name: importRecord.trade_transactions?.invoice_no || "Network Import",
          sku_variant: item.sku || newProduct.sku || "",
          cost_price: item.purchase_price,
          selling_price: item.selling_price || item.purchase_price * 1.2,
          stock: item.quantity
        }).catch(() => {});

        // Save supplier product link for future auto-matching
        if (supplierId) {
          await supabase.from("supplier_product_links").upsert({
            supplier_id: supplierId,
            buyer_id: buyerId,
            supplier_product_name: item.product_name,
            supplier_sku: item.sku || null,
            buyer_inventory_id: newProduct.id,
            auto_import: true,
            confidence_score: 1.0
          }, { onConflict: "supplier_id,buyer_id,supplier_product_name" }).catch(() => {});
        }

        createdCount++;
        savedLinks.push({ product_name: item.product_name, inventory_id: newProduct.id, action: "created" });

      } else if (item.action === "match" && item.inventory_id) {
        // Match to existing product — add stock
        const { data: existing } = await supabase
          .from("inventory")
          .select("stock")
          .eq("id", item.inventory_id)
          .eq("user_id", buyerId)
          .single();

        if (existing) {
          const newStock = Number(existing.stock || 0) + Number(item.quantity || 0);
          await supabase
            .from("inventory")
            .update({ stock: newStock })
            .eq("id", item.inventory_id);

          // Add batch
          await supabase.from("inventory_batches").insert({
            inventory_id: item.inventory_id,
            batch_name: importRecord.trade_transactions?.invoice_no || "Network Import",
            sku_variant: item.sku || "",
            cost_price: item.purchase_price,
            selling_price: item.selling_price || item.purchase_price * 1.2,
            stock: item.quantity
          }).catch(() => {});

          // Save/update supplier product link
          if (supplierId) {
            await supabase.from("supplier_product_links").upsert({
              supplier_id: supplierId,
              buyer_id: buyerId,
              supplier_product_name: item.product_name,
              supplier_sku: item.sku || null,
              buyer_inventory_id: item.inventory_id,
              auto_import: true,
              confidence_score: 1.0
            }, { onConflict: "supplier_id,buyer_id,supplier_product_name" }).catch(() => {});
          }

          matchedCount++;
          savedLinks.push({ product_name: item.product_name, inventory_id: item.inventory_id, action: "matched" });
        }
      }
    }

    // Mark import as Completed
    await supabase
      .from("purchase_imports")
      .update({
        status: "Completed",
        items_created: createdCount,
        items_matched: matchedCount,
        items_ignored: ignoredCount,
        imported_at: new Date().toISOString()
      })
      .eq("id", import_id);

    // Mark trade transaction as Imported
    await supabase
      .from("trade_transactions")
      .update({ status: "Imported", updated_at: new Date().toISOString() })
      .eq("id", importRecord.transaction_id);

    // Notify supplier
    if (importRecord.trade_transactions?.sender_id) {
      const { data: buyer } = await supabase.from("users").select("business_name").eq("id", buyerId).single();
      await NetworkService.notifyUser(
        importRecord.trade_transactions.sender_id,
        "import_accepted",
        "Invoice Imported",
        `${buyer?.business_name || "Buyer"} imported your invoice #${importRecord.trade_transactions.invoice_no} — ${createdCount} products created, ${matchedCount} matched.`,
        importRecord.transaction_id,
        "trade_transaction"
      );
    }

    return successResponse(res, {
      import_id,
      itemsCreated: createdCount,
      itemsMatched: matchedCount,
      itemsIgnored: ignoredCount,
      savedLinks
    }, `Import completed: ${createdCount} products created, ${matchedCount} matched, ${ignoredCount} ignored`);
  } catch (err) {
    console.error("executeImport error:", err);
    return errorResponse(res, err, 500, "Import execution failed");
  }
};

// Get import history for the buyer
export const getImportHistory = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const { data, error } = await supabase
      .from("purchase_imports")
      .select("*, trade_transactions(id, invoice_no, total_amount, sender:sender_id(business_name))")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return successResponse(res, data, "Import history retrieved");
  } catch (err) {
    console.error("getImportHistory error:", err);
    return errorResponse(res, err, 500, "Failed to fetch import history");
  }
};

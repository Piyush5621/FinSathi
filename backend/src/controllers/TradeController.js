import { supabase } from "../config/db.js";
import { NetworkService } from "../services/NetworkService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * TradeController — Cross-business invoice exchange
 * Handles: send invoice, send existing sale, purchase inbox, sales outbox, status updates, trade history
 */

// Send existing sales invoice from POS/Billing to connected buyer
export const sendSaleTradeTransaction = async (req, res) => {
  try {
    const senderId = req.user.id || req.user.user_id;
    const orgId = req.tenantId || req.user?.organization_id || req.user?.tenant_id;
    const { sale_id, receiver_id, notes } = req.body;

    if (!sale_id || !receiver_id) {
      return errorResponse(res, "sale_id and receiver_id are required", 400);
    }

    // 1. Fetch existing sale and items
    let saleQuery = supabase
      .from("sales")
      .select("*, sale_items(*, products(*))")
      .eq("id", sale_id);

    if (orgId) {
      saleQuery = saleQuery.or(`organization_id.eq.${orgId},user_id.eq.${senderId}`);
    } else {
      saleQuery = saleQuery.eq("user_id", senderId);
    }

    const { data: sale, error: saleErr } = await saleQuery.single();

    if (saleErr || !sale) {
      return errorResponse(res, "Existing sale invoice not found or unauthorized", 404);
    }

    const items = sale.sale_items || [];
    if (!items || items.length === 0) {
      return errorResponse(res, "Sale invoice contains no items to send", 400);
    }

    // 2. Verify connection exists with receiver
    const { data: conn } = await supabase
      .from("business_connections")
      .select("id")
      .or(`and(requester_id.eq.${senderId},receiver_id.eq.${receiver_id}),and(requester_id.eq.${receiver_id},receiver_id.eq.${senderId})`)
      .eq("status", "accepted")
      .maybeSingle();

    if (!conn) {
      return errorResponse(res, "You must be connected with this business partner to send invoices", 403);
    }

    // 3. Idempotency check: Check if this sale invoice has already been sent to this receiver
    const invoiceNumber = sale.invoice_no || `INV-${String(sale.id).slice(0, 8)}`;
    const { data: existingTx } = await supabase
      .from("trade_transactions")
      .select("id, status")
      .eq("sender_id", senderId)
      .eq("receiver_id", receiver_id)
      .eq("invoice_no", invoiceNumber)
      .maybeSingle();

    if (existingTx) {
      return errorResponse(res, `Invoice #${invoiceNumber} has already been sent to this partner (Status: ${existingTx.status})`, 409);
    }

    // 4. Calculate items line values
    let totalAmount = 0;
    let taxAmount = 0;
    const normalizedItems = items.map(item => {
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price || item.price || (item.total ? item.total / qty : 0));
      const gst = Number(item.gst_rate || item.gst_percent || item.tax_rate || 0);
      const lineTotal = qty * unitPrice;
      const lineTax = lineTotal * (gst / 100);
      totalAmount += lineTotal + lineTax;
      taxAmount += lineTax;

      const prodName = item.products?.name || item.product_name || item.name || "Product Item";
      const sku = item.products?.sku || item.sku || null;
      const category = item.products?.category || item.category || null;
      const unit = item.products?.unit || item.unit || "pcs";
      const batchName = item.batch_name || item.batch_number || null;
      const expiryDate = item.expiry_date || null;

      return {
        product_name: prodName,
        sku,
        quantity: qty,
        purchase_price: unitPrice,
        gst_percent: gst,
        category,
        batch_name: batchName,
        expiry_date: expiryDate,
        unit,
        total: lineTotal + lineTax
      };
    });

    const finalTotal = Number(sale.total) || totalAmount;

    // 5. Insert trade transaction
    const { data: transaction, error: txErr } = await supabase
      .from("trade_transactions")
      .insert({
        sender_id: senderId,
        receiver_id,
        connection_id: conn.id,
        invoice_no: invoiceNumber,
        invoice_date: sale.date ? String(sale.date).split("T")[0] : (sale.created_at ? String(sale.created_at).split("T")[0] : new Date().toISOString().split("T")[0]),
        total_amount: finalTotal,
        tax_amount: taxAmount,
        status: "Pending",
        notes: notes || `Sent from Sale Invoice #${invoiceNumber}`
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // 6. Insert transaction items
    const itemsPayload = normalizedItems.map(item => ({
      transaction_id: transaction.id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      purchase_price: item.purchase_price,
      gst_percent: item.gst_percent,
      category: item.category,
      batch_name: item.batch_name,
      expiry_date: item.expiry_date,
      unit: item.unit,
      total: item.total
    }));

    const { error: itemsErr } = await supabase
      .from("trade_transaction_items")
      .insert(itemsPayload);

    if (itemsErr) {
      await supabase.from("trade_transactions").delete().eq("id", transaction.id);
      throw itemsErr;
    }

    // 7. Update connection trade volume
    try {
      const { data: currentConn } = await supabase
        .from("business_connections")
        .select("trade_volume")
        .eq("id", conn.id)
        .single();
      const newVolume = Number(currentConn?.trade_volume || 0) + finalTotal;
      await supabase
        .from("business_connections")
        .update({ trade_volume: newVolume })
        .eq("id", conn.id);
    } catch {}

    // 8. Notify buyer
    const { data: sender } = await supabase
      .from("users")
      .select("business_name, name")
      .eq("id", senderId)
      .single();

    await NetworkService.notifyUser(
      receiver_id,
      "invoice_received",
      "New Invoice Received",
      `${sender?.business_name || "A supplier"} sent you invoice #${invoiceNumber} for ₹${finalTotal.toLocaleString("en-IN")}.`,
      transaction.id,
      "trade_transaction"
    );

    return createdResponse(res, transaction, "Existing sale invoice sent to partner successfully");
  } catch (err) {
    console.error("sendSaleTradeTransaction error:", err);
    return errorResponse(res, err, 500, "Failed to send existing sale invoice");
  }
};

// Supplier pushes a manual invoice to a connected buyer (Fallback)
export const sendTradeTransaction = async (req, res) => {
  try {
    const senderId = req.user.id || req.user.user_id;
    const { receiver_id, invoice_no, invoice_date, items, notes } = req.body;

    if (!receiver_id || !items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "receiver_id and items[] are required", 400);
    }

    // Verify connection exists
    const { data: conn } = await supabase
      .from("business_connections")
      .select("id")
      .or(`and(requester_id.eq.${senderId},receiver_id.eq.${receiver_id}),and(requester_id.eq.${receiver_id},receiver_id.eq.${senderId})`)
      .eq("status", "accepted")
      .maybeSingle();

    if (!conn) {
      return errorResponse(res, "You must be connected with this business to send invoices", 403);
    }

    // Calculate totals
    let totalAmount = 0;
    let taxAmount = 0;
    const normalizedItems = items.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.purchase_price || 0);
      const gst = Number(item.gst_percent || 0);
      const lineTotal = qty * price;
      const lineTax = lineTotal * (gst / 100);
      totalAmount += lineTotal + lineTax;
      taxAmount += lineTax;
      return { ...item, quantity: qty, purchase_price: price, gst_percent: gst, total: lineTotal + lineTax };
    });

    // Insert trade transaction
    const { data: transaction, error: txErr } = await supabase
      .from("trade_transactions")
      .insert({
        sender_id: senderId,
        receiver_id,
        connection_id: conn.id,
        invoice_no: invoice_no || `TRD-${Date.now()}`,
        invoice_date: invoice_date || new Date().toISOString().split("T")[0],
        total_amount: totalAmount,
        tax_amount: taxAmount,
        status: "Pending",
        notes
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // Insert transaction items
    const itemsPayload = normalizedItems.map(item => ({
      transaction_id: transaction.id,
      product_name: item.product_name,
      sku: item.sku || null,
      quantity: item.quantity,
      purchase_price: item.purchase_price,
      gst_percent: item.gst_percent,
      category: item.category || null,
      batch_name: item.batch_name || null,
      expiry_date: item.expiry_date || null,
      unit: item.unit || "pcs",
      total: item.total
    }));

    const { error: itemsErr } = await supabase
      .from("trade_transaction_items")
      .insert(itemsPayload);

    if (itemsErr) {
      await supabase.from("trade_transactions").delete().eq("id", transaction.id);
      throw itemsErr;
    }

    // Update connection trade volume
    try {
      const { data: currentConn } = await supabase
        .from("business_connections")
        .select("trade_volume")
        .eq("id", conn.id)
        .single();
      const newVolume = Number(currentConn?.trade_volume || 0) + totalAmount;
      await supabase
        .from("business_connections")
        .update({ trade_volume: newVolume })
        .eq("id", conn.id);
    } catch {}

    // Notify buyer
    const { data: sender } = await supabase
      .from("users")
      .select("business_name, name")
      .eq("id", senderId)
      .single();

    await NetworkService.notifyUser(
      receiver_id,
      "invoice_received",
      "New Invoice Received",
      `${sender?.business_name || "A supplier"} sent you an invoice #${transaction.invoice_no} for ₹${totalAmount.toLocaleString("en-IN")}.`,
      transaction.id,
      "trade_transaction"
    );

    return createdResponse(res, transaction, "Trade invoice sent successfully");
  } catch (err) {
    console.error("sendTradeTransaction error:", err);
    return errorResponse(res, err, 500, "Failed to send trade invoice");
  }
};

// Buyer's purchase inbox — all received invoices
export const getPurchaseInbox = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { status } = req.query;

    let query = supabase
      .from("trade_transactions")
      .select("*, sender:sender_id(id, business_name, city, phone)")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return successResponse(res, data, "Purchase inbox retrieved");
  } catch (err) {
    console.error("getPurchaseInbox error:", err);
    return errorResponse(res, err, 500, "Failed to fetch purchase inbox");
  }
};

// Supplier's sales outbox — all sent invoices
export const getSalesOutbox = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { status } = req.query;

    let query = supabase
      .from("trade_transactions")
      .select("*, receiver:receiver_id(id, business_name, city, phone)")
      .eq("sender_id", userId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return successResponse(res, data, "Sales outbox retrieved");
  } catch (err) {
    console.error("getSalesOutbox error:", err);
    return errorResponse(res, err, 500, "Failed to fetch sales outbox");
  }
};

// Get a trade transaction's full details with items
export const getTransactionDetail = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { id } = req.params;

    const { data: transaction, error: txErr } = await supabase
      .from("trade_transactions")
      .select("*, sender:sender_id(id, business_name, phone, city), receiver:receiver_id(id, business_name, phone, city)")
      .eq("id", id)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .single();

    if (txErr || !transaction) return errorResponse(res, "Transaction not found", 404);

    const { data: items, error: itemsErr } = await supabase
      .from("trade_transaction_items")
      .select("*")
      .eq("transaction_id", id);

    if (itemsErr) throw itemsErr;

    // Mark as viewed if buyer is fetching
    if (transaction.receiver_id === userId && transaction.status === "Pending") {
      await supabase
        .from("trade_transactions")
        .update({ status: "Viewed", updated_at: new Date().toISOString() })
        .eq("id", id);

      await NetworkService.notifyUser(
        transaction.sender_id,
        "invoice_viewed",
        "Invoice Viewed",
        `Your invoice #${transaction.invoice_no} was viewed by the buyer.`,
        id,
        "trade_transaction"
      );
    }

    return successResponse(res, { ...transaction, items }, "Transaction details retrieved");
  } catch (err) {
    console.error("getTransactionDetail error:", err);
    return errorResponse(res, err, 500, "Failed to fetch transaction details");
  }
};

// Buyer updates status of a trade transaction (Accept / Reject)
export const updateTransactionStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { id } = req.params;
    const { status, notes } = req.body;

    const allowed = ["Accepted", "Rejected", "Modified"];
    if (!status || !allowed.includes(status)) {
      return errorResponse(res, `status must be one of: ${allowed.join(", ")}`, 400);
    }

    const { data: transaction, error: fetchErr } = await supabase
      .from("trade_transactions")
      .select("*")
      .eq("id", id)
      .eq("receiver_id", userId)
      .single();

    if (fetchErr || !transaction) return errorResponse(res, "Transaction not found", 404);

    const { data: updated, error } = await supabase
      .from("trade_transactions")
      .update({ status, notes: notes || transaction.notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const { data: buyer } = await supabase
      .from("users").select("business_name").eq("id", userId).single();

    const notifType = status === "Accepted" ? "import_accepted" : "import_rejected";
    await NetworkService.notifyUser(
      transaction.sender_id,
      notifType,
      `Invoice ${status}`,
      `${buyer?.business_name || "Buyer"} ${status.toLowerCase()} your invoice #${transaction.invoice_no}.`,
      id,
      "trade_transaction"
    );

    return successResponse(res, updated, `Transaction status updated to ${status}`);
  } catch (err) {
    console.error("updateTransactionStatus error:", err);
    return errorResponse(res, err, 500, "Failed to update transaction status");
  }
};

// Get full trade history (both sent and received) with filters
export const getTradeHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { partner_id, status, from_date, to_date } = req.query;

    let query = supabase
      .from("trade_transactions")
      .select("*, sender:sender_id(id, business_name), receiver:receiver_id(id, business_name)");

    if (partner_id) {
      query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${partner_id}),and(sender_id.eq.${partner_id},receiver_id.eq.${userId})`);
    } else {
      query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    }

    query = query.order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    if (from_date) query = query.gte("created_at", from_date);
    if (to_date) query = query.lte("created_at", to_date);

    const { data, error } = await query;
    if (error) throw error;

    return successResponse(res, data, "Trade history retrieved");
  } catch (err) {
    console.error("getTradeHistory error:", err);
    return errorResponse(res, err, 500, "Failed to fetch trade history");
  }
};

import { supabase } from "../config/db.js";
import { NetworkService } from "../services/NetworkService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * TradeController — Cross-business invoice exchange
 * Handles: send invoice, purchase inbox, sales outbox, status updates, trade history
 */

// Supplier pushes an invoice to a connected buyer
export const sendTradeTransaction = async (req, res) => {
  try {
    const senderId = req.user.id;
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
    await supabase
      .from("business_connections")
      .update({ trade_volume: supabase.raw(`trade_volume + ${totalAmount}`) })
      .eq("id", conn.id)
      .catch(() => {});

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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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

    // Notify sender
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
    const userId = req.user.id;
    const { partner_id, status, from_date, to_date } = req.query;

    let query = supabase
      .from("trade_transactions")
      .select("*, sender:sender_id(id, business_name), receiver:receiver_id(id, business_name)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (partner_id) {
      query = query.or(`and(sender_id.eq.${partner_id}),and(receiver_id.eq.${partner_id})`);
    }
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

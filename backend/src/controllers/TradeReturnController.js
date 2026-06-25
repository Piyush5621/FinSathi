import { supabase } from "../config/db.js";
import { NetworkService } from "../services/NetworkService.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * TradeReturnController — Product return and damage management
 */

// Buyer creates a return request
export const createReturnRequest = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { transaction_id, supplier_id, reason, notes, items } = req.body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "supplier_id and items[] are required", 400);
    }

    const totalValue = items.reduce((sum, i) => sum + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);
    const returnNo = `RET-${Date.now()}`;

    const { data: returnRecord, error: retErr } = await supabase
      .from("trade_returns")
      .insert({
        transaction_id: transaction_id || null,
        supplier_id,
        buyer_id: buyerId,
        return_no: returnNo,
        total_value: totalValue,
        reason,
        notes,
        status: "Requested"
      })
      .select()
      .single();

    if (retErr) throw retErr;

    // Insert return items
    const itemsPayload = items.map(item => ({
      return_id: returnRecord.id,
      product_name: item.product_name,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
      total: Number(item.quantity || 0) * Number(item.unit_price || 0),
      reason: item.reason || "Damaged"
    }));

    await supabase.from("trade_return_items").insert(itemsPayload);

    // Notify supplier
    const { data: buyer } = await supabase.from("users").select("business_name").eq("id", buyerId).single();
    await NetworkService.notifyUser(
      supplier_id,
      "return_requested",
      "Return Request Received",
      `${buyer?.business_name || "Buyer"} has requested a return for ${items.length} item(s). Return #${returnNo}.`,
      returnRecord.id,
      "trade_return"
    );

    return createdResponse(res, returnRecord, "Return request submitted successfully");
  } catch (err) {
    console.error("createReturnRequest error:", err);
    return errorResponse(res, err, 500, "Failed to create return request");
  }
};

// Get returns list (filtered by buyer or supplier perspective)
export const getReturns = async (req, res) => {
  try {
    const userId = req.user.id;
    const { role } = req.query; // 'buyer' | 'supplier'

    let query = supabase
      .from("trade_returns")
      .select("*, buyer:buyer_id(id, business_name), supplier:supplier_id(id, business_name)");

    if (role === "supplier") {
      query = query.eq("supplier_id", userId);
    } else {
      query = query.eq("buyer_id", userId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return successResponse(res, data, "Returns retrieved");
  } catch (err) {
    console.error("getReturns error:", err);
    return errorResponse(res, err, 500, "Failed to fetch returns");
  }
};

// Get return detail with items
export const getReturnDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: returnRecord, error } = await supabase
      .from("trade_returns")
      .select("*, buyer:buyer_id(id, business_name, phone), supplier:supplier_id(id, business_name, phone)")
      .eq("id", id)
      .or(`buyer_id.eq.${userId},supplier_id.eq.${userId}`)
      .single();

    if (error || !returnRecord) return errorResponse(res, "Return not found", 404);

    const { data: items } = await supabase
      .from("trade_return_items")
      .select("*")
      .eq("return_id", id);

    return successResponse(res, { ...returnRecord, items }, "Return details retrieved");
  } catch (err) {
    console.error("getReturnDetail error:", err);
    return errorResponse(res, err, 500, "Failed to fetch return details");
  }
};

// Supplier updates return status
export const updateReturnStatus = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;
    const { status, credit_note_amount } = req.body;

    const allowed = ["Approved", "Rejected", "Picked Up", "Completed"];
    if (!status || !allowed.includes(status)) {
      return errorResponse(res, `status must be one of: ${allowed.join(", ")}`, 400);
    }

    const updatePayload = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === "Completed" && credit_note_amount) {
      updatePayload.credit_note_issued = true;
      updatePayload.credit_note_amount = Number(credit_note_amount);
    }

    const { data: updated, error } = await supabase
      .from("trade_returns")
      .update(updatePayload)
      .eq("id", id)
      .eq("supplier_id", supplierId)
      .select()
      .single();

    if (error) throw error;

    // Notify buyer
    await NetworkService.notifyUser(
      updated.buyer_id,
      "return_approved",
      `Return ${status}`,
      `Your return request #${updated.return_no} has been ${status.toLowerCase()} by the supplier.`,
      id,
      "trade_return"
    );

    return successResponse(res, updated, `Return status updated to ${status}`);
  } catch (err) {
    console.error("updateReturnStatus error:", err);
    return errorResponse(res, err, 500, "Failed to update return status");
  }
};

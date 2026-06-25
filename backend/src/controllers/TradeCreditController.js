import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * TradeCreditController — B2B trade credit management
 */

export const getCreditAccounts = async (req, res) => {
  try {
    const userId = req.user.id;

    const [asSupplier, asBuyer] = await Promise.all([
      supabase.from("trade_credit_accounts")
        .select("*, buyer:buyer_id(id, business_name, phone)")
        .eq("supplier_id", userId),
      supabase.from("trade_credit_accounts")
        .select("*, supplier:supplier_id(id, business_name, phone)")
        .eq("buyer_id", userId)
    ]);

    return successResponse(res, {
      creditGiven: asSupplier.data || [],
      creditReceived: asBuyer.data || []
    }, "Trade credit accounts retrieved");
  } catch (err) {
    console.error("getCreditAccounts error:", err);
    return errorResponse(res, err, 500, "Failed to fetch credit accounts");
  }
};

export const createOrUpdateCreditAccount = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { buyer_id, credit_limit, due_date, notes } = req.body;

    if (!buyer_id || !credit_limit) return errorResponse(res, "buyer_id and credit_limit are required", 400);

    const { data, error } = await supabase
      .from("trade_credit_accounts")
      .upsert({
        supplier_id: supplierId,
        buyer_id,
        credit_limit: Number(credit_limit),
        due_date: due_date || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "supplier_id,buyer_id" })
      .select()
      .single();

    if (error) throw error;
    return createdResponse(res, data, "Credit account created/updated");
  } catch (err) {
    console.error("createOrUpdateCreditAccount error:", err);
    return errorResponse(res, err, 500, "Failed to save credit account");
  }
};

export const updateCreditOutstanding = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;
    const { outstanding_amount, utilized_amount, status } = req.body;

    const { data, error } = await supabase
      .from("trade_credit_accounts")
      .update({
        outstanding_amount: outstanding_amount !== undefined ? Number(outstanding_amount) : undefined,
        utilized_amount: utilized_amount !== undefined ? Number(utilized_amount) : undefined,
        status: status || undefined,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("supplier_id", supplierId)
      .select()
      .single();

    if (error) throw error;
    return successResponse(res, data, "Credit account updated");
  } catch (err) {
    console.error("updateCreditOutstanding error:", err);
    return errorResponse(res, err, 500, "Failed to update credit account");
  }
};

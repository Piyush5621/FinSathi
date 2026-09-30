import { supabase } from "../config/db.js";
import { CustomerPaymentService } from "../services/CustomerPaymentService.js";

/**
 * Add Payment (Canonical FIFO Logic via CustomerPaymentService)
 * Route: POST /api/payments/add
 */
export const addPayment = async (req, res) => {
    const { customer_id, customerId, amount, date, payment_mode, payment_method, reference, notes, idempotency_key, idempotencyKey } = req.body;
    const targetCustId = customer_id || customerId;
    const key = idempotency_key || idempotencyKey || req.headers?.["x-idempotency-key"] || null;
    const mode = payment_mode || payment_method || "cash";

    try {
        const userId = req.user?.id;
        const result = await CustomerPaymentService.recordRepayment({
            userId,
            customerId: targetCustId,
            amount,
            paymentMode: mode,
            reference,
            notes,
            date,
            idempotencyKey: key,
            tenantId: req.tenantId || req.user?.organization_id
        });

        if (result.isDuplicate) {
            return res.status(result.status || 409).json({
                error: result.message,
                message: result.message,
                payment: result.payment
            });
        }

        return res.status(201).json({
            message: "Payment recorded and allocated",
            payment: result.payment,
            receipt: result.receipt,
            customer: result.updatedCustomer
        });

    } catch (error) {
        console.error("Add Payment Error:", error);
        return res.status(error.status || 500).json({ error: error.message || "Failed to process payment", details: error });
    }
};

/**
 * Get Payment History for a Customer
 * Route: GET /api/payments/:customerId
 */
export const getCustomerPayments = async (req, res) => {
    const { customerId } = req.params;
    try {
        const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("customer_id", customerId)
            .eq("user_id", req.user.id)
            .order("date", { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error("Get Payments Error:", error);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
};

/**
 * Delete Payment (Canonical Revert Logic via CustomerPaymentService)
 * Route: DELETE /api/payments/:id
 */
export const deletePayment = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await CustomerPaymentService.deleteRepayment({
            userId: req.user.id,
            paymentId: id,
            tenantId: req.tenantId || req.user?.organization_id
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error("Delete Payment Error:", error);
        return res.status(error.status || 500).json({ error: error.message || "Failed to delete payment" });
    }
};

/**
 * Get All Payments (with Customer Details)
 * Route: GET /api/payments
 */
export const getAllPayments = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("payments")
            .select("*, customers(name)")
            .eq("user_id", req.user.id)
            .order("date", { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error("Get All Payments Error:", error);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
};

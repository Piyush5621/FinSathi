import { supabase } from "../config/db.js";

// ✅ Add Payment (FIFO Logic)
export const addPayment = async (req, res) => {
    const { customer_id, amount, date, payment_mode, reference } = req.body;
    const payAmount = parseFloat(amount);

    if (!customer_id || isNaN(payAmount) || payAmount <= 0) {
        return res.status(400).json({ error: "Invalid payment details" });
    }

    try {
        // 1. Record the Payment
        const userId = req.user?.id;
        const { data: payment, error: payError } = await supabase
            .from("payments")
            .insert([{
                user_id: userId, // ✅ Associate with logged-in user
                customer_id,
                amount: payAmount,
                date: date || new Date(),
                payment_mode,
                reference
            }])
            .select()
            .single();

        if (payError) {
            console.error("Supabase Payment Insert Error:", payError);
            throw payError;
        }

        if (payError) throw payError;

        // 2. Fetch Unpaid Invoices (Oldest First)
        const { data: invoices, error: invError } = await supabase
            .from("sales")
            .select("*")
            .eq("customer_id", customer_id)
            .neq("payment_status", "paid")
            .order("date", { ascending: true }); // FIFO

        if (invError) throw invError;

        // 3. Distribute Payment
        let remaining = payAmount;

        for (const inv of invoices) {
            if (remaining <= 0) break;

            const total = parseFloat(inv.total);
            const paidSoFar = parseFloat(inv.amount_paid || 0);
            const due = total - paidSoFar;

            // Calculate how much to pay for this invoice
            const toPay = Math.min(due, remaining);
            const newPaidAmount = paidSoFar + toPay;

            // Determine new status
            let newStatus = "partial";
            if (newPaidAmount >= total - 0.01) { // tolerance for float logic
                newStatus = "paid";
            }

            // Update Invoice
            await supabase
                .from("sales")
                .update({
                    amount_paid: newPaidAmount,
                    payment_status: newStatus
                })
                .eq("id", inv.id);

            remaining -= toPay;
        }

        res.status(201).json({ message: "Payment recorded and allocated", payment });

    } catch (error) {
        console.error("Add Payment Error:", error);
        res.status(500).json({ error: error.message || "Failed to process payment", details: error });
    }
};

// ✅ Get Payment History
export const getCustomerPayments = async (req, res) => {
    const { customerId } = req.params;
    try {
        const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("customer_id", customerId)
            .order("date", { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
};
// ✅ Delete Payment (and Revert Invoice Balances)
export const deletePayment = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Get Payment Details
        const { data: payment, error: fetchError } = await supabase
            .from("payments")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        // 2. Delete the Payment Record
        const { error: deleteError } = await supabase
            .from("payments")
            .delete()
            .eq("id", id);

        if (deleteError) throw deleteError;

        // 3. Revert the Amount from Invoices (Reverse Logic)
        // We need to decrease 'amount_paid' on invoices by the payment amount.
        // Strategy: Find invoices with amount_paid > 0 for this customer.
        // We don't strictly know which ones this payment touched, but we must reduce the total paid for the customer.
        // We will reduce from strict LIFO (Latest invoices first) or similar? 
        // Actually, since AddPayment does FIFO (Oldest first), reversing it efficiently is tricky without a link.
        // But to keep "Pending" correct, we just need to reduce the total amount_paid across invoices.

        // Let's reverse from the *Latest Updated* or just *Any*? 
        // Let's try to reverse from the *Newest* invoices that have payment, to leave older debts if any. 
        // Or reverse match the FIFO? If we paid Oldest, maybe we should unpay Oldest?
        // Risky if we unpay the WRONG Old receipt.

        // BETTER APPROACH for Consistency: 
        // Since we blindly applied to Oldest, we should probably un-apply from the invoices that currently have payment.
        // Iterate invoices with amount_paid > 0, order by Date DESC (Newest first).

        const { data: invoices, error: invError } = await supabase
            .from("sales")
            .select("*")
            .eq("customer_id", payment.customer_id)
            .gt("amount_paid", 0)
            .order("date", { ascending: false }); // Newest first

        if (invError) throw invError;

        let remainingToRevert = parseFloat(payment.amount);

        for (const inv of invoices) {
            if (remainingToRevert <= 0.01) break;

            const currentPaid = parseFloat(inv.amount_paid);
            const toDeduct = Math.min(currentPaid, remainingToRevert);
            const newPaid = currentPaid - toDeduct;

            // Determine Status
            let newStatus = "partial";
            if (newPaid <= 0.01) {
                newStatus = "unpaid";
            } else if (newPaid >= parseFloat(inv.total) - 0.01) {
                // Should not happen when reducing, unless it stays fully paid (if we didn't touch it)
                newStatus = "paid";
            }

            await supabase
                .from("sales")
                .update({
                    amount_paid: newPaid,
                    payment_status: newStatus
                })
                .eq("id", inv.id);

            remainingToRevert -= toDeduct;
        }

        res.status(200).json({ message: "Payment deleted and balances reverted" });

    } catch (error) {
        console.error("Delete Payment Error:", error);
        res.status(500).json({ error: "Failed to delete payment" });
    }
};

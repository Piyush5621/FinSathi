import express from "express";
import { supabase } from "../config/db.js";
import { getCustomers, addCustomer, updateCustomer, recordCustomerPayment } from "../controllers/CustomerController.js";
import { planGuard } from "../middleware/planGuard.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { customerSchema } from "../utils/schemas.js";

const router = express.Router();

// List all customers (delegating to controller for consistency)
router.get("/", getCustomers);

// Create customer (delegating to controller)
router.post("/", validateRequest(customerSchema), addCustomer);


// Record customer repayment
router.post("/:id/payments", recordCustomerPayment);

// Get single customer by id
router.get("/:id", async (req, res) => {
	try {
		const { data, error } = await supabase.from("customers").select("*").eq("id", req.params.id).eq("user_id", req.user.id).single();
		if (error) return res.status(404).json({ error: "Customer not found" });
		return res.status(200).json(data);
	} catch (err) {
		console.error("Get customer error:", err.message || err);
		return res.status(500).json({ error: err.message || "Failed to fetch customer" });
	}
});

// Delete customer by id
router.delete("/:id", async (req, res) => {
	try {
		const { data: customer, error: fetchErr } = await supabase
			.from("customers")
			.select("id, name, outstanding_balance")
			.eq("id", req.params.id)
			.eq("user_id", req.user.id)
			.maybeSingle();

		if (fetchErr) throw fetchErr;
		if (!customer) {
			return res.status(404).json({ error: "Customer not found." });
		}

		const balance = Number(customer.outstanding_balance || 0);
		if (balance > 0) {
			return res.status(400).json({ 
				error: `Cannot delete customer '${customer.name}' with an active outstanding balance of ₹${balance.toLocaleString('en-IN')}. Please settle or void dues first.` 
			});
		}

		const { error } = await supabase.from("customers").delete().eq("id", req.params.id).eq("user_id", req.user.id);
		if (error) throw error;
		return res.status(200).json({ success: true, message: "Customer deleted successfully." });
	} catch (err) {
		console.error("Delete customer error:", err.message || err);
		return res.status(500).json({ error: err.message || "Failed to delete customer" });
	}
});

// Update customer by id (delegating to controller for sanitized, secure updates)
router.put("/:id", updateCustomer);

export default router;

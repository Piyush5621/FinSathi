import express from "express";
import { supabase } from "../config/db.js";
import { getCustomers, addCustomer } from "../controllers/CustomerController.js";

const router = express.Router();

// List all customers (delegating to controller for consistency)
router.get("/", getCustomers);

// Create customer (delegating to controller)
router.post("/", addCustomer);

// Get single customer by id
router.get("/:id", async (req, res) => {
	try {
		const { data, error } = await supabase.from("customers").select("*").eq("id", req.params.id).single();
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
		const { error } = await supabase.from("customers").delete().eq("id", req.params.id);
		if (error) throw error;
		return res.status(200).json({ success: true });
	} catch (err) {
		console.error("Delete customer error:", err.message || err);
		return res.status(500).json({ error: err.message || "Failed to delete customer" });
	}
});

export default router;

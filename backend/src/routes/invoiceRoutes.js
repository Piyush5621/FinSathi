import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

/* ========================================================
   ⚙️ Utility Function - Validate Numeric IDs
======================================================== */
const validateId = (id) => {
  if (isNaN(Number(id))) {
    throw new Error("Invalid ID format");
  }
};

/* ========================================================
   📜 1️⃣  GET /api/invoices/history
   (Place BEFORE /:id to avoid route conflicts)
======================================================== */
router.get("/history", async (req, res) => {
  try {
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(`
        *,
        customer:customers (
          name,
          email
        ),
        items:invoice_items (
          quantity,
          price,
          subtotal
        )
      `)
      .eq('user_id', req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoice history:", error);
      return res.status(500).json({ error: "Failed to fetch invoice history" });
    }

    const invoicesWithTotals = invoices.map((invoice) => ({
      ...invoice,
      total_items: invoice.items.length,
      subtotal: invoice.items.reduce((sum, item) => sum + item.subtotal, 0),
      final_amount:
        invoice.total_amount + (invoice.gst || 0) - (invoice.discount || 0),
    }));

    res.json(invoicesWithTotals);
  } catch (err) {
    console.error("Invoice history fetch error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

/* ========================================================
   🧾 2️⃣  POST /api/invoices - Create new invoice
======================================================== */
router.post("/", async (req, res) => {
  try {
    const { customer_id, payment_method } = req.body;

    if (!customer_id)
      return res.status(400).json({ error: "Customer ID is required" });

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        user_id: req.user.id,
        customer_id,
        payment_method: payment_method || "cash",
        status: "pending",
        total_amount: 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(invoice);
  } catch (err) {
    console.error("Invoice creation error:", err.message);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

/* ========================================================
   📦 3️⃣  POST /api/invoices/:id/items - Add invoice item
======================================================== */
router.post("/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    validateId(id);

    const { product_id, quantity, price } = req.body;
    if (!product_id || !quantity || !price)
      return res.status(400).json({
        error: "Product ID, quantity, and price are required",
      });

    // ✅ 1. Check Invoice Ownership
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (invError || !invoice)
      return res.status(403).json({ error: "Access denied to this invoice" });

    // ✅ 2. Check Product Ownership & Stock
    const { data: product, error: stockError } = await supabase
      .from("inventory")
      .select("id, stock")
      .eq("id", product_id)
      .eq("user_id", req.user.id) // Verify owner
      .single();

    if (stockError || !product)
      return res.status(404).json({ error: "Product not found or access denied" });

    if (product.stock < quantity)
      return res.status(400).json({ error: "Insufficient stock" });

    // ✅ 3. Add item
    const { data: item, error: itemError } = await supabase
      .from("invoice_items")
      .insert({
        invoice_id: id,
        product_id,
        quantity,
        price,
        subtotal: quantity * price,
      })
      .select()
      .single();

    if (itemError) throw itemError;

    // ✅ 4. Update stock
    const { error: updateError } = await supabase
      .from("inventory")
      .update({ stock: product.stock - quantity })
      .eq("id", product_id)
      .eq("user_id", req.user.id);

    if (updateError) throw updateError;

    res.status(201).json(item);
  } catch (err) {
    console.error("Invoice item creation error:", err.message);
    res.status(500).json({ error: "Failed to add item" });
  }
});

/* ========================================================
   📋 4️⃣  GET /api/invoices - Fetch all invoices
======================================================== */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        customer:customers!inner ( id, name, email ),
        items:invoice_items (
          id, quantity, price, subtotal,
          product:inventory ( id, name )
        )
      `)
      .eq("user_id", req.user.id)
      .eq("customer.user_id", req.user.id) // Double lock
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Invoice fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

/* ========================================================
   🧾 5️⃣  GET /api/invoices/:id - Single invoice details
======================================================== */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    validateId(id);

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        customer:customers!inner (
          id, name, email, phone, address
        ),
        items:invoice_items (
          id, quantity, price, subtotal,
          product:inventory ( id, name, sku )
        )
      `)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .eq("customer.user_id", req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Invoice not found" });

    res.json(data);
  } catch (err) {
    console.error("Invoice fetch error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

/* ========================================================
   💳 6️⃣  PATCH /api/invoices/:id/status - Update status
======================================================== */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    validateId(id);

    const { payment_status } = req.body;
    if (!["Paid", "Unpaid", "Partial"].includes(payment_status))
      return res.status(400).json({ error: "Invalid payment status" });

    const { data, error } = await supabase
      .from("invoices")
      .update({ payment_status })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Payment status update error:", err.message);
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

/* ========================================================
   💰 7️⃣  PATCH /api/invoices/:id/amounts - GST & Discount
======================================================== */
router.patch("/:id/amounts", async (req, res) => {
  try {
    const { id } = req.params;
    validateId(id);

    const { gst, discount } = req.body;

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("total_amount")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (fetchError) throw fetchError;
    if (discount > invoice.total_amount)
      return res.status(400).json({ error: "Discount exceeds total" });

    const final_amount =
      invoice.total_amount + (gst || 0) - (discount || 0);

    const { data, error } = await supabase
      .from("invoices")
      .update({ gst: gst || 0, discount: discount || 0, final_amount })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Amount update error:", err.message);
    res.status(500).json({ error: "Failed to update amounts" });
  }
});

export default router;

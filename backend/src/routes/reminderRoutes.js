import express from "express";
import { ReminderService } from "../services/ReminderService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

import { supabase } from "../config/db.js";

// GET settings
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const data = await ReminderService.getSettings(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual WhatsApp Reminder
router.post("/send-whatsapp", authenticateToken, async (req, res) => {
  try {
    const { saleId } = req.body;
    const userId = req.user.id;

    // Fetch sale with customer and user details
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .select('*, customers(name, phone), users(business_name)')
      .eq('id', saleId)
      .eq('user_id', userId)
      .single();

    if (saleErr || !sale) return res.status(404).json({ error: "Invoice not found" });
    if (!sale.customers?.phone) return res.status(400).json({ error: "Customer phone missing" });

    const shopName = sale.users?.business_name || "FinSathi";
    const msg = `Hi ${sale.customers.name}, your invoice #${sale.invoice_no} of ₹${sale.total} is due.`;

    const result = await ReminderService.sendMessage(sale.customers.phone, sale, shopName, msg);
    
    if (result.success) {
      res.json({ message: "WhatsApp sent via " + result.method });
    } else {
      res.status(500).json({ error: "WhatsApp delivery failed" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE settings
router.put("/settings", authenticateToken, async (req, res) => {
  try {
    const data = await ReminderService.updateSettings(req.user.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger a manual test run (restricted to Admins or for testing)
router.post("/trigger-test", authenticateToken, async (req, res) => {
    try {
        await ReminderService.processAllReminders();
        res.json({ message: "Daily scan triggered manually" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;

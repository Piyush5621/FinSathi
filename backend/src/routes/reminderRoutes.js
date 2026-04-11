import express from "express";
import { ReminderService } from "../services/ReminderService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET settings
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const data = await ReminderService.getSettings(req.user.id);
    res.json(data);
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

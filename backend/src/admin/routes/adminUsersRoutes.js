import express from "express";
import { adminSupabase } from "../adminSupabase.js";

const router = express.Router();

// List all users
router.get("/", async (req, res) => {
  try {
    const { data: users, error } = await adminSupabase
       .from('users')
       .select('id, name, email, phone, business_name, is_active, created_at')
       .order('created_at', { ascending: false });
       
    if (error) throw error;
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error });
  }
});

// Suspend/Activate User
router.put("/:id/status", async (req, res) => {
  const { is_active } = req.body;
  try {
    const { error } = await adminSupabase
       .from('users')
       .update({ is_active })
       .eq('id', req.params.id);
       
    if (error) throw error;
    res.json({ message: `User status updated to ${is_active ? 'active' : 'suspended'}` });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user status", error });
  }
});

// Get user activity
router.get("/:id/activity", async (req, res) => {
  try {
    const { data, error } = await adminSupabase
       .from('activity_logs')
       .select('*')
       .eq('user_id', req.params.id)
       .order('created_at', { ascending: false })
       .limit(50);
       
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user activity logs", error });
  }
});

export default router;

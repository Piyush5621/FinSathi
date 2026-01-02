// controllers/notificationController.js
import { supabase } from "../config/db.js";

/**
 * @desc Get all notifications (latest first)
 * @route GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Error fetching notifications:", err.message);
    res.status(500).json({ message: "Failed to load notifications" });
  }
};

/**
 * @desc Add new notification
 * @route POST /api/notifications
 */
export const addNotification = async (req, res) => {
  try {
    const { title, type } = req.body;

    if (!title || !type)
      return res.status(400).json({ message: "Title and type are required" });

    const { error } = await supabase
      .from("notifications")
      .insert([{ title, type }]);

    if (error) throw error;

    res.status(201).json({ message: "Notification added successfully" });
  } catch (err) {
    console.error("❌ Error adding notification:", err.message);
    res.status(500).json({ message: "Failed to add notification" });
  }
};

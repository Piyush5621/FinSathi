import { supabase } from "../config/db.js";
import { successResponse, errorResponse, createdResponse } from "../utils/responseHelper.js";

/**
 * Get all notifications (latest first)
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return successResponse(res, data, "Notifications retrieved successfully");
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    return errorResponse(res, err, 500, "Failed to load notifications");
  }
};

/**
 * Add new notification
 * POST /api/notifications
 */
export const addNotification = async (req, res) => {
  try {
    const { title, type, message, severity } = req.body;

    if (!title || !type) {
      return errorResponse(res, "Title and type are required", 400);
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert([{
        user_id: req.user.id,
        type,
        title,
        message: message || "",
        severity: severity || "info",
        is_read: false
      }])
      .select("*");

    if (error) throw error;

    return createdResponse(res, data[0], "Notification added successfully");
  } catch (err) {
    console.error("Error adding notification:", err.message);
    return errorResponse(res, err, 500, "Failed to add notification");
  }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("*")
      .single();

    if (error) throw error;

    return successResponse(res, data, "Notification marked as read");
  } catch (err) {
    console.error("Error marking notification read:", err.message);
    return errorResponse(res, err, 500, "Failed to update notification");
  }
};

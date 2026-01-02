import { supabase } from "../config/db.js";

/**
 * Reusable notification creator
 * @param {Object} notification
 * @param {string} notification.title - Notification message
 * @param {string} [notification.type='info'] - Notification type ('info', 'success', 'warning', 'error')
 */
export const createNotification = async ({ title, type = "info" }) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert([{ title, type }]);

    if (error) throw error;
    console.log("📢 Notification created:", title);
  } catch (err) {
    console.error("createNotification Error:", err.message);
  }
};

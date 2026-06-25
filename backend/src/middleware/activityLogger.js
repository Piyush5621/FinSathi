import { supabase } from "../config/db.js";

/**
 * Middleware to log authenticated actions across the system.
 */
export const activityLogger = async (req, res, next) => {
  // We only care about mutative actions (create, update, delete)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.user) {
    try {
      // The response 'finish' event will trigger when the response is fully sent
      res.on('finish', async () => {
        // Only log successful actions
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const actionText = `${req.method} ${req.originalUrl}`;
          await supabase.from('activity_logs').insert({
            user_id: req.user.id,
            action: actionText,
            method: req.method,
            endpoint: req.originalUrl,
            status_code: res.statusCode,
            // Depending on database setup, business_id could be requested from context but left out for simple implementation
          });
        }
      });
    } catch (e) {
      console.error('Activity logger error', e);
    }
  }

  next();
};

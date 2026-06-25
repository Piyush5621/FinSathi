import { supabase } from '../config/db.js';

/**
 * Activity & Audit Logger Utility
 */
export const ActivityLogger = {
  /**
   * Logs a user activity asynchronously.
   * Does not throw or block the main thread if it fails.
   */
  async logActivity({ userId, staffId, storeId, module, actionType, description, entityId, req }) {
    try {
      const logData = {
        user_id: userId,
        staff_id: staffId || null,
        store_id: storeId || null,
        module,
        action_type: actionType,
        description,
        entity_id: entityId || null,
        ip_address: req?.ip || req?.headers['x-forwarded-for'] || null,
        user_agent: req?.headers['user-agent'] || null,
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert([logData])
        .select('id')
        .single();

      if (error) {
        console.error('[ActivityLogger] Failed to insert activity log:', error);
      }
      return data?.id;
    } catch (err) {
      console.error('[ActivityLogger] Exception during logActivity:', err);
      return null;
    }
  },

  /**
   * Logs a full audit trail (Before/After) linked to an activity.
   */
  async logAudit({ activityId, userId, tableName, recordId, oldValues, newValues }) {
    if (!activityId) return;

    try {
      const auditData = {
        activity_id: activityId,
        user_id: userId,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues || null,
        new_values: newValues || null,
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert([auditData]);

      if (error) {
        console.error('[ActivityLogger] Failed to insert audit log:', error);
      }
    } catch (err) {
      console.error('[ActivityLogger] Exception during logAudit:', err);
    }
  }
};

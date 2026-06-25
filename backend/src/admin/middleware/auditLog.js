import { adminSupabase } from "../adminSupabase.js";

export const auditLog = async (req, res, next) => {
  // Only log mutative actions
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.admin) {
    try {
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await adminSupabase.from('admin_audit_logs').insert({
            admin_id: req.admin.id,
            action: `${req.method} ${req.originalUrl}`,
            target_resource: req.originalUrl,
            ip_address: req.ip || req.connection.remoteAddress
          });
        }
      });
    } catch (e) {
      console.error("Admin Audit Log Error", e);
    }
  }
  next();
};

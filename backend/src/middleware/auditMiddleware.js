import { supabase } from "../config/db.js";

// Helper to map route paths to database tables and modules
const getModuleAndTable = (url) => {
  if (url.includes("/api/inventory")) return { module: "Inventory", table: "inventory" };
  if (url.includes("/api/sales") || url.includes("/api/invoices")) return { module: "Billing", table: "sales" };
  if (url.includes("/api/customers")) return { module: "Customers", table: "customers" };
  if (url.includes("/api/expenses")) return { module: "Expenses", table: "expenses" };
  if (url.includes("/api/staff")) return { module: "Staff", table: "staff" };
  if (url.includes("/api/crm")) return { module: "CRM", table: "leads" };
  if (url.includes("/api/purchase-orders")) return { module: "PurchaseOrders", table: "purchase_orders" };
  return { module: "General", table: null };
};

export const auditMiddleware = async (req, res, next) => {
  // Only audit mutating methods
  const methods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!methods.includes(req.method) || !req.user) {
    return next();
  }

  const { module, table } = getModuleAndTable(req.originalUrl);
  if (!table) {
    return next();
  }

  const userId = req.user.id;
  // Actor ID is the staff ID if request is performed by a staff member
  const actorId = req.headers["x-staff-id"] || req.user.staffId || null;
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  let oldValues = null;
  let targetId = null;

  // 1. If UPDATE or DELETE, try to pre-fetch the existing record before the handler changes it
  const pathParts = req.path.split("/");
  // The last part is often the UUID id
  const possibleId = pathParts[pathParts.length - 1];
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  
  if (uuidRegex.test(possibleId) && ["PUT", "PATCH", "DELETE"].includes(req.method)) {
    targetId = possibleId;
    try {
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("id", targetId)
        .eq("user_id", userId)
        .single();
      if (data) {
        oldValues = data;
      }
    } catch (err) {
      console.warn(`[AuditMiddleware] Pre-fetch failed for table ${table}:`, err.message);
    }
  }

  // 2. Intercept response body to capture the new values
  const originalJson = res.json;
  res.json = function (body) {
    res.locals.responseBody = body;
    return originalJson.call(this, body);
  };

  // 3. Capture event on request finish
  res.on("finish", async () => {
    // Only log successful operations
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    try {
      let newValues = null;
      let action = "CREATE";

      if (req.method === "DELETE") {
        action = "DELETE";
        newValues = null;
      } else {
        action = req.method === "POST" ? "CREATE" : "UPDATE";
        
        // Try to get new values from response body (standard API wrapper: { success: true, data: { ... } })
        const resBody = res.locals.responseBody;
        if (resBody && resBody.success && resBody.data) {
          newValues = resBody.data;
          targetId = targetId || resBody.data.id;
        } else if (resBody && resBody.id) {
          newValues = resBody;
          targetId = targetId || resBody.id;
        }

        // Fallback: If no targetId or newValues captured, query from database
        if (targetId && !newValues) {
          const { data } = await supabase
            .from(table)
            .select("*")
            .eq("id", targetId)
            .single();
          if (data) {
            newValues = data;
          }
        }
      }

      if (!targetId) return; // Cannot log without target

      // Insert audit log
      const auditPayload = {
        user_id: userId,
        actor_id: actorId,
        module: module,
        action: action,
        target_id: targetId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: ipAddress
      };

      const { error: insertError } = await supabase
        .from("compliance_audit_logs")
        .insert(auditPayload);

      if (insertError) {
        console.warn("[AuditMiddleware] Failed to write audit log:", insertError.message);
      }
    } catch (err) {
      console.error("[AuditMiddleware] Logging error:", err);
    }
  });

  next();
};

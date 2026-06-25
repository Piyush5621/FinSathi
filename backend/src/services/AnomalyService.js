import { supabase } from "../config/db.js";
import { getISTHour } from "../utils/dateTime.js";

/**
 * AnomalyService — Lightweight Rules-Based Invoice Anomaly Detection
 * Runs pure SQL/JS rules — no ML library needed.
 * Flags: duplicate invoices, unusual discounts, off-hours billing.
 */
export const AnomalyService = {
  /**
   * Get all active (un-dismissed) anomaly flags for a user.
   */
  async getFlags(userId) {
    const { data, error } = await supabase
      .from("anomaly_flags")
      .select("*")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      // Table may not exist yet — return empty gracefully
      console.warn("anomaly_flags table not found or error:", error.message);
      return [];
    }
    return data || [];
  },

  /**
   * Dismiss a specific anomaly flag.
   */
  async dismissFlag(userId, flagId) {
    const { error } = await supabase
      .from("anomaly_flags")
      .update({ dismissed: true })
      .eq("id", flagId)
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Run all anomaly detection rules for a given user.
   * Called periodically or on-demand.
   */
  async runDetection(userId) {
    const results = [];

    try {
      const { data: sales } = await supabase
        .from("sales")
        .select("id, invoice_no, total, discount_percent, created_at, customer_id, payment_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!sales || sales.length === 0) return { detected: 0 };

      // ─── Rule 1: Duplicate invoice (same customer, same total within 24h) ─
      const seen = new Map(); // key: customerId-total → { saleId, date }
      for (const sale of sales) {
        const key = `${sale.customer_id}-${sale.total}`;
        const saleDate = new Date(sale.created_at);
        if (seen.has(key)) {
          const prev = seen.get(key);
          const diffHours = (saleDate - new Date(prev.date)) / 36e5;
          if (Math.abs(diffHours) <= 24) {
          results.push({
              user_id: userId,
              sale_id: sale.id,  // bigint — stored as number
              type: "DUPLICATE_INVOICE",
              severity: "warning",
              message: `Invoice ${sale.invoice_no || String(sale.id).slice(0, 8)} may be a duplicate — same customer & amount within 24 hours.`,
              dismissed: false,
            });
          }
        } else {
          seen.set(key, { saleId: sale.id, date: sale.created_at });
        }
      }

      // ─── Rule 2: Unusually large discount (discount_percent > 30%) ──────────
      for (const sale of sales) {
        // Schema column is discount_percent (0-100 range), not a flat amount
        const discountPct = Number(sale.discount_percent || 0);
        if (discountPct > 30) {
          results.push({
            user_id: userId,
            sale_id: sale.id,  // bigint — stored as number
            type: "LARGE_DISCOUNT",
            severity: "info",
            message: `Invoice ${sale.invoice_no || String(sale.id).slice(0, 8)} has an unusually large discount (${Math.round(discountPct)}% off).`,
            dismissed: false,
          });
        }
      }

      // ─── Rule 3: Off-hours billing (before 6am or after 11pm) ─────────────
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentSales = sales.filter((s) => new Date(s.created_at) >= yesterday);

      for (const sale of recentSales) {
        // Evaluate hours using the centralized timezone utility.
        const hour = getISTHour(sale.created_at);

        if (hour < 6 || hour >= 23) {
          results.push({
            user_id: userId,
            sale_id: sale.id,  // bigint — stored as number
            type: "OFF_HOURS_BILLING",
            severity: "info",
            message: `Invoice ${sale.invoice_no || String(sale.id)} was created at ${hour}:00 — outside normal business hours.`,
            dismissed: false,
          });
        }
      }

      // ─── Write new flags to DB (if table exists) ──────────────────────────
      if (results.length > 0) {
        const { error } = await supabase
          .from("anomaly_flags")
          .upsert(results, { onConflict: "user_id,sale_id,type", ignoreDuplicates: true });

        if (error) {
          console.warn("Could not write anomaly flags (table may not exist):", error.message);
        }
      }

      return { detected: results.length, flags: results };
    } catch (err) {
      console.error("AnomalyService.runDetection error:", err);
      return { detected: 0, error: err.message };
    }
  },
};

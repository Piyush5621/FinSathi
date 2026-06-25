import cron from "node-cron";
import { supabase } from "../config/db.js";

// Run every night at midnight to refresh materialized views
cron.schedule("0 0 * * *", async () => {
  console.log("[Background Job] Refreshing mv_dashboard_analytics...");
  try {
    await supabase.rpc('refresh_mv_dashboard'); // Custom RPC to refresh
    console.log("[Background Job] Materialized View refreshed successfully.");
  } catch (error) {
    console.error("[Background Job] Failed to refresh Materialized View:", error);
  }
});

// Run every 6 hours for Health Score Precomputation
cron.schedule("0 */6 * * *", async () => {
  console.log("[Background Job] Precomputing Business Health Scores...");
  // Logic to calculate AI health scores and store in business_health_metrics table
});

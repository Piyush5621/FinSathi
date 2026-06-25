import { supabase } from '../config/db.js';

/**
 * Utility to refresh the dashboard materialized view.
 * Phase 5: High-performance dashboard optimization.
 */
export async function refreshDashboardView() {
  try {
    // Only attempt refresh if materialized view and function exist.
    // We use a custom function refresh_dashboard_kpis() defined in migration 24.
    const { error } = await supabase.rpc('refresh_dashboard_kpis');
    if (error) {
       console.warn('[DB] Materialized view refresh failed (expected if pg_cron is handling it):', error.message);
    } else {
       console.log('[DB] Dashboard materialized view refreshed successfully.');
    }
  } catch (err) {
    console.error('[DB] Dashboard refresh error:', err);
  }
}

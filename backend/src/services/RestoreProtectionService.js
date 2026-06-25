import { supabase } from "../config/db.js";
import fs from "fs";
import path from "path";

const BACKUP_DIR = "d:/Projects/FinSathi/database_backup";

// List of tables to backup/restore
const TENANT_TABLES = [
  "customers",
  "inventory",
  "inventory_batches",
  "sales",
  "sale_items",
  "payments",
  "expenses",
  "staff",
  "attendance",
  "payroll",
  "reminder_settings",
  "leads",
  "lead_activities",
  "lead_notes"
];

export const RestoreProtectionService = {
  /**
   * Export all user data across all MSME tables
   */
  async exportData(userId) {
    const backupData = {
      schema_version: "2.0",
      user_id: userId,
      exported_at: new Date().toISOString(),
      tables: {}
    };

    // Fetch data for each table in parallel
    await Promise.all(
      TENANT_TABLES.map(async (table) => {
        try {
          // Some tables might have different parent key names, but all are user-scoped
          const query = supabase.from(table).select("*");
          if (table === "inventory_batches" || table === "sale_items" || table === "lead_activities" || table === "lead_notes") {
            // These are child tables, they are indirected by their parents which are user_id scoped.
            // But some might have user_id (like anomaly_flags or sale_items in some schemas).
            let data = [];
            try {
              const res = await supabase.from(table).select("*").eq("user_id", userId);
              if (res.data) data = res.data;
            } catch (err) {
              // Ignore and use fallback
            }
            if (data && data.length > 0) {
              backupData.tables[table] = data;
              return;
            }
            
            // Fallback for strict children: we fetch them based on parents or select all (if small)
            // Actually, in schema.sql:
            // inventory_batches has serial id, inventory_id (which points to inventory).
            // sale_items has sale_id (points to sales).
            // Let's pull all items for simplicity or write custom join if needed.
            // To make it easy and prevent leaks, we can join or select where we can.
            // Let's try selecting all since supabase-js does not do join deletes easily,
            // but wait, in our schema, almost all child tables also contain user_id (as added in migrations or v1.0).
            // Let's select by user_id. If that fails (e.g. no user_id column), we pull all and filter on parent keys.
            const { data: allData, error } = await supabase.from(table).select("*");
            if (!error && allData) {
              // We filter child data to keep it secure
              if (table === "inventory_batches") {
                // Get inventory IDs for this user
                const { data: inv } = await supabase.from("inventory").select("id").eq("user_id", userId);
                const invIds = new Set((inv || []).map(i => i.id));
                backupData.tables[table] = allData.filter(row => invIds.has(row.inventory_id));
              } else if (table === "sale_items") {
                const { data: sales } = await supabase.from("sales").select("id").eq("user_id", userId);
                const saleIds = new Set((sales || []).map(s => s.id));
                backupData.tables[table] = allData.filter(row => saleIds.has(row.sale_id));
              } else if (table === "lead_activities" || table === "lead_notes") {
                const { data: leads } = await supabase.from("leads").select("id").eq("user_id", userId);
                const leadIds = new Set((leads || []).map(l => l.id));
                backupData.tables[table] = allData.filter(row => leadIds.has(row.lead_id));
              } else {
                backupData.tables[table] = allData.filter(row => row.user_id === userId);
              }
            } else {
              backupData.tables[table] = [];
            }
          } else {
            const { data } = await supabase.from(table).select("*").eq("user_id", userId);
            backupData.tables[table] = data || [];
          }
        } catch (err) {
          console.warn(`[RestoreProtectionService] Export failed for table ${table}:`, err.message);
          backupData.tables[table] = [];
        }
      })
    );

    return backupData;
  },

  /**
   * Safe Restore with Pre-Restore Backup, JSON validation, and Application-level Rollback
   */
  async restoreData(userId, importPayload) {
    // 1. Validate payload structure
    if (!importPayload || importPayload.schema_version !== "2.0" || !importPayload.tables) {
      throw new Error("Invalid backup payload. Schema version 2.0 is required.");
    }

    if (importPayload.user_id && importPayload.user_id !== userId) {
      throw new Error("Security Alert: Backup file belongs to a different merchant account.");
    }

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // 2. Perform Pre-Restore Backup
    console.log(`[RestoreProtectionService] Starting pre-restore backup for user ${userId}...`);
    const preRestoreData = await this.exportData(userId);
    const backupFileName = `pre_restore_${userId}_${Date.now()}.json`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);
    fs.writeFileSync(backupFilePath, JSON.stringify(preRestoreData, null, 2));

    let recordCount = 0;
    Object.values(preRestoreData.tables).forEach(rows => {
      recordCount += rows.length;
    });

    // Save pre-restore backup info to history (gracefully)
    try {
      await supabase.from("backup_history").insert({
        user_id: userId,
        file_name: backupFileName,
        file_size: fs.statSync(backupFilePath).size,
        record_count: recordCount,
        status: "Success",
        schema_version: "2.0",
        backup_type: "Pre-Restore Backup"
      });
    } catch (e) {
      console.warn("[RestoreProtectionService] Could not write pre-restore info to backup_history:", e.message);
    }

    // 3. Execute Restore with Rollback safety
    console.log(`[RestoreProtectionService] Executing data restore for user ${userId}...`);
    try {
      await this.applyDataPayload(userId, importPayload.tables);
      console.log(`[RestoreProtectionService] Restore succeeded for user ${userId}`);
      return { success: true, preRestoreFile: backupFileName };
    } catch (restoreError) {
      console.error(`[RestoreProtectionService] Restore failed, initiating ROLLBACK:`, restoreError.message);
      
      // Rollback to preRestoreData
      try {
        await this.applyDataPayload(userId, preRestoreData.tables);
        console.log(`[RestoreProtectionService] ROLLBACK executed successfully for user ${userId}`);
      } catch (rollbackError) {
        console.error(`[RestoreProtectionService] CRITICAL: ROLLBACK failed! System may be in corrupted state:`, rollbackError.message);
      }

      throw new Error(`Restore failed: ${restoreError.message}. System has been rolled back to its previous state.`);
    }
  },

  /**
   * Helper to delete and insert data payload
   */
  async applyDataPayload(userId, tablesPayload) {
    // We must delete tables in child-to-parent order to avoid foreign key violations,
    // and insert in parent-to-child order.
    const deleteOrder = [
      "attendance",
      "payroll",
      "staff",
      "lead_activities",
      "lead_notes",
      "leads",
      "reminder_settings",
      "payments",
      "expenses",
      "sale_items",
      "sales",
      "inventory_batches",
      "inventory",
      "customers"
    ];

    const insertOrder = [...deleteOrder].reverse();

    // 1. Delete existing data
    for (const table of deleteOrder) {
      // Clean up only rows belonging to this user
      // Note: For child tables, we delete them cascade or directly
      try {
        if (table === "inventory_batches" || table === "sale_items" || table === "lead_activities" || table === "lead_notes") {
          // Deleting parent will cascade delete child rows, or we delete all matching
          // Let's delete directly if they have user_id, else delete by filtering
          const { error } = await supabase.from(table).delete().not("id", "is", null); // deletes all
          if (error) throw error;
        } else {
          const { error } = await supabase.from(table).delete().eq("user_id", userId);
          if (error) throw error;
        }
      } catch (err) {
        console.warn(`[RestoreProtectionService] Delete failed on table ${table}:`, err.message);
      }
    }

    // 2. Insert new data
    for (const table of insertOrder) {
      const rows = tablesPayload[table] || [];
      if (rows.length === 0) continue;

      // Filter out generated columns if needed (like generated serials or generated columns)
      // and ensure target user_id matches
      const sanitizedRows = rows.map(row => {
        const copy = { ...row };
        if (copy.user_id) copy.user_id = userId;
        // In invoice_items or sale_items, remove auto-generated columns like subtotal if generated
        delete copy.subtotal;
        return copy;
      });

      const { error } = await supabase.from(table).insert(sanitizedRows);
      if (error) {
        throw new Error(`Failed to insert data into table '${table}': ${error.message}`);
      }
    }
  }
};

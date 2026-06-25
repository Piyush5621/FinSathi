import { RestoreProtectionService } from "../services/RestoreProtectionService.js";
import { supabase } from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHelper.js";

export const exportBackup = async (req, res) => {
  try {
    const userId = req.user.id;
    const backupData = await RestoreProtectionService.exportData(userId);
    
    // Set headers for file download
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=finsathi_backup_${userId}_${Date.now()}.json`
    );
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error("Export backup error:", err);
    return errorResponse(res, err, 500, "Could not export database backup");
  }
};

export const restoreBackup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { backupData } = req.body;

    if (!backupData) {
      return errorResponse(res, "Backup data is required.", 400);
    }

    const result = await RestoreProtectionService.restoreData(userId, backupData);
    
    // Log success history
    try {
      let recordCount = 0;
      Object.values(backupData.tables || {}).forEach(rows => {
        recordCount += rows.length;
      });

      await supabase.from("backup_history").insert({
        user_id: userId,
        file_name: `imported_restore_${Date.now()}.json`,
        file_size: JSON.stringify(backupData).length,
        record_count: recordCount,
        status: "Restored",
        schema_version: "2.0",
        backup_type: "Full Backup"
      });
    } catch (e) {
      console.warn("Could not log restore success to history:", e.message);
    }

    return successResponse(res, result, "Database restored successfully");
  } catch (err) {
    console.error("Restore backup error:", err);
    
    // Log failure history
    try {
      await supabase.from("backup_history").insert({
        user_id: req.user.id,
        file_name: "failed_restore.json",
        file_size: 0,
        record_count: 0,
        status: "Failed",
        schema_version: "2.0",
        backup_type: "Full Backup"
      });
    } catch (e) {
      console.warn("Could not log restore failure to history:", e.message);
    }

    return errorResponse(res, err.message, 500, "Database restore failed");
  }
};

export const getBackupHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from("backup_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // Table may not exist yet — degrade gracefully
      console.warn("backup_history table not found:", error.message);
      return successResponse(res, [], "No backup history found");
    }

    return successResponse(res, data || [], "Backup history retrieved");
  } catch (err) {
    console.error("Get backup history error:", err);
    return errorResponse(res, err, 500, "Could not fetch backup history");
  }
};

import express from "express";
import { exportBackup, restoreBackup, getBackupHistory } from "../controllers/BackupController.js";

const router = express.Router();

router.get("/export", exportBackup);
router.post("/restore", restoreBackup);
router.get("/history", getBackupHistory);

export default router;

import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { createImportDraft, executeImport, getImportHistory } from "../controllers/ImportController.js";

const router = express.Router();
router.use(authenticateToken);

router.get("/history", getImportHistory);
router.post("/draft", createImportDraft);
router.post("/execute", executeImport);

export default router;

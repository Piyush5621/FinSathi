import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  searchBusinesses,
  sendConnectionRequest,
  respondToRequest,
  getConnections,
  getPendingRequests,
  removeConnection,
  getConnectionProfile,
  getNetworkOverview
} from "../controllers/NetworkController.js";

const router = express.Router();
router.use(authenticateToken);

router.get("/overview", getNetworkOverview);
router.get("/search", searchBusinesses);
router.get("/connections", getConnections);
router.get("/connections/pending", getPendingRequests);
router.get("/connections/:partnerId/profile", getConnectionProfile);
router.post("/connections/request", sendConnectionRequest);
router.put("/connections/:id/respond", respondToRequest);
router.delete("/connections/:id", removeConnection);

export default router;

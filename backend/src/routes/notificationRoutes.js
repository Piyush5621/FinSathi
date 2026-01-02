// routes/notificationRoutes.js
import express from "express";
import {
  getNotifications,
  addNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", getNotifications);
router.post("/", addNotification);

export default router;

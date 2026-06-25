import express from "express";
import {
  getNotifications,
  addNotification,
  markAsRead
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", getNotifications);
router.post("/", addNotification);
router.patch("/:id/read", markAsRead);

export default router;

import express from "express";
import { registerUser, loginUser } from "../controllers/AuthController.js";
import { getUserProfile, updateUserProfile } from "../controllers/AuthController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";


const router = express.Router();
router.get("/me", authenticateToken, getUserProfile);
router.put("/update", authenticateToken, updateUserProfile);

router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;

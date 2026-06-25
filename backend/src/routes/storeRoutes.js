import express from "express";
import { getStores, createStore, switchStore } from "../controllers/StoreController.js";

const router = express.Router();

router.get("/", getStores);
router.post("/", createStore);
router.post("/switch/:id", switchStore);

export default router;

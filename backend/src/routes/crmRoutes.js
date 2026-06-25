import express from "express";
import { getLeads, createLead, updateLead, getLeadActivities, addLeadActivity, addLeadNote, getCrmAnalytics } from "../controllers/CrmController.js";

const router = express.Router();

router.get("/leads", getLeads);
router.post("/leads", createLead);
router.put("/leads/:id", updateLead);
router.get("/leads/:id/activities", getLeadActivities);
router.post("/leads/:id/activities", addLeadActivity);
router.post("/leads/:id/notes", addLeadNote);
router.get("/analytics", getCrmAnalytics);

export default router;

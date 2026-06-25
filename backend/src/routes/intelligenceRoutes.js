import express from "express";
import { CashFlowService } from "../services/CashFlowService.js";
import { AnomalyService } from "../services/AnomalyService.js";
import { HealthScoreService } from "../services/HealthScoreService.js";
import { DailyBriefService } from "../services/DailyBriefService.js";
import { CreditRulesService } from "../services/CreditRulesService.js";
import { successResponse, errorResponse } from "../utils/responseHelper.js";

const router = express.Router();

/**
 * GET /api/intelligence/cashflow
 * Returns 14-day cash flow prediction.
 */
router.get("/cashflow", async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await CashFlowService.predict(userId);
    return successResponse(res, data, "Cash flow projection calculated");
  } catch (err) {
    return errorResponse(res, err, 500, "Could not calculate cash flow");
  }
});

/**
 * GET /api/intelligence/health-score
 * Returns normalized Business Health Score and actionable recommendations.
 */
router.get("/health-score", async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await HealthScoreService.calculateAndLog(userId);
    return successResponse(res, data, "Business Health Score calculated");
  } catch (err) {
    console.error("Health score route error:", err);
    return errorResponse(res, err, 500, "Could not calculate health score");
  }
});

/**
 * GET /api/intelligence/brief
 * Returns today's cached AI business brief.
 */
router.get("/brief", async (req, res) => {
  try {
    const userId = req.user.id;
    const brief = await DailyBriefService.getDailyBrief(userId);
    return successResponse(res, brief, "Business brief retrieved");
  } catch (err) {
    console.error("Brief route error:", err);
    return errorResponse(res, err, 500, "Could not fetch business brief");
  }
});

/**
 * GET /api/intelligence/credit
 * Returns credit score and analysis.
 */
router.get("/credit", async (req, res) => {
  try {
    const userId = req.user.id;
    const credit = await CreditRulesService.calculateCreditMetrics(userId);
    return successResponse(res, credit, "Credit analysis calculated");
  } catch (err) {
    console.error("Credit route error:", err);
    return errorResponse(res, err, 500, "Could not compute credit metrics");
  }
});

/**
 * GET /api/intelligence/coach
 * Returns AI coaching recommendation.
 */
router.get("/coach", async (req, res) => {
  try {
    const userId = req.user.id;
    const topic = req.query.topic || null;
    const recommendation = await DailyBriefService.getCoachingRecommendation(userId, topic);
    return successResponse(res, recommendation, "Coaching recommendation generated");
  } catch (err) {
    console.error("Coach route error:", err);
    return errorResponse(res, err, 500, "Could not generate coaching recommendation");
  }
});

/**
 * GET /api/intelligence/anomalies
 * Returns active (un-dismissed) anomaly flags for the user.
 */
router.get("/anomalies", async (req, res) => {
  try {
    const userId = req.user.id;
    const flags = await AnomalyService.getFlags(userId);
    return successResponse(res, flags, "Anomaly flags retrieved");
  } catch (err) {
    return errorResponse(res, err, 500, "Could not fetch anomaly flags");
  }
});

/**
 * POST /api/intelligence/anomalies/scan
 * Trigger a fresh anomaly detection scan for the user.
 */
router.post("/anomalies/scan", async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await AnomalyService.runDetection(userId);
    return successResponse(res, result, "Anomaly scan complete");
  } catch (err) {
    return errorResponse(res, err, 500, "Anomaly scan failed");
  }
});

/**
 * PATCH /api/intelligence/anomalies/:id/dismiss
 * Dismiss a specific anomaly flag.
 */
router.patch("/anomalies/:id/dismiss", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await AnomalyService.dismissFlag(userId, id);
    return res.json(result);
  } catch (err) {
    console.error("Anomaly dismiss route error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

import express from 'express';
import { GstService } from '../services/GstService.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

const router = express.Router();

/**
 * GSTR-1 Sales Report
 * GET /api/reports/gst/gstr1?from=...&to=...
 */
router.get('/gst/gstr1', async (req, res) => {
  const { from, to } = req.query;
  const userId = req.user.id;

  if (!from || !to) {
    return errorResponse(res, "Date range (from, to) is required", 400);
  }

  try {
    const report = await GstService.getGstr1Report(userId, from, to);
    return successResponse(res, report, `GSTR-1 report generated for ${from} to ${to}`);
  } catch (err) {
    return errorResponse(res, err, 500, "Failed to generate GSTR-1 report");
  }
});

export default router;

import express from 'express';
import { GstService } from '../services/GstService.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

const router = express.Router();

/**
 * RBAC check: Cashiers are restricted from accessing GST compliance reports.
 */
function ensureTaxAuditAccess(req, res) {
  const role = req.user?.role?.toLowerCase();
  if (role === 'cashier') {
    errorResponse(res, "Access denied: Cashiers are not authorized to view GST tax compliance reports.", 403);
    return false;
  }
  return true;
}

/**
 * GSTR-1 Sales Report (JSON)
 * GET /api/reports/gst/gstr1?from=...&to=...&store_id=...
 */
router.get('/gst/gstr1', async (req, res) => {
  if (!ensureTaxAuditAccess(req, res)) return;

  const { from, to, store_id, storeId } = req.query;
  const userId = req.user.id;

  if (!from || !to) {
    return errorResponse(res, "Date range (from, to) is required", 400);
  }

  try {
    const options = {
      orgId: req.tenantId || req.user?.organization_id,
      storeId: store_id || storeId || null
    };
    const report = await GstService.getGstr1Report(userId, from, to, options);
    return successResponse(res, report, `GSTR-1 report generated for ${from} to ${to}`);
  } catch (err) {
    const status = err.statusCode || 500;
    return errorResponse(res, err, status, err.message || "Failed to generate GSTR-1 report");
  }
});

/**
 * GSTR-3B Summary Report (JSON)
 * GET /api/reports/gst/gstr3b?from=...&to=...&store_id=...
 */
router.get('/gst/gstr3b', async (req, res) => {
  if (!ensureTaxAuditAccess(req, res)) return;

  const { from, to, store_id, storeId } = req.query;
  const userId = req.user.id;

  if (!from || !to) {
    return errorResponse(res, "Date range (from, to) is required", 400);
  }

  try {
    const options = {
      orgId: req.tenantId || req.user?.organization_id,
      storeId: store_id || storeId || null
    };
    const report = await GstService.getGstr3bReport(userId, from, to, options);
    return successResponse(res, report, `GSTR-3B summary generated for ${from} to ${to}`);
  } catch (err) {
    const status = err.statusCode || 500;
    return errorResponse(res, err, status, err.message || "Failed to generate GSTR-3B summary");
  }
});

/**
 * GSTR-1 Spreadsheet Export (.xlsx or .csv)
 * GET /api/reports/gst/export/gstr1?from=...&to=...&format=xlsx|csv&store_id=...
 */
router.get('/gst/export/gstr1', async (req, res) => {
  if (!ensureTaxAuditAccess(req, res)) return;

  const { from, to, format, store_id, storeId } = req.query;
  const userId = req.user.id;

  if (!from || !to) {
    return errorResponse(res, "Date range (from, to) is required", 400);
  }

  try {
    const options = {
      orgId: req.tenantId || req.user?.organization_id,
      storeId: store_id || storeId || null
    };
    const report = await GstService.getGstr1Report(userId, from, to, options);

    if (format === 'csv') {
      const csvData = GstService.exportGstr1Csv(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="GSTR1_${from}_to_${to}.csv"`);
      return res.send(csvData);
    }

    const buffer = GstService.exportGstr1Excel(report);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="GSTR1_${from}_to_${to}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    const status = err.statusCode || 500;
    return errorResponse(res, err, status, err.message || "Failed to export GSTR-1 spreadsheet");
  }
});

/**
 * GSTR-3B Spreadsheet Export (.xlsx)
 * GET /api/reports/gst/export/gstr3b?from=...&to=...&store_id=...
 */
router.get('/gst/export/gstr3b', async (req, res) => {
  if (!ensureTaxAuditAccess(req, res)) return;

  const { from, to, store_id, storeId } = req.query;
  const userId = req.user.id;

  if (!from || !to) {
    return errorResponse(res, "Date range (from, to) is required", 400);
  }

  try {
    const options = {
      orgId: req.tenantId || req.user?.organization_id,
      storeId: store_id || storeId || null
    };
    const report = await GstService.getGstr3bReport(userId, from, to, options);
    const buffer = GstService.exportGstr3bExcel(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="GSTR3B_${from}_to_${to}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    const status = err.statusCode || 500;
    return errorResponse(res, err, status, err.message || "Failed to export GSTR-3B spreadsheet");
  }
});

export default router;

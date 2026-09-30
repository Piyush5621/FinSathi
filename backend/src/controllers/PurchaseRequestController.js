import { PurchaseRequestService } from '../modules/purchases/services/PurchaseRequestService.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

/**
 * PurchaseRequestController — Buyer-Side Purchase Request Endpoints
 */

export const createPurchaseRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const idempotencyKey = req.headers?.['x-idempotency-key'] || req.body?.idempotency_key || null;

    const result = await PurchaseRequestService.createRequest(userId, {
      ...req.body,
      idempotency_key: idempotencyKey
    });

    const status = result.idempotent ? 200 : 201;
    if (result.idempotent) {
      return successResponse(res, result.request, "Purchase request retrieved (idempotent submission)");
    }
    return createdResponse(res, result.request, "Purchase request created successfully");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("createPurchaseRequest Error:", err);
    return errorResponse(res, err, 500, "Failed to create purchase request");
  }
};

export const getPurchaseRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const results = await PurchaseRequestService.getRequests(userId, req.query);
    return successResponse(res, results, "Purchase requests retrieved successfully");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("getPurchaseRequests Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve purchase requests");
  }
};

export const getPurchaseRequestById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const request = await PurchaseRequestService.getRequestById(userId, id);
    return successResponse(res, request, "Purchase request details retrieved");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("getPurchaseRequestById Error:", err);
    return errorResponse(res, err, 500, "Failed to retrieve purchase request details");
  }
};

export const updateDraftPurchaseRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updated = await PurchaseRequestService.updateDraftRequest(userId, id, req.body);
    return successResponse(res, updated, "Draft purchase request updated successfully");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("updateDraftPurchaseRequest Error:", err);
    return errorResponse(res, err, 500, "Failed to update purchase request");
  }
};

export const sendPurchaseRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await PurchaseRequestService.sendRequest(userId, id);
    return successResponse(
      res, 
      result.request, 
      result.alreadySent ? "Purchase request already sent" : "Purchase request sent to supplier"
    );
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("sendPurchaseRequest Error:", err);
    return errorResponse(res, err, 500, "Failed to send purchase request");
  }
};

export const cancelPurchaseRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body || {};
    const result = await PurchaseRequestService.cancelRequest(userId, id, reason);
    return successResponse(
      res, 
      result.request, 
      result.alreadyCancelled ? "Purchase request was already cancelled" : "Purchase request cancelled"
    );
  } catch (err) {
    const status = err.statusCode || 500;
    if (status < 500) {
      return errorResponse(res, err.message, status);
    }
    console.error("cancelPurchaseRequest Error:", err);
    return errorResponse(res, err, 500, "Failed to cancel purchase request");
  }
};

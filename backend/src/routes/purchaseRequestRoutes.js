import express from "express";
import { 
  createPurchaseRequest, 
  getPurchaseRequests, 
  getPurchaseRequestById, 
  updateDraftPurchaseRequest, 
  sendPurchaseRequest, 
  cancelPurchaseRequest 
} from "../controllers/PurchaseRequestController.js";
import {
  getIncomingPurchaseRequests,
  respondToPurchaseRequest,
  acceptCounterOffer,
  createPurchaseOrderFromRequest,
  getPurchaseRequestResponses,
  generateInvoiceForRequest
} from "../controllers/SupplierResponseController.js";

const router = express.Router();

// Specific routes before parameterized :id
router.get("/incoming", getIncomingPurchaseRequests);

// Buyer CRUD & Lifecycle
router.get("/", getPurchaseRequests);
router.post("/", createPurchaseRequest);
router.get("/:id", getPurchaseRequestById);
router.patch("/:id", updateDraftPurchaseRequest);
router.put("/:id", updateDraftPurchaseRequest);
router.post("/:id/send", sendPurchaseRequest);
router.patch("/:id/send", sendPurchaseRequest);
router.post("/:id/cancel", cancelPurchaseRequest);
router.patch("/:id/cancel", cancelPurchaseRequest);

// Supplier Response & Conversion Actions
router.get("/:id/responses", getPurchaseRequestResponses);
router.post("/:id/respond", respondToPurchaseRequest);
router.post("/:id/accept-counter", acceptCounterOffer);
router.post("/:id/create-po", createPurchaseOrderFromRequest);
router.post("/:id/generate-invoice", generateInvoiceForRequest);

export default router;

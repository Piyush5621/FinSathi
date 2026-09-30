import { SupplierResponseService } from "../modules/purchases/services/SupplierResponseService.js";

/**
 * Handle incoming purchase requests for supplier
 */
export async function getIncomingPurchaseRequests(req, res) {
  try {
    const userId = req.user.id;
    const { status, search, page, limit } = req.query;

    const data = await SupplierResponseService.getIncomingRequests(userId, {
      status,
      search,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error fetching incoming purchase requests:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to fetch incoming purchase requests"
    });
  }
}

/**
 * Supplier responds to a purchase request (accept, reject, counter)
 */
export async function respondToPurchaseRequest(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const payload = req.body || {};

    const result = await SupplierResponseService.respondToRequest(userId, id, payload);

    return res.status(result.idempotent ? 200 : 201).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Error responding to purchase request:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to respond to purchase request"
    });
  }
}

/**
 * Buyer accepts supplier's counter-offer
 */
export async function acceptCounterOffer(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const payload = req.body || {};

    const result = await SupplierResponseService.acceptCounterOffer(userId, id, payload);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Error accepting counter offer:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to accept counter offer"
    });
  }
}

/**
 * Buyer converts an accepted purchase request into a Purchase Order
 */
export async function createPurchaseOrderFromRequest(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const payload = req.body || {};

    const result = await SupplierResponseService.createPoFromAcceptedRequest(userId, id, payload);

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Error converting purchase request to PO:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to convert purchase request to purchase order"
    });
  }
}

/**
 * Get responses and comparison for a purchase request
 */
export async function getPurchaseRequestResponses(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const data = await SupplierResponseService.getRequestResponse(userId, id);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error fetching purchase request responses:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to fetch purchase request responses"
    });
  }
}

/**
 * Supplier generates a formal Sales Invoice / Bill from an accepted purchase request
 */
export async function generateInvoiceForRequest(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const payload = req.body || {};

    const result = await SupplierResponseService.generateInvoiceForRequest(userId, id, payload);

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Error generating invoice for purchase request:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to generate invoice for purchase request"
    });
  }
}

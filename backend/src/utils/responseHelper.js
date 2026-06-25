/**
 * Standard API Response Helper — Phase 4
 * Enforces consistency: { success, data, error, summary, meta }
 */

export const successResponse = (res, data, summary = "Request successful", meta = null) => {
  return res.status(200).json({
    success: true,
    data,
    error: null,
    summary,
    meta
  });
};

export const errorResponse = (res, error, status = 500, summary = "An error occurred") => {
  return res.status(status).json({
    success: false,
    data: null,
    error: error.message || error,
    summary
  });
};

export const createdResponse = (res, data, summary = "Created successfully") => {
  return res.status(201).json({
    success: true,
    data,
    error: null,
    summary
  });
};

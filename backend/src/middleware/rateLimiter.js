import rateLimit from "express-rate-limit";

/**
 * Tiered Rate Limiting Middleware — Phase 4 Security Hardening
 *
 * Different endpoints have different rate limits:
 *   /api/auth/*  → 20 req / 15 min  (brute-force prevention)
 *   /api/ai/*    → 50 req / 15 min  (LLM cost control)
 *   others       → 500 req / 15 min (normal usage)
 */

const createLimiter = (max, windowMs = 15 * 60 * 1000) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "RATE_LIMIT",
      data: null,
      summary: `Too many requests. Please wait and try again. Limit: ${max} per 15 minutes.`,
    },
  });

// Auth endpoints — strict (brute force prevention)
export const authLimiter = createLimiter(20);

// AI endpoints — moderate (LLM cost control)
export const aiLimiter = createLimiter(50);

// General API — relaxed
export const generalLimiter = createLimiter(500);

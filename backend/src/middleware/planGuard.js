/**
 * [NEUTRALIZED] Obsolete Subscription Guard
 * Subscriptions/monetization have been removed from KaroBar.
 * All businesses operate with unlimited access.
 */
export const planGuard = (metric, incrementBy = 1) => (req, res, next) => {
  req.userPlan = 'enterprise';
  next();
};

/**
 * [NEUTRALIZED] Usage Tracking
 * Safe no-op maintaining backwards compatibility with any remaining callers.
 */
export const incrementPlanUsage = async (userId, metric, incrementBy = 1) => {
  // No-op - subscriptions removed
};



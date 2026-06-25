import { supabase } from "../config/db.js";
import { PLANS } from "../constants/plans.js";

export const planGuard = (metric, incrementBy = 1) => async (req, res, next) => {
  const userId = req.user.id; // User is authenticated via authenticateToken

  try {
    // Subscriptions are handled in user_subscriptions table

    // Check user_subscriptions
    const { data: sub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle();

    const plan = sub?.plan || 'free';
    const limit = PLANS[plan].limits[metric];

    // -1 means unlimited
    if (limit === -1) {
       req.userPlan = plan;
       return next();
    }

    // Get current usage for this month
    const monthYear = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('current_count')
      .eq('user_id', userId)
      .eq('metric', metric)
      .eq('month_year', monthYear)
      .maybeSingle();

    const currentCount = usage?.current_count || 0;

    if (currentCount + incrementBy > limit) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_REACHED',
        message: `You have reached the ${metric} limit for your ${plan} plan.`,
        current: currentCount,
        limit,
        upgrade_url: '/subscription/plans'
      });
    }

    // Attach plan info for service layer use
    req.userPlan = plan;
    next();
  } catch (error) {
    console.error("Plan guard error details:", error);
    res.status(500).json({ 
      message: "Internal server error during plan check.",
      details: error.message,
      hint: "Check server logs for 'Plan guard error details'"
    });
  }
};

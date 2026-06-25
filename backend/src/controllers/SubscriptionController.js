import Razorpay from "razorpay";
import crypto from "crypto";
import { supabase } from "../config/db.js";
import { PLANS } from "../constants/plans.js";

// Initialize Razorpay
// Using placeholders if env variables are not present.
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder",
});

/**
 * Get current user's plan and usage
 */
export const getMyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get plan
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const plan = sub?.plan || 'free';
    
    // Get usage for current month
    const monthYear = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('metric, current_count')
      .eq('user_id', userId)
      .eq('month_year', monthYear);

    // Format usage into an object
    const usageObj = {};
    if (usage) {
      usage.forEach(u => { usageObj[u.metric] = u.current_count; });
    }

    res.status(200).json({
      subscription: sub || { plan: 'free', status: 'active' },
      planDetails: PLANS[plan],
      usage: usageObj
    });
  } catch (error) {
    console.error("getMyPlan error:", error);
    res.status(500).json({ message: "Failed to fetch plan info." });
  }
};

/**
 * Create a Razorpay subscription or one-time order
 */
export const createOrder = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const userId = req.user.id;

    if (!PLANS[plan] || plan === 'free') {
      return res.status(400).json({ message: "Invalid plan selected." });
    }

    const planDetails = PLANS[plan];
    const amount = billingCycle === 'yearly' ? planDetails.price_yearly : planDetails.price_monthly;
    
    // In a real app with sub payments, you would create a subscription using plan ID
    // const rzpPlanId = billingCycle === 'yearly' ? planDetails.razorpay_plan_id_yearly : planDetails.razorpay_plan_id_monthly;
    // const subscription = await razorpay.subscriptions.create({ plan_id: rzpPlanId, ... });

    // For simplicity / testing, we can create an Order
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `receipt_${userId}_${Date.now()}`
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error("createOrder error:", error);
    if (error.statusCode === 401 || error.error?.code === 'BAD_REQUEST_ERROR') {
         return res.status(401).json({ 
             message: "Razorpay Environment Keys missing or invalid. Please configure RAZORPAY_KEY_ID and SECRET in backend .env" 
         });
    }
    res.status(500).json({ message: "Failed to create Razorpay order.", details: error.error?.description || error.message });
  }
};

/**
 * Verify Payment Signature
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billingCycle } = req.body;
    const userId = req.user.id;

    const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder";
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature." });
    }

    // Payment successful, update user_subscriptions
    // Upsert or insert logic
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan: plan,
        billing_cycle: billingCycle,
        status: 'active',
        razorpay_customer_id: razorpay_payment_id,
        current_period_start: new Date(),
        current_period_end: new Date(new Date().setMonth(new Date().getMonth() + (billingCycle === 'yearly' ? 12 : 1))),
        updated_at: new Date()
      }, { onConflict: 'user_id' });

    if (error) {
       console.error("Failed to update subscription in DB", error);
       return res.status(500).json({ message: "Failed to update subscription." });
    }
    
    // Also log in payments
    const amount = PLANS[plan][billingCycle === 'yearly' ? 'price_yearly' : 'price_monthly'];
    await supabase.from('subscription_payments').insert({
       user_id: userId,
       razorpay_payment_id: razorpay_payment_id,
       amount_paise: amount * 100,
       plan: plan,
       billing_cycle: billingCycle,
       status: 'captured'
    });

    res.status(200).json({ message: "Payment verified successfully!" });
  } catch (error) {
    console.error("verifyPayment error:", error);
    res.status(500).json({ message: "Failed to verify payment." });
  }
};

/**
 * Cancel subscription (at period end)
 */
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('user_id', userId);

    if (error) throw error;
    res.status(200).json({ message: "Subscription will be cancelled at end of period." });
  } catch (error) {
    console.error("Cancel error:", error);
    res.status(500).json({ message: "Failed to cancel subscription." });
  }
};

/**
 * Webhook for Razorpay
 */
export const razorpayWebhook = async (req, res) => {
  // In production, verify razorpay signature header
  // x-razorpay-signature
  res.status(200).send("OK");
};

/**
 * Get Sub invoices
 */
export const getInvoices = async (req, res) => {
  try {
    const { data: invoices, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.status(200).json(invoices || []);
  } catch(error) {
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

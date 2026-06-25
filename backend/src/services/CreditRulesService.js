import { supabase } from "../config/db.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(systemPrompt, userMessage, retryCount = 0) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nMetrics: ${userMessage}` }]
      }
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
  };

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (res.status === 429 && retryCount < 2) {
      await new Promise(r => setTimeout(r, 2500));
      return callGemini(systemPrompt, userMessage, retryCount + 1);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${res.status} — ${errText}`);
    }

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    if (retryCount < 1 && (error.message?.includes("fetch") || error.code === "ECONNRESET")) {
      await new Promise(r => setTimeout(r, 1000));
      return callGemini(systemPrompt, userMessage, retryCount + 1);
    }
    throw error;
  }
}

export const CreditRulesService = {
  async calculateCreditMetrics(userId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch raw data in parallel
    const [
      salesRes,
      expensesRes,
      inventoryRes,
      suppliersRes,
      userRes
    ] = await Promise.all([
      supabase.from("sales").select("total, tax_amount, amount_paid, payment_status, created_at").eq("user_id", userId).gte("created_at", thirtyDaysAgo),
      supabase.from("expenses").select("amount, category").eq("user_id", userId).gte("created_at", thirtyDaysAgo),
      supabase.from("inventory").select("stock, cost_price, price").eq("user_id", userId),
      supabase.from("suppliers").select("outstanding_balance").eq("user_id", userId),
      supabase.from("users").select("gstin").eq("id", userId).single()
    ]);

    const sales = salesRes.data || [];
    const expenses = expensesRes.data || [];
    const inventory = inventoryRes.data || [];
    const suppliers = suppliersRes.data || [];
    const user = userRes.data || {};

    // 2. Calculations
    // Revenue & NOI
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netOperatingIncome = Math.max(0, totalRevenue - totalExpenses);

    // Current Assets
    const accountsReceivable = sales.reduce((sum, s) => {
      if (s.payment_status === "unpaid" || s.payment_status === "partial" || s.payment_status === "overdue") {
        const due = Number(s.total || 0) - Number(s.amount_paid || 0);
        return sum + Math.max(0, due);
      }
      return sum;
    }, 0);

    const inventoryValue = inventory.reduce((sum, item) => {
      const cost = Number(item.cost_price || item.price * 0.7 || 0);
      return sum + (Number(item.stock || 0) * cost);
    }, 0);

    const cashOnHandFallback = Math.max(10000, totalRevenue - totalExpenses); // assumed cash base
    const currentAssets = cashOnHandFallback + accountsReceivable + inventoryValue;

    // Current Liabilities
    const accountsPayable = suppliers.reduce((sum, vendor) => sum + Number(vendor.outstanding_balance || 0), 0);
    const currentLiabilities = Math.max(5000, accountsPayable); // floor liabilities to prevent division by zero

    // Ratios
    const workingCapitalRatio = currentAssets / currentLiabilities;

    // Debt Service Coverage Ratio (DSCR)
    // Assume typical loan repayment size of ₹5,000 monthly if no debts, or use actual payable
    const monthlyDebtService = Math.max(2000, accountsPayable * 0.1); 
    const dscr = monthlyDebtService > 0 ? netOperatingIncome / monthlyDebtService : 1.0;

    // Days Sales Outstanding (DSO)
    const creditSales = sales.reduce((sum, s) => {
      if (s.payment_status !== "paid") return sum + Number(s.total || 0);
      return sum;
    }, 0);
    const dso = creditSales > 0 ? (accountsReceivable / creditSales) * 30 : 0;

    // Estimated GST Due
    const outputGst = sales.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0);
    // Assume input tax credit (ITC) is 18% of expenses where categories have GST (like purchase, logistics, rent)
    const gstEligibleExpenses = expenses.filter(e => ["Purchase", "Logistics", "Rent", "Utility"].includes(e.category));
    const inputGstCredit = gstEligibleExpenses.reduce((sum, e) => sum + (Number(e.amount || 0) * 0.18), 0);
    const estimatedGstDue = Math.max(0, outputGst - inputGstCredit);

    // 3. CIBIL-style score generation (300 to 900)
    let score = 300;

    // A: Revenue factor (max 150 points)
    const revFactor = Math.min(1.0, totalRevenue / 100000);
    score += Math.round(revFactor * 150);

    // B: DSCR factor (max 150 points)
    const dscrFactor = dscr >= 1.5 ? 1.0 : dscr >= 1.2 ? 0.8 : dscr >= 1.0 ? 0.5 : 0.2;
    score += Math.round(dscrFactor * 150);

    // C: Working Capital factor (max 150 points)
    const wcFactor = workingCapitalRatio >= 2.0 ? 1.0 : workingCapitalRatio >= 1.5 ? 0.8 : workingCapitalRatio >= 1.0 ? 0.5 : 0.2;
    score += Math.round(wcFactor * 150);

    // D: DSO factor (max 100 points)
    const dsoFactor = dso <= 15 ? 1.0 : dso <= 30 ? 0.8 : dso <= 45 ? 0.5 : 0.2;
    score += Math.round(dsoFactor * 100);

    // E: Profile / GSTIN factor (max 50 points)
    const hasGst = user.gstin ? 50 : 0;
    score += hasGst;

    // Guarantee score stays within range
    score = Math.max(300, Math.min(900, score));

    // Rating text
    let rating = "Poor";
    if (score >= 750) rating = "Excellent";
    else if (score >= 680) rating = "Good";
    else if (score >= 580) rating = "Average";

    // 4. Generate AI explanation
    const dataDesc = JSON.stringify({
      score,
      rating,
      dscr: dscr.toFixed(2),
      workingCapitalRatio: workingCapitalRatio.toFixed(2),
      dso: dso.toFixed(1),
      estimatedGstDue: Math.round(estimatedGstDue),
      accountsReceivable: Math.round(accountsReceivable),
      hasGst: !!user.gstin
    });

    const systemPrompt = `You are FinVoice, the credit analyst co-pilot for FinSathi.
Explain the following locally computed business credit profile to the merchant.
Use clear, encouraging Hinglish/English.
Explain why they got this score, and list exactly what they can do to improve their credit rating (e.g. collect dues faster, maintain better margins, register GST).

Provide a conversational, expert explanation under 4 sentences. Break down the strength and weakness based ONLY on these numbers. Don't mention JSON fields directly, speak to the business owner naturally. Always mention their credit score and rating in the explanation.`;

    let explanation = "";
    try {
      explanation = await callGemini(systemPrompt, dataDesc);
    } catch (e) {
      console.error("[CreditRulesService] Gemini explanation fetch failed:", e.message);
      explanation = `Your credit score is ${score} (${rating}). To improve your rating, try reducing your collections speed (currently ${dso.toFixed(1)} days) and maintaining a healthy working capital ratio (currently ${workingCapitalRatio.toFixed(2)}).`;
    }

    return {
      success: true,
      score,
      rating,
      metrics: {
        dscr: Number(dscr.toFixed(2)),
        workingCapitalRatio: Number(workingCapitalRatio.toFixed(2)),
        dso: Number(dso.toFixed(1)),
        estimatedGstDue: Math.round(estimatedGstDue),
        accountsReceivable: Math.round(accountsReceivable),
        accountsPayable: Math.round(accountsPayable),
        inventoryValue: Math.round(inventoryValue)
      },
      explanation: explanation.trim()
    };
  }
};

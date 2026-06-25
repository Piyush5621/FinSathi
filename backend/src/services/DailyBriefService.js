import { supabase } from "../config/db.js";
import { HealthScoreService } from "./HealthScoreService.js";
import { CreditRulesService } from "./CreditRulesService.js";

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
        parts: [{ text: `${systemPrompt}\n\nData: ${userMessage}` }]
      }
    ],
    generationConfig: { 
      temperature: 0.3, 
      maxOutputTokens: 1024,
      responseMimeType: "application/json"
    }
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

export const DailyBriefService = {
  async getDailyBrief(userId) {
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Try to fetch cached brief
    try {
      const { data: cachedBrief, error: cacheError } = await supabase
        .from("daily_business_briefs")
        .select("*")
        .eq("user_id", userId)
        .eq("brief_date", todayStr)
        .single();

      if (!cacheError && cachedBrief) {
        console.log(`[DailyBriefService] Serving brief from cache for date ${todayStr}`);
        return {
          success: true,
          briefDate: cachedBrief.brief_date,
          summary: cachedBrief.summary,
          actionItems: cachedBrief.action_items,
          generatedAt: cachedBrief.generated_at
        };
      }
    } catch (e) {
      console.warn("[DailyBriefService] Cache fetch error/table missing, generating on-the-fly");
    }

    // 2. Fetch raw business stats for calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayISO = startOfToday.toISOString();

    const [
      salesRes,
      expensesRes,
      inventoryRes,
      leadsRes,
      tasksRes
    ] = await Promise.all([
      // Today's Sales
      supabase.from("sales").select("total").eq("user_id", userId).gte("created_at", todayISO),
      // Today's Expenses
      supabase.from("expenses").select("amount").eq("user_id", userId).gte("created_at", todayISO),
      // Low Stock Inventory count
      supabase.from("inventory").select("id, name, stock, low_stock_threshold").eq("user_id", userId),
      // High-interest leads
      supabase.from("leads").select("id, name, expected_revenue").eq("user_id", userId).in("status", ["New Lead", "Contacted", "Interested"]),
      // Pending high tasks
      supabase.from("tasks").select("id, title, priority").eq("user_id", userId).neq("status", "Completed").in("priority", ["Critical", "High"])
    ]);

    // Calculate metrics
    const sales = salesRes.data || [];
    const salesCount = sales.length;
    const totalSales = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);

    const expenses = expensesRes.data || [];
    const expensesCount = expenses.length;
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const inventory = inventoryRes.data || [];
    const lowStockItems = inventory.filter(item => Number(item.stock || 0) <= Number(item.low_stock_threshold || 10));
    const lowStockCount = lowStockItems.length;

    // Fetch outstanding customer balance
    let outstandingBalance = 0;
    let dueCount = 0;
    try {
      const { data: unpaidSales } = await supabase
        .from("sales")
        .select("total, amount_paid, payment_status")
        .eq("user_id", userId)
        .in("payment_status", ["unpaid", "partial", "overdue"]);

      (unpaidSales || []).forEach(sale => {
        dueCount++;
        let due = Number(sale.total || 0);
        if (sale.payment_status === "partial") {
          due = due - Number(sale.amount_paid || 0);
        }
        outstandingBalance += due;
      });
    } catch (e) {
      console.warn("[DailyBriefService] Error fetching customer balances:", e.message);
    }

    const leadsCount = (leadsRes.data || []).length;
    const tasksCount = (tasksRes.data || []).length;

    // 3. Formulate LLM prompts
    const metricsDescription = JSON.stringify({
      todayRevenue: totalSales,
      salesInvoicesCount: salesCount,
      todayExpenses: totalExpenses,
      expensesCount: expensesCount,
      lowStockCount: lowStockCount,
      lowStockSample: lowStockItems.slice(0, 3).map(i => i.name),
      outstandingBalance: outstandingBalance,
      customersWithDuesCount: dueCount,
      activeLeadsCount: leadsCount,
      pendingCriticalTasksCount: tasksCount
    });

    const systemPrompt = `You are FinVoice, a warm and expert AI business advisor for FinSathi, a business operating system for small retailers in India.
Analyze the raw business metrics for today and generate a concise business brief.

Return your analysis as a valid JSON object with the following fields (do NOT include any markdown code blocks, just raw JSON):
{
  "summary": "A warm, concise 2-3 sentence overview of how the business is doing today, using Hinglish/English. Encourage the merchant and highlight the most important positive trend or critical risk.",
  "action_items": [
    {
      "title": "A short, specific, actionable item name (e.g., 'Restock Wheat Flour', 'Follow up with Amit Kumar for ₹5,000 due')",
      "priority": "Critical" | "High" | "Medium" | "Low",
      "type": "restock" | "collection" | "crm" | "general"
    }
  ]
}`;

    let summaryText = "";
    let actionItems = [];

    try {
      const gResponse = await callGemini(systemPrompt, metricsDescription);
      const parsed = JSON.parse(gResponse);
      summaryText = parsed.summary || "Here is your business overview for today. Keep tracking sales and expenses to get a deeper analysis.";
      actionItems = parsed.action_items || [];
    } catch (e) {
      console.error("[DailyBriefService] Gemini parsing error:", e.message);
      summaryText = `Today's revenue is ₹${totalSales.toLocaleString("en-IN")} with ₹${totalExpenses.toLocaleString("en-IN")} in expenses. You have ${lowStockCount} items low on stock and ₹${outstandingBalance.toLocaleString("en-IN")} in outstanding customer dues.`;
      
      // Fallback action items
      if (lowStockCount > 0) {
        actionItems.push({ title: `Restock low inventory items (${lowStockCount} items)`, priority: "High", type: "restock" });
      }
      if (outstandingBalance > 0) {
        actionItems.push({ title: `Collect ₹${outstandingBalance.toLocaleString("en-IN")} outstanding customer dues`, priority: "High", type: "collection" });
      }
      if (tasksCount > 0) {
        actionItems.push({ title: `Complete pending critical tasks (${tasksCount} tasks)`, priority: "Medium", type: "general" });
      }
    }

    // 4. Cache the results in database (if table exists)
    try {
      const briefData = {
        user_id: userId,
        brief_date: todayStr,
        summary: summaryText,
        action_items: actionItems,
        generated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from("daily_business_briefs")
        .upsert(briefData, { onConflict: "user_id,brief_date" });

      if (insertError) {
        console.warn("[DailyBriefService] Could not cache daily brief in DB:", insertError.message);
      }
    } catch (e) {
      console.warn("[DailyBriefService] Cache write exception (table probably missing):", e.message);
    }

    return {
      success: true,
      briefDate: todayStr,
      summary: summaryText,
      actionItems: actionItems,
      generatedAt: new Date().toISOString()
    };
  },

  async getCoachingRecommendation(userId, customTopic = null) {
    const healthData = await HealthScoreService.calculateAndLog(userId).catch(() => null);
    const creditData = await CreditRulesService.calculateCreditMetrics(userId).catch(() => null);

    const systemPrompt = `You are FinVoice, the AI Business Coach for Indian MSMEs.
Analyze the business stats and provide a structured coaching recommendation.
You MUST format your output as a valid JSON object with the following fields (no markdown blocks, just raw JSON):
{
  "problem": "Identify the primary bottleneck or area of improvement (e.g., 'High Outstanding Customer Dues' or 'Negative Cash Flow Trend')",
  "reason": "Provide a brief explanation based on stats (e.g., 'Your Days Sales Outstanding (DSO) is 45 days, meaning payments take too long to collect')",
  "action": "Detail a concrete, actionable step (e.g., 'Set up automated reminders in the Billing tab and contact Amit Kumar for the overdue ₹12,000')",
  "impact": "Explain the positive outcome (e.g., 'Recovering this will inject ₹12,000 cash back into your working capital, raising your credit rating')"
}`;

    const context = JSON.stringify({
      healthScore: healthData?.score || 65,
      riskLevel: healthData?.riskLevel || "Needs Attention",
      salesPerformance: healthData?.components?.sales || {},
      cashFlow: healthData?.components?.cashFlow || {},
      creditMetrics: creditData?.metrics || {},
      customTopic: customTopic || "General business performance"
    });

    try {
      const res = await callGemini(systemPrompt, context);
      return JSON.parse(res);
    } catch (e) {
      console.error("[DailyBriefService] Coach generation failed:", e.message);
      return {
        problem: "Add invoices to see insights",
        reason: "We need more historical invoices and expenses to identify bottlenecks.",
        action: "Create a few test invoices in the POS billing terminal and add store expenses.",
        impact: "This will unlock cash flow forecasts, anomaly flags, and granular credit scores."
      };
    }
  }
};

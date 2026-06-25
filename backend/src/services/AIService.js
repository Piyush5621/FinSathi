import { supabase } from "../config/db.js";
import { SalesRepository } from "../repositories/SalesRepository.js";
import { ExpenseRepository } from "../repositories/ExpenseRepository.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Call Gemini API with a system+user prompt pair.
 */
async function callGemini(systemPrompt, userMessage, retryCount = 0) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. Please add it to your .env file.");
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser query: ${userMessage}` }]
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
      let errMsg = errText;
      try { errMsg = JSON.parse(errText).error?.message || errText; } catch (_) {}
      throw new Error(`Gemini API error: ${res.status} — ${errMsg}`);
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

/**
 * STEP 1: Extract structured intent.
 */
async function extractIntent(userQuery, context) {
  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = `You are an intent extraction engine for FinSathi, a business management app used by Indian small businesses.
  Extract the user's query intent into valid JSON.

  Intent Types:
  - SALES_SUMMARY: user asks about sales, revenue, billing, kitna bika, aaj ka sale
  - EXPENSE_QUERY: user asks about expenses, kharcha, spend
  - CUSTOMER_BALANCE: user asks about pending dues, outstanding, udhaar, receivables
  - INVENTORY_CHECK: user asks about stock, inventory, kya stock hai, low stock
  - PROFIT_REPORT: user asks about profit, net income, margin, munafa
  - TOP_PRODUCTS: user asks about best selling items, top products
  - STAFF_SALARY: user asks about staff, salary, employees
  - GENERAL_ADVICE: user asks for advice, tips, kya karna chahiye, how to improve
  - UNKNOWN: cannot determine

  Periods: today, this_week, this_month, last_month, all_time
  Today is: ${today}
  Business: ${context.businessName || "General"}

  Return ONLY valid JSON (no markdown):
  {
    "intent": "INTENT_TYPE",
    "period": "period",
    "date_from": "ISO date or null",
    "date_to": "ISO date or null",
    "language": "hindi/hinglish/english"
  }`;

  const raw = await callGemini(systemPrompt, userQuery);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse intent from AI response");
  return JSON.parse(jsonMatch[0]);
}

/**
 * STEP 2: Execute the data query based on intent.
 */
async function executeIntentQuery(userId, intent) {
  const now = new Date();
  let startDate, endDate;

  switch (intent.period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      endDate = now.toISOString();
      break;
    case "this_week": {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      startDate = weekStart.toISOString();
      endDate = now.toISOString();
      break;
    }
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      break;
    case "all_time":
      startDate = new Date("2020-01-01").toISOString();
      endDate = now.toISOString();
      break;
    default: // this_month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endDate = now.toISOString();
  }

  // Helper: fetch sales using created_at as fallback for date column
  const fetchSalesInRange = async () => {
    // Try date column first, fallback to created_at
    const { data: byDate } = await supabase
      .from("sales")
      .select("date, created_at, total, payment_status")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (byDate && byDate.length > 0) return byDate;

    // Fallback: filter by created_at
    const { data: byCreated } = await supabase
      .from("sales")
      .select("date, created_at, total, payment_status")
      .eq("user_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    return byCreated || [];
  };

  switch (intent.intent) {
    case "SALES_SUMMARY": {
      const sales = await fetchSalesInRange();
      const total = sales.reduce((s, r) => s + Number(r.total || 0), 0);
      const trend = groupByDate(sales);
      return {
        type: "SALES_SUMMARY",
        total,
        count: sales.length,
        trend,
        period: intent.period,
        average: sales.length > 0 ? Math.round(total / sales.length) : 0
      };
    }

    case "EXPENSE_QUERY": {
      const allExpenses = await ExpenseRepository.findAll(userId);
      const filtered = allExpenses.filter(e => {
        const d = new Date(e.date || e.created_at);
        return d >= new Date(startDate) && d <= new Date(endDate);
      });
      const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
      const byCategory = groupByField(filtered, "category", "amount");
      return { type: "EXPENSE_QUERY", total, count: filtered.length, byCategory, period: intent.period };
    }

    case "CUSTOMER_BALANCE": {
      const { data: unpaidSales } = await supabase
        .from("sales")
        .select("total, amount_paid, payment_status, customers(name)")
        .eq("user_id", userId)
        .in("payment_status", ["unpaid", "partial", "overdue"]);

      const perCustomer = {};
      (unpaidSales || []).forEach(r => {
        const name = r.customers?.name || "Walk-in";
        let due = Number(r.total || 0);
        if (r.payment_status === "partial") due = due - Number(r.amount_paid || 0);
        perCustomer[name] = (perCustomer[name] || 0) + due;
      });

      const outstanding = Object.values(perCustomer).reduce((s, v) => s + v, 0);
      return {
        type: "CUSTOMER_BALANCE",
        outstanding,
        perCustomer,
        count: (unpaidSales || []).length
      };
    }

    case "INVENTORY_CHECK": {
      const { data: products } = await supabase
        .from("inventory")
        .select("name, stock, min_stock")
        .eq("user_id", userId)
        .limit(100);

      const allProducts = products || [];
      const lowStock = allProducts
        .filter(p => Number(p.stock || 0) <= Number(p.min_stock || 10))
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 10);

      return {
        type: "INVENTORY_CHECK",
        lowStock,
        totalProducts: allProducts.length,
        outOfStock: allProducts.filter(p => Number(p.stock || 0) === 0).length
      };
    }

    case "PROFIT_REPORT": {
      const sales = await fetchSalesInRange();
      const allExpenses = await ExpenseRepository.findAll(userId);
      const revenue = sales.reduce((s, r) => s + Number(r.total || 0), 0);
      const totalExp = allExpenses
        .filter(e => {
          const d = new Date(e.date || e.created_at);
          return d >= new Date(startDate) && d <= new Date(endDate);
        })
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const profit = revenue - totalExp;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      return { type: "PROFIT_REPORT", revenue, expenses: totalExp, profit, margin, period: intent.period };
    }

    case "TOP_PRODUCTS": {
      // Pull from sale_items table (joined with inventory for product name)
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("product_name, quantity, total, products:inventory(name)")
        .eq("user_id", userId);

      const productSums = {};
      (saleItems || []).forEach(item => {
        const name = item.products?.name || item.product_name || "Unknown Product";
        productSums[name] = (productSums[name] || 0) + Number(item.total || 0);
      });

      // If no sale_items, try from sales.items JSONB column as fallback
      if (Object.keys(productSums).length === 0) {
        const { data: salesWithItems } = await supabase
          .from("sales")
          .select("items")
          .eq("user_id", userId);

        (salesWithItems || []).forEach(s => {
          (s.items || []).forEach(item => {
            const name = item.name || item.product_name || item.productName || "Product";
            const amt = Number(item.total || (item.price * item.quantity) || 0);
            productSums[name] = (productSums[name] || 0) + amt;
          });
        });
      }

      const topProducts = Object.entries(productSums)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8);

      return { type: "TOP_PRODUCTS", topProducts, totalProducts: Object.keys(productSums).length };
    }

    case "STAFF_SALARY": {
      const { data: staff } = await supabase
        .from("staff")
        .select("name, base_salary, role, status")
        .eq("user_id", userId);
      const totalSalary = (staff || []).reduce((s, m) => s + Number(m.base_salary || 0), 0);
      return {
        type: "STAFF_SALARY",
        staff: (staff || []).map(s => ({ name: s.name, salary: s.base_salary, role: s.role })),
        totalSalary,
        count: (staff || []).length
      };
    }

    case "GENERAL_ADVICE": {
      // Pull summary data for context
      const sales = await fetchSalesInRange();
      const allExpenses = await ExpenseRepository.findAll(userId);
      const { data: products } = await supabase
        .from("inventory")
        .select("name, stock")
        .eq("user_id", userId)
        .limit(50);

      const revenue = sales.reduce((s, r) => s + Number(r.total || 0), 0);
      const expenses = allExpenses
        .filter(e => new Date(e.date || e.created_at) >= new Date(startDate))
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const lowStock = (products || []).filter(p => Number(p.stock || 0) <= 5).length;

      return {
        type: "GENERAL_ADVICE",
        revenue,
        expenses,
        profit: revenue - expenses,
        salesCount: sales.length,
        lowStockCount: lowStock,
        period: intent.period
      };
    }

    default:
      return { type: "UNKNOWN" };
  }
}

/**
 * STEP 3: Format the raw data into a natural language response via LLM.
 */
async function formatResponse(data, originalQuery, language) {
  // Build a human-friendly data description
  let dataDesc = "";
  switch (data.type) {
    case "SALES_SUMMARY":
      dataDesc = data.count > 0
        ? `Revenue this period: ₹${data.total.toLocaleString("en-IN")} from ${data.count} invoices. Average order: ₹${data.average?.toLocaleString("en-IN")}.`
        : "No sales recorded in this period.";
      break;
    case "EXPENSE_QUERY":
      dataDesc = data.count > 0
        ? `Total expenses: ₹${data.total.toLocaleString("en-IN")} across ${data.count} entries. Top category: ${data.byCategory?.[0]?.name || "N/A"}.`
        : "No expenses recorded in this period.";
      break;
    case "CUSTOMER_BALANCE":
      dataDesc = data.count > 0
        ? `Outstanding dues: ₹${data.outstanding.toLocaleString("en-IN")} from ${data.count} unpaid invoices. Customers: ${Object.keys(data.perCustomer || {}).slice(0, 3).join(", ")}.`
        : "All dues are cleared! No pending balances.";
      break;
    case "INVENTORY_CHECK":
      dataDesc = `Total products: ${data.totalProducts}. Low stock items: ${data.lowStock?.length || 0}. Out of stock: ${data.outOfStock || 0}.`;
      if (data.lowStock?.length > 0) dataDesc += ` Low stock: ${data.lowStock.slice(0, 3).map(p => p.name).join(", ")}.`;
      break;
    case "PROFIT_REPORT":
      dataDesc = `Revenue: ₹${data.revenue.toLocaleString("en-IN")}. Expenses: ₹${data.expenses.toLocaleString("en-IN")}. Net Profit: ₹${data.profit.toLocaleString("en-IN")} (${data.margin}% margin).`;
      break;
    case "TOP_PRODUCTS":
      dataDesc = data.topProducts?.length > 0
        ? `Top selling products: ${data.topProducts.slice(0, 5).map(p => `${p.name} (₹${p.amount.toLocaleString("en-IN")})`).join(", ")}.`
        : "No product sales data found yet. Add items to invoices to track top products.";
      break;
    case "STAFF_SALARY":
      dataDesc = data.count > 0
        ? `${data.count} staff members. Total monthly salary: ₹${data.totalSalary?.toLocaleString("en-IN")}. Staff: ${data.staff.map(s => s.name).join(", ")}.`
        : "No staff records found. Add staff in the Staff Hub.";
      break;
    case "GENERAL_ADVICE":
      dataDesc = `Business snapshot: Revenue ₹${data.revenue.toLocaleString("en-IN")}, Expenses ₹${data.expenses.toLocaleString("en-IN")}, Profit ₹${data.profit.toLocaleString("en-IN")}, ${data.salesCount} sales, ${data.lowStockCount} low stock items.`;
      break;
    default:
      dataDesc = "I could not determine what you're asking. Please try: 'Show today sales', 'Profit this month', 'Low stock items', or 'Outstanding dues'.";
  }

  const systemPrompt = `You are FinVoice, a warm, expert AI business advisor for FinSathi — an app used by Indian small business owners.

The user asked: "${originalQuery}"

Here is the actual business data from their account:
${dataDesc}

Your job: Reply in ${language === "hindi" ? "Hindi" : language === "hinglish" ? "a mix of Hindi and English (Hinglish)" : "English"}.
- Be warm, specific, and helpful.
- Use the ACTUAL numbers from the data above — do NOT say "no data" if numbers are present.
- If data is genuinely empty (zero records), acknowledge it and suggest what to do.
- Give 1-2 actionable tips based on the data.
- Keep it concise: 2-4 sentences max.
- Use ₹ symbol for Indian Rupees.`;

  try {
    const text = await callGemini(systemPrompt, originalQuery);
    return text.trim();
  } catch (e) {
    return dataDesc; // fallback to plain data description
  }
}

// Helpers
function groupByDate(records) {
  const map = {};
  records.forEach(r => {
    const d = (r.date || r.created_at || "").split("T")[0];
    if (d) map[d] = (map[d] || 0) + Number(r.total || 0);
  });
  return Object.entries(map).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));
}

function groupByField(records, field, valueField) {
  const map = {};
  records.forEach(r => {
    const key = r[field] || "Other";
    map[key] = (map[key] || 0) + Number(r[valueField] || 0);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function getChartType(intent) {
  const map = {
    SALES_SUMMARY: "line",
    EXPENSE_QUERY: "pie",
    PROFIT_REPORT: "bar",
    TOP_PRODUCTS: "bar",
    CUSTOMER_BALANCE: "list",
    INVENTORY_CHECK: "list"
  };
  return map[intent] || "list";
}

/**
 * Main entry: natural language query processor.
 */
export const AIService = {
  async query(userId, userQuery, contextData = {}) {
    try {
      const intent = await extractIntent(userQuery, contextData);
      console.log(`AI Intent: ${intent.intent} | Period: ${intent.period} | Lang: ${intent.language}`);

      const rawData = await executeIntentQuery(userId, intent);
      const summary = await formatResponse(rawData, userQuery, intent.language);

      return {
        success: true,
        intent: intent.intent,
        period: intent.period,
        data: rawData,
        summary,
        chartType: getChartType(intent.intent)
      };
    } catch (error) {
      console.error("AIService.query error:", error.message);
      return {
        success: false,
        summary: error.message?.includes("quota")
          ? "AI quota reached. Please try again in a few seconds."
          : error.message?.includes("GEMINI_API_KEY")
          ? "Gemini API key is not configured in the backend .env file."
          : "Something went wrong processing your query. Please try again."
      };
    }
  }
};

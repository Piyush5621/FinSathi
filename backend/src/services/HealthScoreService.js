import { supabase } from "../config/db.js";

/**
 * HealthScoreService
 * Computes a normalized Business Health Score (0-100) across 5 weighted components:
 * - Sales Performance (30%)
 * - Cash Flow Health (25%)
 * - Inventory Health (20%)
 * - Customer Collection (15%)
 * - Profile Completeness (10%)
 * Generates top 3 actionable recommendations and logs snapshots to the database.
 */
export const HealthScoreService = {
  async calculateAndLog(userId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch data in parallel
    const [
      salesRaw,
      expensesRaw,
      inventoryRaw,
      staffRaw,
      attendanceRaw,
      userRaw
    ] = await Promise.all([
      // Sales in last 60 days
      supabase.from("sales").select("total, amount_paid, payment_status, due_date, items, date, created_at, customers(name)").eq("user_id", userId).gte("date", sixtyDaysAgo),
      // Expenses in last 30 days
      supabase.from("expenses").select("amount").eq("user_id", userId).gte("date", thirtyDaysAgo),
      // Inventory products
      supabase.from("inventory").select("id, name, stock, low_stock_threshold").eq("user_id", userId),
      // Staff members
      supabase.from("staff").select("id").eq("user_id", userId).eq("status", "active"),
      // Attendance records for today
      supabase.from("attendance").select("id").eq("user_id", userId).eq("date", now.toISOString().split("T")[0]),
      // User Profile details
      supabase.from("users").select("business_name, business_type, phone, city, state, address, gstin, upi_id, payment_qr_url, logo_url").eq("id", userId).single()
    ]);

    const sales = salesRaw.data || [];
    const expenses = expensesRaw.data || [];
    const inventory = inventoryRaw.data || [];
    const staffCount = (staffRaw.data || []).length;
    const attendanceTodayCount = (attendanceRaw.data || []).length;
    const user = userRaw.data || {};

    // ─── Component 1: Sales Performance (30%) ───
    let currentPeriodSales = 0;
    let previousPeriodSales = 0;
    const thirtyDaysTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    sales.forEach(sale => {
      const saleDate = new Date(sale.date || sale.created_at).getTime();
      const total = Number(sale.total || 0);
      if (saleDate >= thirtyDaysTime) {
        currentPeriodSales += total;
      } else {
        previousPeriodSales += total;
      }
    });

    let salesScore = 0;
    let salesGrowth = 0;
    if (currentPeriodSales > 0) {
      if (previousPeriodSales === 0) {
        salesScore = 100;
      } else {
        salesGrowth = ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) * 100;
        if (salesGrowth >= 15) {
          salesScore = 100;
        } else if (salesGrowth >= 0) {
          salesScore = Math.round(80 + (salesGrowth / 15) * 20);
        } else if (salesGrowth >= -20) {
          salesScore = Math.round(50 + ((salesGrowth + 20) / 20) * 30);
        } else {
          salesScore = Math.round(Math.max(0, 50 + (salesGrowth / 100) * 50));
        }
      }
    } else {
      salesScore = 0;
    }

    // ─── Component 2: Cash Flow Health (25%) ───
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expenseRatio = currentPeriodSales > 0 ? totalExpenses / currentPeriodSales : 0;

    let cashFlowScore = 0;
    if (currentPeriodSales === 0 && totalExpenses === 0) {
      cashFlowScore = 100; // Neutral start
    } else if (currentPeriodSales === 0 && totalExpenses > 0) {
      cashFlowScore = 0;
    } else if (expenseRatio <= 0.3) {
      cashFlowScore = 100;
    } else if (expenseRatio <= 0.7) {
      cashFlowScore = Math.round(100 - ((expenseRatio - 0.3) / 0.4) * 30);
    } else if (expenseRatio <= 1.0) {
      cashFlowScore = Math.round(70 - ((expenseRatio - 0.7) / 0.3) * 40);
    } else {
      cashFlowScore = Math.round(Math.max(0, 30 - ((expenseRatio - 1.0) / 1.0) * 30));
    }

    // ─── Component 3: Inventory Health (20%) ───
    let lowStockCount = 0;
    let deadStockCount = 0;
    let inventoryScore = 100;

    if (inventory.length > 0) {
      // Find all product IDs sold in the last 30 days
      const soldProductIds = new Set();
      sales.forEach(sale => {
        const saleDate = new Date(sale.date || sale.created_at).getTime();
        if (saleDate >= thirtyDaysTime && sale.items) {
          const items = Array.isArray(sale.items) ? sale.items : [];
          items.forEach(item => {
            const pId = item.productId || item.id;
            if (pId) soldProductIds.add(pId);
          });
        }
      });

      inventory.forEach(product => {
        const stock = product.stock ?? 0;
        const threshold = product.low_stock_threshold ?? 10;
        if (stock <= threshold) {
          lowStockCount++;
        }
        if (stock > 0 && !soldProductIds.has(product.id)) {
          deadStockCount++;
        }
      });

      const lowStockRatio = lowStockCount / inventory.length;
      const deadStockRatio = deadStockCount / inventory.length;

      const lowStockScore = Math.max(0, 100 - (lowStockRatio * 150));
      const deadStockScore = Math.max(0, 100 - (deadStockRatio * 150));
      inventoryScore = Math.round((lowStockScore + deadStockScore) / 2);
    }

    // ─── Component 4: Customer Collection Health (15%) ───
    let currentInvoiced = 0;
    let currentCollected = 0;

    sales.forEach(sale => {
      const saleDate = new Date(sale.date || sale.created_at).getTime();
      if (saleDate >= thirtyDaysTime) {
        currentInvoiced += Number(sale.total || 0);
        currentCollected += Number(sale.amount_paid || 0);
      }
    });

    const collectionRate = currentInvoiced > 0 ? currentCollected / currentInvoiced : 1.0;
    const collectionScore = Math.round(collectionRate * 100);

    // ─── Component 5: Business Profile Completeness (10%) ───
    const profileFields = [
      "business_name", "business_type", "phone", "city", "state",
      "address", "gstin", "upi_id", "payment_qr_url", "logo_url"
    ];
    let completedFields = 0;
    profileFields.forEach(field => {
      if (user[field] !== null && user[field] !== undefined && String(user[field]).trim() !== "") {
        completedFields++;
      }
    });
    const profileScore = (completedFields / profileFields.length) * 100;

    // ─── Final Aggregated Score ───
    const finalScore = Math.round(
      (salesScore * 0.30) +
      (cashFlowScore * 0.25) +
      (inventoryScore * 0.20) +
      (collectionScore * 0.15) +
      (profileScore * 0.10)
    );

    // ─── Risk Level Classification ───
    let riskLevel = "At Risk";
    if (finalScore >= 85) {
      riskLevel = "Excellent";
    } else if (finalScore >= 70) {
      riskLevel = "Healthy";
    } else if (finalScore >= 50) {
      riskLevel = "Needs Attention";
    }

    // ─── Recommendations Candidate Pool ───
    const recommendations = [];

    // 1. Overdue invoices check
    const overdueSales = sales.filter(sale => {
      const status = (sale.payment_status || "").toLowerCase();
      const isUnpaid = ["unpaid", "overdue", "partial"].includes(status);
      const isPastDue = sale.due_date && new Date(sale.due_date) < now;
      return isUnpaid && isPastDue;
    });

    overdueSales.slice(0, 3).forEach(sale => {
      const due = Number(sale.total || 0) - Number(sale.amount_paid || 0);
      const customerName = sale.customers?.name || "Cash Customer";
      recommendations.push({
        id: `rec_overdue_${sale.invoice_no || sale.id}`,
        title: "Follow up overdue customer",
        message: `Invoice ${sale.invoice_no || "Bill"} for ${customerName} is overdue by ₹${due.toLocaleString()}.`,
        priority: "high",
        link: "/payments",
        category: "collection",
        severityRank: 3
      });
    });

    // 2. Low stock check
    const outOfStockItems = inventory.filter(p => (p.stock ?? 0) === 0);
    const lowStockItems = inventory.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.low_stock_threshold ?? 10));

    outOfStockItems.slice(0, 3).forEach(p => {
      recommendations.push({
        id: `rec_out_of_stock_${p.id}`,
        title: "Restock immediately",
        message: `Product "${p.name}" is completely out of stock.`,
        priority: "critical",
        link: "/inventory",
        category: "inventory",
        severityRank: 4
      });
    });

    lowStockItems.slice(0, 3).forEach(p => {
      recommendations.push({
        id: `rec_low_stock_${p.id}`,
        title: "Restock low stock item",
        message: `Product "${p.name}" is low on stock (${p.stock} remaining).`,
        priority: "high",
        link: "/inventory",
        category: "inventory",
        severityRank: 3
      });
    });

    // 3. Dead Stock check
    if (inventory.length > 0) {
      const soldProductIds = new Set();
      sales.forEach(sale => {
        const saleDate = new Date(sale.date || sale.created_at).getTime();
        if (saleDate >= thirtyDaysTime && sale.items) {
          const items = Array.isArray(sale.items) ? sale.items : [];
          items.forEach(item => {
            const pId = item.productId || item.id;
            if (pId) soldProductIds.add(pId);
          });
        }
      });

      const deadStockItems = inventory.filter(p => (p.stock ?? 0) > 0 && !soldProductIds.has(p.id));
      deadStockItems.slice(0, 2).forEach(p => {
        recommendations.push({
          id: `rec_dead_stock_${p.id}`,
          title: "Reduce dead stock",
          message: `Product "${p.name}" has not sold in the last 30 days. Consider a promotion.`,
          priority: "medium",
          link: "/inventory",
          category: "inventory",
          severityRank: 2
        });
      });
    }

    // 4. Staff Attendance check
    if (staffCount > 0 && attendanceTodayCount === 0) {
      recommendations.push({
        id: "rec_staff_attendance_missing",
        title: "Log staff attendance",
        message: "No staff attendance logs have been recorded for today.",
        priority: "medium",
        link: "/staff",
        category: "staff",
        severityRank: 2
      });
    }

    // 5. Profile completeness check
    if (profileScore < 100) {
      const missing = [];
      if (!user.gstin) missing.push("GSTIN");
      if (!user.upi_id) missing.push("UPI ID");
      if (!user.logo_url) missing.push("Business Logo");
      
      const missingStr = missing.length > 0 ? ` (missing: ${missing.slice(0, 2).join(", ")})` : "";
      recommendations.push({
        id: "rec_profile_incomplete",
        title: "Complete business profile",
        message: `Complete your merchant settings${missingStr} to improve customer trust.`,
        priority: "low",
        link: "/profile",
        category: "profile",
        severityRank: 1
      });
    }

    // Sort by severity rank descending and take top 3
    const topRecommendations = recommendations
      .sort((a, b) => b.severityRank - a.severityRank)
      .slice(0, 3)
      .map(({ severityRank, ...rest }) => rest);

    // ─── Save / Update Daily Snapshot to Database ───
    try {
      const todayDateStr = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextDayDateStr = tomorrow.toISOString().split("T")[0];

      const { data: existing, error: fetchError } = await supabase
        .from("business_health_scores")
        .select("id")
        .eq("user_id", userId)
        .gte("recorded_at", todayDateStr)
        .lt("recorded_at", nextDayDateStr)
        .limit(1);

      if (fetchError) throw fetchError;

      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase
          .from("business_health_scores")
          .update({
            score: finalScore,
            sales_score: salesScore,
            cash_flow_score: cashFlowScore,
            inventory_score: inventoryScore,
            collection_score: collectionScore,
            profile_score: Math.round(profileScore),
            recorded_at: now.toISOString()
          })
          .eq("id", existing[0].id);

        if (updateError) {
          console.warn("[HealthScoreService] Snapshot update error:", updateError.message);
        }
      } else {
        const { error: insertError } = await supabase
          .from("business_health_scores")
          .insert([{
            user_id: userId,
            score: finalScore,
            sales_score: salesScore,
            cash_flow_score: cashFlowScore,
            inventory_score: inventoryScore,
            collection_score: collectionScore,
            profile_score: Math.round(profileScore),
            recorded_at: now.toISOString()
          }]);

        if (insertError) {
          console.warn("[HealthScoreService] Snapshot insert error:", insertError.message);
        }
      }
    } catch (e) {
      console.error("[HealthScoreService] Snapshot exception:", e);
    }

    // Fetch the past 30 days of score history
    let history = [];
    try {
      const { data: histData } = await supabase
        .from("business_health_scores")
        .select("score, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: true })
        .limit(30);

      if (histData) {
        history = histData.map(h => ({
          date: h.recorded_at.split("T")[0],
          score: h.score
        }));
      }
    } catch (e) {
      console.warn("[HealthScoreService] History fetch warning:", e.message);
    }

    return {
      score: finalScore,
      riskLevel,
      components: {
        sales: { score: salesScore, weight: 0.30, details: { currentPeriodSales, previousPeriodSales, growth: Math.round(salesGrowth * 100) / 100 } },
        cashFlow: { score: cashFlowScore, weight: 0.25, details: { revenue: currentPeriodSales, expenses: totalExpenses, ratio: Math.round(expenseRatio * 100) / 100 } },
        inventory: { score: inventoryScore, weight: 0.20, details: { totalProducts: inventory.length, lowStockCount, deadStockCount } },
        collection: { score: collectionScore, weight: 0.15, details: { invoiced: currentInvoiced, collected: currentCollected, rate: Math.round(collectionRate * 100) } },
        profile: { score: Math.round(profileScore), weight: 0.10, details: { completedFields, totalFields: profileFields.length } }
      },
      recommendations: topRecommendations,
      history
    };
  }
};

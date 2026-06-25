import { supabase } from "../config/db.js";
import { SalesRepository } from "../repositories/SalesRepository.js";
import { ExpenseRepository } from "../repositories/ExpenseRepository.js";

/**
 * FinPredict — Predictive Cash Flow Engine
 * Generates a 14-day forward-looking cash flow projection.
 *
 * Schema reality (public_schema_snapshot.md):
 *   sales   → id(bigint), user_id, date, total, payment_status, items, invoice_no
 *             NO amount_paid, NO due_date columns
 *   expenses→ id, user_id, date, amount, category
 *   staff   → id, user_id, name, monthly_salary
 */
export const CashFlowService = {
  async predict(userId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ─── Fetch all required data in parallel ────────────────────────────────
    const [recentSales, allSales, expenses, upcomingUnpaidSales, staff] =
      await Promise.all([
        // Last 30 days sales for avg daily revenue
        SalesRepository.findSalesByDateRange(
          userId,
          thirtyDaysAgo.toISOString(),
          now.toISOString()
        ),
        // All sales for starting balance
        SalesRepository.findAllSales(userId, 5000, "date", false),
        // All expenses
        ExpenseRepository.findAll(userId),
        // Unpaid sales (aggregating actual amount_paid and due_date)
        (async () => {
          const { data } = await supabase
            .from("sales")
            .select("total, amount_paid, due_date, date, payment_status")
            .eq("user_id", userId)
            .in("payment_status", ["unpaid", "partial", "overdue"]);
          return data || [];
        })(),
        // Staff for payroll projection
        (async () => {
          const { data } = await supabase
            .from("staff")
            .select("name, base_salary")
            .eq("user_id", userId);
          return data || [];
        })(),
      ]);

    // ─── Historical averages ─────────────────────────────────────────────────

    const last30Revenue = recentSales.reduce((s, r) => s + Number(r.total || 0), 0);
    const avgDailyRevenue = last30Revenue / 30;

    const recentExpenses = expenses.filter((e) => {
      const d = new Date(e.date || e.created_at);
      return d >= thirtyDaysAgo;
    });
    const last30Expenses = recentExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const avgDailyExpense = last30Expenses / 30;

    // Starting cash position (utilizing actual amount_paid column)
    const totalRevenue = allSales.reduce((s, r) => {
      const status = (r.payment_status || "").toLowerCase();
      if (status === "paid") return s + Number(r.amount_paid !== null ? r.amount_paid : r.total || 0);
      return s + Number(r.amount_paid || 0);
    }, 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const startingBalance = Math.max(totalRevenue - totalExpenses, 0);

    // ─── Payroll projection ──────────────────────────────────────────────────
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemainingInMonth = daysInMonth - now.getDate();
    const totalMonthlySalary = staff.reduce((s, m) => s + Number(m.base_salary || 0), 0);
    const projectedPayrollNext14 = Math.min(
      (totalMonthlySalary / daysInMonth) * 14,
      totalMonthlySalary * (daysRemainingInMonth / daysInMonth)
    );

    // ─── Build 14-day projection ─────────────────────────────────────────────
    const dailyProjections = [];
    let runningBalance = startingBalance;

    for (let i = 1; i <= 14; i++) {
      const projDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = projDate.toISOString().split("T")[0];

      // Baseline: avg daily revenue
      let inflow = avgDailyRevenue;

      // Bonus: outstanding dues of unpaid/partial/overdue invoices whose due_date (or sale date) matches this projected day
      upcomingUnpaidSales.forEach((s) => {
        const targetDateRaw = s.due_date || s.date || "";
        const targetDateStr = (targetDateRaw instanceof Date ? targetDateRaw.toISOString() : String(targetDateRaw)).substring(0, 10);
        
        if (targetDateStr === dateStr) {
          const total = Number(s.total || 0);
          const amountPaid = Number(s.amount_paid !== null ? s.amount_paid : (s.payment_status === 'unpaid' ? 0 : total * 0.5));
          const outstanding = Math.max(total - amountPaid, 0);
          inflow += outstanding * 0.6; // 60% collection probability
        }
      });

      const dailyPayroll = i <= daysRemainingInMonth ? projectedPayrollNext14 / 14 : 0;
      const outflow = avgDailyExpense + dailyPayroll;
      runningBalance = runningBalance + inflow - outflow;

      dailyProjections.push({
        date: dateStr,
        dayLabel: projDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        balance: Math.round(runningBalance),
        inflow: Math.round(inflow),
        outflow: Math.round(outflow),
        isCrunch: false,
      });
    }

    // ─── Cash crunch detection ───────────────────────────────────────────────
    // Threshold: 20% of 20× avg daily revenue
    const warningThreshold = avgDailyRevenue * 20 * 0.2;
    let cashCrunchDay = null;

    dailyProjections.forEach((day, i) => {
      if (day.balance < warningThreshold) {
        day.isCrunch = true;
        if (!cashCrunchDay) cashCrunchDay = i + 1;
      }
    });

    const minBalance = Math.min(...dailyProjections.map((d) => d.balance));
    const maxBalance = Math.max(...dailyProjections.map((d) => d.balance));

    return {
      startingBalance:        Math.round(startingBalance),
      projectedBalance14Days: Math.round(dailyProjections[13]?.balance || startingBalance),
      avgDailyRevenue:        Math.round(avgDailyRevenue),
      avgDailyExpense:        Math.round(avgDailyExpense),
      projectedPayroll:       Math.round(projectedPayrollNext14),
      cashCrunchDetected:     cashCrunchDay !== null,
      cashCrunchInDays:       cashCrunchDay,
      warningThreshold:       Math.round(warningThreshold),
      minBalance:             Math.round(minBalance),
      maxBalance:             Math.round(maxBalance),
      dailyProjections,
    };
  },
};

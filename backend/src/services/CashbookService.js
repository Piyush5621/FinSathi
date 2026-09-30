import { getPostgresPool } from "../config/postgres.js";
import { FinancialCacheService } from "../utils/cache.js";

/**
 * CashbookService — Canonical engine for business liquidity and cash movement.
 * Derives inflows and outflows from authoritative underlying tables:
 * - Sales (paid amount)
 * - Customer Payments (Khata debt repayments)
 * - Operating Expenses
 * - Supplier Payments
 * - Cash Float Adjustments (deposits & withdrawals)
 */
export const CashbookService = {
  /**
   * Retrieve unified chronological cashbook movements with totals,
   * account breakdowns, and server-side pagination.
   */
  async getCashbook(userContext, filters = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const { userId, orgId } = userContext;
      const {
        storeId,
        startDate,
        endDate,
        paymentMethod,
        transactionType,
        direction,
        page = 1,
        limit = 50
      } = filters;

      // 1. Validate Store ID if provided
      if (storeId) {
        const storeCheck = await client.query(
          `SELECT id, user_id FROM public.stores WHERE id = $1`,
          [storeId]
        );
        if (storeCheck.rows.length === 0) {
          const err = new Error("Store not found or unauthorized.");
          err.statusCode = 403;
          throw err;
        }

        const storeOwner = storeCheck.rows[0].user_id;
        if (storeOwner !== userId) {
          let sameOrg = false;
          if (orgId) {
            const orgCheck = await client.query(`SELECT organization_id FROM public.users WHERE id = $1`, [storeOwner]);
            sameOrg = orgCheck.rows[0]?.organization_id === orgId;
          }
          if (!sameOrg) {
            const err = new Error("Unauthorized store: store does not belong to your business.");
            err.statusCode = 403;
            throw err;
          }
        }
      }

      // 2. Build Unified SQL CTE
      // Note: We use $1 for userId and $2 for orgId
      const cteQuery = `
        WITH unified_movements AS (
          -- 1. Sales Inflow (Only collected amount, excluding unpaid credit)
          SELECT 
            'sale-' || s.id::text as id,
            s.id as source_id,
            'SALE' as source,
            'inflow' as direction,
            COALESCE(s.invoice_no, 'POS-' || substring(s.id::text, 1, 8)) as title,
            COALESCE('Sale to ' || c.name, 'Direct Cash Sale') as description,
            CASE 
              WHEN LOWER(COALESCE(s.payment_status, '')) = 'paid' THEN COALESCE(s.amount_paid, s.total, 0)
              ELSE COALESCE(s.amount_paid, 0)
            END as amount,
            COALESCE(s.payment_method, 'Cash') as payment_method,
            COALESCE(s.date, s.created_at) as date,
            s.store_id,
            st.name as store_name,
            'Sales Revenue' as category,
            s.user_id
          FROM public.sales s
          LEFT JOIN public.customers c ON s.customer_id = c.id
          LEFT JOIN public.stores st ON s.store_id = st.id
          WHERE (s.user_id = $1 OR (st.user_id = $1))
            AND LOWER(COALESCE(s.payment_status, '')) != 'cancelled'
            AND s.cancellation IS NULL
            AND (
              (LOWER(COALESCE(s.payment_status, '')) = 'paid' AND COALESCE(s.total, 0) > 0)
              OR (s.amount_paid IS NOT NULL AND s.amount_paid > 0)
            )

          UNION ALL

          -- 2. Customer Khata Repayments Inflow
          SELECT 
            'pay-' || p.id::text as id,
            p.id as source_id,
            'CUSTOMER_PAYMENT' as source,
            'inflow' as direction,
            'Khata Settlement: ' || COALESCE(c.name, 'Customer') as title,
            'Customer Khata debt repayment' as description,
            p.amount as amount,
            COALESCE(p.payment_mode, 'Cash') as payment_method,
            COALESCE(p.date, p.created_at) as date,
            NULL::uuid as store_id,
            NULL::text as store_name,
            'Customer Repayment' as category,
            p.user_id
          FROM public.payments p
          LEFT JOIN public.customers c ON p.customer_id = c.id
          WHERE p.user_id = $1 AND p.amount > 0

          UNION ALL

          -- 3. Operating Expenses Outflow
          SELECT 
            'exp-' || e.id::text as id,
            e.id as source_id,
            'EXPENSE' as source,
            'outflow' as direction,
            COALESCE(e.description, e.category, 'Operating Expense') as title,
            'Operating expense - ' || e.category as description,
            e.amount as amount,
            COALESCE(e.payment_method, 'Cash') as payment_method,
            COALESCE(e.date, e.created_at) as date,
            e.store_id,
            st.name as store_name,
            e.category as category,
            e.user_id
          FROM public.expenses e
          LEFT JOIN public.stores st ON e.store_id = st.id
          WHERE (e.user_id = $1 OR ($2::uuid IS NOT NULL AND e.organization_id = $2::uuid))
            AND e.amount > 0

          UNION ALL

          -- 4. Supplier Debt Repayments Outflow
          SELECT 
            'suppay-' || sp.id::text as id,
            sp.id as source_id,
            'SUPPLIER_PAYMENT' as source,
            'outflow' as direction,
            'Supplier Payment: ' || COALESCE(sup.name, 'Vendor') as title,
            'Payment towards supplier balance' as description,
            sp.amount as amount,
            COALESCE(sp.payment_method, 'Cash') as payment_method,
            COALESCE(sp.date, sp.created_at) as date,
            sp.store_id,
            st.name as store_name,
            'Supplier Repayment' as category,
            sp.user_id
          FROM public.supplier_payments sp
          LEFT JOIN public.suppliers sup ON sp.supplier_id = sup.id
          LEFT JOIN public.stores st ON sp.store_id = st.id
          WHERE sp.user_id = $1 AND sp.amount > 0

          UNION ALL

          -- 5. Cash Float Adjustments (Deposits = Inflow, Withdrawals = Outflow)
          SELECT 
            'adj-' || ca.id::text as id,
            ca.id as source_id,
            'CASH_ADJUSTMENT' as source,
            CASE WHEN ca.type = 'deposit' THEN 'inflow' ELSE 'outflow' END as direction,
            'Cash Float ' || initcap(ca.type) || ': ' || ca.reason as title,
            COALESCE(ca.notes, ca.reason) as description,
            ca.amount as amount,
            COALESCE(ca.payment_method, 'Cash') as payment_method,
            ca.created_at as date,
            ca.store_id,
            st.name as store_name,
            'Cash Float' as category,
            ca.user_id
          FROM public.cash_adjustments ca
          LEFT JOIN public.stores st ON ca.store_id = st.id
          WHERE (ca.user_id = $1 OR ($2::uuid IS NOT NULL AND ca.organization_id = $2::uuid))
            AND ca.amount > 0
        )
      `;

      // 3. Dynamic Filtering
      const whereConditions = [];
      const queryParams = [userId, orgId || null];

      if (storeId) {
        queryParams.push(storeId);
        whereConditions.push(`store_id = $${queryParams.length}`);
      }

      if (startDate) {
        queryParams.push(new Date(startDate).toISOString());
        whereConditions.push(`date >= $${queryParams.length}`);
      }

      if (endDate) {
        let end = new Date(endDate);
        if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
          end = new Date(`${endDate.trim()}T23:59:59.999Z`);
        }
        queryParams.push(end.toISOString());
        whereConditions.push(`date <= $${queryParams.length}`);
      }

      if (paymentMethod && paymentMethod !== 'all') {
        queryParams.push(`%${paymentMethod.trim()}%`);
        whereConditions.push(`payment_method ILIKE $${queryParams.length}`);
      }

      if (transactionType && transactionType !== 'all') {
        queryParams.push(transactionType.toUpperCase());
        whereConditions.push(`source = $${queryParams.length}`);
      }

      if (direction && direction !== 'all') {
        queryParams.push(direction.toLowerCase());
        whereConditions.push(`direction = $${queryParams.length}`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      // 4. Compute Summary Totals & Breakdowns
      const summaryQuery = `
        ${cteQuery}
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE 0 END), 0) as total_inflow,
          COALESCE(SUM(CASE WHEN direction = 'outflow' THEN amount ELSE 0 END), 0) as total_outflow,
          COALESCE(SUM(
            CASE 
              WHEN LOWER(payment_method) LIKE '%cash%' THEN (CASE WHEN direction = 'inflow' THEN amount ELSE -amount END)
              ELSE 0 
            END
          ), 0) as cash_drawer,
          COALESCE(SUM(
            CASE 
              WHEN LOWER(payment_method) LIKE '%upi%' THEN (CASE WHEN direction = 'inflow' THEN amount ELSE -amount END)
              ELSE 0 
            END
          ), 0) as upi_digital,
          COALESCE(SUM(
            CASE 
              WHEN LOWER(payment_method) LIKE '%bank%' OR LOWER(payment_method) LIKE '%card%' OR LOWER(payment_method) LIKE '%cheque%' OR LOWER(payment_method) LIKE '%rtgs%'
              THEN (CASE WHEN direction = 'inflow' THEN amount ELSE -amount END)
              ELSE 0 
            END
          ), 0) as bank_card
        FROM unified_movements
        ${whereClause}
      `;

      const summaryRes = await client.query(summaryQuery, queryParams);
      const summaryRow = summaryRes.rows[0] || {};

      const totalCount = Number(summaryRow.total_count || 0);
      const totalInflow = Number(summaryRow.total_inflow || 0);
      const totalOutflow = Number(summaryRow.total_outflow || 0);
      const netMovement = Math.round((totalInflow - totalOutflow) * 100) / 100;

      // 5. Fetch Paginated Chronological Stream
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
      const offset = (parsedPage - 1) * parsedLimit;

      const paginationParams = [...queryParams, parsedLimit, offset];
      const itemsQuery = `
        ${cteQuery}
        SELECT 
          id,
          source_id,
          source,
          direction,
          title,
          description,
          amount,
          payment_method,
          date,
          store_id,
          store_name,
          category
        FROM unified_movements
        ${whereClause}
        ORDER BY date DESC, id DESC
        LIMIT $${paginationParams.length - 1} OFFSET $${paginationParams.length}
      `;

      const itemsRes = await client.query(itemsQuery, paginationParams);
      const movements = itemsRes.rows.map(m => ({
        ...m,
        amount: Number(m.amount)
      }));

      const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

      return {
        movements,
        summary: {
          totalInflow: Math.round(totalInflow * 100) / 100,
          totalOutflow: Math.round(totalOutflow * 100) / 100,
          netMovement,
          accounts: {
            cashDrawer: Math.round(Number(summaryRow.cash_drawer || 0) * 100) / 100,
            upiDigital: Math.round(Number(summaryRow.upi_digital || 0) * 100) / 100,
            bankCard: Math.round(Number(summaryRow.bank_card || 0) * 100) / 100
          }
        },
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: totalCount,
          totalPages
        }
      };
    } finally {
      client.release();
    }
  },

  /**
   * Record a persistent manual cash drawer adjustment (deposit or withdrawal).
   */
  async addAdjustment(userId, payload, context = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const { type, amount, reason, notes, store_id, payment_method = "Cash" } = payload;

      // 1. Validation
      if (!type || !["deposit", "withdrawal"].includes(type.toLowerCase())) {
        const err = new Error("Invalid adjustment type: must be 'deposit' or 'withdrawal'.");
        err.statusCode = 400;
        throw err;
      }
      const adjType = type.toLowerCase();

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0 || !isFinite(numAmount)) {
        const err = new Error("Invalid adjustment amount: must be greater than zero.");
        err.statusCode = 400;
        throw err;
      }
      const adjAmount = Math.round(numAmount * 100) / 100;

      if (!reason || typeof reason !== "string" || !reason.trim()) {
        const err = new Error("Adjustment reason is required.");
        err.statusCode = 400;
        throw err;
      }

      // 2. Resolve Organization
      let orgId = context.orgId || null;
      if (!orgId) {
        const userRes = await client.query(`SELECT organization_id FROM public.users WHERE id = $1`, [userId]);
        orgId = userRes.rows[0]?.organization_id || null;
      }

      // 3. Resolve Store
      let storeId = store_id || null;
      if (storeId) {
        const storeCheck = await client.query(
          `SELECT id, user_id FROM public.stores WHERE id = $1`,
          [storeId]
        );
        if (storeCheck.rows.length === 0) {
          const err = new Error("Store not found or unauthorized.");
          err.statusCode = 403;
          throw err;
        }

        const storeOwner = storeCheck.rows[0].user_id;
        if (storeOwner !== userId) {
          let sameOrg = false;
          if (orgId) {
            const orgCheck = await client.query(`SELECT organization_id FROM public.users WHERE id = $1`, [storeOwner]);
            sameOrg = orgCheck.rows[0]?.organization_id === orgId;
          }
          if (!sameOrg) {
            const err = new Error("Unauthorized store: store does not belong to your business.");
            err.statusCode = 403;
            throw err;
          }
        }
      } else {
        const defaultStoreRes = await client.query(
          `SELECT id FROM public.stores WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
          [userId]
        );
        storeId = defaultStoreRes.rows[0]?.id || null;
      }

      await client.query("BEGIN");

      // 4. Insert Cash Adjustment
      const insertQuery = `
        INSERT INTO public.cash_adjustments (
          organization_id, store_id, user_id, type, amount, reason, notes, payment_method, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, now()
        )
        RETURNING *
      `;

      const insertRes = await client.query(insertQuery, [
        orgId,
        storeId,
        userId,
        adjType,
        adjAmount,
        reason.trim(),
        notes ? String(notes).trim() : null,
        payment_method || "Cash"
      ]);

      const adjustment = insertRes.rows[0];

      // 5. Audit Log
      await client.query(`
        INSERT INTO public.audit_logs (
          user_id, store_id, table_name, record_id, entity_type, entity_id, action, new_values, created_at
        ) VALUES (
          $1, $2, 'cash_adjustments', $3, 'cash_adjustment', $3, 'CASH_ADJUSTMENT_CREATED', $4, now()
        )
      `, [userId, storeId, adjustment.id, JSON.stringify(adjustment)]);

      await client.query("COMMIT");

      // 6. Cache Invalidation
      try {
        await FinancialCacheService.invalidate(orgId, userId);
      } catch (cErr) {
        console.warn("[CashbookService] Cache invalidation warning:", cErr.message);
      }

      return {
        ...adjustment,
        amount: Number(adjustment.amount)
      };
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }
};

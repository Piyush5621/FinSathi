import { getPostgresPool } from "../config/postgres.js";

/**
 * ExpenseRepository — Database access layer for operating expenses.
 * Handles direct PostgreSQL pool queries, transaction propagation,
 * multi-tenant organization scoping, store-filtering, and pagination.
 */
export const ExpenseRepository = {
  /**
   * Find all expenses with optional filtering and pagination.
   * If options are omitted or empty, returns an array directly (maintains backward compatibility with DashboardService, AnalyticsService, etc.).
   */
  async findAll(userId, options = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const {
        orgId,
        storeId,
        category,
        paymentMethod,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 50,
        paginate = false
      } = options;

      const conditions = [];
      const values = [];

      // 1. Tenant & User Scoping
      if (orgId) {
        values.push(orgId);
        values.push(userId);
        conditions.push(`(e.organization_id = $${values.length - 1} OR e.user_id = $${values.length})`);
      } else {
        values.push(userId);
        conditions.push(`e.user_id = $${values.length}`);
      }

      // 2. Store filter
      if (storeId) {
        values.push(storeId);
        conditions.push(`e.store_id = $${values.length}`);
      }

      // 3. Category filter
      if (category && category !== 'all') {
        values.push(category);
        conditions.push(`e.category ILIKE $${values.length}`);
      }

      // 4. Payment method filter
      if (paymentMethod && paymentMethod !== 'all') {
        values.push(paymentMethod);
        conditions.push(`e.payment_method ILIKE $${values.length}`);
      }

      // 5. Date range
      if (startDate) {
        values.push(new Date(startDate).toISOString());
        conditions.push(`e.date >= $${values.length}`);
      }
      if (endDate) {
        let end = new Date(endDate);
        if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
          end = new Date(`${endDate.trim()}T23:59:59.999Z`);
        }
        values.push(end.toISOString());
        conditions.push(`e.date <= $${values.length}`);
      }

      // 6. Search query (description, category, supplier name)
      if (search && search.trim()) {
        values.push(`%${search.trim().toLowerCase()}%`);
        conditions.push(`(
          LOWER(COALESCE(e.description, '')) LIKE $${values.length} OR
          LOWER(e.category) LIKE $${values.length} OR
          LOWER(COALESCE(s.name, '')) LIKE $${values.length} OR
          LOWER(COALESCE(e.payment_method, '')) LIKE $${values.length}
        )`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Count query if pagination is enabled
      let total = 0;
      if (paginate) {
        const countQuery = `
          SELECT COUNT(*) as total
          FROM public.expenses e
          LEFT JOIN public.suppliers s ON e.supplier_id = s.id
          ${whereClause}
        `;
        const countRes = await client.query(countQuery, values);
        total = Number(countRes.rows[0]?.total || 0);
      }

      // Base query
      let query = `
        SELECT 
          e.id,
          e.user_id,
          e.organization_id,
          e.store_id,
          e.supplier_id,
          e.amount,
          e.category,
          e.payment_method,
          e.date,
          e.description,
          e.created_at,
          e.is_system_generated,
          e.purchase_order_id,
          e.idempotency_key,
          json_build_object('name', s.name, 'phone', s.phone) as suppliers,
          json_build_object('name', st.name) as stores
        FROM public.expenses e
        LEFT JOIN public.suppliers s ON e.supplier_id = s.id
        LEFT JOIN public.stores st ON e.store_id = st.id
        ${whereClause}
        ORDER BY e.date DESC, e.created_at DESC
      `;

      if (paginate) {
        const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
        values.push(Number(limit));
        values.push(offset);
        query += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
      }

      const res = await client.query(query, values);
      const items = res.rows.map(r => ({
        ...r,
        amount: Number(r.amount)
      }));

      if (paginate) {
        const totalPages = Math.ceil(total / Number(limit)) || 1;
        return {
          items,
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages
        };
      }

      return items;
    } finally {
      client.release();
    }
  },

  /**
   * Find a single expense by ID, enforcing tenant ownership.
   */
  async findById(id, context = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const { userId, orgId } = context;
      const values = [id];
      let tenantClause = "";

      if (orgId && userId) {
        values.push(orgId);
        values.push(userId);
        tenantClause = "AND (e.organization_id = $2 OR e.user_id = $3)";
      } else if (userId) {
        values.push(userId);
        tenantClause = "AND e.user_id = $2";
      }

      const query = `
        SELECT 
          e.*,
          json_build_object('name', s.name, 'phone', s.phone) as suppliers,
          json_build_object('name', st.name) as stores
        FROM public.expenses e
        LEFT JOIN public.suppliers s ON e.supplier_id = s.id
        LEFT JOIN public.stores st ON e.store_id = st.id
        WHERE e.id = $1 ${tenantClause}
        LIMIT 1
      `;

      const res = await client.query(query, values);
      if (res.rows.length === 0) return null;
      return {
        ...res.rows[0],
        amount: Number(res.rows[0].amount)
      };
    } finally {
      client.release();
    }
  },

  /**
   * Check for duplicate expense via idempotency key.
   */
  async findByIdempotencyKey(userId, idempotencyKey, client = null) {
    if (!idempotencyKey) return null;
    const db = client || getPostgresPool();
    const res = await db.query(
      `SELECT * FROM public.expenses WHERE user_id = $1 AND idempotency_key = $2 LIMIT 1`,
      [userId, idempotencyKey]
    );
    return res.rows[0] || null;
  },

  /**
   * Create a new expense record in PostgreSQL.
   */
  async create(expenseData, client = null) {
    const shouldRelease = !client;
    const db = client || await getPostgresPool().connect();

    try {
      const {
        user_id,
        organization_id = null,
        store_id = null,
        supplier_id = null,
        amount,
        category,
        payment_method = 'Cash',
        date = new Date().toISOString(),
        description = null,
        idempotency_key = null,
        is_system_generated = false,
        purchase_order_id = null
      } = expenseData;

      const query = `
        INSERT INTO public.expenses (
          user_id, organization_id, store_id, supplier_id,
          amount, category, payment_method, date,
          description, idempotency_key, is_system_generated, purchase_order_id,
          created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          now()
        )
        RETURNING *
      `;

      const values = [
        user_id,
        organization_id,
        store_id,
        supplier_id,
        amount,
        category,
        payment_method,
        date,
        description,
        idempotency_key,
        is_system_generated,
        purchase_order_id
      ];

      const res = await db.query(query, values);
      return {
        ...res.rows[0],
        amount: Number(res.rows[0].amount)
      };
    } finally {
      if (shouldRelease) db.release();
    }
  },

  /**
   * Update an existing expense using strict whitelist fields.
   */
  async update(id, updateData, context = {}, client = null) {
    const shouldRelease = !client;
    const db = client || await getPostgresPool().connect();

    try {
      const { userId, orgId } = context;
      const setClauses = [];
      const values = [id];

      // Whitelist fields only
      const allowedFields = [
        'amount',
        'category',
        'payment_method',
        'description',
        'date',
        'supplier_id',
        'store_id'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          values.push(updateData[field]);
          setClauses.push(`${field} = $${values.length}`);
        }
      }

      if (setClauses.length === 0) {
        throw new Error("No valid fields provided for update.");
      }

      let tenantClause = "";
      if (orgId && userId) {
        values.push(orgId);
        values.push(userId);
        tenantClause = `AND (organization_id = $${values.length - 1} OR user_id = $${values.length})`;
      } else if (userId) {
        values.push(userId);
        tenantClause = `AND user_id = $${values.length}`;
      }

      const query = `
        UPDATE public.expenses 
        SET ${setClauses.join(", ")}
        WHERE id = $1 ${tenantClause}
        RETURNING *
      `;

      const res = await db.query(query, values);
      if (res.rows.length === 0) return null;
      return {
        ...res.rows[0],
        amount: Number(res.rows[0].amount)
      };
    } finally {
      if (shouldRelease) db.release();
    }
  },

  /**
   * Delete an expense record.
   */
  async delete(id, context = {}, client = null) {
    const shouldRelease = !client;
    const db = client || await getPostgresPool().connect();

    try {
      const { userId, orgId } = context;
      const values = [id];
      let tenantClause = "";

      if (orgId && userId) {
        values.push(orgId);
        values.push(userId);
        tenantClause = `AND (organization_id = $2 OR user_id = $3)`;
      } else if (userId) {
        values.push(userId);
        tenantClause = `AND user_id = $2`;
      }

      const query = `
        DELETE FROM public.expenses 
        WHERE id = $1 ${tenantClause}
        RETURNING *
      `;

      const res = await db.query(query, values);
      if (res.rows.length === 0) return null;
      return res.rows[0];
    } finally {
      if (shouldRelease) db.release();
    }
  }
};

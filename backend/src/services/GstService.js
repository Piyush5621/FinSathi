import { getPostgresPool } from '../config/postgres.js';
import * as XLSX from 'xlsx';

// Standard 2-digit state code mappings for Indian GST
export const STATE_CODE_MAP = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};

/**
 * GstService — Authoritative Engine for GST Compliance & Tax Calculation.
 * 
 * Capabilities:
 * 1. Place of Supply & Inter-State vs Intra-State Determination.
 * 2. Canonical Line-item and Invoice-level Tax Computation (CGST + SGST vs IGST).
 * 3. GSTR-1 Outward Supplies Generation (B2B, B2C, Rate-wise, Credit/Debit Notes, Document Summary).
 * 4. GSTR-3B Monthly Tax Liability & Input Tax Credit (ITC) Summary.
 * 5. Multi-format Spreadsheet Exports (.xlsx and CSV).
 * 6. Multi-Tenant Business & Store Scoping with strict isolation.
 */
export const GstService = {
  /**
   * Resolves state name from a 15-character Indian GSTIN
   */
  /**
   * Normalizes state name or 2-digit state code or GSTIN into canonical state name
   */
  normalizeState(stateOrGstinOrCode) {
    if (!stateOrGstinOrCode || typeof stateOrGstinOrCode !== 'string') return null;
    const s = stateOrGstinOrCode.trim();
    if (/^\d{2}$/.test(s)) {
      return STATE_CODE_MAP[s] || s;
    }
    if (s.length >= 15) {
      const code = s.slice(0, 2);
      if (STATE_CODE_MAP[code]) return STATE_CODE_MAP[code];
    }
    const lower = s.toLowerCase();
    for (const [code, name] of Object.entries(STATE_CODE_MAP)) {
      if (name.toLowerCase() === lower) return name;
    }
    return s;
  },

  /**
   * Resolves state name from a 15-character Indian GSTIN
   */
  resolveStateFromGstin(gstin) {
    if (!gstin || typeof gstin !== 'string') return null;
    return this.normalizeState(gstin);
  },

  /**
   * Resolves merchant context (state, GSTIN, business name, organization ID)
   */
  async getMerchantContext(userId, orgId, storeId = null) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      let merchantState = "Delhi";
      let merchantGstin = "";
      let businessName = "Karobar Merchant";
      let resolvedOrgId = orgId || null;

      // 1. Check Store first if specified
      if (storeId) {
        const storeRes = await client.query(
          `SELECT id, name, gstin, address, state FROM public.stores WHERE id = $1`,
          [storeId]
        );
        if (storeRes.rows.length > 0) {
          const s = storeRes.rows[0];
          if (s.gstin) {
            merchantGstin = s.gstin.trim().toUpperCase();
            const fromGstin = this.resolveStateFromGstin(merchantGstin);
            if (fromGstin) merchantState = fromGstin;
          }
          if (s.state) merchantState = this.normalizeState(s.state) || s.state.trim();
        }
      }

      // 2. Check Organization
      if (resolvedOrgId) {
        const orgRes = await client.query(
          `SELECT id, name, state, gstin FROM public.organizations WHERE id = $1`,
          [resolvedOrgId]
        );
        if (orgRes.rows.length > 0) {
          const org = orgRes.rows[0];
          businessName = org.name || businessName;
          if (!merchantGstin && org.gstin) {
            merchantGstin = org.gstin.trim().toUpperCase();
          }
          if (org.state && (!merchantState || merchantState === "Delhi")) {
            merchantState = this.normalizeState(org.state) || org.state.trim();
          }
          if (merchantGstin) {
            const fromGstin = this.resolveStateFromGstin(merchantGstin);
            if (fromGstin) merchantState = fromGstin;
          }
        }
      }

      // 3. Fallback to User Profile
      if (!merchantGstin || !resolvedOrgId) {
        const userRes = await client.query(
          `SELECT organization_id, business_name, state, gstin FROM public.users WHERE id = $1`,
          [userId]
        );
        if (userRes.rows.length > 0) {
          const u = userRes.rows[0];
          if (!resolvedOrgId) resolvedOrgId = u.organization_id || null;
          if (u.business_name) businessName = u.business_name;
          if (!merchantGstin && u.gstin) merchantGstin = u.gstin.trim().toUpperCase();
          if (u.state && (!merchantState || merchantState === "Delhi")) {
            merchantState = this.normalizeState(u.state) || u.state.trim();
          }
          if (merchantGstin) {
            const fromGstin = this.resolveStateFromGstin(merchantGstin);
            if (fromGstin) merchantState = fromGstin;
          }
        }
      }

      return {
        organizationId: resolvedOrgId,
        merchantState,
        merchantGstin,
        businessName
      };
    } finally {
      client.release();
    }
  },

  /**
   * Authoritative canonical tax calculation for cart/sale items.
   * Computes taxable subtotal, line tax, CGST/SGST vs IGST, and invoice totals.
   */
  calculateGst({
    items = [],
    customerState = null,
    customerGstin = null,
    merchantState = "Delhi",
    discountAmount = 0,
    discountPercent = 0
  }) {
    // 1. Resolve Customer State & Place of Supply
    let resolvedCustomerState = null;
    if (customerGstin) {
      resolvedCustomerState = this.normalizeState(customerGstin);
    } else if (customerState) {
      resolvedCustomerState = this.normalizeState(customerState);
    }

    const resolvedMerchantState = this.normalizeState(merchantState) || "Delhi";

    if (!resolvedCustomerState) {
      // Intra-state default if customer state not specified (Retail B2C walk-in)
      resolvedCustomerState = resolvedMerchantState;
    }

    // 2. Check Inter-State vs Intra-State supply
    const normMerchantState = (resolvedMerchantState || "").toLowerCase().trim();
    const normCustomerState = (resolvedCustomerState || "").toLowerCase().trim();
    const isInterState = normMerchantState !== "" && normCustomerState !== "" && normMerchantState !== normCustomerState;

    // 3. Line-Item Calculations
    let rawSubtotal = 0;
    const computedItems = items.map(item => {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      const lineTotal = Math.round(price * qty * 100) / 100;
      const rate = Number(item.gst_percent !== undefined ? item.gst_percent : (item.tax_percent || 0));

      rawSubtotal += lineTotal;
      return {
        ...item,
        price,
        quantity: qty,
        lineTotal,
        gst_percent: rate
      };
    });

    // 4. Order-Level Discount Allocation
    let effectiveDiscount = 0;
    if (discountPercent > 0) {
      effectiveDiscount = Math.round((rawSubtotal * (Number(discountPercent) / 100)) * 100) / 100;
    } else if (discountAmount > 0) {
      effectiveDiscount = Math.min(rawSubtotal, Math.round(Number(discountAmount) * 100) / 100);
    }

    const discountFactor = rawSubtotal > 0 ? (rawSubtotal - effectiveDiscount) / rawSubtotal : 1;

    // 5. Compute Tax Breakdown per Line Item
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const lineDetails = computedItems.map(item => {
      const discountedLine = Math.round(item.lineTotal * discountFactor * 100) / 100;
      const itemTax = Math.round((discountedLine * (item.gst_percent / 100)) * 100) / 100;

      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (isInterState) {
        lineIgst = itemTax;
      } else {
        lineCgst = Math.round((itemTax / 2) * 100) / 100;
        lineSgst = Math.round((itemTax - lineCgst) * 100) / 100;
      }

      totalTaxable += discountedLine;
      totalCgst += lineCgst;
      totalSgst += lineSgst;
      totalIgst += lineIgst;

      return {
        ...item,
        taxable_amount: discountedLine,
        tax_amount: itemTax,
        cgst_amount: lineCgst,
        sgst_amount: lineSgst,
        igst_amount: lineIgst
      };
    });

    totalTaxable = Math.round(totalTaxable * 100) / 100;
    totalCgst = Math.round(totalCgst * 100) / 100;
    totalSgst = Math.round(totalSgst * 100) / 100;
    totalIgst = Math.round(totalIgst * 100) / 100;
    const totalTax = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
    const grandTotal = Math.round((totalTaxable + totalTax) * 100) / 100;

    const effectiveRate = totalTaxable > 0 ? Math.round((totalTax / totalTaxable) * 100) : 0;

    return {
      subtotal: rawSubtotal,
      discountAmount: effectiveDiscount,
      taxableAmount: totalTaxable,
      totalTax,
      cgstAmount: totalCgst,
      sgstAmount: totalSgst,
      igstAmount: totalIgst,
      grandTotal,
      isInterState,
      placeOfSupply: resolvedCustomerState,
      customerGstin: customerGstin ? customerGstin.trim().toUpperCase() : null,
      effectiveRate,
      lineDetails
    };
  },

  /**
   * Generates comprehensive GSTR-1 outward supplies report.
   * Categorizes into B2B & B2C, computes CGST/SGST vs IGST, handles returns/credit notes,
   * and builds rate-wise summaries directly from PostgreSQL.
   */
  async getGstr1Report(userId, fromDate, toDate, options = {}) {
    if (!fromDate || !toDate) {
      const err = new Error("Valid date range ('fromDate' and 'toDate') is required.");
      err.statusCode = 400;
      throw err;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      const err = new Error("'fromDate' cannot be after 'toDate'.");
      err.statusCode = 400;
      throw err;
    }

    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const { orgId, storeId } = options;
      const merchant = await this.getMerchantContext(userId, orgId, storeId);

      // Inclusive date boundaries
      const startIso = new Date(fromDate).toISOString().split('T')[0];
      const endIso = typeof toDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toDate.trim())
        ? `${toDate.trim()}T23:59:59.999Z`
        : new Date(toDate).toISOString();

      const conditions = [];
      const values = [];

      // Multi-tenant organization / user scoping
      if (merchant.organizationId) {
        values.push(merchant.organizationId);
        values.push(userId);
        conditions.push(`(s.organization_id = $${values.length - 1} OR s.user_id = $${values.length})`);
      } else {
        values.push(userId);
        conditions.push(`s.user_id = $${values.length}`);
      }

      // Store scoping
      if (storeId) {
        values.push(storeId);
        conditions.push(`s.store_id = $${values.length}`);
      }

      // Date range filter
      values.push(startIso);
      conditions.push(`s.date >= $${values.length}`);

      values.push(endIso);
      conditions.push(`s.date <= $${values.length}`);

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const query = `
        SELECT 
          s.id,
          s.invoice_no,
          s.total,
          s.subtotal,
          s.tax_amount,
          s.discount_percent,
          s.taxable_amount,
          s.cgst_amount,
          s.sgst_amount,
          s.igst_amount,
          s.is_inter_state,
          s.customer_gstin,
          s.place_of_supply,
          s.gst_rate,
          s.date,
          s.created_at,
          s.payment_status,
          s.payment_method,
          s.returns,
          s.cancellation,
          s.items,
          s.user_id,
          s.store_id,
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.gstin as customer_db_gstin,
          c.city as customer_city,
          c.state as customer_state,
          st.name as store_name
        FROM public.sales s
        LEFT JOIN public.customers c ON s.customer_id = c.id
        LEFT JOIN public.stores st ON s.store_id = st.id
        ${whereClause}
        ORDER BY s.date ASC, s.created_at ASC
      `;

      const res = await client.query(query, values);
      const allSales = res.rows;

      const b2bInvoices = [];
      const b2cInvoices = [];
      const creditDebitNotes = [];
      const rateMap = {};

      let totalTaxableValue = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let totalInvoiceValue = 0;
      let cancelledCount = 0;
      let returnedCount = 0;

      for (const s of allSales) {
        // Track cancelled documents
        if (s.payment_status === 'cancelled') {
          cancelledCount += 1;
          continue; // Cancelled sales excluded from active outward taxable liability
        }

        const rawCustGstin = (s.customer_gstin || s.customer_db_gstin || '').trim().toUpperCase();
        const isB2B = Boolean(rawCustGstin && rawCustGstin.length >= 10);

        // Place of supply resolution
        let posState = s.place_of_supply || s.customer_state;
        if (rawCustGstin.length >= 2) {
          const fromGstin = this.resolveStateFromGstin(rawCustGstin);
          if (fromGstin) posState = fromGstin;
        }
        if (!posState) posState = merchant.merchantState;

        const isInterState = s.is_inter_state !== null && s.is_inter_state !== undefined
          ? Boolean(s.is_inter_state)
          : (posState.toLowerCase() !== merchant.merchantState.toLowerCase());

        const subtotal = Number(s.taxable_amount || s.subtotal || 0);
        let tax = Number(s.tax_amount || 0);
        const total = Number(s.total || (subtotal + tax));

        let cgst = Number(s.cgst_amount || 0);
        let sgst = Number(s.sgst_amount || 0);
        let igst = Number(s.igst_amount || 0);

        // If breakdown columns were 0 but tax_amount > 0, compute on the fly
        if (tax > 0 && cgst === 0 && sgst === 0 && igst === 0) {
          if (isInterState) {
            igst = tax;
          } else {
            cgst = Math.round((tax / 2) * 100) / 100;
            sgst = Math.round((tax - cgst) * 100) / 100;
          }
        }

        let rate = Number(s.gst_rate || 0);
        if (rate === 0 && subtotal > 0 && tax > 0) {
          rate = Math.round((tax / subtotal) * 100);
        }

        const invRow = {
          invoiceId: s.id,
          invoiceNo: s.invoice_no || `INV-${s.id}`,
          invoiceDate: new Date(s.date || s.created_at).toISOString().split('T')[0],
          customerName: s.customer_name || (isB2B ? 'B2B Client' : 'Walk-in Client'),
          customerPhone: s.customer_phone || '',
          customerGstin: rawCustGstin || 'N/A',
          placeOfSupply: posState,
          supplyType: isInterState ? 'INTER-STATE' : 'INTRA-STATE',
          reverseCharge: 'N',
          invoiceType: 'Regular',
          taxableValue: subtotal,
          gstRate: rate,
          cgst,
          sgst,
          igst,
          totalGst: tax,
          totalInvoiceValue: total,
          paymentStatus: s.payment_status || 'paid',
          paymentMethod: s.payment_method || 'Cash',
          storeName: s.store_name || 'Main Store'
        };

        totalTaxableValue += subtotal;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;
        totalInvoiceValue += total;

        if (isB2B) {
          b2bInvoices.push(invRow);
        } else {
          b2cInvoices.push(invRow);
        }

        // Rate-wise accumulation
        const rateKey = `${rate}%`;
        if (!rateMap[rateKey]) {
          rateMap[rateKey] = {
            rate,
            rateLabel: rateKey,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalGst: 0,
            totalValue: 0,
            invoiceCount: 0
          };
        }
        rateMap[rateKey].taxableValue += subtotal;
        rateMap[rateKey].cgst += cgst;
        rateMap[rateKey].sgst += sgst;
        rateMap[rateKey].igst += igst;
        rateMap[rateKey].totalGst += tax;
        rateMap[rateKey].totalValue += total;
        rateMap[rateKey].invoiceCount += 1;

        // Process Sales Returns (Credit Notes)
        if (Array.isArray(s.returns) && s.returns.length > 0) {
          returnedCount += s.returns.length;
          for (const ret of s.returns) {
            const refundAmt = Number(ret.total_refund_amount || 0);
            if (refundAmt > 0) {
              let returnTaxable = 0;
              let returnTax = 0;
              const retItems = Array.isArray(ret.items) ? ret.items : [];
              if (retItems.length > 0) {
                for (const it of retItems) {
                  const itQty = Number(it.quantity || 1);
                  const itPrice = Number(it.unitPrice || it.price || 0);
                  const itLine = Number(it.refundAmount || (itPrice * itQty));
                  const itRate = Number(it.gst_percent !== undefined ? it.gst_percent : rate);
                  const itTax = Math.round((itLine * (itRate / 100)) * 100) / 100;
                  returnTaxable += itLine;
                  returnTax += itTax;
                }
              } else {
                returnTaxable = refundAmt;
                returnTax = rate > 0 ? Math.round((refundAmt * (rate / 100)) * 100) / 100 : 0;
              }

              let retCgst = 0, retSgst = 0, retIgst = 0;
              if (isInterState) {
                retIgst = returnTax;
              } else {
                retCgst = Math.round((returnTax / 2) * 100) / 100;
                retSgst = Math.round((returnTax - retCgst) * 100) / 100;
              }

              creditDebitNotes.push({
                noteId: ret.return_id || `CDN-${s.invoice_no}`,
                creditNoteNo: ret.return_id || `CDN-${s.invoice_no}`,
                originalInvoiceNo: s.invoice_no,
                noteDate: ret.created_at ? ret.created_at.split('T')[0] : invRow.invoiceDate,
                customerName: invRow.customerName,
                customerGstin: invRow.customerGstin,
                noteType: 'C', // Credit Note
                placeOfSupply: posState,
                taxableValue: Math.round(returnTaxable * 100) / 100,
                gstRate: rate,
                cgst: retCgst,
                sgst: retSgst,
                igst: retIgst,
                totalGst: Math.round(returnTax * 100) / 100,
                taxAmount: Math.round(returnTax * 100) / 100,
                totalRefundAmount: refundAmt,
                reason: ret.reason || 'Customer Return'
              });
            }
          }
        }
      }

      const rateWiseSummary = Object.values(rateMap).sort((a, b) => a.rate - b.rate);
      const b2bTaxable = b2bInvoices.reduce((sum, i) => sum + (Number(i.taxableValue) || 0), 0);
      const b2bTax = b2bInvoices.reduce((sum, i) => sum + (Number(i.totalGst) || 0), 0);
      const b2cTaxable = b2cInvoices.reduce((sum, i) => sum + (Number(i.taxableValue) || 0), 0);
      const b2cTax = b2cInvoices.reduce((sum, i) => sum + (Number(i.totalGst) || 0), 0);

      const totalDocIssued = b2bInvoices.length + b2cInvoices.length + cancelledCount;
      const netDocActive = b2bInvoices.length + b2cInvoices.length;

      return {
        success: true,
        period: { from: fromDate, to: toDate },
        merchantInfo: {
          businessName: merchant.businessName,
          merchantGstin: merchant.merchantGstin || 'Unregistered',
          merchantState: merchant.merchantState,
          organizationId: merchant.organizationId
        },
        summary: {
          totalInvoices: netDocActive,
          b2bCount: b2bInvoices.length,
          b2cCount: b2cInvoices.length,
          cancelledCount,
          returnedCount,
          totalTaxable: Math.round(totalTaxableValue * 100) / 100,
          totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
          totalCgst: Math.round(totalCgst * 100) / 100,
          totalSgst: Math.round(totalSgst * 100) / 100,
          totalIgst: Math.round(totalIgst * 100) / 100,
          totalGst: Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100,
          totalInvoiceValue: Math.round(totalInvoiceValue * 100) / 100
        },
        b2bSummary: {
          count: b2bInvoices.length,
          totalTaxable: Math.round(b2bTaxable * 100) / 100,
          totalTax: Math.round(b2bTax * 100) / 100
        },
        b2cSummary: {
          count: b2cInvoices.length,
          totalTaxable: Math.round(b2cTaxable * 100) / 100,
          totalTax: Math.round(b2cTax * 100) / 100
        },
        b2bInvoices,
        b2cInvoices,
        invoices: [...b2bInvoices, ...b2cInvoices], // Backward compatibility
        creditDebitNotes,
        rateWiseSummary,
        docSummary: {
          totalIssued: totalDocIssued,
          totalCancelled: cancelledCount,
          netActiveCount: netDocActive,
          creditNotesCount: creditDebitNotes.length
        },
        documentSummary: {
          invoicesIssued: totalDocIssued,
          cancelledInvoices: cancelledCount,
          netInvoices: netDocActive,
          creditNotesIssued: creditDebitNotes.length
        }
      };
    } finally {
      client.release();
    }
  },

  /**
   * Generates GSTR-3B monthly/quarterly tax liability and Input Tax Credit (ITC) summary.
   */
  async getGstr3bReport(userId, fromDate, toDate, options = {}) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const { orgId, storeId } = options;
      // 1. Outward supplies from canonical GSTR-1 calculation
      const gstr1 = await this.getGstr1Report(userId, fromDate, toDate, options);
      const merchant = gstr1.merchantInfo;

      const startIso = new Date(fromDate).toISOString().split('T')[0];
      const endIso = typeof toDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toDate.trim())
        ? `${toDate.trim()}T23:59:59.999Z`
        : new Date(toDate).toISOString();

      // 2. Fetch Inward Supplies (Purchase Orders) for Input Tax Credit (ITC)
      const poConditions = [];
      const poValues = [];

      if (merchant.organizationId) {
        poValues.push(merchant.organizationId);
        poValues.push(userId);
        poConditions.push(`(po.organization_id = $${poValues.length - 1} OR po.user_id = $${poValues.length})`);
      } else {
        poValues.push(userId);
        poConditions.push(`po.user_id = $${poValues.length}`);
      }

      if (storeId) {
        poValues.push(storeId);
        poConditions.push(`po.store_id = $${poValues.length}`);
      }

      poValues.push(startIso);
      poConditions.push(`po.date >= $${poValues.length}`);

      poValues.push(endIso);
      poConditions.push(`po.date <= $${poValues.length}`);

      poConditions.push(`po.status IN ('received', 'completed')`);

      const poWhere = poConditions.length > 0 ? `WHERE ${poConditions.join(" AND ")}` : "";

      const poQuery = `
        SELECT 
          po.id,
          po.order_no,
          po.total_amount,
          po.subtotal,
          po.tax_amount,
          po.status,
          po.date,
          po.created_at,
          s.gstin as supplier_gstin,
          s.state as supplier_state
        FROM public.purchase_orders po
        LEFT JOIN public.suppliers s ON po.supplier_id = s.id
        ${poWhere}
      `;

      const poRes = await client.query(poQuery, poValues);
      const purchases = poRes.rows;

      let itcTaxableValue = 0;
      let itcCgst = 0;
      let itcSgst = 0;
      let itcIgst = 0;

      for (const po of purchases) {
        const taxable = Number(po.subtotal || 0);
        const tax = Number(po.tax_amount || Math.max(0, Number(po.total_amount || 0) - taxable));

        const suppGstin = (po.supplier_gstin || '').trim().toUpperCase();
        let suppState = po.supplier_state;
        if (suppGstin.length >= 2) {
          const fromGstin = this.resolveStateFromGstin(suppGstin);
          if (fromGstin) suppState = fromGstin;
        }

        const isInterState = suppState && merchant.merchantState && 
          suppState.toLowerCase() !== merchant.merchantState.toLowerCase();

        itcTaxableValue += taxable;
        if (isInterState) {
          itcIgst += tax;
        } else {
          const half = Math.round((tax / 2) * 100) / 100;
          itcCgst += half;
          itcSgst += (tax - half);
        }
      }

      itcTaxableValue = Math.round(itcTaxableValue * 100) / 100;
      itcCgst = Math.round(itcCgst * 100) / 100;
      itcSgst = Math.round(itcSgst * 100) / 100;
      itcIgst = Math.round(itcIgst * 100) / 100;

      // 3. Compute Net Tax Payable
      const outwardCgst = gstr1.summary.totalCgst;
      const outwardSgst = gstr1.summary.totalSgst;
      const outwardIgst = gstr1.summary.totalIgst;

      const netCgst = Math.max(0, Math.round((outwardCgst - itcCgst) * 100) / 100);
      const netSgst = Math.max(0, Math.round((outwardSgst - itcSgst) * 100) / 100);
      const netIgst = Math.max(0, Math.round((outwardIgst - itcIgst) * 100) / 100);
      const totalNetPayable = Math.round((netCgst + netSgst + netIgst) * 100) / 100;

      return {
        success: true,
        period: { from: fromDate, to: toDate },
        merchantInfo: merchant,
        table31OutwardSupplies: {
          description: "3.1 (a) Outward Taxable Supplies (other than zero rated, nil rated and exempted)",
          totalTaxableValue: gstr1.summary.totalTaxableValue,
          integratedTax: outwardIgst,
          centralTax: outwardCgst,
          stateUtTax: outwardSgst,
          cess: 0.00,
          totalTaxLiability: gstr1.summary.totalGst
        },
        table3_1: {
          outwardTaxableSupplies: {
            taxableAmount: gstr1.summary.totalTaxableValue,
            cgstAmount: outwardCgst,
            sgstAmount: outwardSgst,
            igstAmount: outwardIgst,
            totalTax: gstr1.summary.totalGst
          }
        },
        table4EligibleItc: {
          description: "4 (A)(5) All other ITC (Purchases from registered suppliers)",
          totalPurchaseTaxableValue: itcTaxableValue,
          integratedTax: itcIgst,
          centralTax: itcCgst,
          stateUtTax: itcSgst,
          totalItcAvailable: Math.round((itcCgst + itcSgst + itcIgst) * 100) / 100,
          purchaseCount: purchases.length
        },
        table4_itc: {
          totalEligibleItc: Math.round((itcCgst + itcSgst + itcIgst) * 100) / 100,
          cgstItc: itcCgst,
          sgstItc: itcSgst,
          igstItc: itcIgst,
          purchaseCount: purchases.length
        },
        table5NetTaxPayable: {
          description: "5. Net GST Tax Payable after ITC Set-off",
          netIntegratedTax: netIgst,
          netCentralTax: netCgst,
          netStateUtTax: netSgst,
          totalNetPayable
        },
        table5_payment: {
          netGstPayable: totalNetPayable,
          cgstPayable: netCgst,
          sgstPayable: netSgst,
          igstPayable: netIgst
        }
      };
    } finally {
      client.release();
    }
  },

  /**
   * Builds downloadable GSTR-1 Excel buffer (.xlsx) with multiple sheets
   */
  exportGstr1Excel(reportData) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary Info
    const summaryRows = [
      { Metric: "Business Name", Value: reportData.merchantInfo?.businessName || "Karobar Merchant" },
      { Metric: "Merchant GSTIN", Value: reportData.merchantInfo?.merchantGstin || "Unregistered" },
      { Metric: "State / Place of Business", Value: reportData.merchantInfo?.merchantState || "Delhi" },
      { Metric: "Financial Period", Value: `${reportData.period?.from} to ${reportData.period?.to}` },
      { Metric: "", Value: "" },
      { Metric: "Total Invoices", Value: reportData.summary?.totalInvoices || 0 },
      { Metric: "B2B Invoices (with GSTIN)", Value: reportData.summary?.b2bCount || 0 },
      { Metric: "B2C Invoices (Retail)", Value: reportData.summary?.b2cCount || 0 },
      { Metric: "Total Taxable Value (₹)", Value: reportData.summary?.totalTaxableValue || 0 },
      { Metric: "Total CGST (₹)", Value: reportData.summary?.totalCgst || 0 },
      { Metric: "Total SGST (₹)", Value: reportData.summary?.totalSgst || 0 },
      { Metric: "Total IGST (₹)", Value: reportData.summary?.totalIgst || 0 },
      { Metric: "Total GST Collected (₹)", Value: reportData.summary?.totalGst || 0 },
      { Metric: "Total Invoice Value (₹)", Value: reportData.summary?.totalInvoiceValue || 0 }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2: B2B Invoices
    const b2bRows = (reportData.b2bInvoices || []).map(inv => ({
      "Invoice No": inv.invoiceNo,
      "Invoice Date": inv.invoiceDate,
      "Customer Name": inv.customerName,
      "Customer GSTIN": inv.customerGstin,
      "Place of Supply": inv.placeOfSupply,
      "Supply Type": inv.supplyType,
      "Reverse Charge": inv.reverseCharge,
      "Taxable Value (₹)": inv.taxableValue,
      "GST Rate (%)": `${inv.gstRate}%`,
      "CGST (₹)": inv.cgst,
      "SGST (₹)": inv.sgst,
      "IGST (₹)": inv.igst,
      "Total GST (₹)": inv.totalGst,
      "Total Invoice Value (₹)": inv.totalInvoiceValue
    }));
    const wsB2B = XLSX.utils.json_to_sheet(b2bRows.length > 0 ? b2bRows : [{ Message: "No B2B Invoices in this period" }]);
    XLSX.utils.book_append_sheet(wb, wsB2B, "B2B Invoices");

    // Sheet 3: B2C Invoices
    const b2cRows = (reportData.b2cInvoices || []).map(inv => ({
      "Invoice No": inv.invoiceNo,
      "Invoice Date": inv.invoiceDate,
      "Customer Name": inv.customerName,
      "Place of Supply": inv.placeOfSupply,
      "Supply Type": inv.supplyType,
      "Taxable Value (₹)": inv.taxableValue,
      "GST Rate (%)": `${inv.gstRate}%`,
      "CGST (₹)": inv.cgst,
      "SGST (₹)": inv.sgst,
      "IGST (₹)": inv.igst,
      "Total GST (₹)": inv.totalGst,
      "Total Invoice Value (₹)": inv.totalInvoiceValue
    }));
    const wsB2C = XLSX.utils.json_to_sheet(b2cRows.length > 0 ? b2cRows : [{ Message: "No B2C Invoices in this period" }]);
    XLSX.utils.book_append_sheet(wb, wsB2C, "B2C Invoices");

    // Sheet 4: Rate Wise Summary
    const rateRows = (reportData.rateWiseSummary || []).map(r => ({
      "GST Rate": r.rateLabel,
      "Taxable Value (₹)": r.taxableValue,
      "CGST (₹)": r.cgst,
      "SGST (₹)": r.sgst,
      "IGST (₹)": r.igst,
      "Total Tax (₹)": r.totalGst,
      "Total Value (₹)": r.totalValue,
      "Invoice Count": r.invoiceCount
    }));
    const wsRate = XLSX.utils.json_to_sheet(rateRows.length > 0 ? rateRows : [{ Message: "No Rate Data" }]);
    XLSX.utils.book_append_sheet(wb, wsRate, "Rate Summary");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  },

  /**
   * Builds downloadable GSTR-1 CSV buffer
   */
  exportGstr1Csv(reportData) {
    const allRows = [
      ...(reportData.b2bInvoices || []),
      ...(reportData.b2cInvoices || [])
    ];
    if (allRows.length === 0) {
      return Buffer.from("Invoice No,Invoice Date,Customer Name,Customer GSTIN,Place of Supply,Supply Type,Taxable Value,GST Rate,CGST,SGST,IGST,Total GST,Total Invoice Value\n");
    }
    const headers = ["Invoice No", "Invoice Date", "Customer Name", "Customer GSTIN", "Place of Supply", "Supply Type", "Taxable Value", "GST Rate", "CGST", "SGST", "IGST", "Total GST", "Total Invoice Value"];
    const lines = [headers.join(",")];
    for (const r of allRows) {
      lines.push([
        `"${r.invoiceNo}"`,
        `"${r.invoiceDate}"`,
        `"${(r.customerName || '').replace(/"/g, '""')}"`,
        `"${r.customerGstin}"`,
        `"${r.placeOfSupply}"`,
        `"${r.supplyType}"`,
        r.taxableValue,
        `"${r.gstRate}%"`,
        r.cgst,
        r.sgst,
        r.igst,
        r.totalGst,
        r.totalInvoiceValue
      ].join(","));
    }
    return lines.join("\n");
  },

  /**
   * Builds downloadable GSTR-3B Excel buffer (.xlsx)
   */
  exportGstr3bExcel(gstr3bData) {
    const wb = XLSX.utils.book_new();

    const t31 = gstr3bData.table31OutwardSupplies || {};
    const t4 = gstr3bData.table4EligibleItc || {};
    const t5 = gstr3bData.table5NetTaxPayable || {};

    const rows = [
      { Section: "1. Business Details", Details: "", "Taxable Value (₹)": "", "IGST (₹)": "", "CGST (₹)": "", "SGST (₹)": "", "Total (₹)": "" },
      { Section: "Business Name", Details: gstr3bData.merchantInfo?.businessName || "Merchant", "Taxable Value (₹)": "", "IGST (₹)": "", "CGST (₹)": "", "SGST (₹)": "", "Total (₹)": "" },
      { Section: "GSTIN", Details: gstr3bData.merchantInfo?.merchantGstin || "Unregistered", "Taxable Value (₹)": "", "IGST (₹)": "", "CGST (₹)": "", "SGST (₹)": "", "Total (₹)": "" },
      { Section: "Tax Period", Details: `${gstr3bData.period?.from} to ${gstr3bData.period?.to}`, "Taxable Value (₹)": "", "IGST (₹)": "", "CGST (₹)": "", "SGST (₹)": "", "Total (₹)": "" },
      { Section: "", Details: "", "Taxable Value (₹)": "", "IGST (₹)": "", "CGST (₹)": "", "SGST (₹)": "", "Total (₹)": "" },
      {
        Section: "Table 3.1 Outward Taxable Supplies",
        Details: "Sales / Outward Liability",
        "Taxable Value (₹)": t31.totalTaxableValue || 0,
        "IGST (₹)": t31.integratedTax || 0,
        "CGST (₹)": t31.centralTax || 0,
        "SGST (₹)": t31.stateUtTax || 0,
        "Total (₹)": t31.totalTaxLiability || 0
      },
      {
        Section: "Table 4. Eligible Input Tax Credit (ITC)",
        Details: "Purchases / Inward ITC",
        "Taxable Value (₹)": t4.totalPurchaseTaxableValue || 0,
        "IGST (₹)": t4.integratedTax || 0,
        "CGST (₹)": t4.centralTax || 0,
        "SGST (₹)": t4.stateUtTax || 0,
        "Total (₹)": t4.totalItcAvailable || 0
      },
      { Section: "", Details: "", "Taxable Value (₹)": "", "IGST (₹)": "", "CGST (₹)": "", "SGST (₹)": "", "Total (₹)": "" },
      {
        Section: "Table 5. Net GST Payable",
        Details: "Outward Liability - Eligible ITC",
        "Taxable Value (₹)": "-",
        "IGST (₹)": t5.netIntegratedTax || 0,
        "CGST (₹)": t5.netCentralTax || 0,
        "SGST (₹)": t5.netStateUtTax || 0,
        "Total (₹)": t5.totalNetPayable || 0
      }
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "GSTR-3B Summary");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }
};

import { supabase } from '../config/db.js';
import * as XLSX from 'xlsx';

// State code mappings for Indian GST
const STATE_CODE_MAP = {
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
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "36": "Telangana",
  "37": "Andhra Pradesh"
};

export const GstService = {
  /**
   * Resolves merchant context (state, GSTIN, business name, organization ID)
   */
  async getMerchantContext(userId, orgId) {
    let merchantState = "Delhi";
    let merchantGstin = "";
    let businessName = "Karobar Merchant";
    let resolvedOrgId = orgId || userId;

    try {
      const { data: user } = await supabase
        .from('users')
        .select('organization_id, business_name, state, gstin, full_name')
        .eq('id', userId)
        .maybeSingle();

      if (user) {
        resolvedOrgId = user.organization_id || resolvedOrgId;
        businessName = user.business_name || user.full_name || businessName;
        merchantState = user.state || merchantState;
        merchantGstin = user.gstin || "";
      }

      if (resolvedOrgId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name, state, gstin, business_type')
          .eq('id', resolvedOrgId)
          .maybeSingle();

        if (org) {
          businessName = org.name || businessName;
          merchantState = org.state || merchantState;
          merchantGstin = org.gstin || merchantGstin;
        }
      }
    } catch (err) {
      console.warn("[GstService] Context resolution warning:", err.message);
    }

    return {
      organizationId: resolvedOrgId,
      merchantState,
      merchantGstin,
      businessName
    };
  },

  /**
   * Generates comprehensive GSTR-1 outward supplies report.
   * Categorizes into B2B & B2C, computes CGST/SGST vs IGST, and provides rate summaries.
   */
  async getGstr1Report(userId, fromDate, toDate, orgId) {
    if (!fromDate || !toDate) {
      const err = new Error("Valid date range ('from' and 'to') is required.");
      err.statusCode = 400;
      throw err;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      const err = new Error("'fromDate' cannot be after 'toDate'.");
      err.statusCode = 400;
      throw err;
    }

    const merchant = await this.getMerchantContext(userId, orgId);

    // Normalize date filters to include whole days
    const startIso = new Date(fromDate).toISOString().split('T')[0];
    const endIso = new Date(toDate).toISOString().split('T')[0] + 'T23:59:59.999Z';

    // 1. Query Sales for this tenant within date range
    let query = supabase
      .from('sales')
      .select(`
        id,
        invoice_no,
        total,
        subtotal,
        tax_amount,
        gst_percent,
        discount_percent,
        date,
        created_at,
        payment_status,
        payment_method,
        return_status,
        items,
        user_id,
        organization_id,
        customers (
          id,
          name,
          phone,
          gstin,
          state,
          address
        )
      `)
      .gte('date', startIso)
      .lte('date', endIso)
      .neq('payment_status', 'cancelled')
      .order('date', { ascending: true });

    // Multi-tenant organization isolation
    if (merchant.organizationId && merchant.organizationId !== userId) {
      query = query.or(`organization_id.eq.${merchant.organizationId},user_id.eq.${userId}`);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data: sales, error } = await query;
    if (error) throw error;

    const validSales = sales || [];

    const b2bInvoices = [];
    const b2cInvoices = [];
    const rateMap = {};

    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalInvoiceValue = 0;

    for (const s of validSales) {
      const cust = s.customers || {};
      const custGstin = (cust.gstin || '').trim().toUpperCase();
      const isB2B = Boolean(custGstin && custGstin.length >= 10);

      // Determine Place of Supply (POS) / Customer State
      let customerState = cust.state || merchant.merchantState;
      if (custGstin && custGstin.length >= 2) {
        const stateCode = custGstin.slice(0, 2);
        if (STATE_CODE_MAP[stateCode]) {
          customerState = STATE_CODE_MAP[stateCode];
        }
      }

      // Check Intra-State vs Inter-State supply
      const isIntraState = !merchant.merchantState || !customerState || 
        merchant.merchantState.toLowerCase() === customerState.toLowerCase();

      const taxable = Number(s.subtotal || 0);
      let tax = Number(s.tax_amount);
      if (isNaN(tax) || tax === 0) {
        tax = Math.max(0, Number(s.total || 0) - taxable);
      }
      const total = Number(s.total || (taxable + tax));

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIntraState) {
        cgst = Number((tax / 2).toFixed(2));
        sgst = Number((tax / 2).toFixed(2));
        igst = 0;
      } else {
        cgst = 0;
        sgst = 0;
        igst = Number(tax.toFixed(2));
      }

      // Determine effective GST rate percentage
      let effectiveRate = Number(s.gst_percent || 0);
      if (effectiveRate === 0 && taxable > 0 && tax > 0) {
        effectiveRate = Math.round((tax / taxable) * 100);
      }

      const invRow = {
        invoiceId: s.id,
        invoiceNo: s.invoice_no || `INV-${s.id}`,
        invoiceDate: new Date(s.date || s.created_at).toISOString().split('T')[0],
        customerName: cust.name || (isB2B ? 'B2B Client' : 'Consumer'),
        customerPhone: cust.phone || '',
        customerGstin: custGstin || 'N/A',
        placeOfSupply: customerState,
        supplyType: isIntraState ? 'INTRA-STATE' : 'INTER-STATE',
        reverseCharge: 'N',
        invoiceType: 'Regular',
        taxableValue: taxable,
        gstRate: effectiveRate,
        cgst,
        sgst,
        igst,
        totalGst: tax,
        totalInvoiceValue: total,
        paymentStatus: s.payment_status || 'paid',
        paymentMethod: s.payment_method || 'cash'
      };

      totalTaxableValue += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      totalInvoiceValue += total;

      if (isB2B) {
        b2bInvoices.push(invRow);
      } else {
        b2cInvoices.push(invRow);
      }

      // Accumulate Rate-wise summary
      const rateKey = `${effectiveRate}%`;
      if (!rateMap[rateKey]) {
        rateMap[rateKey] = {
          rate: effectiveRate,
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
      rateMap[rateKey].taxableValue += taxable;
      rateMap[rateKey].cgst += cgst;
      rateMap[rateKey].sgst += sgst;
      rateMap[rateKey].igst += igst;
      rateMap[rateKey].totalGst += tax;
      rateMap[rateKey].totalValue += total;
      rateMap[rateKey].invoiceCount += 1;
    }

    const rateWiseSummary = Object.values(rateMap).sort((a, b) => a.rate - b.rate);

    return {
      success: true,
      period: { from: fromDate, to: toDate },
      merchantInfo: {
        businessName: merchant.businessName,
        merchantGstin: merchant.merchantGstin || 'Unregistered',
        merchantState: merchant.merchantState
      },
      summary: {
        totalInvoices: validSales.length,
        b2bCount: b2bInvoices.length,
        b2cCount: b2cInvoices.length,
        totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
        totalCgst: Number(totalCgst.toFixed(2)),
        totalSgst: Number(totalSgst.toFixed(2)),
        totalIgst: Number(totalIgst.toFixed(2)),
        totalGst: Number((totalCgst + totalSgst + totalIgst).toFixed(2)),
        totalInvoiceValue: Number(totalInvoiceValue.toFixed(2))
      },
      b2bInvoices,
      b2cInvoices,
      invoices: [...b2bInvoices, ...b2cInvoices], // Backward compatibility
      rateWiseSummary
    };
  },

  /**
   * Generates GSTR-3B monthly/quarterly tax liability and Input Tax Credit (ITC) summary.
   */
  async getGstr3bReport(userId, fromDate, toDate, orgId) {
    // 1. Get GSTR-1 outward supplies
    const gstr1 = await this.getGstr1Report(userId, fromDate, toDate, orgId);
    const merchant = gstr1.merchantInfo;

    const startIso = new Date(fromDate).toISOString().split('T')[0];
    const endIso = new Date(toDate).toISOString().split('T')[0] + 'T23:59:59.999Z';

    // 2. Fetch Inward Supplies (Purchase Orders) for Input Tax Credit (ITC)
    let poQuery = supabase
      .from('purchase_orders')
      .select('id, order_no, total_amount, subtotal, tax_amount, status, date, created_at, organization_id, user_id')
      .gte('date', startIso)
      .lte('date', endIso)
      .in('status', ['received', 'completed']);

    if (gstr1.merchantInfo.organizationId && gstr1.merchantInfo.organizationId !== userId) {
      poQuery = poQuery.or(`organization_id.eq.${gstr1.merchantInfo.organizationId},user_id.eq.${userId}`);
    } else {
      poQuery = poQuery.eq('user_id', userId);
    }

    const { data: purchases } = await poQuery;
    const validPurchases = purchases || [];

    let itcTaxableValue = 0;
    let itcCgst = 0;
    let itcSgst = 0;
    let itcIgst = 0;

    for (const po of validPurchases) {
      const taxable = Number(po.subtotal || 0);
      const tax = Number(po.tax_amount || Math.max(0, Number(po.total_amount || 0) - taxable));

      itcTaxableValue += taxable;
      // Default to intra-state purchase (CGST + SGST split) unless specified
      itcCgst += Number((tax / 2).toFixed(2));
      itcSgst += Number((tax / 2).toFixed(2));
    }

    // 3. Compute Net Tax Payable
    const outwardCgst = gstr1.summary.totalCgst;
    const outwardSgst = gstr1.summary.totalSgst;
    const outwardIgst = gstr1.summary.totalIgst;

    const netCgst = Math.max(0, Number((outwardCgst - itcCgst).toFixed(2)));
    const netSgst = Math.max(0, Number((outwardSgst - itcSgst).toFixed(2)));
    const netIgst = Math.max(0, Number((outwardIgst - itcIgst).toFixed(2)));
    const totalNetPayable = Number((netCgst + netSgst + netIgst).toFixed(2));

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
      table4EligibleItc: {
        description: "4 (A)(5) All other ITC (Purchases from registered suppliers)",
        totalPurchaseTaxableValue: Number(itcTaxableValue.toFixed(2)),
        integratedTax: itcIgst,
        centralTax: Number(itcCgst.toFixed(2)),
        stateUtTax: Number(itcSgst.toFixed(2)),
        totalItcAvailable: Number((itcCgst + itcSgst + itcIgst).toFixed(2)),
        purchaseCount: validPurchases.length
      },
      table5NetTaxPayable: {
        description: "5. Net GST Tax Payable after ITC Set-off",
        netIntegratedTax: netIgst,
        netCentralTax: netCgst,
        netStateUtTax: netSgst,
        totalNetPayable
      }
    };
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

    // Sheet 2: B2B Invoices (Table 4A)
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

    // Sheet 3: B2C Invoices (Table 7)
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

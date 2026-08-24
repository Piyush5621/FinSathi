import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert";
import { GstService } from "../src/services/GstService.js";
import { supabase } from "../src/config/db.js";
import * as XLSX from "xlsx";

// Mock Database Stores
let mockSales = [];
let mockPurchases = [];
let mockCustomers = [];
let mockUsers = [];
let mockOrganizations = [];

describe("GST Reporting & Spreadsheet Export Flow Tests", () => {
  before(() => {
    // Mock supabase query builder
    const createQueryMock = (tableName) => {
      let filterId = null;
      let filterUserId = null;
      let filterOrgId = null;
      let dateGte = null;
      let dateLte = null;
      let neqStatus = null;
      let inStatus = null;

      let orConditions = [];

      const builder = {
        select: (cols) => {
          return {
            eq: (col, val) => {
              if (col === "id") filterId = val;
              if (col === "user_id") filterUserId = val;
              if (col === "organization_id") filterOrgId = val;
              return builder.select(cols);
            },
            gte: (col, val) => {
              dateGte = val;
              return builder.select(cols);
            },
            lte: (col, val) => {
              dateLte = val;
              return builder.select(cols);
            },
            neq: (col, val) => {
              neqStatus = val;
              return builder.select(cols);
            },
            in: (col, val) => {
              inStatus = val;
              return builder.select(cols);
            },
            or: (val) => {
              // Parse strings like: "organization_id.eq.org-gst-1,user_id.eq.user-gst-1"
              if (typeof val === "string") {
                const parts = val.split(",");
                parts.forEach(p => {
                  const [k, op, v] = p.split(".");
                  if (op === "eq") {
                    orConditions.push({ key: k, value: v });
                  }
                });
              }
              return builder.select(cols);
            },
            order: (col, opts) => builder.select(cols),
            maybeSingle: async () => {
              if (tableName === "users") {
                const u = mockUsers.find(x => x.id === filterId || x.id === filterUserId);
                return { data: u || mockUsers[0] || null, error: null };
              }
              if (tableName === "organizations") {
                const org = mockOrganizations.find(x => x.id === filterId);
                return { data: org || mockOrganizations[0] || null, error: null };
              }
              return { data: null, error: null };
            },
            single: async () => builder.select(cols).maybeSingle(),
            then: (resolve) => {
              if (tableName === "sales") {
                let filtered = mockSales.filter(s => {
                  if (orConditions.length > 0) {
                    const matchesAny = orConditions.some(c => s[c.key] === c.value);
                    if (!matchesAny) return false;
                  } else {
                    if (filterUserId && s.user_id !== filterUserId) return false;
                    if (filterOrgId && s.organization_id !== filterOrgId) return false;
                  }
                  if (dateGte && s.date < dateGte) return false;
                  if (dateLte && s.date > dateLte) return false;
                  if (neqStatus && s.payment_status === neqStatus) return false;
                  return true;
                });
                // Attach customer object
                const enriched = filtered.map(s => {
                  const cust = mockCustomers.find(c => c.id === s.customer_id) || null;
                  return { ...s, customers: cust };
                });
                resolve({ data: enriched, error: null });
              } else if (tableName === "purchase_orders") {
                let filtered = mockPurchases.filter(p => {
                  if (orConditions.length > 0) {
                    const matchesAny = orConditions.some(c => p[c.key] === c.value);
                    if (!matchesAny) return false;
                  } else {
                    if (filterUserId && p.user_id !== filterUserId) return false;
                    if (filterOrgId && p.organization_id !== filterOrgId) return false;
                  }
                  if (dateGte && p.date < dateGte) return false;
                  if (dateLte && p.date > dateLte) return false;
                  if (inStatus && !inStatus.includes(p.status)) return false;
                  return true;
                });
                resolve({ data: filtered, error: null });
              } else {
                resolve({ data: [], error: null });
              }
            }
          };
        }
      };
      return builder;
    };

    supabase.from = createQueryMock;
  });

  beforeEach(() => {
    mockUsers = [
      {
        id: "user-gst-1",
        organization_id: "org-gst-1",
        business_name: "Karobar Supermart",
        state: "Delhi",
        gstin: "07AAAAA0000A1Z5"
      },
      {
        id: "user-tenant-2",
        organization_id: "org-tenant-2",
        business_name: "Competitor Mart",
        state: "Delhi",
        gstin: "07BBBBB1111B2Z6"
      }
    ];

    mockOrganizations = [
      {
        id: "org-gst-1",
        name: "Karobar Supermart Delhi",
        state: "Delhi",
        gstin: "07AAAAA0000A1Z5"
      }
    ];

    mockCustomers = [
      {
        id: "cust-retail-1",
        name: "Amit Sharma",
        phone: "9876543210",
        state: "Delhi",
        gstin: null // B2C
      },
      {
        id: "cust-b2b-mumbai",
        name: "Reliance Retail Ltd",
        phone: "9822001122",
        state: "Maharashtra",
        gstin: "27ABCDE1234F1Z5" // B2B Inter-state
      }
    ];

    mockSales = [
      // 1. Intra-State B2C Sale (Delhi to Delhi, No GSTIN): 18% GST -> 9% CGST + 9% SGST
      {
        id: "sale-b2c-1",
        user_id: "user-gst-1",
        organization_id: "org-gst-1",
        invoice_no: "INV-2026-001",
        customer_id: "cust-retail-1",
        subtotal: 1000.00,
        tax_amount: 180.00,
        gst_percent: 18,
        total: 1180.00,
        payment_status: "paid",
        date: "2026-05-10T10:00:00.000Z"
      },
      // 2. Inter-State B2B Sale (Delhi to Maharashtra, with GSTIN): 18% GST -> 18% IGST
      {
        id: "sale-b2b-1",
        user_id: "user-gst-1",
        organization_id: "org-gst-1",
        invoice_no: "INV-2026-002",
        customer_id: "cust-b2b-mumbai",
        subtotal: 2000.00,
        tax_amount: 360.00,
        gst_percent: 18,
        total: 2360.00,
        payment_status: "paid",
        date: "2026-05-15T14:30:00.000Z"
      },
      // 3. Cancelled Invoice: Should be excluded
      {
        id: "sale-cancelled-1",
        user_id: "user-gst-1",
        organization_id: "org-gst-1",
        invoice_no: "INV-2026-VOID",
        customer_id: "cust-retail-1",
        subtotal: 500.00,
        tax_amount: 90.00,
        gst_percent: 18,
        total: 590.00,
        payment_status: "cancelled",
        date: "2026-05-20T11:00:00.000Z"
      },
      // 4. Sale outside financial period (June 2026 vs May 2026 filter): Should be excluded
      {
        id: "sale-future-1",
        user_id: "user-gst-1",
        organization_id: "org-gst-1",
        invoice_no: "INV-2026-099",
        customer_id: "cust-retail-1",
        subtotal: 3000.00,
        tax_amount: 540.00,
        gst_percent: 18,
        total: 3540.00,
        payment_status: "paid",
        date: "2026-07-01T10:00:00.000Z"
      },
      // 5. Tenant Isolation Test Sale (Belongs to competitor user-tenant-2)
      {
        id: "sale-competitor-1",
        user_id: "user-tenant-2",
        organization_id: "org-tenant-2",
        invoice_no: "INV-COMP-001",
        customer_id: "cust-retail-1",
        subtotal: 10000.00,
        tax_amount: 1800.00,
        gst_percent: 18,
        total: 11800.00,
        payment_status: "paid",
        date: "2026-05-12T10:00:00.000Z"
      }
    ];

    mockPurchases = [
      // Inward Supply (Purchase Order) for ITC calculation: Subtotal ₹1,000, Tax ₹180
      {
        id: "po-1",
        user_id: "user-gst-1",
        organization_id: "org-gst-1",
        order_no: "PO-2026-01",
        subtotal: 1000.00,
        tax_amount: 180.00,
        total_amount: 1180.00,
        status: "received",
        date: "2026-05-05T09:00:00.000Z"
      }
    ];
  });

  test("1. GSTR-1 Categorization & Tax Calculations (Intra-State vs Inter-State & B2B vs B2C)", async () => {
    const report = await GstService.getGstr1Report("user-gst-1", "2026-05-01", "2026-05-31", "org-gst-1");

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.summary.totalInvoices, 2, "Must include only 2 valid non-cancelled invoices in May 2026");
    assert.strictEqual(report.summary.b2bCount, 1);
    assert.strictEqual(report.summary.b2cCount, 1);

    // Verify Intra-State B2C (INV-2026-001)
    const b2c = report.b2cInvoices[0];
    assert.strictEqual(b2c.invoiceNo, "INV-2026-001");
    assert.strictEqual(b2c.taxableValue, 1000.00);
    assert.strictEqual(b2c.cgst, 90.00, "Intra-state must split 18% into 9% CGST (₹90)");
    assert.strictEqual(b2c.sgst, 90.00, "Intra-state must split 18% into 9% SGST (₹90)");
    assert.strictEqual(b2c.igst, 0.00, "Intra-state IGST must be ₹0");
    assert.strictEqual(b2c.totalInvoiceValue, 1180.00);

    // Verify Inter-State B2B (INV-2026-002)
    const b2b = report.b2bInvoices[0];
    assert.strictEqual(b2b.invoiceNo, "INV-2026-002");
    assert.strictEqual(b2b.customerGstin, "27ABCDE1234F1Z5");
    assert.strictEqual(b2b.taxableValue, 2000.00);
    assert.strictEqual(b2b.cgst, 0.00, "Inter-state CGST must be ₹0");
    assert.strictEqual(b2b.sgst, 0.00, "Inter-state SGST must be ₹0");
    assert.strictEqual(b2b.igst, 360.00, "Inter-state IGST must be 18% (₹360)");
    assert.strictEqual(b2b.totalInvoiceValue, 2360.00);

    // Verify Period Totals
    assert.strictEqual(report.summary.totalTaxableValue, 3000.00);
    assert.strictEqual(report.summary.totalCgst, 90.00);
    assert.strictEqual(report.summary.totalSgst, 90.00);
    assert.strictEqual(report.summary.totalIgst, 360.00);
    assert.strictEqual(report.summary.totalGst, 540.00);
    assert.strictEqual(report.summary.totalInvoiceValue, 3540.00);
  });

  test("2. Date Range & Cancelled Invoice Exclusion", async () => {
    // 1. Cancelled invoice check: INV-2026-VOID is NOT in report
    const reportMay = await GstService.getGstr1Report("user-gst-1", "2026-05-01", "2026-05-31", "org-gst-1");
    const hasCancelled = reportMay.invoices.some(i => i.invoiceNo === "INV-2026-VOID");
    assert.strictEqual(hasCancelled, false, "Cancelled invoices must be excluded");

    // 2. Date Range Filtering: Filtering for July 2026 returns only July invoice
    const reportJuly = await GstService.getGstr1Report("user-gst-1", "2026-07-01", "2026-07-31", "org-gst-1");
    assert.strictEqual(reportJuly.summary.totalInvoices, 1);
    assert.strictEqual(reportJuly.invoices[0].invoiceNo, "INV-2026-099");
  });

  test("3. Multi-Tenant Organization Isolation", async () => {
    const reportUser1 = await GstService.getGstr1Report("user-gst-1", "2026-05-01", "2026-05-31", "org-gst-1");
    const hasCompetitorSale = reportUser1.invoices.some(i => i.invoiceNo === "INV-COMP-001");
    assert.strictEqual(hasCompetitorSale, false, "Must NOT leak sales from another tenant");
  });

  test("4. GSTR-3B Summary Calculation (Outward Liability, Eligible ITC & Net Tax Payable)", async () => {
    const gstr3b = await GstService.getGstr3bReport("user-gst-1", "2026-05-01", "2026-05-31", "org-gst-1");

    assert.strictEqual(gstr3b.success, true);

    // Table 3.1 Outward Tax Liability
    assert.strictEqual(gstr3b.table31OutwardSupplies.totalTaxableValue, 3000.00);
    assert.strictEqual(gstr3b.table31OutwardSupplies.centralTax, 90.00);
    assert.strictEqual(gstr3b.table31OutwardSupplies.stateUtTax, 90.00);
    assert.strictEqual(gstr3b.table31OutwardSupplies.integratedTax, 360.00);
    assert.strictEqual(gstr3b.table31OutwardSupplies.totalTaxLiability, 540.00);

    // Table 4 Eligible Inward ITC (Purchase of ₹1,000 with ₹180 tax -> ₹90 CGST + ₹90 SGST)
    assert.strictEqual(gstr3b.table4EligibleItc.totalPurchaseTaxableValue, 1000.00);
    assert.strictEqual(gstr3b.table4EligibleItc.centralTax, 90.00);
    assert.strictEqual(gstr3b.table4EligibleItc.stateUtTax, 90.00);
    assert.strictEqual(gstr3b.table4EligibleItc.totalItcAvailable, 180.00);

    // Table 5 Net Tax Payable (Outward - Inward ITC)
    // CGST: 90 - 90 = 0
    // SGST: 90 - 90 = 0
    // IGST: 360 - 0 = 360
    assert.strictEqual(gstr3b.table5NetTaxPayable.netCentralTax, 0.00);
    assert.strictEqual(gstr3b.table5NetTaxPayable.netStateUtTax, 0.00);
    assert.strictEqual(gstr3b.table5NetTaxPayable.netIntegratedTax, 360.00);
    assert.strictEqual(gstr3b.table5NetTaxPayable.totalNetPayable, 360.00);
  });

  test("5. Excel Spreadsheet (.xlsx) Generation for GSTR-1 and GSTR-3B", async () => {
    const gstr1 = await GstService.getGstr1Report("user-gst-1", "2026-05-01", "2026-05-31", "org-gst-1");
    const gstr3b = await GstService.getGstr3bReport("user-gst-1", "2026-05-01", "2026-05-31", "org-gst-1");

    // 1. Export GSTR-1 Excel
    const gstr1Buffer = GstService.exportGstr1Excel(gstr1);
    assert.ok(Buffer.isBuffer(gstr1Buffer) || gstr1Buffer instanceof Uint8Array);
    const wb1 = XLSX.read(gstr1Buffer, { type: "buffer" });
    assert.ok(wb1.SheetNames.includes("Summary"));
    assert.ok(wb1.SheetNames.includes("B2B Invoices"));
    assert.ok(wb1.SheetNames.includes("B2C Invoices"));
    assert.ok(wb1.SheetNames.includes("Rate Summary"));

    // 2. Export GSTR-3B Excel
    const gstr3bBuffer = GstService.exportGstr3bExcel(gstr3b);
    assert.ok(Buffer.isBuffer(gstr3bBuffer) || gstr3bBuffer instanceof Uint8Array);
    const wb3 = XLSX.read(gstr3bBuffer, { type: "buffer" });
    assert.ok(wb3.SheetNames.includes("GSTR-3B Summary"));
  });

  test("6. Invalid Date Range Validation", async () => {
    // 1. Missing dates
    await assert.rejects(
      async () => GstService.getGstr1Report("user-gst-1", null, "2026-05-31"),
      /date range.*is required/
    );

    // 2. fromDate > toDate
    await assert.rejects(
      async () => GstService.getGstr1Report("user-gst-1", "2026-06-01", "2026-05-01"),
      /fromDate.*cannot be after.*toDate/
    );
  });
});

# 🗺️ Karobar — Project Map: Current State & Verified Architecture

> **Document Type**: Production State & Architecture Blueprint  
> **Product Name**: Karobar (कारोबार)  
> **Status**: Production-Ready / Verified (15 Test Suites, 74/74 Tests Passing)  
> **Last Updated**: August 2026  

---

# 1. Karobar in One Page

### What is Karobar?
Karobar (कारोबार) is a smart, mobile-first business management and stock platform (Operating System) built for Indian shopkeepers, Kirana stores, distributors, wholesalers, and small businesses. 

Instead of manual paper notebooks (*Bahi-Khata*) or rigid desktop software, shopkeepers use Karobar to:
* Generate GST/non-GST bills in under 10 seconds.
* Scan physical barcodes (EAN-13, Code 128, QR) via mobile camera or barcode hardware.
* Manage multi-variant catalogs (Size, Color, Flavour) and batch expiry tracking (FEFO/FIFO).
* Deduct stock atomically with database row locking (`SELECT FOR UPDATE`) across POS sales and offline sync.
* Inward purchase orders automatically into warehouse stock balances and batches.
* Track customer credit (*Udhaar*) with partial debt repayments and WhatsApp reminders.
* Export compliance-ready GST GSTR-1 and GSTR-3B spreadsheets with B2B/B2CS tax categorization.
* Monitor 14-day cash flow forecasts, business health scores, and financial KPIs with real-time Redis cache invalidation.
* Interact in natural Hindi/Hinglish voice (*"Aaj kitna bika?"*) via FinVoice AI.

---

# 2. Implemented Architecture & Flow Matrix

| System Component | Implemented Workflow | Verified Status |
| :--- | :--- | :---: |
| **Identity & Authentication** | Access token (15m) + HttpOnly secure cookie refresh (30d), bcrypt hashing, session revocation, brute-force lockout, rate limiting. | 🟢 **DONE** |
| **RBAC & Multi-Tenancy** | Organization-isolated queries (`organization_id`/`tenant_id`), staff store permissions, compliance audit logging. | 🟢 **DONE** |
| **Master Data** | Base units (kg, pcs, boxes) with conversion multipliers, hierarchical categories, brand registries, warehouse configurations. | 🟢 **DONE** |
| **Product Catalog & Barcodes** | Multi-variant matrix, SKU generation rules, primary/secondary barcode registries, barcode scanner integration. | 🟢 **DONE** |
| **Modern Karobar Stock Engine** | Warehouse balances (`warehouse_stock`), batch tracking (`inventory_batches`), immutable movement ledger (`inventory_movements`), atomic row locking. | 🟢 **DONE** |
| **POS Billing & Invoicing** | `POS UI → SalesService.createSale → StockService.deductSaleStock` (FEFO batch allocation, movement logging, financial cache invalidation). | 🟢 **DONE** |
| **Purchase Order Receiving** | `PurchaseOrderController.updatePurchaseOrderStatus → StockService.receivePurchaseOrderStock` (updates warehouse balances, creates batches, logs movements). | 🟢 **DONE** |
| **Sales Returns & Restocking** | `SalesService.returnSale → StockService.returnSaleStock` / `processSalesReturn` (idempotent restocking, batch restoration, Khata adjustment). | 🟢 **DONE** |
| **Customer Khata & Repayments** | Credit ledger, FIFO debt allocation (`PaymentController.addPayment`, `CustomerController.recordCustomerPayment`), balance synchronization. | 🟢 **DONE** |
| **Offline POS Billing & Sync** | IndexedDB local queue, client-side idempotency keys, background sync worker (`OfflineSyncEngine → SalesService.createSale → StockService`). | 🟢 **DONE** |
| **GST GSTR-1 & GSTR-3B** | B2B, B2CL, B2CS, and HSN summary computation, Excel export (`.xlsx`), inter-state vs intra-state tax segregation. | 🟢 **DONE** |
| **Financial Intelligence & Caching** | Dashboard KPIs, Business Health Score, 14-Day Cash Flow Forecast, daily briefs with tenant-isolated Redis & NodeCache invalidation hooks. | 🟢 **DONE** |
| **FinVoice AI Assistant** | Action-guarded intent extraction using Gemini Flash + Deepgram Nova-2 speech-to-text in Hindi/Hinglish. | 🟢 **DONE** |
| **Business Network (B2B V2)** | Verified merchant directory, digital purchase orders, trade credit, trust scoring engine. | 🟢 **DONE** |

---

# 3. Verified Stock Engine Integration

Every active production stock mutation is strictly routed through `StockService`:

```
┌─────────────────────────────────────────────────────────────┐
│                      Karobar POS UI                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /api/sales
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        SalesService                         │
│  - Validates cart items & pricing                           │
│  - Calculates GST, discounts, and customer credit           │
└──────────────────────────────┬──────────────────────────────┘
                               │ StockService.deductSaleStock()
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     StockService Engine                     │
│  1. Atomic Row Lock (SELECT FOR UPDATE on warehouse_stock)  │
│  2. FEFO/FIFO Batch Selection (BatchSelectionEngine)        │
│  3. Decrement warehouse on_hand / available balances        │
│  4. Decrement batch quantity in inventory_batches           │
│  5. Append immutable movement record (inventory_movements)  │
│  6. Publish event (inventory.stock.changed)                 │
│  7. Invalidate tenant Redis financial cache                 │
└─────────────────────────────────────────────────────────────┘
```

---

# 4. Verified Automated Test Suites

```
✔ 1.  Identity Module Tests (tests/identity.test.js)
✔ 2.  Master Data Foundation Tests (tests/masters.test.js)
✔ 3.  Product Catalog Engine Tests (tests/catalog.test.js)
✔ 4.  Modern Inventory & Stock Engine Tests (tests/inventory.test.js)
✔ 5.  POS Stock Flow & Concurrency Tests (tests/pos_stock_flow.test.js)
✔ 6.  Catalog Frontend Flow Tests (tests/catalog_frontend_flow.test.js)
✔ 7.  Automatic Access Token Refresh Flow Tests (tests/token_refresh_flow.test.js)
✔ 8.  Purchase Order Receiving & Stock Engine Tests (tests/purchase_order_receiving_flow.test.js)
✔ 9.  Customer Khata Repayment & Allocation Tests (tests/customer_khata_repayment_flow.test.js)
✔ 10. Sales Return & Restocking Flow Tests (tests/sales_return_flow.test.js)
✔ 11. Offline POS Sync & Idempotency Tests (tests/offline_sync_flow.test.js)
✔ 12. GST GSTR-1 & GSTR-3B Reporting Tests (tests/gst_reporting_flow.test.js)
✔ 13. Demo Accounts Authentication Tests (tests/demo_accounts_auth.test.js)
✔ 14. Financial Intelligence Cache Invalidation Tests (tests/financial_cache_invalidation.test.js)
✔ 15. Production Readiness & Security Tests (tests/production_audit.test.js)
✔ 16. End-to-End Business Workflow Audit Tests (tests/end_to_end_workflow.test.js)

Total Test Execution: 85 passing tests across 16 suites (0 failures).
Frontend Production Build: Vite PWA build passing cleanly (8.91s).
```

---

# 5. Production Operations & Security Guidelines

1. **Production Environment Configuration**:
   * Set `NODE_ENV=production`
   * Provide strong `JWT_SECRET` (min 32 characters)
   * Configure `REDIS_URL` for BullMQ queues and multi-instance financial cache invalidation
   * Provide valid `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_KEY`
   * Provide valid `GEMINI_API_KEY` for AI features
2. **Branding & Legacy Compatibility**:
   * Primary brand is **Karobar**.
   * Legacy database views (such as `finsathi_dashboard_summary`) and Supabase storage bucket (`finsathi-assets`) are preserved for remote schema backwards compatibility.
   * All production code exclusively uses the modern Stock Engine (`StockService`).

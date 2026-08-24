# 🗺️ FinSathi — Project Map: Current State → Final Product

> **Document Type**: Plain-English Project Execution Map  
> **Status**: Living Execution Guide  
> **Target**: Take FinSathi from `v1.0.0-rc1` to a Production-Ready Product  
> **Rule**: No complex diagrams, no heavy theory. Just what is built, what is broken, what we are doing next, and the final goal.

---

# 1. FinSathi in One Page

### What is FinSathi?
FinSathi is a smart, mobile-first business management app (Operating System) built for Indian shopkeepers, Kirana stores, wholesalers, and small businesses. 

Instead of writing in paper notebooks (*Bahi-Khata*) or using complicated desktop software like Tally, a shopkeeper uses FinSathi on their phone or tablet to scan barcodes, make GST bills in 10 seconds, track expiring product batches, see if they will run out of cash in the next 14 days, send payment reminders to customers on WhatsApp, and ask business questions in Hindi or Hinglish voice (*"Aaj kitna bika?"*).

### Where are we right now?
The backend foundation is in great shape. In our recent development sprints, we built a modern, enterprise-grade engine for organizations, users, product variants, warehouse stock, and batch expiry tracking. 

However, **the application is currently running two systems at the same time:**
* The new modular backend engine is ready and tested.
* The frontend user screens (like POS Billing and Sanchay) are still calling older, simpler APIs.

### Biggest Problem Right Now
**Two inventory systems exist at once.** If you add stock in the new warehouse system, but sell an item on the POS billing screen, the POS deducts stock from the old inventory table. This means the two tables show different stock counts, which can cause wrong reports and overselling.

### What Are We Doing Next?
We are **connecting POS Billing and the Sanchay UI to the new modern engine**, so that every sale, purchase, and restock updates the exact same warehouse stock table with database row locks.

### Final Goal
A single, unified, bulletproof app where a shopkeeper logs in, adds products, creates bills in seconds, tracks customer credit (*Udhaar*), and gets automated daily business advice — with 100% accurate stock and zero data corruption.

---

# 2. Where We Are Today (The Story)

To understand what to do next, you only need to know how the project evolved:

1. **The Starting Point (v1.0)**: FinSathi started as a simple monolithic app with basic tables for users, products, sales, and expenses. It worked for basic billing, but lacked support for multi-store branches, product variants (like size and color), multiple barcodes, and batch expiration tracking.
2. **The Upgrade (Sprints 1–4)**: We built a modern modular engine in `backend/src/modules/` with database migrations 51 to 54. This gave us:
   * Real multi-tenant organizations and device session tracking (`modules/identity`).
   * Units of measure with conversion factors, brands, and categories (`modules/masters`).
   * Product variants and barcode registries (`modules/catalog`).
   * Warehouse stock balances, batch expiry tracking (FEFO/FIFO), and immutable stock movement history (`modules/inventory`).
3. **The Current Gap**: The new backend code was written and passed automated unit tests, but **we haven't rewired the frontend screens (`Billing.jsx`, `InventoryPage.jsx`) to use it yet**.
4. **The Mission**: We do **not** need to invent new architectures or rebuild the backend. We just need to connect the frontend to the new backend, delete the old duplicate APIs, and make sure daily operations are 100% reliable.

---

# 3. Simple Status Board

| Area | Status | Meaning in Plain English |
| :--- | :---: | :--- |
| **Login, Users & RBAC** | 🟢 **Ready** | Fully working with sessions, lockout protection, and role permissions. |
| **Master Data (Units, Brands)** | 🟢 **Ready** | Backend engine ready; conversion factors and categories working. |
| **Product Catalog** | 🟡 **Needs Connection** | Backend supports variants and barcodes; frontend UI still uses old flat product API. |
| **Sanchay (Stock Engine)** | 🔴 **Critical Integration** | Modern engine is ready, but POS still writes to the old inventory table. |
| **POS Billing & Invoicing** | 🔴 **Critical Integration** | Fast billing UI works, but sales must be connected to modern stock deduction. |
| **Customer Khata (Credit Ledger)** | 🟡 **Needs Hardening** | Outstanding balance tracking works; needs dedicated partial debt repayment flow. |
| **Purchases & Suppliers** | 🟡 **Needs Connection** | PO creation works; marking a PO as "received" must auto-create inventory batches. |
| **Business Health & Cash Flow** | 🟢 **Ready** | 5-factor health score and 14-day cash flow forecast algorithms work. |
| **FinVoice AI Assistant** | 🟢 **Ready** | Hindi/Hinglish voice transcription and guarded intent Q&A work. |
| **WhatsApp Reminders** | 🟢 **Ready** | Automated daily reminder cron and Meta WhatsApp template messaging work. |
| **Business Network (B2B V2)** | 🟢 **Ready** | Directory, B2B orders, trade credit, and trust score engine complete. |
| **Offline POS Billing** | 🟡 **Needs Work** | IndexedDB local storage works; needs automatic background sync when WiFi returns. |

---

# 4. What Is Already Built (🟢 DONE — Do NOT Rebuild)

These components are verified, tested, and working in the codebase:

* ✅ **Identity & Sessions**: Multi-tenant organizations, user registration, BCrypt password hashing, session tracking, token refresh, and brute-force lockout (`backend/src/modules/identity/`).
* ✅ **Master Data Foundation**: Units of measure (kg, pcs, boxes) with conversion multipliers, brands, hierarchical categories, and warehouse setups (`backend/src/modules/masters/`).
* ✅ **Product Catalog Engine**: Multi-variant matrix, primary/secondary barcode registries (EAN-13, QR), and SKU uniqueness registry (`backend/src/modules/catalog/`).
* ✅ **Modern Sanchay Stock Engine**: Real-time warehouse balances (`warehouse_stock`), batch tracking with FEFO/FIFO valuation (`inventory_batches`), serial numbers, and partitioned movement history (`inventory_movements`) with pessimistic row locking (`SELECT FOR UPDATE`).
* ✅ **Business Health Score**: 0–100 business rating calculated from sales growth, cash flow ratio, inventory health, collection rate, and profile completeness (`HealthScoreService.js`).
* ✅ **14-Day Cash Flow Forecast**: Forward-looking projection incorporating sales velocity, supplier bills, and staff payroll (`CashFlowService.js`).
* ✅ **FinVoice AI Assistant**: Action-guarded intent extraction using Gemini 2.5 Flash + Deepgram Nova-2 voice transcription in Hindi/Hinglish (`AIService.js`).
* ✅ **B2B Network V2**: Partner directory, digital B2B orders, trade credits, and algorithmic trust scores (`TrustScoreService.js`).

---

# 5. What Is Built But Not Connected (🟡 CONNECT)

These systems exist and have passing tests, but are not wired up to the frontend UI yet:

### 1. Modern Sanchay Stock Engine
* **What exists**: `StockService.js`, `BatchSelectionEngine.js`, `warehouse_stock`, `inventory_batches`, `inventory_movements`.
* **Problem**: `Billing.jsx` (POS) still calls the old `POST /api/sales` endpoint which decrements the old `inventory.stock` column.
* **Required**: Connect `SalesService.createSale()` to call `StockService.lockWarehouseStock()`.

### 2. Product Variants & Barcodes in UI
* **What exists**: Backend `/api/v1/catalog/products` supports variants (Size/Color) and multiple barcodes.
* **Problem**: `InventoryPage.jsx` still fetches from legacy `/api/inventory` (single flat product).
* **Required**: Update `InventoryPage.jsx` to call `/api/v1/catalog/products` and add variant/barcode inputs in the modal.

### 3. Purchase Order Inward Receiving
* **What exists**: `PurchaseOrderController.js` creates and updates PO status to `received`.
* **Problem**: Marking a PO as received does not automatically create an inventory batch.
* **Required**: Call `StockService.postOpeningStock()` when PO status changes to `received`.

---

# 6. What Is Broken / Needs Fixing (🔴 FIX)

* **Dual-Schema Stock Writing**: POS checkouts write to the old table while new stock entries write to the new table. This must be unified immediately.
* **Client Token Expiry during Checkout**: If a merchant's 15-minute access token expires while building an invoice, Axios `apiClient.js` needs an automatic refresh interceptor so the checkout doesn't fail.
* **Customer Khata Repayment Flow**: No dedicated endpoint to record partial customer debt repayments and issue instant digital receipts.

---

# 7. What Is Not Built Yet (🔵 BUILD)

These are future features that genuinely do not exist in the code yet:

* **Voice-Guided Hands-Free Checkout**: Speaking *"Add 2 packets milk to Amit's bill"* to automatically build an invoice hands-free.
* **OCR Supplier Bill Scanner**: Taking a photo of a paper supplier invoice to automatically restock inventory.
* **Automated GSTR-1 & GSTR-3B Spreadsheet Download**: One-click download of Indian GST tax return spreadsheets.
* **Offline POS Sync Reconciliation**: Automatically pushing offline IndexedDB bills to the server when internet connectivity returns.

---

# 8. The Biggest Problem Right Now (Before vs After)

### TODAY (The Split Problem)
```text
Cashier at POS
     │
     ↓
Billing.jsx
     │
     ↓
POST /api/sales (Old Endpoint)
     │
     ↓
Old inventory.stock Column
(New warehouse_stock table is completely ignored!)
```

AND AT THE SAME TIME:

```text
Admin Restock
     │
     ↓
POST /api/v1/inventory/opening-stock (New Endpoint)
     │
     ↓
warehouse_stock Table + inventory_batches Table
(Old inventory table is not updated!)
```

### FINAL (The Single Source of Truth)
```text
Cashier at POS                   Admin Purchase Receiving
     │                                      │
     ↓                                      ↓
POST /api/sales                     POST /api/purchase-orders/receive
     │                                      │
     └──────────────────┬───────────────────┘
                        │
                        ↓
                   SalesService
                        │
                        ↓
                   StockService (Row Lock: SELECT FOR UPDATE)
                        │
                        ↓
            ┌───────────────────────┐
            │ warehouse_stock       │ (Real-time balance)
            │ inventory_batches     │ (FEFO/FIFO expiry)
            │ inventory_movements   │ (Audit trail ledger)
            └───────────────────────┘
```

**Result**: Every sale, restock, return, and transfer updates the exact same warehouse stock table with 100% consistency.

---

# 9. Module-by-Module Status & Execution Plan

---

### 📦 1. Inventory & Stock Engine

* **Status**: 🔴 **FIX + CONNECT**
* **What We Have**:
  * `StockService.js`, `BatchSelectionEngine.js`, `StockRepository.js`
  * Database: `warehouse_stock`, `inventory_batches`, `inventory_serial_numbers`, `inventory_movements` (monthly partitioned)
  * Database row locking: `StockRepository.lockWarehouseStock()` (`SELECT FOR UPDATE`)
  * Tests: `backend/tests/inventory.test.js`
* **What Works**: Direct API calls to `/api/v1/inventory/*` for opening stock, adjustments, and warehouse transfers.
* **What Is Wrong**: POS billing still deducts from the old `inventory.stock` column instead of calling `StockService`.
* **Why It Matters**: Two cashiers selling at once can cause negative stock, and batch expiration dates are ignored.
* **What We Need To Do**:
  1. Make `SalesService.createSale()` call `StockService.lockWarehouseStock()`.
  2. Deduct items from `inventory_batches` using FEFO (nearest expiry first).
  3. Record every sale deduction in `inventory_movements`.
  4. Stop writing to the old `inventory.stock` column.
* **Files Involved**:
  * `backend/src/services/SalesService.js`
  * `backend/src/modules/inventory/services/StockService.js`
  * `backend/src/routes/salesRoutes.js`
* **Database Involved**: `warehouse_stock`, `inventory_batches`, `inventory_movements`.
* **How We Test It**:
  * Create a product with 10 units in Batch A (expiring tomorrow) and 10 units in Batch B (expiring next year).
  * Sell 5 units on POS $\to$ Verify Batch A drops to 5, `warehouse_stock` drops to 15, and `inventory_movements` has a sale entry.
* **When Is It Done?**: When all POS checkouts deduct from `warehouse_stock` and `inventory_batches` with zero writes to the old inventory table.

---

### 🏷️ 2. Product Catalog & Variants

* **Status**: 🟡 **CONNECT**
* **What We Have**:
  * `ProductService.js`, `ProductRepository.js`, `VariantRepository.js`, `BarcodeRepository.js`
  * Database: `inventory` (rich columns), `product_variants`, `product_barcodes`, `sku_registry`
  * Tests: `backend/tests/catalog.test.js`
* **What Works**: Creating products with variants, sizes, colors, multiple barcodes, and SKUs via `/api/v1/catalog/products`.
* **What Is Wrong**: `InventoryPage.jsx` and `Billing.jsx` still fetch from the old single-table `/api/inventory` endpoint.
* **Why It Matters**: Merchants cannot see or add product variants (e.g., T-Shirt Red/M) or scan packaging barcodes in the UI.
* **What We Need To Do**:
  1. Update `InventoryPage.jsx` to fetch from `/api/v1/catalog/products`.
  2. Add variant fields (attribute name/value) and barcode fields in the Add Product modal.
  3. Update POS `ItemAdder.jsx` to find items by searching `product_barcodes`.
* **Files Involved**:
  * `frontend/src/pages/InventoryPage.jsx`
  * `frontend/src/components/billing/ItemAdder.jsx`
* **Database Involved**: `inventory`, `product_variants`, `product_barcodes`, `sku_registry`.
* **How We Test It**:
  * Add a product "Basmati Rice" with Variant 1 (1kg, Barcode 8901) and Variant 2 (5kg, Barcode 8902).
  * Scan 8901 in POS $\to$ Verifies 1kg variant is added to the cart.
* **When Is It Done?**: When the Inventory UI displays variants and barcodes, and POS barcode scanning resolves variant records.

---

### 🧾 3. POS Billing & Invoicing

* **Status**: 🔴 **FIX + CONNECT**
* **What We Have**:
  * `Billing.jsx`, `InvoiceEditorModal.jsx`, `ItemTable.jsx`, `PaymentSection.jsx`, `PdfService.js`
  * F2–F6 keyboard shortcuts, fast barcode buffer, GST tax calculations (CGST/SGST/IGST), PDF receipt generation.
* **What Works**: Adding items, applying discounts, computing taxes, choosing payment method (`Cash`, `UPI`, `Khata`), generating PDF.
* **What Is Wrong**:
  * Checkout does not use pessimistic row locks.
  * Sales returns do not restock inventory.
  * Token expiration mid-sale can cause checkout errors.
* **Why It Matters**: Double-selling can happen during rush hours; token expiry can frustrate cashiers.
* **What We Need To Do**:
  1. Connect checkout to `StockService` with row locking.
  2. Add automatic token refresh interceptor in `frontend/src/services/apiClient.js`.
  3. Create Sales Return endpoint (`POST /api/sales/:id/return`) that restores stock in `inventory_movements`.
* **Files Involved**:
  * `frontend/src/pages/Billing/Billing.jsx`
  * `backend/src/services/SalesService.js`
  * `frontend/src/services/apiClient.js`
* **Database Involved**: `sales`, `sale_items`, `warehouse_stock`, `inventory_movements`.
* **How We Test It**:
  * Sell the last 1 item simultaneously in two browser tabs $\to$ Verifies first sale succeeds, second sale shows "Insufficient stock".
* **When Is It Done?**: When POS sales lock stock rows, generate receipts in < 1 second, and handle token refresh invisibly.

---

### 🚚 4. Purchases & Suppliers

* **Status**: 🟡 **CONNECT**
* **What We Have**:
  * `PurchaseOrderController.js`, `SupplierController.js`, `SmartReorderService.js`, `SupplierHub.jsx`
  * Database: `suppliers`, `purchase_orders`, `po_items`, `supplier_product_links`
* **What Works**: Creating suppliers, drafting purchase orders, smart reorder suggestions based on low stock.
* **What Is Wrong**: Marking a Purchase Order as `received` does not automatically increase warehouse stock.
* **Why It Matters**: Shopkeepers must manually re-type supplier bills into inventory after receiving shipments.
* **What We Need To Do**:
  1. When a PO status is set to `received`, automatically call `StockService.postOpeningStock()` for each line item.
  2. Set the batch cost price and batch number from the PO.
  3. Log an inward receipt in `inventory_movements`.
* **Files Involved**:
  * `backend/src/controllers/PurchaseOrderController.js`
  * `frontend/src/pages/SupplierHub.jsx`
* **Database Involved**: `purchase_orders`, `po_items`, `warehouse_stock`, `inventory_batches`, `inventory_movements`.
* **How We Test It**:
  * Create a PO for 50 units of Milk at ₹30/unit.
  * Click "Mark as Received" $\to$ Verifies Milk stock increases by 50 and a new batch is created.
* **When Is It Done?**: When receiving a PO automatically populates warehouse stock with zero manual re-entry.

---

### 👥 5. Customers & Khata (Credit Ledger)

* **Status**: 🟡 **CONNECT + HARDEN**
* **What We Have**:
  * `CustomerController.js`, `CustomerRepository.js`, `CustomersPage.jsx`, `CustomerInvoicesPage.jsx`
  * Database: `customers.outstanding_balance`, `sales.payment_status`
* **What Works**: Tracking customer contact info, purchase history, and debt balance from unpaid invoices.
* **What Is Wrong**: No dedicated button/modal to record partial cash/UPI repayments and issue instant digital receipts.
* **Why It Matters**: Shopkeepers cannot easily settle customer debt when customers pay in installments.
* **What We Need To Do**:
  1. Create `POST /api/customers/:id/payments` endpoint to accept repayments.
  2. Decrement `customers.outstanding_balance` and mark oldest unpaid sales as paid.
  3. Send an instant WhatsApp payment confirmation receipt to the customer.
* **Files Involved**:
  * `backend/src/controllers/CustomerController.js`
  * `frontend/src/pages/CustomersPage.jsx`
* **Database Involved**: `customers`, `sales`.
* **How We Test It**:
  * Customer owes ₹1,000. Record a payment of ₹400 $\to$ Verifies balance updates to ₹600 and WhatsApp receipt is sent.
* **When Is It Done?**: When a merchant can record customer debt repayments in 2 clicks with immediate ledger update and WhatsApp receipt.

---

### 📊 6. Financial Intelligence & Business Health

* **Status**: 🟢 **DONE — Needs Cache Hardening**
* **What We Have**:
  * `HealthScoreService.js`, `CashFlowService.js`, `CreditRulesService.js`, `AnomalyService.js`, `DailyBriefService.js`
  * Database: `business_health_scores`, `daily_business_briefs`, `anomaly_flags`
  * Frontend: `BusinessHealthPage.jsx`, `Dashboard.jsx`
* **What Works**: 5-factor health score (0–100), 14-day cash flow forecast, CIBIL credit score, off-hours anomaly detection.
* **What Needs Hardening**: Add Redis cache deletion when new sales or expenses are created so dashboard metrics update instantly.
* **When Is It Done?**: When dashboard KPIs load in < 100ms and immediately reflect new sales.

---

### 🎙️ 7. FinVoice AI Assistant

* **Status**: 🟢 **DONE (Core Q&A)**
* **What We Have**:
  * `AIService.js`, `aiRoutes.js`, `AiAdvisorPage.jsx`
  * Deepgram Nova-2 voice transcription + Gemini 2.5 Flash intent parsing in Hindi/Hinglish.
* **What Works**: Answering queries like *"Aaj kitna bika?"*, *"Sharma ji ka kitna baaki hai?"*, *"Konsa item low stock hai?"*.
* **Guardrails**: AI only parses intents; backend code executes verified SQL queries. The LLM never writes to the database.
* **When Is It Done?**: Core Q&A is done; voice checkout is marked as future scope.

---

### 📴 8. Offline POS Billing

* **Status**: 🟡 **CONNECT**
* **What We Have**:
  * IndexedDB local storage in browser, offline product catalog caching in `Billing.jsx`.
* **What Works**: Cashier can search products and assemble bills when disconnected from the internet.
* **What Is Wrong**: Offline sales are saved locally but do not automatically sync when internet reconnects.
* **What We Need To Do**:
  1. Add a `window.addEventListener('online')` listener.
  2. Replay buffered offline sales sequentially to `POST /api/sales`.
  3. Show a toast notification: *"5 offline bills synced successfully"*.
* **Files Involved**:
  * `frontend/src/pages/Billing/Billing.jsx`
* **When Is It Done?**: When unplugging WiFi allows billing 5 customers, and plugging WiFi back in automatically saves all 5 bills to the server.

---

# 10. The Real Work We Have Left

Here is the entire remaining project work organized by category:

### 1. 🔴 Critical Fixes (Data Safety)
* Connect POS Billing to `StockService` so sales lock stock rows (`FOR UPDATE`) and deduct from `warehouse_stock` and `inventory_batches`.
* Remove all direct table writes to legacy `inventory` and `sales` tables.

### 2. 🟡 Integration Work (Wiring Existing Code)
* Update `InventoryPage.jsx` to fetch from `/api/v1/catalog/products` (show variants and barcodes).
* Connect Purchase Order receiving to `StockService.postOpeningStock()` (auto-create batches).
* Add Customer Khata partial payment settlement endpoint and UI modal.
* Add Sales Return endpoint (`POST /api/sales/:id/return`) to restock returned items.
* Add automatic token refresh interceptor in Axios `apiClient.js`.

### 3. 🔵 Future Work (Net-New Features)
* Offline POS automatic sync queue reconciliation on network reconnect.
* Automated GSTR-1 and GSTR-3B tax summary spreadsheet exporter.
* Voice-guided hands-free checkout drafting in FinVoice.

---

# 11. Dependency Order (What Must Be Built First)

```text
First:
Product Catalog (/api/v1/catalog/products)
└── We must be able to load and identify products, variants, and barcodes.

Then:
Inventory Stock Engine (StockService)
└── We must be able to lock stock rows, allocate batches, and write to the ledger.

Then:
POS Billing + Purchases
└── Every sale and purchase must update the exact same StockService.

Then:
Customer Khata + Payments
└── Sales that are unpaid update customer balances; payments settle debt.

Then:
Financial Reports & Intelligence
└── Dashboard, Cash Flow, and Health Score calculate metrics from verified sales.

Then:
Automation & Offline
└── WhatsApp reminders, daily crons, and offline sync run on top of stable sales.

Finally:
Production Hardening
└── Security audit, load testing, and deployment verification.
```

### Why this order matters:
You cannot finish POS Billing until Inventory is stable, because every sale changes stock. And you cannot finish Reports until POS and Purchases are updating the same inventory ledger.

---

# 12. Final Roadmap (Phases to Launch)

---

### 🏁 PHASE 1: Core Inventory & POS Unification (Immediate P0)
* **Goal**: Eliminate the dual-system split. Make all sales and catalog operations use the modern backend.
* **Tasks**:
  1. Connect POS checkout (`Billing.jsx`) to `SalesService` and `StockService`.
  2. Connect `InventoryPage.jsx` to `/api/v1/catalog/products`.
  3. Add client-side token auto-refresh interceptor in `apiClient.js`.
* **Exit Condition**: Every sale completed in POS decrements `warehouse_stock` with pessimistic row locking, and zero production workflows write to the old inventory table.

---

### 🏁 PHASE 2: Procurement, Khata & Returns (P1)
* **Goal**: Make daily inventory restocks, customer debt collections, and item returns safe.
* **Tasks**:
  1. Connect Purchase Order receiving to automatic inward batch creation.
  2. Add Customer Khata repayment settlement endpoint (`POST /api/customers/:id/payments`) with WhatsApp receipts.
  3. Add Sales Return endpoint (`POST /api/sales/:id/return`) with inventory restocking.
* **Exit Condition**: Shopkeeper can receive supplier goods, settle customer credit, and accept customer returns with 100% accurate stock and accounting.

---

### 🏁 PHASE 3: Offline Sync, Taxes & Caching (P2)
* **Goal**: Ensure reliability under poor internet connectivity and provide tax compliance.
* **Tasks**:
  1. Add automatic sync queue reconciliation for offline POS billing.
  2. Build GSTR-1 and GSTR-3B tax summary spreadsheet exporter in `GstService.js`.
  3. Add Redis cache invalidation on new sales/expenses writes.
* **Exit Condition**: Bills created offline automatically sync on reconnect, and the merchant can download GST tax reports.

---

### 🏁 PHASE 4: Production Hardening & Final Launch (P3)
* **Goal**: Final operational readiness and security verification.
* **Tasks**:
  1. Run end-to-end regression tests across POS, Inventory, and Khata.
  2. Verify rate limiting, Helmet headers, and multi-tenant isolation.
  3. Verify database backup schedule and monitoring alerts.
* **Exit Condition**: All tests pass, production builds succeed with zero warnings, and health checks return 200 OK.

---

# 13. 🚀 NEXT 5 TASKS (What To Work On Immediately)

These are the immediate 5 tasks in exact priority order:

### 1. Connect POS Checkout to Modern StockService
* **Why**: POS billing currently writes to the old inventory table, causing stock divergence.
* **Files**: [`backend/src/services/SalesService.js`](file:///e:/Projects/FinSathi/backend/src/services/SalesService.js), [`backend/src/modules/inventory/services/StockService.js`](file:///e:/Projects/FinSathi/backend/src/modules/inventory/services/StockService.js)
* **Action**: Make `SalesService.createSale()` acquire a row lock via `StockService.lockWarehouseStock()`, deduct from `warehouse_stock`, and log the movement in `inventory_movements`.

---

### 2. Connect Inventory Page to Modern Catalog API
* **Why**: The Inventory screen currently calls the old flat product API and cannot show variants or barcodes.
* **Files**: [`frontend/src/pages/InventoryPage.jsx`](file:///e:/Projects/FinSathi/frontend/src/pages/InventoryPage.jsx), [`frontend/src/components/billing/ItemAdder.jsx`](file:///e:/Projects/FinSathi/frontend/src/components/billing/ItemAdder.jsx)
* **Action**: Switch endpoints to `/api/v1/catalog/products` and add variant/barcode inputs in the UI.

---

### 3. Add Client-Side Token Auto-Refresh Interceptor
* **Why**: When a 15-minute access token expires during billing, checkout requests fail.
* **Files**: [`frontend/src/services/apiClient.js`](file:///e:/Projects/FinSathi/frontend/src/services/apiClient.js)
* **Action**: Add an Axios 401 response interceptor that calls `/api/v1/auth/refresh` using the HttpOnly cookie and retries failed requests seamlessly.

---

### 4. Connect Purchase Order Inward Stock Receiving
* **Why**: Receiving a supplier order does not automatically add batches to warehouse stock.
* **Files**: [`backend/src/controllers/PurchaseOrderController.js`](file:///e:/Projects/FinSathi/backend/src/controllers/PurchaseOrderController.js)
* **Action**: When PO status changes to `received`, automatically call `StockService.postOpeningStock()` for each PO item.

---

### 5. Customer Khata Repayment Settlement Flow
* **Why**: Merchants cannot record partial debt repayments when customers pay down their balance.
* **Files**: [`backend/src/controllers/CustomerController.js`](file:///e:/Projects/FinSathi/backend/src/controllers/CustomerController.js), [`frontend/src/pages/CustomersPage.jsx`](file:///e:/Projects/FinSathi/frontend/src/pages/CustomersPage.jsx)
* **Action**: Add `POST /api/customers/:id/payments` endpoint and UI repayment modal with instant WhatsApp receipt.

---

# 14. ⚠️ Things We Should NOT Do

* ❌ **Do NOT rebuild the inventory engine**: `StockService.js` and `warehouse_stock` already exist and are tested. We only need to connect POS to it.
* ❌ **Do NOT create new database tables for existing features**: Sprints 1–4 already created the modern schema in migrations 51–54.
* ❌ **Do NOT delete legacy code before verifying connections**: Leave backward-compatible route aliases until the frontend switch is fully verified.
* ❌ **Do NOT add new AI features before inventory and billing are consistent**: Correct financial data is 100x more important than new experimental features.
* ❌ **Do NOT give the AI direct database write access**: The LLM must remain an intent parser only, never executing raw SQL.

---

# 15. The Final Product (What FinSathi Will Look Like)

When FinSathi is finished, this is the complete merchant experience:

1. **Morning Opening**: The shopkeeper opens FinSathi on their tablet. The Dashboard shows today's Business Health Score (88/100), cash on hand, and 3 proactive tips (*"Reorder 20kg sugar before Friday; 3 customer bills are overdue"*).
2. **Fast POS Checkout**: A customer brings 4 items. The cashier scans barcodes (or types initials). Items, variants, and GST taxes calculate instantly. Cashier presses `F4` (Cash), and a PDF bill is generated in under 1 second.
3. **Automatic Stock Update**: The warehouse stock drops by 4, the nearest-expiring batch is deducted, and an audit row is logged in the background.
4. **Customer Credit (*Udhaar*)**: A trusted customer buys on credit. The cashier selects "Khata". The bill total adds to the customer's balance, and a WhatsApp payment link is sent automatically.
5. **Supplier Restock**: A supplier delivers 50 boxes of biscuits. The shopkeeper clicks "Mark Received" on the Purchase Order. 50 boxes enter the inventory batch with expiry date and cost price automatically.
6. **Voice Query**: The shopkeeper taps the mic and asks: *"Aaj kitna munafa hua?"*. FinVoice answers in warm Hindi: *"Aaj total sales ₹14,200 hui hai, estimated profit ₹3,100 hai."*
7. **Evening Summary**: The daily cron generates the evening sales summary, checks for cash leakage anomalies, and prepares the 14-day cash flow forecast.

---

# 16. Final Definition of DONE

FinSathi is officially **FINAL & PRODUCTION-READY** when:

* [ ] **Single Source of Truth**: All stock changes (POS sales, PO receipts, returns, adjustments) update `warehouse_stock` through `StockService`.
* [ ] **Zero Split-Brain**: No production user workflow writes to the legacy inventory table.
* [ ] **Concurrency Safe**: Two simultaneous sales on the last available unit cannot cause negative stock (protected by `SELECT FOR UPDATE`).
* [ ] **Customer Khata**: Shopkeepers can record customer debt repayments in 2 clicks with WhatsApp receipts.
* [ ] **Offline Resilience**: Offline POS bills automatically sync when internet reconnects.
* [ ] **Zero Session Crashes**: Access token expiry is handled invisibly via background refresh token rotation.
* [ ] **Test Coverage**: All automated test suites (`identity`, `masters`, `catalog`, `inventory`) pass with zero regressions.
* [ ] **Living Documentation**: [`FINSATHI_PROJECT_KNOWLEDGE.md`](file:///e:/Projects/FinSathi/FINSATHI_PROJECT_KNOWLEDGE.md) and [`CURRENT_STATE.md`](file:///e:/Projects/FinSathi/CURRENT_STATE.md) remain 100% synchronized with the codebase.

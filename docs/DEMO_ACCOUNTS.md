# 📦 Sanchay (संचय) — Complete Demo Environment, Users, Roles & Testing Guide

Welcome to the **Sanchay Demo Environment**. This environment is pre-configured with realistic multi-tenant data, multi-branch store operations, real-world catalog items with batch management, live customer ledgers, supplier purchase workflows, sales invoices, expense trackers, and role-based access control (RBAC).

---

## 🔑 Demo Accounts & Credentials Directory

All demo accounts share the standard development password: **`Sanchay@12345`**

| Organization | Role | Email | Password | Access Scope & Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Sharma General Store** | **Owner** | `demo.owner@sanchay.test` | `Sanchay@12345` | **Full Platform Access**: Dashboard analytics, Sanchay stock, multi-store switcher, RBAC matrix, financial reports, settings |
| **Sharma General Store** | **Manager** | `demo.manager@sanchay.test` | `Sanchay@12345` | **Store Operations**: Staff management, purchase orders approval, customer credit, stock counts, sales oversight |
| **Sharma General Store** | **Cashier** | `demo.cashier@sanchay.test` | `Sanchay@12345` | **POS Terminal**: Fast barcode/SKU billing, customer lookup, cash/UPI receipt generation, invoice history |
| **Sharma General Store** | **Accountant** | `demo.accountant@sanchay.test` | `Sanchay@12345` | **Finance & Tax**: P&L statements, expense categorization, GST tax reports export, customer payment ledgers |
| **Sharma General Store** | **Inventory Manager** *(Warehouse Staff)* | `demo.inventory@sanchay.test` | `Sanchay@12345` | **Sanchay Stock Hub**: Batch tracking (FEFO/FIFO), low-stock restock recommendations, valuation, catalog updates |
| **Sharma General Store** | **Delivery Staff** | `demo.delivery@sanchay.test` | `Sanchay@12345` | **Order Fulfillment**: Dispatched orders, delivery milestones, customer drop-off verification |
| **Verma Wholesale Traders** | **Owner (Wholesale)** | `demo.wholesale@sanchay.test` | `Sanchay@12345` | **B2B Bulk Trade**: Sacks/cartons inventory, wholesale tiered pricing, bulk supplier credit, high-value invoicing |
| **UrbanWear Store** | **Owner (Apparel)** | `demo.apparel@sanchay.test` | `Sanchay@12345` | **Fashion & Variants**: Multi-SKU sizes (32, 34, M, L), color variants, garment stock batches, boutique POS |
| **System Admin Portal** | **Superadmin** | `admin@finsathi.com` | `finadmin123` | **Platform Administration**: Access at `/admin/login`. Tenant supervision, user activation/suspension, audit trail |

---

## 🏢 Pre-Seeded Organizations & Multi-Store Branches

### 1. Sharma General Store *(Retail FMCG & Grocery — Delhi)*
- **Tenant ID / Scope**: Multi-branch grocery business.
- **Branches**:
  - **Main Branch**: B-14, Inner Circle, Connaught Place, New Delhi (`07AAAAA1234A1Z1`)
  - **City Branch**: 18/4, Ajmal Khan Road, Karol Bagh, New Delhi
- **Catalog**: 40+ FMCG, staples, dairy, beverages, snacks, personal care, and household items.
- **Stock States Represented**:
  - ✅ **Healthy Stock**: Atta, Basmati Rice, Toor Dal, Sunflower Oil, Amul Milk, Maggi, Good Day.
  - ⚠️ **Low Stock Alert (< 10 units)**: California Almonds (4 pkts left), Goa Cashew Nuts (3 pkts left), Horlicks Malt (2 jars left).
  - 🚫 **Stockout (0 units)**: Borges Extra Virgin Olive Oil, Organic India Tulsi Tea, Saffola Gold Oil.
  - 🔄 **Multi-Batch (FEFO/FIFO)**: Active batches (e.g. `Batch 2026-JUN`, `Batch 2026-JUL`) with distinct cost prices and expiry dates.

### 2. Verma Wholesale Traders *(Wholesale Commodity Distribution — Mumbai)*
- **Depot**: Sector 19, APMC Commodity Market, Vashi, Navi Mumbai (`27BBBBB5678B1Z2`)
- **Catalog**: 50kg Rice Sacks, 50kg Wheat Sacks, 15L Oil Commercial Tins, 50kg Sugar Bags, 30kg Chana Dal Sacks.
- **Features**: Wholesale pricing tiers, volume discounts, bulk B2B purchase orders.

### 3. UrbanWear Store *(Retail Apparel & Fashion — Bengaluru)*
- **Flagship Store**: 742, 100 Feet Road, Indiranagar, Bengaluru (`29CCCCC9012C1Z3`)
- **Catalog**: Slim Fit Denim Jeans (32/34 Midnight Blue), Combed Cotton T-Shirts (M/L Black, M White), Pure Linen Shirts.
- **Features**: Multi-attribute size & color matrix, variant barcode generation, seasonal batch collections.

---

## 🛡️ RBAC Permissions Matrix

| Permission Key | Description | Owner | Manager | Cashier | Accountant | Warehouse Staff | Delivery Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `view_catalog` | View Sanchay stock & product catalog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `edit_catalog` | Create, edit, and update product items | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `delete_inventory`| Remove catalog products permanently | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `run_counts` | Run stock adjustments & batch counts | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `adjust_costs` | Adjust cost prices & unit margins | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `create_sales` | Create POS bills, invoices, and receipts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `view_billing` | View POS history, receipts & invoice ledger| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `post_invoices` | Post purchase invoices & vendor bills | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `approve_po` | Approve vendor purchase orders | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `admin_setup` | Access Access Matrix & security settings| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🧪 Role-Specific Testing Workflows

### 👑 Workflow 1: Business Owner (`demo.owner@sanchay.test`)
1. **Login**: Navigate to `/login` and enter `demo.owner@sanchay.test` / `Sanchay@12345`.
2. **Dashboard Overview**: Check today's sales KPI (₹25,000+), revenue trend sparkline, AOV, and low-stock widget.
3. **Sanchay Stock Hub (`/inventory`)**:
   - Filter by *Low Stock* or *Stockout* to view items needing reorder.
   - Click **Quick Restock** to generate replenishment recommendations.
   - Inspect batch breakdown with FIFO/FEFO expiration indicators.
4. **Access Matrix (`/rbac`)**:
   - View permission toggles across all 6 roles.
   - Verify that Owner permissions remain permanently locked and active.
5. **Multi-Store Switcher (`/stores`)**: Switch between *Main Branch* and *City Branch*.

---

### 🏪 Workflow 2: Store Manager (`demo.manager@sanchay.test`)
1. **Login**: Sign in with `demo.manager@sanchay.test` / `Sanchay@12345`.
2. **Staff Hub (`/staff`)**:
   - View active staff roster (Cashier, Accountant, Warehouse, Delivery).
   - Check attendance logs and salary structures.
3. **Purchases & Vendor POs (`/suppliers`)**:
   - Open **Purchase Orders** to review `Sent` and `Draft` POs.
   - Change PO status from `Accepted` to `Received` to verify automatic stock batch increment.

---

### 🧾 Workflow 3: POS Cashier (`demo.cashier@sanchay.test`)
1. **Login**: Sign in with `demo.cashier@sanchay.test` / `Sanchay@12345`.
2. **POS Terminal (`/billing`)**:
   - Search for `Aashirvaad Atta` or `Amul Butter` via barcode or name search.
   - Select Customer `Rajesh Kumar` (`9876543210`).
   - Select Payment Method: **UPI** (generates dynamic QR) or **Cash**.
   - Click **Generate Invoice & Print** to verify receipt layout.
3. **Invoice Ledger (`/invoice-history`)**: View recently closed transactions.

---

### 📊 Workflow 4: Tax & Financial Accountant (`demo.accountant@sanchay.test`)
1. **Login**: Sign in with `demo.accountant@sanchay.test` / `Sanchay@12345`.
2. **P&L Analytics (`/pnl`)**:
   - Inspect Gross Revenue, Cost of Goods Sold (COGS), Gross Profit, and Operating Expenses.
   - Review net profit margins.
3. **Expenses Outflow (`/expenses`)**:
   - Review pre-seeded expense categories: *Rent*, *Staff Salary*, *Electricity*, *Logistics*, *Packaging*.
   - Click **Add Expense** to log a new receipt.
4. **GST Tax Reports (`/reports/gst`)**:
   - View GSTR-1 outward supplies summary with tax slab breakdowns (0%, 5%, 12%, 18%).
   - Export GST report to Excel / CSV.

---

### 📦 Workflow 5: Warehouse & Sanchay Stock Lead (`demo.inventory@sanchay.test`)
1. **Login**: Sign in with `demo.inventory@sanchay.test` / `Sanchay@12345`.
2. **Sanchay Stock Operations (`/inventory`)**:
   - Review batch health and total valuation.
   - Filter items by category (Dairy, Snacks, Grains, Personal Care).
   - Verify that administrative settings and P&L financial data are appropriately restricted under RBAC.

---

### 🚚 Workflow 6: Wholesale & Apparel Demo Owners
- **Wholesale (`demo.wholesale@sanchay.test`)**: Test bulk sack units, wholesale price margins, and vendor purchase orders.
- **Apparel (`demo.apparel@sanchay.test`)**: Test denim jeans and cotton t-shirt variants across sizes (32, 34, M, L) and colors (Black, White, Blue).

---

## 🔄 How to Re-Seed or Reset Demo Data

The seed script is fully **idempotent** and can be run at any time to restore the demo environment to its pristine starting state:

```bash
# In the backend directory
cd backend
npm run seed:demo
```

This will safely clear and re-populate all `@sanchay.test` demo organizations, accounts, products, batches, customer ledgers, POs, invoices, and notifications without affecting any non-demo user data.

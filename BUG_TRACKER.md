# 🐛 FinSathi Bug Tracker & Investigation Database

This document acts as the immutable log and tracker for all identified codebase bugs, logic anomalies, and architectural violations in the FinSathi project. 

---

## 📌 Master Bug Tracker Table

| Bug ID | Affected Module | Priority | Status | Risk | Dependencies | Ready to Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **BUG-001** | Kiosk Check-In | **Critical** | FIXED | Low | Database / API | Yes |
| **BUG-002** | Anomaly Detection | **High** | FIXED | Low | Backend Logic | Yes |
| **BUG-003** | Health Score Logs | **High** | FIXED | Medium | Database / Service | Yes |
| **BUG-004** | Cash Flow Forecast | **Medium** | FIXED | Medium | Service Logic | Yes |
| **BUG-005** | Dashboard API Hook | **Medium** | FIXED | Medium | Frontend Hook & API | Yes |
| **BUG-006** | Sub-tab Navigation | **Medium** | OPEN | Low | Frontend Routing | Yes |
| **BUG-007** | Dead Code & Duplicates| **Low** | OPEN | Low | Frontend Files | Yes |
| **BUG-008** | Bundle Performance | **Low** | OPEN | Low | Frontend Import | Yes |
| **BUG-009** | Backend Architecture | **High** | OPEN | High | Backend Layers | Yes |
| **BUG-010** | Frontend Architecture | **Medium** | OPEN | Medium | Frontend Components| Yes |

---

## 🔍 Detailed Bug Investigation Reports

### BUG-001: Kiosk Business Info Retrieval Crash
* **Bug Information:**
  - Bug ID: BUG-001
  - Module: Kiosk check-in
  - Priority: Critical
  - Severity: High
  - Status: FIXED
* **Symptoms:**
  - Exactly what happens: When accessing the public kiosk check-in page (`/attend?biz=...`), the terminal crashes and fails to display the business owner's business name.
  - Expected behaviour: The kiosk page should load successfully, fetch the business name from the merchant account, and display the employee roster.
  - Actual behaviour: The backend logs throw a Postgres database error: `error: relation "profiles" does not exist`, and the API returns a 500 server error, resulting in a frontend crash/blank page.
* **Root Cause:**
  - Why it happens: The kiosk route attempts to query a table named `profiles` to get the `business_name`. However, there is no `profiles` table in the database schema. The merchant profile information is stored in the `users` table, which contains the `business_name` column.
  - Which file starts the issue: [`kioskRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/kioskRoutes.js#L10)
  - Which files are affected: [`kioskRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/kioskRoutes.js)
  - Whether frontend, backend, database or API is responsible: Backend API
* **Dependency Analysis:**
  - Routes: [`kioskRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/kioskRoutes.js)
  - Controllers: None (logic resides directly in the routes file).
  - Services: None.
  - Repositories: None.
  - Components: [`AttendanceTerminal.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/AttendanceTerminal.jsx) (calls `GET /api/kiosk/business/:id`).
  - Hooks: None.
  - Database tables: `users` (correct target), `profiles` (non-existent).
  - API endpoints: `GET /api/kiosk/business/:id`
  - State management: None.
* **Regression Risk:** Low
  - Explain why: This route is only consumed by the public kiosk view. It does not affect other merchant dashboards, billing, or inventory modules.
* **Fix Strategy:**
  - Explain the safest fix: Modify line 10 of [`kioskRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/kioskRoutes.js) to query the `users` table instead of the `profiles` table.
  - Files to modify: [`kioskRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/kioskRoutes.js)
  - Files NOT to modify: [`AttendanceTerminal.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/AttendanceTerminal.jsx).
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **Kiosk Check-In:** Access `/attend?biz=<user-uuid>` in the browser. Verify the page loads correctly and displays the business name.
    - **Staff Clock-In:** Select a staff member, enter their token, and verify that clock-in/out records successfully.
    - **Authentication:** Verify merchant authentication and general dashboard operations remain unaffected.
* **Possible Hidden Bugs:**
  - Review other kiosk routes to ensure no other references to `profiles` exist. (No other references found; other routes fetch from `staff` or `attendance`).

---

### BUG-002: False Positives in Off-Hours Billing Anomaly
* **Bug Information:**
  - Bug ID: BUG-002
  - Module: Anomaly Detection
  - Priority: High
  - Severity: High
  - Status: FIXED
* **Symptoms:**
  - Exactly what happens: Normal business sales logged in the morning (e.g. 8:30 AM IST) are flagged as "Off-hours billing" anomalies.
  - Expected behaviour: Only invoices created outside standard business hours (before 6 AM IST or after 11 PM IST) should be flagged.
  - Actual behaviour: Transactions are incorrectly flagged because the server compares the hour in UTC time.
* **Root Cause:**
  - Why it happens: The server retrieves the hour using `new Date(sale.created_at).getHours()`. Since servers on cloud platforms (e.g., Supabase, Vercel) default to UTC, a sale at 8:30 AM IST (3:00 AM UTC) yields `getHours() = 3`. Because 3 < 6, it flags the sale as off-hours cash leakage.
  - Which file starts the issue: [`AnomalyService.js`](file:///d:/Projects/FinSathi/backend/src/services/AnomalyService.js#L105)
  - Which files are affected: [`AnomalyService.js`](file:///d:/Projects/FinSathi/backend/src/services/AnomalyService.js), `public.anomaly_flags` table.
  - Whether frontend, backend, database or API is responsible: Backend Service
* **Dependency Analysis:**
  - Routes: [`intelligenceRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/intelligenceRoutes.js)
  - Controllers: None.
  - Services: [`AnomalyService.js`](file:///d:/Projects/FinSathi/backend/src/services/AnomalyService.js)
  - Repositories: None.
  - Components: [`AnomalyBanner.jsx`](file:///d:/Projects/FinSathi/frontend/src/components/Dashboard/AnomalyBanner.jsx)
  - Hooks: None.
  - Database tables: `sales`, `anomaly_flags`
  - API endpoints: `POST /api/intelligence/anomalies/scan`
  - State management: None.
* **Regression Risk:** Low
  - Explain why: It only alters anomaly flagging heuristics. It does not touch sales, inventory, or billing databases.
* **Fix Strategy:**
  - Explain the safest fix: Modify [`AnomalyService.js`](file:///d:/Projects/FinSathi/backend/src/services/AnomalyService.js) to convert the timestamp to Indian Standard Time (IST, UTC+5:30) before extracting the hour. Shift the time by adding `5.5 * 60 * 60 * 1000` milliseconds to the date value and then call `getUTCHours()`.
  - Files to modify: [`AnomalyService.js`](file:///d:/Projects/FinSathi/backend/src/services/AnomalyService.js)
  - Files NOT to modify: `sales` repository or controllers.
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **Anomaly Scan:** Trigger anomaly scan via `/api/intelligence/anomalies/scan`.
    - **Dashboard:** Ensure the dashboard anomaly banner updates correctly and no longer displays standard hours sales as anomalies.
    - **Off-hours verification:** Create a sale at 2:00 AM IST and verify it is correctly flagged.
* **Possible Hidden Bugs:**
  - Other date/time checks (e.g. daily summaries, sales reports) might calculate boundaries using server local time instead of IST, causing transactions logged near midnight IST to show on the wrong day.

---

### BUG-003: Database Constraint Error on Health Score Recalculation
* **Bug Information:**
  - Bug ID: BUG-003
  - Module: Business Health Score
  - Priority: High
  - Severity: High
  - Status: FIXED
* **Symptoms:**
  - Exactly what happens: Recalculating the health score multiple times in a single day fails to update history and logs warnings `[HealthScoreService] Snapshot save error: ...` in the server console.
  - Expected behaviour: Running recalculations multiple times in a day should update the score record for today, leaving a single trend point.
  - Actual behaviour: A unique constraint error is thrown by Postgres because the conflict target doesn't match the database constraint.
* **Root Cause:**
  - Why it happens: The database unique index is defined on `UNIQUE(user_id, recorded_at::date)`. The code tries to upsert using `onConflict: "user_id,recorded_at"`. Since `recorded_at` is a full timestamp column, PostgREST tries to find a constraint on `(user_id, recorded_at)`, which does not exist, causing a conflict target mismatch.
  - Which file starts the issue: [`HealthScoreService.js`](file:///d:/Projects/FinSathi/backend/src/services/HealthScoreService.js#L310)
  - Which files are affected: [`HealthScoreService.js`](file:///d:/Projects/FinSathi/backend/src/services/HealthScoreService.js), `public.business_health_scores` table.
  - Whether frontend, backend, database or API is responsible: Backend Service / Database interface
* **Dependency Analysis:**
  - Routes: [`intelligenceRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/intelligenceRoutes.js)
  - Controllers: None (handled directly in routes and services).
  - Services: [`HealthScoreService.js`](file:///d:/Projects/FinSathi/backend/src/services/HealthScoreService.js)
  - Repositories: None.
  - Components: [`BusinessHealthPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/BusinessHealthPage.jsx)
  - Hooks: None.
  - Database tables: `business_health_scores`
  - API endpoints: `GET /api/intelligence/health-score`
  - State management: None.
* **Regression Risk:** Medium
  - Explain why: Affects historical tracking charts. If history fails to save, trend lines will be empty.
* **Fix Strategy:**
  - Explain the safest fix: Instead of relying on `onConflict` matching an expression index, implement a select-then-insert-or-update pattern: check if a score record exists for this user where `recorded_at` is within the current UTC date range. If found, update it by ID; otherwise, insert a new record.
  - Files to modify: [`HealthScoreService.js`](file:///d:/Projects/FinSathi/backend/src/services/HealthScoreService.js)
  - Files NOT to modify: Database schema.
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **Health Score History:** Trigger health score recalculation multiple times. Verify that no DB warnings appear and a single entry for the day is updated.
    - **Dashboard / Reports:** Verify the historical trend line graph loads points correctly.
* **Possible Hidden Bugs:**
  - Other history tables implementing custom unique expression indexes might suffer from similar PostgREST upsert failures.

---

### BUG-004: Inaccurate Outflows & Dues in Cash Flow Forecast
* **Bug Information:**
  - Bug ID: BUG-004
  - Module: Cash Flow Projection
  - Priority: Medium
  - Severity: Medium
  - Status: FIXED
* **Symptoms:**
  - Exactly what happens: Projected inflows are inaccurate because the forecasting service assumes all partial invoices are exactly 50% paid, and due dates are completely ignored (using invoice dates instead).
  - Expected behaviour: Cash flow forecasts should aggregate actual invoice outstanding dues (`total - amount_paid`) and project them on the exact invoice `due_date`.
  - Actual behaviour: The forecast uses hardcoded 50% mock calculations and sale dates, ignoring the correct columns.
* **Root Cause:**
  - Why it happens: The developer assumed that `amount_paid` and `due_date` columns were missing from the database and wrote mock heuristics. However, these columns exist in the database.
  - Which file starts the issue: [`CashFlowService.js`](file:///d:/Projects/FinSathi/backend/src/services/CashFlowService.js#L65)
  - Which files are affected: [`CashFlowService.js`](file:///d:/Projects/FinSathi/backend/src/services/CashFlowService.js), [`CashFlowWidget.jsx`](file:///d:/Projects/FinSathi/frontend/src/components/Dashboard/CashFlowWidget.jsx).
  - Whether frontend, backend, database or API is responsible: Backend Service
* **Dependency Analysis:**
  - Routes: [`intelligenceRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/intelligenceRoutes.js)
  - Controllers: None.
  - Services: [`CashFlowService.js`](file:///d:/Projects/FinSathi/backend/src/services/CashFlowService.js)
  - Repositories: [`SalesRepository.js`](file:///d:/Projects/FinSathi/backend/src/repositories/SalesRepository.js)
  - Components: [`CashFlowWidget.jsx`](file:///d:/Projects/FinSathi/frontend/src/components/Dashboard/CashFlowWidget.jsx)
  - Hooks: None.
  - Database tables: `sales`
  - API endpoints: `GET /api/intelligence/cashflow`
  - State management: None.
* **Regression Risk:** Medium
  - Explain why: This changes the projected cash balances and cash crunch alerts shown on the dashboard.
* **Fix Strategy:**
  - Explain the safest fix: Modify [`CashFlowService.js`](file:///d:/Projects/FinSathi/backend/src/services/CashFlowService.js) to:
    1. Query `amount_paid` and `due_date` columns in the `upcomingUnpaidSales` sub-query.
    2. Sum `amount_paid` across all sales for starting balance, instead of using the 50% heuristic.
    3. Project remaining dues (`total - amount_paid`) on their exact `due_date` (falling back to `date` if not set).
  - Files to modify: [`CashFlowService.js`](file:///d:/Projects/FinSathi/backend/src/services/CashFlowService.js)
  - Files NOT to modify: [`CashFlowWidget.jsx`](file:///d:/Projects/FinSathi/frontend/src/components/Dashboard/CashFlowWidget.jsx).
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **Dashboard Widget:** Verify the Cash Flow widget lists accurate balance trends.
    - **Calculations validation:** Create a sale with ₹10,000 total, ₹3,000 amount_paid, and due date set to 7 days away. Verify the starting balance increases by ₹3,000, and day 7 projection contains the outstanding ₹7,000 (weighted).
* **Possible Hidden Bugs:**
  - If other analytics dashboards calculate outstanding dues manually, they might also contain mock fallback equations.

---

### BUG-005: Broken Dashboard API Hook
* **Bug Information:**
  - Bug ID: BUG-005
  - Module: Dashboard Analytics
  - Priority: Medium
  - Severity: Medium
  - Status: FIXED
* **Symptoms:**
  - Exactly what happens: The custom React query hook `useDashboardData` fails with a 404 network error.
  - Expected behaviour: The dashboard page should fetch and cache data using `useDashboardData()`.
  - Actual behaviour: The hook points to `/dashboard/data` (which returns 404). To compensate, the dashboard page calls `/dashboard` directly using a raw manual Axios request inside a `useEffect` function.
* **Root Cause:**
  - Why it happens: Mismatched API paths. The backend mounts dashboard routes on `/api/dashboard/` and listens to `GET /`. However, the frontend API utility calls `/dashboard/data`.
  - Which file starts the issue: [`api/dashboard.js`](file:///d:/Projects/FinSathi/frontend/src/api/dashboard.js#L15)
  - Which files are affected: [`api/dashboard.js`](file:///d:/Projects/FinSathi/frontend/src/api/dashboard.js), [`Dashboard.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/Dashboard/Dashboard.jsx), [`useDashboard.js`](file:///d:/Projects/FinSathi/frontend/src/hooks/useDashboard.js).
  - Whether frontend, backend, database or API is responsible: Frontend API Client
* **Dependency Analysis:**
  - Routes: [`dashboardRoutes.js`](file:///d:/Projects/FinSathi/backend/src/routes/dashboardRoutes.js) (backend)
  - Controllers: [`dashboardController.js`](file:///d:/Projects/FinSathi/backend/src/controllers/dashboardController.js) (backend)
  - Services: [`DashboardService.js`](file:///d:/Projects/FinSathi/backend/src/services/DashboardService.js)
  - Repositories: [`DashboardRepository.js`](file:///d:/Projects/FinSathi/backend/src/repositories/DashboardRepository.js)
  - Components: [`Dashboard.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/Dashboard/Dashboard.jsx)
  - Hooks: [`useDashboard.js`](file:///d:/Projects/FinSathi/frontend/src/hooks/useDashboard.js)
  - Database tables: None.
  - API endpoints: `/api/dashboard` (mismatched as `/api/dashboard/data`)
  - State management: TanStack Query cache (`["dashboardData"]` key).
* **Regression Risk:** Medium
  - Explain why: Refactoring the main dashboard fetch logic to use TanStack Query changes how rendering lifecycles, load states, and errors are handled.
* **Fix Strategy:**
  - Explain the safest fix:
    1. In [`api/dashboard.js`](file:///d:/Projects/FinSathi/frontend/src/api/dashboard.js), change the endpoint from `/dashboard/data` to `/dashboard`.
    2. In [`Dashboard.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/Dashboard/Dashboard.jsx), replace the manual state and `useEffect` fetch logic with the `useDashboardData()` hook.
  - Files to modify: [`api/dashboard.js`](file:///d:/Projects/FinSathi/frontend/src/api/dashboard.js), [`Dashboard.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/Dashboard/Dashboard.jsx).
  - Files NOT to modify: Backend dashboard controllers/routes.
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **Dashboard Loading:** Navigate to `/dashboard` and verify stats load correctly without 404 errors. Check that charts and metrics render.
* **Possible Hidden Bugs:**
  - None.

---

### BUG-006: Sub-tab Navigation Mismatch inside General Hub
* **Bug Information:**
  - Bug ID: BUG-006
  - Module: Frontend Routing
  - Priority: Medium
  - Severity: Low
  - Status: OPEN
* **Symptoms:**
  - Exactly what happens: Clicking "Subsidy Matcher" or "Reminders Autopilot" in the Sidebar redirects the user to `/general?tab=growth`, but the page displays the "Feature Modules" tab anyway.
  - Expected behaviour: The general page should load with the tab specified in the URL query parameter active.
  - Actual behaviour: The tab query parameter is ignored, and the default tab (`modules`) is always active.
* **Root Cause:**
  - Why it happens: `GeneralPage.jsx` initializes `activeTab` to `"modules"` and never inspects the URL's query parameters to set or sync the active tab state.
  - Which file starts the issue: [`GeneralPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GeneralPage.jsx#L34)
  - Which files are affected: [`GeneralPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GeneralPage.jsx).
  - Whether frontend, backend, database or API is responsible: Frontend Page Routing
* **Dependency Analysis:**
  - Routes: [`App.jsx`](file:///d:/Projects/FinSathi/frontend/src/App.jsx)
  - Controllers: None.
  - Services: None.
  - Repositories: None.
  - Components: [`Sidebar.jsx`](file:///d:/Projects/FinSathi/frontend/src/components/Sidebar.jsx) (contains the redirect links `/reminders`, `/growth`, etc., which map to `/general?tab=xxx`).
  - Hooks: `useSearchParams` (react-router-dom)
  - Database tables: None.
  - API endpoints: None.
  - State management: Component local state.
* **Regression Risk:** Low
  - Explain why: This only affects client-side tab selection.
* **Fix Strategy:**
  - Explain the safest fix: Modify [`GeneralPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GeneralPage.jsx) to use `useSearchParams` from `react-router-dom` to manage the active tab state directly from the URL. Derive `activeTab = searchParams.get("tab") || "modules"`. Provide `setActiveTab` as a function that calls `setSearchParams({ tab: tabId })`.
  - Files to modify: [`GeneralPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GeneralPage.jsx)
  - Files NOT to modify: [`Sidebar.jsx`](file:///d:/Projects/FinSathi/frontend/src/components/Sidebar.jsx).
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **General Page Navigation:** Open "Reminders Autopilot" from the Sidebar and verify it displays the reminders panel directly. Verify all other tabs load correctly on URL modification.
* **Possible Hidden Bugs:**
  - None.

---

### BUG-007: Unused Code Files
* **Bug Information:**
  - Bug ID: BUG-007
  - Module: Code Cleanup
  - Priority: Low
  - Severity: Low
  - Status: OPEN
* **Symptoms:**
  - Exactly what happens: Unused, duplicate files (`AttendanceScanPage.jsx`, `ToolsPage.jsx`) clutter the project directory.
  - Expected behaviour: The codebase contains only files in active use.
  - Actual behaviour: Deprecated files are kept, causing confusion.
* **Root Cause:**
  - Why it happens: These files are legacy artifacts from earlier iterations. They were replaced by `AttendanceTerminal.jsx` (for kiosk check-ins) and `GeneralPage.jsx` (for general settings), but were never deleted.
  - Which file starts the issue: [`AttendanceScanPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/AttendanceScanPage.jsx), [`ToolsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/ToolsPage.jsx).
  - Which files are affected: Codebase repository files.
  - Whether frontend, backend, database or API is responsible: Frontend Filesystem
* **Dependency Analysis:**
  - Routes: [`App.jsx`](file:///d:/Projects/FinSathi/frontend/src/App.jsx) (lazy imports defined but unused or mapped to other files).
  - Controllers: None.
  - Services: None.
  - Repositories: None.
  - Components: None.
  - Hooks: None.
  - Database tables: None.
  - API endpoints: None.
  - State management: None.
* **Regression Risk:** Low
  - Explain why: Deleting files that are never imported or routed has zero risk.
* **Fix Strategy:**
  - Explain the safest fix: Delete the files [`AttendanceScanPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/AttendanceScanPage.jsx) and [`ToolsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/ToolsPage.jsx). Remove the unused import for `ToolsPage` on line 24 of [`App.jsx`](file:///d:/Projects/FinSathi/frontend/src/App.jsx).
  - Files to modify/delete: [`ToolsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/ToolsPage.jsx), [`AttendanceScanPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/AttendanceScanPage.jsx), [`App.jsx`](file:///d:/Projects/FinSathi/frontend/src/App.jsx).
  - Files NOT to modify: Any active page files.
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **Frontend Compile:** Run `npm run build` to verify there are no missing import dependencies across the bundle.
* **Possible Hidden Bugs:**
  - None.

---

### BUG-008: Static Library Import Bloat
* **Bug Information:**
  - Bug ID: BUG-008
  - Module: Bundle Performance
  - Priority: Low
  - Severity: Low
  - Status: OPEN
* **Symptoms:**
  - Exactly what happens: The initial JavaScript bundle size is bloated, leading to slow page transitions and slow load times on slow mobile network connections.
  - Expected behaviour: The heavy `xlsx` Excel export library should be chunked separately and dynamically loaded only when the user clicks "Export to Excel".
  - Actual behaviour: `xlsx` is statically imported at the top of the GstReportsPage, adding weight to the initial layout bundle.
* **Root Cause:**
  - Why it happens: Static import statement `import * as XLSX from 'xlsx';` is declared at the top of the component.
  - Which file starts the issue: [`GstReportsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GstReportsPage.jsx#L9)
  - Which files are affected: [`GstReportsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GstReportsPage.jsx).
  - Whether frontend, backend, database or API is responsible: Frontend Import Strategy
* **Dependency Analysis:**
  - Routes: None.
  - Controllers: None.
  - Services: None.
  - Repositories: None.
  - Components: [`GstReportsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GstReportsPage.jsx)
  - Hooks: None.
  - Database tables: None.
  - API endpoints: None.
  - State management: None.
* **Regression Risk:** Low
  - Explain why: Dynamic imports are natively supported in Vite.
* **Fix Strategy:**
  - Explain the safest fix: Remove `import * as XLSX from 'xlsx'` from the top of [`GstReportsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GstReportsPage.jsx). Inside the `exportToExcel` function, load it dynamically: `const XLSX = await import('xlsx');`.
  - Files to modify: [`GstReportsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GstReportsPage.jsx)
  - Files NOT to modify: Any other files.
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **GST Export:** Fetch GST data, click "Export to Excel". Confirm sheet is saved and loads.
    - **Bundle:** Verify in the browser devtools network tab that `xlsx` chunk is loaded only upon click.
* **Possible Hidden Bugs:**
  - None.

---

### BUG-009: Backend Architecture Violations
* **Bug Information:**
  - Bug ID: BUG-009
  - Module: Backend Architecture
  - Priority: High
  - Severity: High
  - Status: OPEN
* **Symptoms:**
  - Exactly what happens: Routes and controllers query the Supabase client directly, bypassing services and repository abstractions. In addition, the audit routes query the non-existent table `compliance_audit_logs`, returning empty arrays.
  - Expected behaviour: All database operations should be encapsulated in repositories and called via service layers. Routes should only delegate to controllers. Audit logging should query the correct `audit_logs` table created in migration 46.
  - Actual behaviour: Multiple routes and controllers contain raw Supabase queries, violating architecture guidelines.
* **Root Cause:**
  - Why it happens: The team skipped building repositories and services during rapid feature development, querying Supabase directly. Additionally, the audit logs route has a typo in the table name (`compliance_audit_logs` instead of `audit_logs`).
  - Which file starts the issue: Various backend controllers and routes (e.g. `CustomerController.js`, `auditRoutes.js`).
  - Which files are affected:
    - Controllers: `CustomerController.js`, `CrmController.js`, `TaskController.js`, `StaffController.js`, `SchemeController.js`, `PaymentController.js`.
    - Routes: `auditRoutes.js`, `reportRoutes.js`.
    - Services: `DashboardService.js`, `GstService.js`, `ReminderService.js`.
  - Whether frontend, backend, database or API is responsible: Backend Architecture
* **Dependency Analysis:**
  - Routes: `auditRoutes.js`, `reportRoutes.js`, `schemeRoutes.js`, `customerRoutes.js`, `crmRoutes.js`, `taskRoutes.js`, `staffRoutes.js`, `paymentRoutes.js`.
  - Controllers: `CustomerController.js`, `CrmController.js`, `TaskController.js`, `StaffController.js`, `SchemeController.js`, `PaymentController.js`.
  - Services: `DashboardService.js`, `GstService.js`, `ReminderService.js`.
  - Repositories: `CustomerRepository.js`, `SalesRepository.js`, etc.
  - Components: Any frontend pages that query these endpoints.
  - Hooks: None.
  - Database tables: `customers`, `leads`, `tasks`, `staff`, `attendance`, `payroll`, `schemes`, `payments`, `sales`, `audit_logs`.
  - API endpoints: All related backend APIs.
  - State management: None.
* **Regression Risk:** High
  - Explain why: Refactoring databases calls inside payment processing, payroll, and CRM carries a high risk of breaking data integrity or calculation rules if not validated carefully.
* **Fix Strategy:**
  - Explain the safest fix: Refactor incrementally, one module at a time. For each module, move raw DB queries to repository files (creating them if necessary), write services for business logic, and call the repository/service from the controller. Specifically, modify `auditRoutes.js` to call an audit logs repository that queries the correct table `audit_logs`.
  - Files to modify: The listed routes, controllers, and services.
  - Files NOT to modify: Database schema.
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **CRM / Customers CRUD:** Add, update, delete customers and check listings.
    - **Attendance & Payroll:** Check workforce panels, record clock-in/out, run payroll processes.
    - **Payments:** Post payments, verify invoice status transitions.
    - **Audit Trail:** Load the audit center screen and check that compliance logs render.
* **Possible Hidden Bugs:**
  - Correcting the table in `auditRoutes.js` to `audit_logs` might reveal column mapping errors if the columns queried on the frontend do not match the columns generated in migration 46.

---

### BUG-010: Frontend Architecture Violations
* **Bug Information:**
  - Bug ID: BUG-010
  - Module: Frontend Architecture
  - Priority: Medium
  - Severity: Medium
  - Status: OPEN
* **Symptoms:**
  - Exactly what happens: Frontend pages perform manual, raw inline API requests using the basic axios client and handle local loading states manually, bypassing TanStack React Query caching.
  - Expected behaviour: All page data fetching should utilize custom React Query hooks (from `/hooks`) pointing to API functions in `/api` to leverage caching and background updates.
  - Actual behaviour: Multiple pages (`AiAdvisorPage.jsx`, `BusinessHealthPage.jsx`, `AuditCenter.jsx`, `GstReportsPage.jsx`, `FinVoiceWidget.jsx`) use `useEffect` and raw axios calls.
* **Root Cause:**
  - Why it happens: React Query was bypassed during development of these pages.
  - Which file starts the issue: The listed frontend page components.
  - Which files are affected: `AiAdvisorPage.jsx`, `BusinessHealthPage.jsx`, `AuditCenter.jsx`, `GstReportsPage.jsx`, `FinVoiceWidget.jsx`.
  - Whether frontend, backend, database or API is responsible: Frontend Architecture
* **Dependency Analysis:**
  - Routes: None.
  - Controllers: None.
  - Services: None.
  - Repositories: None.
  - Components: `AiAdvisorPage.jsx`, `BusinessHealthPage.jsx`, `AuditCenter.jsx`, `GstReportsPage.jsx`, `FinVoiceWidget.jsx`.
  - Hooks: Missing custom react-query hooks.
  - Database tables: None.
  - API endpoints: `/api/dashboard`, `/api/intelligence/health-score`, `/api/audit/logs`, `/api/reports/gst/gstr1`, `/api/ai/query`.
  - State management: Manual local state.
* **Regression Risk:** Medium
  - Explain why: Rewriting components to use TanStack Query hooks changes the data loading lifecycle. Loading states, error states, and component re-renders must be thoroughly verified to prevent visual flickers or layout crashes.
* **Fix Strategy:**
  - Explain the safest fix:
    1. Define API calling functions in the `frontend/src/api` directory (e.g. `api/intelligence.js`, `api/audit.js`).
    2. Create corresponding custom React Query hooks in `frontend/src/hooks/` (e.g. `useHealthScore`, `useAuditLogs`).
    3. Modify the pages to use these hooks, removing manual `useState` and `useEffect` blocks.
  - Files to modify: The listed page components, `/api` files, and `/hooks` files.
  - Files NOT to modify: Backend routes or controllers.
* **Regression Test Plan:**
  - After fixing, what should be tested?
    - **Advisor & Chatbot:** Ask AI queries, verify charts are returned and render.
    - **Health Score & Diagnostics:** Verify categories and ratings update and refresh without manual UI jumps.
    - **Audit center diffs:** Verify JSON visual diffs expand and load.
* **Possible Hidden Bugs:**
  - Caching updates: Mutations (such as posting payments or adding customers) might leave the cached queries stale if query invalidation is not set up correctly.

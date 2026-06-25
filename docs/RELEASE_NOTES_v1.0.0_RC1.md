# 🚀 FinSathi Release Notes — v1.0.0-rc1

**Version:** v1.0.0-rc1  
**Release Date:** June 26, 2026  
**Status:** Release Candidate 1  
**Branch:** `master` / `release/v1.0.0-rc1`  
**Git Tag:** `v1.0.0-rc1`  
**Deployment Status:** Deployed to Production (Vercel Frontend, Render Backend, Supabase Database)

---

## 📌 Overview
FinSathi is a mobile-first **Intelligent Business Operating System (OS)** designed specifically for Indian MSMEs. It transforms reactive, manual bookkeeping into a proactive, AI-driven management solution. 

Version 1.0.0-rc1 (Release Candidate 1) marks the consolidation of the core business modules, complete with timezone standardization, number/currency formatting helpers, extensive bundle size optimizations, and critical bug fixes.

---

## 🌟 Major Features
* **POS Billing Terminal:** Real-time customer search, dynamic barcode inputs, tax calculation, payment status flags, and inventory decrementing triggers.
* **Smart Business Health Score:** Algorithmic calculation of a business rating (0-100) across 5 parameters, providing 3 daily recommendations.
* **FinVoice Voice AI:** Hindi and Hinglish voice question inputs transcribed with Deepgram and resolved with Gemini Flash.
* **14-day Cash Flow Forecast:** Daily trend lines detailing expected payouts, cash inflows, payroll requirements, and cash crunch alerts.
* **CIBIL-style Credit Scoring:** Multi-variable calculations to evaluate business credit ratings (300-900).
* **Multi-Store Management:** Supports creation of multiple store branches, scoping inventory, sales, and employee accounts.
* **Automated WhatsApp Reminders:** Meta WhatsApp integration for sending invoice payment notifications with Razorpay checkout links.

---

## 🛠️ Stabilization Work & Bug Fixes
* **BUG-001 (Kiosk Crash Fix):** Resolved the database relation error (`profiles` does not exist) by querying the correct `users` table, allowing the public clock-in terminal to fetch the merchant's business name and display the employee roster.
* **BUG-002 (TimeZone Correction):** Introduced a centralized timezone utility ([`dateTime.js`](file:///d:/Projects/FinSathi/backend/src/utils/dateTime.js)) to enforce Indian Standard Time (IST, UTC+5:30) for off-hours cash leakage anomaly detection, eliminating false positive flags for morning transactions.
* **BUG-003 (Health Score Recalculation):** Standardized the daily health score persistence by implementing a select-then-upsert date-check logic, resolving the PostgreSQL unique constraint conflict target error.
* **BUG-004 (Cash Flow Forecast Calibration):** Fixed outflows and outstanding dues calculation by querying the actual invoice outstanding dues (`total - amount_paid`) and scheduling them on their exact `due_date`, replacing the mock 50%-payment heuristics.
* **BUG-005 (Broken Dashboard Hook):** Fixed the dashboard API 404 network error by changing the endpoint mapping from `/dashboard/data` to `/dashboard`, and migrated the main dashboard from raw `useEffect` to TanStack Query caching hooks.
* **BUG-006 (Sub-tab URL Navigation):** Integrated `useSearchParams` into [`GeneralPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GeneralPage.jsx) to sync Sidebar navigation links directly with active sub-tabs (e.g. Subsidy Matcher, Reminders).
* **BUG-007 (Unused Code Cleanup):** Removed deprecated and duplicate frontend files ([`ToolsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/ToolsPage.jsx) and [`AttendanceScanPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/AttendanceScanPage.jsx)) to keep the repository maintainable.
* **BUG-008 (GST Excel Export Chunking):** Converted the static `xlsx` library import to a dynamic import in [`GstReportsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GstReportsPage.jsx) to prevent loading Excel dependencies at startup.

---

## ⚡ Performance Improvements
* **jsPDF Lazy-Loading:** Shifted the static `jspdf` package import inside [`Topbar.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/Dashboard/components/Topbar.jsx) to a dynamic on-demand import when clicking "Export PDF". This reduced the initial layout load size by **~350 kB**.
* **General Page Tabs Splitting:** Split settings panels into independent dynamic chunks wrapped in `<Suspense>`. This reduced the [`GeneralPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GeneralPage.jsx) entry chunk by **~240 kB**.
* **PWA Icon Compression:** Resized and optimized `pwa-192x192.png` to **32.45 kB** (saving **~320 kB** in the PWA precache).

---

## 📝 Documentation Improvements
* **BRAIN.md:** Created a comprehensive permanent source of truth and cognitive blueprint detailing folder structures, database tables, RBAC permissions, and coding standards.
* **BUG_TRACKER.md:** Established a master logs database tracking symptoms, root causes, regression risks, and fix strategies.
* **QA_REPORT.md:** Documented final release candidate modules testing status and stability metrics.
* **PERFORMANCE_REPORT.md:** Ranked largest modules, dependencies, and analyzed bundle optimization opportunities.

---

## ⚠️ Known Issues
* **Supabase Schema Cache Delay:** The health score service occasionally logs a warning since Supabase's API proxy (PostgREST) hasn't reloaded its schema cache for the `business_health_scores` table. (See *Upgrade Notes* for the SQL command fix).

---

## 🔧 Upgrade & Deployment Notes
* **Frontend Build Command:** `npm run build` inside `frontend/` directory (already configured in root `package.json`).
* **Backend Run Command:** `npm start` inside `backend/` directory.
* **Supabase PostgREST Cache Reset:** After deploying database migrations, run this SQL command in the Supabase Dashboard SQL Editor to clear the schema cache:
  ```sql
  NOTIFY pgrst, 'reload schema';
  ```

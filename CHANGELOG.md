# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0-rc1] - 2026-06-26

### Added
- Centralized timezone helper [`dateTime.js`](file:///d:/Projects/FinSathi/backend/src/utils/dateTime.js).
- Centralized currency/number formatter [`formatNumbers.js`](file:///d:/Projects/FinSathi/frontend/src/utils/formatNumbers.js).
- Custom `useSearchParams` hook synchronization for Settings/General tab views.
- Sub-tab dynamic lazy-loading with `<Suspense>` fallbacks in [`GeneralPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/GeneralPage.jsx).
- Compressed PWA icon `pwa-192x192.png`.

### Fixed
- **BUG-001:** Kiosk check-in page crash by querying the correct `users` table instead of `profiles`.
- **BUG-002:** False positives in anomaly detection by converting dates to IST (UTC+5:30) before extracting business hours.
- **BUG-003:** Postgres unique constraint duplicate checks on health score recalculation by using date-range upserts.
- **BUG-004:** Inaccurate Cash Flow Forecast outflows and outstanding dues by using actual `amount_paid` and `due_date` columns.
- **BUG-005:** Broken Dashboard API Hook 404 error by pointing `/dashboard/data` to `/dashboard` and using TanStack Query.
- **BUG-006:** Sub-tab navigation sync inside General Hub.
- **BUG-007:** Deleted deprecated unused pages [`ToolsPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/ToolsPage.jsx) and [`AttendanceScanPage.jsx`](file:///d:/Projects/FinSathi/frontend/src/pages/AttendanceScanPage.jsx).
- **BUG-008:** GST reports static excel library import bloat by lazy-loading `xlsx`.

### Optimized
- Lazy-loaded `jsPDF` dynamically inside Topbar to reduce initial load bundle by **~350 kB**.
- Split General settings tabs into lazy chunks, reducing bundle size by **~240 kB**.
- Optimized PWA icons size for local caching.

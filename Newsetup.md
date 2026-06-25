Here is the fully structured Markdown (.md) file generated step-by-step from the provided PRD document. You can copy and paste this directly into your repository.

FinSathi 

v2.0 — Intelligent Business OS 

Product Requirements & Software Architecture Document 

Attribute	Details
Version	
2.0 — Production Blueprint 

Date	
April 2026 

Status	
APPROVED FOR DEVELOPMENT 

1. Executive Summary 

FinSathi v2.0 transforms a reactive billing and management tool into a proactive, AI-driven Intelligent Business OS for Indian MSMEs. This PRD defines every feature, architecture decision, and implementation phase required to ship a world-class, production-ready SaaS product. 

FinSathi already owns a strong v1.0 foundation: multi-tenant billing, inventory, staff payroll, and expense tracking. 

Version 2.0 builds the intelligence and performance layer on top — adding an AI voice assistant in Hindi/Hinglish, predictive cash-flow warnings, WhatsApp commerce, a government subsidy engine, a Command Palette, and a complete performance overhaul that makes the platform feel instant on any Indian mobile connection. 

The guiding principle: every new feature must save the user time, make them money, or prevent a business mistake. 

No feature ships purely for aesthetics. 

2. Architecture Principles & Performance Mandate 

2.1 The Non-Negotiable Performance Targets 

Metric	v1.0 Baseline	v2.0 Target
Time to Interactive (TTI)	~4.2s on 4G	
< 1.8s on 4G 

Largest Contentful Paint (LCP)	~3.1s	
< 1.2s 

Dashboard API response	~820ms	
< 180ms (cached) 

Invoice PDF generation	~3.5s	
< 900ms 

Bundle size (gzipped)	~380KB	
< 140KB (code split) 

Lighthouse Score	~62	
> 92 

2.2 Frontend Architecture Upgrades 


Route-Based Code Splitting 

Every page must be lazy-loaded. Replace all static imports with React.lazy() + Suspense. 

The initial bundle should only ship the Login and Landing pages. Every other route is a dynamic import. 

This alone reduces the initial bundle by ~60%. 


React.lazy() for all 15+ page components 


Suspense boundary at the router level with a skeleton placeholder 

Preload critical routes (Dashboard, Billing) on hover over nav links using <link rel='prefetch'> 

Vite's build.rollupOptions to manually chunk vendor code: react, recharts, framer-motion into separate chunks 


State Management Architecture 

The current pattern of mixing localStorage reads with React state and React Query creates race conditions on refresh. 

The correct architecture: 

Single source of truth: Zustand store for all global UI state (sidebar collapse, theme, active modal) 

React Query (TanStack Query v5) for ALL server state — invoices, customers, inventory, staff. Zero manual fetch/useEffect patterns 

React Query's staleTime = 5 minutes for reference data (products, customers). staleTime = 0 for financial data (dashboard KPIs) 

Optimistic updates on all mutations — cart additions, payment status changes, attendance marks — so the UI never waits for a server round trip 


queryClient.invalidateQueries() scoped precisely — invalidate only the affected query key, never the entire cache 


Virtual Scrolling for Large Lists 

The Inventory, Invoice History, and Customer pages can grow to thousands of rows. 

Rendering all of them crashes low-end Android devices. 

Replace all large tables with TanStack Virtual (useVirtual) for windowed rendering 

Only render ~20 rows at a time regardless of data size 

Pair with server-side cursor pagination — never load more than 50 rows in a single API response 

2.3 Backend Architecture Upgrades 


Database Query Optimization 

Every dashboard query currently runs N+1 patterns. The following changes are mandatory before v2.0 launches: 

Materialized Views in Supabase for the Dashboard KPIs (today_revenue, week_sales_count, top_products). Refresh every 5 minutes via pg_cron. 

Dashboard API drops from ~820ms to ~40ms 

Composite indexes on (user_id, created_at) for sales, invoices, expenses, attendance tables 

Index on (user_id, status) for invoices — the most frequent filter combination 


pg_trgm extension enabled for full-text product and customer search instead of ILIKE '%term%' — 10x faster on large catalogs 

Connection pooling via Supabase's PgBouncer in transaction mode — max 20 connections per service instance 


Caching Layer 

Introduce Redis (Upstash serverless Redis — zero infrastructure) as a caching layer: 

Cache dashboard KPIs per user_id with TTL = 5 minutes. Key pattern: dashboard:kpi:{user_id} 

Cache subscription plan data per user_id with TTL = 1 hour. Key pattern: sub:plan:{user_id} 

Cache product catalog per user_id with TTL = 10 minutes. Key pattern: inventory:list:{user_id} 

On any write mutation, delete the relevant cache key immediately (cache invalidation on write) 

Bull queue (backed by Redis) for all async jobs: PDF generation, email sending, WhatsApp dispatch, reminder crons — never block HTTP responses 


API Response Standards 

Enforce a consistent API contract across all 16 route modules: 

All responses: { success: boolean, data: T | null, error: string | null, meta: { page, limit, total } } 

HTTP status codes used correctly: 200 (success), 201 (created), 400 (validation), 401 (unauthenticated), 403 (forbidden/plan limit), 404 (not found), 429 (rate limit), 500 (server error) 

Zod validation schemas for ALL request bodies — not just inventory. Every POST/PUT/PATCH endpoint has a schema 

Response time header: X-Response-Time added to every response for monitoring 

3. Phase 1 — Foundation & Quick Wins (Weeks 1–2) 

Goal: Ship visible, high-impact improvements that make the existing platform feel 10x faster and more professional — without touching the AI layer. These are pure wins with low regression risk. 

3.1 Command Palette (Ctrl+K / Cmd+K) 

The single highest-ROI frontend feature. Transforms navigation from a 3-click experience to an instant keystroke. This is what separates consumer apps from professional tools. 
+1

Detail	Specification

Library

cmdk (shadcn/ui's command primitive) — 2.8KB gzipped 

Trigger	
Ctrl+K on desktop, floating search FAB on mobile 

Scope	
Global shortcut registered via useEffect on document keydown 

Data	
Static command registry + live fuzzy search via Fuse.js 


Command Registry Architecture 

The command palette must support 4 types of commands: 

Navigation commands: 'Go to Dashboard', 'Open Billing', 'View Reports' → router.push() 

Action commands: 'New Invoice', 'Add Product', 'Pay Salary: [Staff Name]' → opens the relevant modal directly 

Search commands: Live search across customers, invoices, products as the user types — debounced 300ms, queried from React Query cache first, then API 

Shortcut hints: Display keyboard shortcuts next to commands (e.g., 'B for Billing') 

Implementation: A useCommandPalette Zustand slice manages open state. A global CommandRegistry object (plain JS Map) holds all commands keyed by a string ID. 

Each page registers its local commands on mount and deregisters on unmount. 

The palette queries this registry + fuzzy searches the cache. 

3.2 Skeleton Loader System ✅ COMPLETED

Remove every spinner and loading text from the app. Replace with content-accurate skeleton screens. 

Dashboard: Skeleton cards matching exact KPI card dimensions, skeleton chart (3 animated bars) 

Invoice History: Skeleton table with 8 rows, alternating gray shades 

Inventory: Skeleton grid/list matching current product card layout 

Implementation: A reusable <Skeleton width height rounded /> component using CSS animation: pulse 2s ease-in-out infinite. 

No external library needed — 15 lines of CSS 

Apply to every React Query isLoading state across the app 

3.3 FinSathi Health Score 

A gamification layer that drives daily engagement and surfaces actionable tasks. 

Calculated client-side from data already in the React Query cache — zero extra API calls. 

Signal	Max Points	Formula
Invoice Collection Rate (Paid / Total)	
300 pts

ratio × 300 

Inventory Health (Stock > 0 for top 20 SKUs)	
200 pts

ratio × 200 

Daily Attendance Logged	150 pts	
0 or 150 

Profile Completeness (UPI, GSTIN, Logo)	
150 pts

fields/5 × 150 

Expense Logged Today	100 pts	
0 or 100 

Active Subscription (Pro/Enterprise)	100 pts	
0 or 100 

UI: A circular SVG gauge on the dashboard showing score/1000. 

Below it, a 'Today's Tasks' card with 3 dynamic action items derived from the lowest-scoring signals. 

Each item is a deep-link button directly to the relevant action. 

3.4 Professional UI Design System Upgrade 

The v2.0 design system is clean, dense, and professional — not animated or decorative. 

The aesthetic target is Linear.app or Notion: high information density, precise spacing, purposeful use of color as a communication tool, not decoration. 


Typography System 

Font: Inter (already loaded via Google Fonts). Weight usage: 400 for body, 500 for labels, 600 for subheadings, 700 for KPI numbers 

Size scale: 11px (table cells), 13px (body), 15px (subheadings), 20px (headings), 28px (KPI numbers), 36px (page titles) 

Line height: 1.5 for paragraphs, 1.2 for headings, 1.0 for table cells 


Color Usage Rules 

Blue (#2563EB): Primary actions only — primary buttons, active nav items, links 

Green (#16A34A): Success states, paid status badges, positive deltas 

Red (#DC2626): Error states, unpaid status, negative deltas, destructive actions 

Amber (#D97706): Warning states, pending/partial status, low stock flags 

Gray (#6B7280): Secondary text, disabled states, table borders 

No decorative gradients on functional UI elements. Gradients only on the landing page 


Remove Framer Motion from Functional UI 

Framer Motion animations on page load and sidebar transitions add perceived latency. 

The professional feel comes from instant response, not choreographed animations. Remove entry animations from all functional pages. 

Keep only: modal open/close (150ms fade+scale), sidebar collapse (200ms width transition), toast notifications (200ms slide-in). 

This reduces the framer-motion bundle contribution by ~70%. 

4. Phase 2 — WhatsApp Commerce & Growth Engine (Weeks 3–4) 

Goal: Build the WhatsApp-native commerce and collection layer — the most impactful growth channel for Indian MSMEs. WhatsApp is the primary business communication tool for 95% of the target market. 

4.1 WhatsApp Smart Payment Reminders 

Replace email-only reminders with WhatsApp messages containing one-click Razorpay payment links. 

For Indian B2B context, a WhatsApp message has a ~98% open rate vs ~22% for email. 


Technical Implementation 

Register a WhatsApp Business API app via Meta Developer Portal 

Use a pre-approved WhatsApp message template (required for business-initiated messages). 

Template: 'Hello {customer_name}, your invoice #{invoice_id} for ₹{amount} from {business_name} is due. Pay now: {payment_link}. Ignore if already paid.' 

Backend: New WhatsAppService.js using the Meta Graph API (POST /messages endpoint). 

Triggered by the existing ReminderService.js cron job and by a manual 'Send Reminder' button on each invoice row 

Payment link: Generate a Razorpay Payment Link (not an order — payment links work without the customer having an app) via the Razorpay API. 

Attach the invoice ID as the reference_id so payment webhooks auto-update the invoice status 

Store whatsapp_message_id in the invoice record for delivery status tracking 


Delivery Status Tracking 

Webhook endpoint: POST /api/webhooks/whatsapp handles Meta delivery status callbacks (sent, delivered, read, failed) 

Invoice row shows a status indicator: Sent / Delivered / Read / Failed — visible to the business owner 

If status = 'failed' (invalid number, WhatsApp not installed), fall back to SMS via Twilio or MSG91 automatically 

4.2 Digital Catalog (1-Click WhatsApp Storefront) 

Allow business owners to generate a shareable, mobile-first product catalog that their wholesale clients can browse and order from — and orders flow directly into FinSathi. 


Architecture 

Public route: GET /catalog/{business_slug} — no authentication required. business_slug is a URL-safe version of the business name stored in the users table 

The catalog page is a separate, lightweight SSR/SSG-friendly React page (not behind AppLayout). 

It must load in < 1s on a 3G connection. No sidebar, no auth, pure storefront UI 

Products shown: all inventory items where stock > 0, grouped by company/category. Shows product name, description, selling price, unit. 

Does NOT show cost price or wholesale price 

Order flow: Customer fills a simple form (Name, Phone, Quantities) → POST /api/catalog/{business_slug}/orders → creates a pending invoice in FinSathi with the order details → sends the business owner a WhatsApp notification 


Sharing Flow (Critical UX) 

'Share Catalog' button in the Inventory page header 

Generates the catalog URL and a QR code (using the qrcode npm package — already partially available from attendance QR logic) 

'Share via WhatsApp' button opens: https://wa.me/?text=Browse+my+catalog:+{catalog_url} — one tap to share in any WhatsApp chat 

Business owner can toggle individual products on/off from catalog visibility without deleting them from inventory 

4.3 Smart Government Subsidy Matchmaker 

One of the highest-perceived-value features in the PRD. Billions in MSME government grants go unclaimed because discovery is near-impossible. 

FinSathi becomes the discovery engine. 


Data Architecture 

Create a schemes table in the database: scheme_id, name, description, max_amount, eligibility_criteria (JSON), state (or 'national'), category, deadline, application_url 

Seed with 30–50 active schemes from MSME Ministry, SIDBI, CGTMSE, Mudra Yojana, state-level schemes. Update quarterly 

Eligibility criteria JSON schema: { business_type: string[], states: string[], min_employees: number, max_turnover: number, tags: string[] } 


Matching Algorithm 

Run on login and when profile is updated. Pure JavaScript — no LLM needed 

Query: SELECT * FROM schemes WHERE state IN ('national', user.state) AND eligibility_criteria matching user profile fields 

Score each scheme 0–100 based on how many criteria fields match. Show schemes with score > 60 

Store match results in a user_scheme_matches table with match_score and dismissed (boolean) for 'Not Interested' dismissals 


UI — 'Growth' Tab in Sidebar 

New sidebar section: 'Growth' with the subsidy matchmaker and (Phase 3) cash flow predictor 

Each scheme card shows: name, max grant amount (bold, green), match score badge, one-line eligibility summary, 'Apply Now' button linking to official application portal 

'Why am I matched?' tooltip explaining which profile fields triggered the match 

5. Phase 3 — AI & Predictive Intelligence (Weeks 5–6) 

Goal: Build the AI layer that transforms raw transaction data into actionable business intelligence. This is the feature moat that makes FinSathi defensible against generic accounting software. 

5.1 FinVoice — Multilingual AI Assistant 

A voice-and-text AI assistant that lets shop owners ask questions about their business in natural Hindi, Hinglish, or English — and get instant, data-backed answers with visual charts. 


System Architecture (CRITICAL: Never expose DB to LLM) 

The LLM never touches the database. The architecture is strictly: User Input → Intent Extraction (LLM) → Internal API Query (our code) → Formatted Response (LLM). 

The database query is always executed by our backend with our own SQL, not generated by the LLM. 

Step	What Happens	Who Does It
1	User speaks or types: 'Bhai aaj kitna bika?'	
Browser / User 

2	Audio → Text transcription	
Deepgram Nova-2 API (best Indian accent accuracy) 

3	Text → Structured intent JSON (LLM call)	
Gemini 1.5 Flash (fast, cheap, good Hindi support) 

4	Intent JSON → Internal API call	
Our Node.js backend — we write and execute the SQL 

5	Raw data → Natural language summary (LLM)	
Gemini 1.5 Flash — formats the answer 

6	Summary + chart data rendered in UI	
React frontend 


Intent Schema (LLM System Prompt Output) 

The LLM is prompted to return ONLY valid JSON in this schema — no prose, no markdown: 

{ intent: 'SALES_SUMMARY' | 'EXPENSE_QUERY' | 'CUSTOMER_BALANCE' | 'INVENTORY_CHECK' | 'PROFIT_REPORT' | 'STAFF_SALARY' | 'UNKNOWN', period: 'today' | 'this_week' | 'this_month' | 'custom', date_from: ISO string | null, date_to: ISO string | null, filters: { customer_id?: string, product_id?: string, staff_id?: string } } 

The system prompt includes the current date, the user's business name, and a list of their product categories and customer names (first 20 only — for entity resolution) 

The system prompt is in English but instructs the model to accept queries in any Indian language and extract intent regardless of language 


Supported Query Types (v2.0 Launch Scope) 

Sales: 'How much did I sell today/this week/this month?' → Sales summary card + line chart 

Top products: 'Which product is selling best?' → Top 5 products bar chart 

Customer balance: 'How much does Sharma ji owe me?' → Customer outstanding card 

Expenses: 'What was my biggest expense this month?' → Expense breakdown pie chart 

Profit: 'Am I in profit this week?' → Net profit card with revenue vs expense bar 

Inventory: 'Which items are running low?' → Low stock list 

Staff: 'When did I last pay Raju?' → Last salary payment details 


Frontend Component 

Floating FAB button (bottom-right, above mobile nav bar). Mic icon. Opens a slide-up sheet 

Voice recording: MediaRecorder API. Record audio as webm/opus blob. Send to backend /api/ai/voice as multipart/form-data 

Text fallback: Text input in the same sheet for typing queries 

Response UI: The sheet renders either a chart (recharts, reusing existing chart components) or a text summary card based on the response type field in the API response 

Rate limit: 20 AI queries per day on Pro plan, 5 on Free plan. Enforced by planGuard middleware 

5.2 FinPredict — Predictive Cash Flow Engine 

A 14-day forward-looking cash flow projection that warns owners of incoming cash crunches before they happen. 

Built from first-party data already in the system — no external data sources needed. 


Prediction Algorithm 


Projected Inflows: Sum of all invoices with status = 'Unpaid' or 'Partial' due in next 14 days. 

Plus: average daily revenue from the last 30 days × 14 (baseline expected sales) 


Projected Outflows: Upcoming staff salary payroll (sum of monthly_salary for all active staff, prorated for days remaining in month). 

Plus: average daily expenses from last 30 days × 14. Plus: any manually added projected expenses 


Net Cash Position: Starting balance (sum of all payments received - sum of all expenses to date) + projected inflows - projected outflows 


Warning threshold: If Net Cash Position at any point in the 14-day window drops below 20% of the previous 30-day average daily revenue, trigger a 'Cash Crunch Warning' 


UI Widget 

'Cash Flow Forecast' card on the dashboard — below the KPI cards 

A 14-bar sparkline chart showing projected daily balance. Bars turn red for days below the warning threshold 

Summary: 'Projected balance on [date]: ₹X,XXX' with a red/green indicator 

Warning state: A prominent amber banner 'Cash Crunch Detected in ~8 days. Your balance may drop to ₹12,000. View options →' 

'View options' links to the Growth tab which shows the embedded finance CTA (Razorpay Capital / Setu partnership hook for monetization) 

5.3 AI-Powered Invoice Anomaly Detection 

A lightweight ML model that flags unusual billing patterns to prevent fraud and errors. 

Runs as a background job, not blocking any user action. 

Duplicate invoice detection: Flag invoices for the same customer with the same total within 24 hours 

Unusual discount flag: Flag discounts > 30% of invoice total (configurable per business) 

Off-hours billing alert: Flag invoices created outside normal business hours (configurable) 

Implementation: Pure SQL/JavaScript rules engine — no ML library needed for v2.0. 

Each rule is a database query run by a pg_cron job every hour. Results written to an anomaly_flags table 

UI: A small 'Alerts' badge in the sidebar navigation. Clicking shows a list of flagged items with one-click 'Dismiss' or 'Investigate' actions 

6. Phase 4 — Platform Hardening & Scale (Week 7–8) 

Goal: Make FinSathi production-grade for 10,000+ concurrent business accounts. This phase is non-negotiable before any serious marketing spend. 

6.1 Observability Stack 

You cannot optimize what you cannot measure. Implement full observability before scaling: 

Error tracking: Sentry.io — frontend and backend. Every unhandled error and API 5xx gets captured with full context. 

Cost: free tier covers 5,000 errors/month 


Performance monitoring: Sentry Performance for frontend Web Vitals (LCP, CLS, FID) and backend transaction tracing 


Uptime monitoring: Better Uptime or UptimeRobot — ping all critical endpoints every 60 seconds. 

SMS/WhatsApp alert if any endpoint goes down 

Database monitoring: Supabase's built-in pg_stat_statements view. Create a weekly query to identify the top 10 slowest queries. 

Add indexes for any query taking > 100ms 


Business metrics dashboard: A simple internal Metabase or Retool dashboard showing: new signups per day, active users, revenue per plan tier, churn rate 

6.2 Security Hardening 

The current security posture is good but missing several critical controls for a financial platform: 


Content Security Policy (CSP): Add a strict CSP header via helmet. 

Whitelist only known domains: Razorpay, Supabase, Deepgram, Meta (WhatsApp), Google Fonts 

SQL Injection: All Supabase queries already use parameterized queries (RLS). Audit every raw query for any string interpolation 

File Upload Validation: The avatar/logo upload currently accepts any Base64. Add MIME type validation server-side (accept only image/jpeg, image/png, image/webp). 

Add size limit at the middleware level (2MB) 

JWT Rotation: Implement refresh token pattern. Access token: 15 minutes. Refresh token: 30 days, stored as httpOnly cookie (not localStorage). 

This prevents token theft via XSS 


Rate Limiting Enhancement: Current limit (2000 req/15min) is too high for a financial app. 

Tiered limits: /api/auth/* → 20 req/15min, /api/ai/* → 50 req/15min, all other endpoints → 500 req/15min 

Audit Trail: The existing activity_logs table is good. Add log entries for: login, logout, password change, profile update, subscription change, plan downgrade 

6.3 Multi-Device & Offline Support 

Indian shop owners use FinSathi on both desktop and a cheap Android phone. The mobile experience must be first-class, and offline resilience is critical in areas with patchy connectivity. 
+1


Progressive Web App (PWA): Add a manifest.json and a service worker (Vite PWA plugin). 

This enables 'Add to Home Screen' on Android — feels like a native app without App Store friction 

Offline-first for Billing: The most critical flow. Use IndexedDB (via Dexie.js) to cache the product catalog and customer list locally. 

If the network is unavailable, the billing POS still works. Transactions are queued and synced when connectivity returns 

Background sync: Service Worker Background Sync API to flush the offline transaction queue when connectivity is restored 

Mobile-specific optimizations: Replace all hover states with active states on touch. Minimum tap target 44×44px. 

Use 16px font size on all mobile inputs to prevent iOS auto-zoom 

6.4 Invoice PDF Performance Overhaul 

Puppeteer-based PDF generation is the current bottleneck at ~3.5 seconds. This is unacceptable for a POS workflow. 

Replace Puppeteer with @react-pdf/renderer (React-PDF). This generates PDFs in pure JavaScript without launching a headless browser. 

Generation time drops to ~200ms 

PDF template: React component that renders the invoice layout. Props: invoice object. Output: Buffer 

Pre-generate PDFs for invoices asynchronously: When an invoice is created, queue a Bull job to generate and store the PDF. 

By the time the user clicks 'Download', it's already ready 

Store PDFs in Supabase Storage (S3-compatible). Return a pre-signed URL valid for 24 hours instead of streaming the PDF on every request 

7. Additional Recommended Features (Beyond v2.0 PRD) 

These features are recommended additions beyond the original v2.0 PRD scope. They address real gaps identified in the v1.0 architecture and add meaningful business value without adding architectural complexity. 

7.1 Multi-Location / Branch Support 

As MSMEs grow, they open second and third locations. The current architecture is single-location per user_id. 

Add a locations table (location_id, user_id, name, address) and scope inventory, sales, and staff to a location. 

The owner can view consolidated reports or per-location reports. 

Low effort: Add location_id foreign key to inventory, sales, staff, expenses tables 

UI: Location selector dropdown in the AppLayout header — persists in localStorage 

Reports: Toggle between 'All Locations' and individual location views 

7.2 Customer WhatsApp Portal (B2C Self-Service) 

Let customers check their own outstanding balance and download their invoice PDFs without calling the shop. 

Public route: /portal/{business_slug}/customer — customer enters their registered phone number → receives a WhatsApp OTP → authenticated into a read-only view of their invoices and balance 

Eliminates the most common support request: 'Bhai, kitna baaki hai?' (How much is outstanding?) 

Zero development cost for the business owner — they share the portal link with customers once 

7.3 Vendor / Supplier Management 

The expenses table tracks outflows but has no concept of recurring vendors. 

Add a suppliers table (already mentioned in migration 13) and: 

Link expenses to supplier records for spend analysis ('How much did I spend at ABC Distributors this month?') 

Supplier payment terms tracking: Net-30, Net-60 — flag overdue payables 

Purchase Order module: Create POs, mark as received (auto-updates inventory), track outstanding payables 

7.4 Automated GST Report Generator 

The single most requested feature by Indian business owners after billing. Auto-generate GSTR-1 and GSTR-3B summaries from existing sales data. 

GSTR-1 data is already in the invoices + invoice_items tables (HSN codes, GST %, customer GSTIN) 

New report page: 'GST Reports' under the P&L section. Date range selector → generates a summary table in the GSTR-1 format 

Export as Excel (xlsx) and JSON (for direct import into government portal). 

Use the SheetJS library already available in the frontend 

Disclaimer: 'This is a summary for reference only. Verify with a CA before filing.' 

7.5 In-App Notification Center 

Currently, all system events (low stock, payment received, subscription renewal) only appear in the activity log. 

Add a proper notification system: 


notifications table: (notification_id, user_id, type, title, body, read, created_at, action_url) 

Bell icon in the AppLayout header with an unread count badge 

Notification types: LOW_STOCK, PAYMENT_RECEIVED, INVOICE_OVERDUE, SUBSCRIPTION_EXPIRING, CASH_CRUNCH_WARNING, ANOMALY_DETECTED, SUBSIDY_MATCH 

Real-time delivery via Supabase Realtime (WebSocket subscription to the notifications table filtered by user_id). Zero additional infrastructure 

8. Complete v2.0 Technology Stack 

Layer	Technology	Purpose
Frontend Framework	React 18 + Vite 5	
SPA with route-based code splitting 

State: Server	TanStack Query v5	
All API data fetching, caching, mutations 

State: Client	Zustand v4	
UI state, sidebar, modals, command palette 

Routing	React Router v6	
Client-side routing with lazy loading 

Forms	React Hook Form + Zod	
Performant forms with schema validation 

Charts	Recharts	
Sales, P&L, cash flow visualizations 

Command Palette	cmdk	
Ctrl+K omni-search 

Virtual Scroll	TanStack Virtual	
Large list rendering (inventory, invoices) 

Offline Storage	Dexie.js (IndexedDB)	
Offline billing cache 

PDF Generation	@react-pdf/renderer	
Fast invoice PDFs (no Puppeteer) 

PWA	Vite PWA Plugin	
Service worker, manifest, offline support 

Animations	Framer Motion (minimal)	
Modal transitions, sidebar only 

Backend Framework	Node.js 20 + Express 5	
REST API server 

Database	Supabase (PostgreSQL 15)	
Primary data store + RLS + Realtime 

Cache / Queue	Upstash Redis + Bull	
API caching + async job queue 

Auth	JWT (15min) + Refresh Token	
Stateless auth with rotation 

Validation	Zod (all endpoints)	
Request schema validation 

File Storage	Supabase Storage	
Invoice PDFs, avatars, QR codes 

Payments	Razorpay	
Subscriptions + Payment Links 

WhatsApp	Meta Graph API	
Reminders + catalog sharing 

Voice AI	Deepgram Nova-2	
Hindi/Hinglish speech-to-text 

AI/LLM	Gemini 1.5 Flash	
Intent extraction + response formatting 

Error Tracking	Sentry.io	
Frontend + backend error monitoring 

Deployment: Frontend	Vercel	
Edge CDN, automatic HTTPS 

Deployment: Backend	Railway or Render	
Node.js server with auto-deploy 

CI/CD	GitHub Actions	
Lint, test, build, deploy pipeline 

9. Execution Timeline & Sprint Plan 

Week	Phase	Deliverables	Success Metric
1	Foundation	Code splitting, Zustand, skeleton loaders, design system tokens	
Lighthouse > 85 

2	Quick Wins	Command Palette, Health Score, virtual scroll, PDF overhaul	
TTI < 2s on 4G 

3	WhatsApp (1)	WhatsApp Business API setup, payment reminders, delivery tracking	
First WhatsApp reminder sent 

4	WhatsApp (2)	Digital catalog, catalog orders, subsidy matchmaker data + UI	
Catalog shareable via WhatsApp 

5	AI (1)	LLM middleware service, FinVoice backend, intent schema, 7 query types	
Voice query returns data 

6	AI (2)	FinPredict cash flow widget, anomaly detection, notification center	
Cash crunch warning fires 

7	Hardening (1)	Sentry, JWT rotation, CSP, Redis caching, materialized views	
API p95 < 200ms 

8	Hardening (2)	PWA, offline billing, GST report generator, branch support scaffold	
PWA installable on Android 

10. Risk Register & Mitigation 

Risk	Severity	Mitigation
WhatsApp API approval delay (Meta review takes 2–4 weeks)	HIGH	
Apply for Business API access in Week 1 in parallel with other work. Use Twilio SMS as fallback for reminders. 

Deepgram/Gemini API costs spiral at scale	MEDIUM	
Implement strict rate limiting per plan tier. Cache LLM responses for identical queries within 1 hour. Monitor cost per query in a billing dashboard. 

IndexedDB offline sync conflicts (two devices, same shop)	MEDIUM	
Last-write-wins with client timestamp. Show a conflict resolution UI when a sync conflict is detected on the server. 

Redis Upstash cold start latency on free tier	LOW	
Upgrade to paid Upstash tier ($0.20/100K commands) once MAU > 500. Keep TTLs short so stale data can't accumulate. 

Government scheme data goes stale	LOW	
Create a scheduled GitHub Action that pings scheme URLs monthly and flags 404s. Assign a team member 2 hours/month to update the schemes table. 

GSTR data inaccuracy leads to legal liability	HIGH	
Prominent disclaimer on every GST report. Never use words 'file' or 'submit' — only 'summary' and 'reference'. Consult a CA for template verification. 

11. Definition of Done — v2.0 Launch Criteria 

FinSathi v2.0 is ready to launch when ALL of the following are true: 

Lighthouse Performance score > 90 on mobile (tested on a Moto G-class device) 

All 15 existing features work identically to v1.0 — zero regression in billing, inventory, or payroll 

Command Palette responds in < 100ms to keystroke input 

FinVoice correctly interprets 7 intent types with > 90% accuracy on test suite of 50 Hindi/English queries 

WhatsApp reminder successfully delivered to a real phone number in staging 

Digital catalog loads in < 1.5s on a 3G connection (tested via Chrome DevTools throttling) 

At least 1 government scheme correctly matched to a test business profile 

Cash flow predictor correctly identifies a simulated deficit scenario 

Sentry captures a test error in both frontend and backend environments 

JWT refresh token flow works correctly — user stays logged in after 15-minute access token expiry 

PWA installs on Android Chrome without errors 

All API endpoints return responses in < 300ms at p95 under 50 concurrent users (load tested with k6) 

Zero critical or high severity Sentry errors in 48 hours of staging testing 

GSTIN/UPI fields pass correct validation — no invalid data can be saved 

A non-technical tester (shop owner persona) can complete: register → add product → create invoice → send WhatsApp reminder in under 5 minutes with no guidance 

FinSathi v2.0 — Built for the next 10 million Indian businesses. Ship it.


<!-- Or this onle you can usnderstadnd -->
# FinSathi
## v2.0 — Intelligent Business OS
### Product Requirements & Software Architecture Document

| Attribute | Details |
|---|---|
| **Version** | 2.0 — Production Blueprint |
| **Date** | April 2026 |
| **Status** | APPROVED FOR DEVELOPMENT |

---

## 1. Executive Summary

> FinSathi v2.0 transforms a reactive billing and management tool into a proactive, AI-driven Intelligent Business OS for Indian MSMEs. This PRD defines every feature, architecture decision, and implementation phase required to ship a world-class, production-ready SaaS product.

* FinSathi already owns a strong v1.0 foundation: multi-tenant billing, inventory, staff payroll, and expense tracking.
* Version 2.0 builds the intelligence and performance layer on top — adding an AI voice assistant in Hindi/Hinglish, predictive cash-flow warnings, WhatsApp commerce, a government subsidy engine, a Command Palette, and a complete performance overhaul that makes the platform feel instant on any Indian mobile connection.
* The guiding principle: every new feature must save the user time, make them money, or prevent a business mistake.
* No feature ships purely for aesthetics.

---

## 2. Architecture Principles & Performance Mandate

### 2.1 The Non-Negotiable Performance Targets

| Metric | v1.0 Baseline | v2.0 Target |
|---|---|---|
| **Time to Interactive (TTI)** | ~4.2s on 4G | < 1.8s on 4G |
| **Largest Contentful Paint (LCP)** | ~3.1s | < 1.2s |
| **Dashboard API response** | ~820ms | < 180ms (cached) |
| **Invoice PDF generation** | ~3.5s | < 900ms |
| **Bundle size (gzipped)** | ~380KB | < 140KB (code split) |
| **Lighthouse Score** | ~62 | > 92 |

### 2.2 Frontend Architecture Upgrades

**Route-Based Code Splitting** ✅ COMPLETED
* Every page must be lazy-loaded. Replace all static imports with `React.lazy()` + `Suspense`.
* The initial bundle should only ship the Login and Landing pages. Every other route is a dynamic import.
* This alone reduces the initial bundle by ~60%.
* `React.lazy()` for all 15+ page components
* `Suspense` boundary at the router level with a skeleton placeholder
* Preload critical routes (Dashboard, Billing) on hover over nav links using `<link rel='prefetch'>`
* Vite's `build.rollupOptions` to manually chunk vendor code: `react`, `recharts`, `framer-motion` into separate chunks

**State Management Architecture**
* The current pattern of mixing `localStorage` reads with React state and React Query creates race conditions on refresh.
* The correct architecture:
  * Single source of truth: Zustand store for all global UI state (sidebar collapse, theme, active modal)
  * React Query (TanStack Query v5) for ALL server state — invoices, customers, inventory, staff. Zero manual fetch/useEffect patterns
  * React Query's `staleTime = 5 minutes` for reference data (products, customers). `staleTime = 0` for financial data (dashboard KPIs)
  * Optimistic updates on all mutations — cart additions, payment status changes, attendance marks — so the UI never waits for a server round trip
  * `queryClient.invalidateQueries()` scoped precisely — invalidate only the affected query key, never the entire cache

**Virtual Scrolling for Large Lists**
* The Inventory, Invoice History, and Customer pages can grow to thousands of rows.
* Rendering all of them crashes low-end Android devices.
* Replace all large tables with TanStack Virtual (`useVirtual`) for windowed rendering
* Only render ~20 rows at a time regardless of data size
* Pair with server-side cursor pagination — never load more than 50 rows in a single API response

### 2.3 Backend Architecture Upgrades

**Database Query Optimization**
* Every dashboard query currently runs N+1 patterns. The following changes are mandatory before v2.0 launches:
* Materialized Views in Supabase for the Dashboard KPIs (`today_revenue`, `week_sales_count`, `top_products`). Refresh every 5 minutes via `pg_cron`.
* Dashboard API drops from ~820ms to ~40ms
* Composite indexes on `(user_id, created_at)` for `sales`, `invoices`, `expenses`, `attendance` tables
* Index on `(user_id, status)` for invoices — the most frequent filter combination
* `pg_trgm` extension enabled for full-text product and customer search instead of `ILIKE '%term%'` — 10x faster on large catalogs
* Connection pooling via Supabase's PgBouncer in transaction mode — max 20 connections per service instance

**Caching Layer**
* Introduce Redis (Upstash serverless Redis — zero infrastructure) as a caching layer:
  * Cache dashboard KPIs per `user_id` with TTL = 5 minutes. Key pattern: `dashboard:kpi:{user_id}`
  * Cache subscription plan data per `user_id` with TTL = 1 hour. Key pattern: `sub:plan:{user_id}`
  * Cache product catalog per `user_id` with TTL = 10 minutes. Key pattern: `inventory:list:{user_id}`
* On any write mutation, delete the relevant cache key immediately (cache invalidation on write)
* Bull queue (backed by Redis) for all async jobs: PDF generation, email sending, WhatsApp dispatch, reminder crons — never block HTTP responses

**API Response Standards**
* Enforce a consistent API contract across all 16 route modules:
* All responses: `{ success: boolean, data: T | null, error: string | null, meta: { page, limit, total } }`
* HTTP status codes used correctly: 200 (success), 201 (created), 400 (validation), 401 (unauthenticated), 403 (forbidden/plan limit), 404 (not found), 429 (rate limit), 500 (server error)
* Zod validation schemas for ALL request bodies — not just inventory. Every POST/PUT/PATCH endpoint has a schema
* Response time header: `X-Response-Time` added to every response for monitoring

---

## 3. Phase 1 — Foundation & Quick Wins (Weeks 1–2)

> **Goal:** Ship visible, high-impact improvements that make the existing platform feel 10x faster and more professional — without touching the AI layer. These are pure wins with low regression risk.

### 3.1 Command Palette (Ctrl+K / Cmd+K) ✅ COMPLETED

The single highest-ROI frontend feature. Transforms navigation from a 3-click experience to an instant keystroke. This is what separates consumer apps from professional tools.

| Detail | Specification |
|---|---|
| **Library** | cmdk (shadcn/ui's command primitive) — 2.8KB gzipped |
| **Trigger** | Ctrl+K on desktop, floating search FAB on mobile |
| **Scope** | Global shortcut registered via useEffect on document keydown |
| **Data** | Static command registry + live fuzzy search via Fuse.js |

**Command Registry Architecture**
* The command palette must support 4 types of commands:
  * Navigation commands: 'Go to Dashboard', 'Open Billing', 'View Reports' → `router.push()`
  * Action commands: 'New Invoice', 'Add Product', 'Pay Salary: [Staff Name]' → opens the relevant modal directly
  * Search commands: Live search across customers, invoices, products as the user types — debounced 300ms, queried from React Query cache first, then API
  * Shortcut hints: Display keyboard shortcuts next to commands (e.g., 'B for Billing')
* Implementation: A `useCommandPalette` Zustand slice manages open state. A global `CommandRegistry` object (plain JS Map) holds all commands keyed by a string ID.
* Each page registers its local commands on mount and deregisters on unmount.
* The palette queries this registry + fuzzy searches the cache.

### 3.2 Skeleton Loader System
* Remove every spinner and loading text from the app. Replace with content-accurate skeleton screens.
* Dashboard: Skeleton cards matching exact KPI card dimensions, skeleton chart (3 animated bars)
* Invoice History: Skeleton table with 8 rows, alternating gray shades
* Inventory: Skeleton grid/list matching current product card layout
* Implementation: A reusable `<Skeleton width height rounded />` component using CSS animation: `pulse 2s ease-in-out infinite`.
* No external library needed — 15 lines of CSS
* Apply to every React Query `isLoading` state across the app

### 3.3 FinSathi Health Score ✅ COMPLETED

A gamification layer that drives daily engagement and surfaces actionable tasks.
* Calculated client-side from data already in the React Query cache — zero extra API calls.

| Signal | Max Points | Formula |
|---|---|---|
| **Invoice Collection Rate** (Paid / Total) | 300 pts | ratio × 300 |
| **Inventory Health** (Stock > 0 for top 20 SKUs) | 200 pts | ratio × 200 |
| **Daily Attendance Logged** | 150 pts | 0 or 150 |
| **Profile Completeness** (UPI, GSTIN, Logo) | 150 pts | fields/5 × 150 |
| **Expense Logged Today** | 100 pts | 0 or 100 |
| **Active Subscription** (Pro/Enterprise) | 100 pts | 0 or 100 |

* UI: A circular SVG gauge on the dashboard showing score/1000.
* Below it, a 'Today's Tasks' card with 3 dynamic action items derived from the lowest-scoring signals.
* Each item is a deep-link button directly to the relevant action.

### 3.4 Professional UI Design System Upgrade ✅ COMPLETED

The v2.0 design system is clean, dense, and professional — not animated or decorative.
* The aesthetic target is Linear.app or Notion: high information density, precise spacing, purposeful use of color as a communication tool, not decoration.

**Typography System**
* Font: Inter (already loaded via Google Fonts). Weight usage: 400 for body, 500 for labels, 600 for subheadings, 700 for KPI numbers
* Size scale: 11px (table cells), 13px (body), 15px (subheadings), 20px (headings), 28px (KPI numbers), 36px (page titles)
* Line height: 1.5 for paragraphs, 1.2 for headings, 1.0 for table cells

**Color Usage Rules**
* Blue (`#2563EB`): Primary actions only — primary buttons, active nav items, links
* Green (`#16A34A`): Success states, paid status badges, positive deltas
* Red (`#DC2626`): Error states, unpaid status, negative deltas, destructive actions
* Amber (`#D97706`): Warning states, pending/partial status, low stock flags
* Gray (`#6B7280`): Secondary text, disabled states, table borders
* No decorative gradients on functional UI elements. Gradients only on the landing page

**Remove Framer Motion from Functional UI**
* Framer Motion animations on page load and sidebar transitions add perceived latency.
* The professional feel comes from instant response, not choreographed animations. Remove entry animations from all functional pages.
* Keep only: modal open/close (150ms fade+scale), sidebar collapse (200ms width transition), toast notifications (200ms slide-in).
* This reduces the framer-motion bundle contribution by ~70%.

---

## 4. Phase 2 — WhatsApp Commerce & Growth Engine (Weeks 3–4) ✅ COMPLETED

> **Goal:** Build the WhatsApp-native commerce and collection layer — the most impactful growth channel for Indian MSMEs. WhatsApp is the primary business communication tool for 95% of the target market.

### 4.1 WhatsApp Smart Payment Reminders
* Replace email-only reminders with WhatsApp messages containing one-click Razorpay payment links.
* For Indian B2B context, a WhatsApp message has a ~98% open rate vs ~22% for email.

**Technical Implementation**
* Register a WhatsApp Business API app via Meta Developer Portal
* Use a pre-approved WhatsApp message template (required for business-initiated messages).
* Template: 'Hello `{customer_name}`, your invoice `#{invoice_id}` for `₹{amount}` from `{business_name}` is due. Pay now: `{payment_link}`. Ignore if already paid.'
* Backend: New `WhatsAppService.js` using the Meta Graph API (POST `/messages` endpoint).
* Triggered by the existing `ReminderService.js` cron job and by a manual 'Send Reminder' button on each invoice row
* Payment link: Generate a Razorpay Payment Link (not an order — payment links work without the customer having an app) via the Razorpay API.
* Attach the invoice ID as the `reference_id` so payment webhooks auto-update the invoice status
* Store `whatsapp_message_id` in the invoice record for delivery status tracking

**Delivery Status Tracking**
* Webhook endpoint: POST `/api/webhooks/whatsapp` handles Meta delivery status callbacks (sent, delivered, read, failed)
* Invoice row shows a status indicator: Sent / Delivered / Read / Failed — visible to the business owner
* If status = 'failed' (invalid number, WhatsApp not installed), fall back to SMS via Twilio or MSG91 automatically

### 4.2 Digital Catalog (1-Click WhatsApp Storefront)
* Allow business owners to generate a shareable, mobile-first product catalog that their wholesale clients can browse and order from — and orders flow directly into FinSathi.

**Architecture**
* Public route: GET `/catalog/{business_slug}` — no authentication required. `business_slug` is a URL-safe version of the business name stored in the users table
* The catalog page is a separate, lightweight SSR/SSG-friendly React page (not behind `AppLayout`).
* It must load in < 1s on a 3G connection. No sidebar, no auth, pure storefront UI
* Products shown: all inventory items where stock > 0, grouped by company/category. Shows product name, description, selling price, unit.
* Does NOT show cost price or wholesale price
* Order flow: Customer fills a simple form (Name, Phone, Quantities) → POST `/api/catalog/{business_slug}/orders` → creates a pending invoice in FinSathi with the order details → sends the business owner a WhatsApp notification

**Sharing Flow (Critical UX)**
* 'Share Catalog' button in the Inventory page header
* Generates the catalog URL and a QR code (using the `qrcode` npm package — already partially available from attendance QR logic)
* 'Share via WhatsApp' button opens: `https://wa.me/?text=Browse+my+catalog:+{catalog_url}` — one tap to share in any WhatsApp chat
* Business owner can toggle individual products on/off from catalog visibility without deleting them from inventory

### 4.3 Smart Government Subsidy Matchmaker
* One of the highest-perceived-value features in the PRD. Billions in MSME government grants go unclaimed because discovery is near-impossible.
* FinSathi becomes the discovery engine.

**Data Architecture**
* Create a `schemes` table in the database: `scheme_id`, `name`, `description`, `max_amount`, `eligibility_criteria` (JSON), `state` (or 'national'), `category`, `deadline`, `application_url`
* Seed with 30–50 active schemes from MSME Ministry, SIDBI, CGTMSE, Mudra Yojana, state-level schemes. Update quarterly
* Eligibility criteria JSON schema: `{ business_type: string[], states: string[], min_employees: number, max_turnover: number, tags: string[] }`

**Matching Algorithm**
* Run on login and when profile is updated. Pure JavaScript — no LLM needed
* Query: `SELECT * FROM schemes WHERE state IN ('national', user.state) AND eligibility_criteria matching user profile fields`
* Score each scheme 0–100 based on how many criteria fields match. Show schemes with score > 60
* Store match results in a `user_scheme_matches` table with `match_score` and `dismissed` (boolean) for 'Not Interested' dismissals

**UI — 'Growth' Tab in Sidebar**
* New sidebar section: 'Growth' with the subsidy matchmaker and (Phase 3) cash flow predictor
* Each scheme card shows: name, max grant amount (bold, green), match score badge, one-line eligibility summary, 'Apply Now' button linking to official application portal
* 'Why am I matched?' tooltip explaining which profile fields triggered the match

---

## 5. Phase 3 — AI & Predictive Intelligence (Weeks 5–6)

> **Goal:** Build the AI layer that transforms raw transaction data into actionable business intelligence. This is the feature moat that makes FinSathi defensible against generic accounting software.

### 5.1 FinVoice — Multilingual AI Assistant
* A voice-and-text AI assistant that lets shop owners ask questions about their business in natural Hindi, Hinglish, or English — and get instant, data-backed answers with visual charts.
* **System Architecture (CRITICAL: Never expose DB to LLM)**
* The LLM never touches the database. The architecture is strictly: User Input → Intent Extraction (LLM) → Internal API Query (our code) → Formatted Response (LLM).
* The database query is always executed by our backend with our own SQL, not generated by the LLM.

| Step | What Happens | Who Does It |
|---|---|---|
| 1 | User speaks or types: 'Bhai aaj kitna bika?' | Browser / User |
| 2 | Audio → Text transcription | Deepgram Nova-2 API (best Indian accent accuracy) |
| 3 | Text → Structured intent JSON (LLM call) | Gemini 1.5 Flash (fast, cheap, good Hindi support) |
| 4 | Intent JSON → Internal API call | Our Node.js backend — we write and execute the SQL |
| 5 | Raw data → Natural language summary (LLM) | Gemini 1.5 Flash — formats the answer |
| 6 | Summary + chart data rendered in UI | React frontend |

**Intent Schema (LLM System Prompt Output)**
* The LLM is prompted to return ONLY valid JSON in this schema — no prose, no markdown:
* `{ intent: 'SALES_SUMMARY' | 'EXPENSE_QUERY' | 'CUSTOMER_BALANCE' | 'INVENTORY_CHECK' | 'PROFIT_REPORT' | 'STAFF_SALARY' | 'UNKNOWN', period: 'today' | 'this_week' | 'this_month' | 'custom', date_from: ISO string | null, date_to: ISO string | null, filters: { customer_id?: string, product_id?: string, staff_id?: string } }`
* The system prompt includes the current date, the user's business name, and a list of their product categories and customer names (first 20 only — for entity resolution)
* The system prompt is in English but instructs the model to accept queries in any Indian language and extract intent regardless of language

**Supported Query Types (v2.0 Launch Scope)**
* **Sales:** 'How much did I sell today/this week/this month?' → Sales summary card + line chart
* **Top products:** 'Which product is selling best?' → Top 5 products bar chart
* **Customer balance:** 'How much does Sharma ji owe me?' → Customer outstanding card
* **Expenses:** 'What was my biggest expense this month?' → Expense breakdown pie chart
* **Profit:** 'Am I in profit this week?' → Net profit card with revenue vs expense bar
* **Inventory:** 'Which items are running low?' → Low stock list
* **Staff:** 'When did I last pay Raju?' → Last salary payment details

**Frontend Component**
* Floating FAB button (bottom-right, above mobile nav bar). Mic icon. Opens a slide-up sheet
* Voice recording: MediaRecorder API. Record audio as webm/opus blob. Send to backend `/api/ai/voice` as `multipart/form-data`
* Text fallback: Text input in the same sheet for typing queries
* Response UI: The sheet renders either a chart (recharts, reusing existing chart components) or a text summary card based on the response type field in the API response
* Rate limit: 20 AI queries per day on Pro plan, 5 on Free plan. Enforced by `planGuard` middleware

### 5.2 FinPredict — Predictive Cash Flow Engine
* A 14-day forward-looking cash flow projection that warns owners of incoming cash crunches before they happen.
* Built from first-party data already in the system — no external data sources needed.

**Prediction Algorithm**
* **Projected Inflows:** Sum of all invoices with status = 'Unpaid' or 'Partial' due in next 14 days.
  * Plus: average daily revenue from the last 30 days × 14 (baseline expected sales)
* **Projected Outflows:** Upcoming staff salary payroll (sum of monthly_salary for all active staff, prorated for days remaining in month).
  * Plus: average daily expenses from last 30 days × 14. Plus: any manually added projected expenses
* **Net Cash Position:** Starting balance (sum of all payments received - sum of all expenses to date) + projected inflows - projected outflows
* **Warning threshold:** If Net Cash Position at any point in the 14-day window drops below 20% of the previous 30-day average daily revenue, trigger a 'Cash Crunch Warning'

**UI Widget**
* 'Cash Flow Forecast' card on the dashboard — below the KPI cards
* A 14-bar sparkline chart showing projected daily balance. Bars turn red for days below the warning threshold
* Summary: 'Projected balance on [date]: ₹X,XXX' with a red/green indicator
* Warning state: A prominent amber banner 'Cash Crunch Detected in ~8 days. Your balance may drop to ₹12,000. View options →'
* 'View options' links to the Growth tab which shows the embedded finance CTA (Razorpay Capital / Setu partnership hook for monetization)

### 5.3 AI-Powered Invoice Anomaly Detection
* A lightweight ML model that flags unusual billing patterns to prevent fraud and errors.
* Runs as a background job, not blocking any user action.
* Duplicate invoice detection: Flag invoices for the same customer with the same total within 24 hours
* Unusual discount flag: Flag discounts > 30% of invoice total (configurable per business)
* Off-hours billing alert: Flag invoices created outside normal business hours (configurable)
* Implementation: Pure SQL/JavaScript rules engine — no ML library needed for v2.0.
* Each rule is a database query run by a `pg_cron` job every hour. Results written to an `anomaly_flags` table
* UI: A small 'Alerts' badge in the sidebar navigation. Clicking shows a list of flagged items with one-click 'Dismiss' or 'Investigate' actions

---

## 6. Phase 4 — Platform Hardening & Scale (Week 7–8)

> **Goal:** Make FinSathi production-grade for 10,000+ concurrent business accounts. This phase is non-negotiable before any serious marketing spend.

### 6.1 Observability Stack
You cannot optimize what you cannot measure. Implement full observability before scaling:
* **Error tracking:** Sentry.io — frontend and backend. Every unhandled error and API 5xx gets captured with full context.
  * Cost: free tier covers 5,000 errors/month
* **Performance monitoring:** Sentry Performance for frontend Web Vitals (LCP, CLS, FID) and backend transaction tracing
* **Uptime monitoring:** Better Uptime or UptimeRobot — ping all critical endpoints every 60 seconds.
  * SMS/WhatsApp alert if any endpoint goes down
* **Database monitoring:** Supabase's built-in `pg_stat_statements` view. Create a weekly query to identify the top 10 slowest queries.
  * Add indexes for any query taking > 100ms
* **Business metrics dashboard:** A simple internal Metabase or Retool dashboard showing: new signups per day, active users, revenue per plan tier, churn rate

### 6.2 Security Hardening
The current security posture is good but missing several critical controls for a financial platform:
* **Content Security Policy (CSP):** Add a strict CSP header via `helmet`.
  * Whitelist only known domains: Razorpay, Supabase, Deepgram, Meta (WhatsApp), Google Fonts
* **SQL Injection:** All Supabase queries already use parameterized queries (RLS). Audit every raw query for any string interpolation
* **File Upload Validation:** The avatar/logo upload currently accepts any Base64. Add MIME type validation server-side (accept only `image/jpeg`, `image/png`, `image/webp`).
  * Add size limit at the middleware level (2MB)
* **JWT Rotation:** Implement refresh token pattern. Access token: 15 minutes. Refresh token: 30 days, stored as httpOnly cookie (not localStorage).
  * This prevents token theft via XSS
* **Rate Limiting Enhancement:** Current limit (2000 req/15min) is too high for a financial app.
  * Tiered limits: `/api/auth/*` → 20 req/15min, `/api/ai/*` → 50 req/15min, all other endpoints → 500 req/15min
* **Audit Trail:** The existing `activity_logs` table is good. Add log entries for: login, logout, password change, profile update, subscription change, plan downgrade

### 6.3 Multi-Device & Offline Support
Indian shop owners use FinSathi on both desktop and a cheap Android phone.
The mobile experience must be first-class, and offline resilience is critical in areas with patchy connectivity.
* **Progressive Web App (PWA):** Add a `manifest.json` and a service worker (Vite PWA plugin).
  * This enables 'Add to Home Screen' on Android — feels like a native app without App Store friction
* **Offline-first for Billing:** The most critical flow. Use IndexedDB (via Dexie.js) to cache the product catalog and customer list locally.
  * If the network is unavailable, the billing POS still works. Transactions are queued and synced when connectivity returns
  * Background sync: Service Worker Background Sync API to flush the offline transaction queue when connectivity is restored
* **Mobile-specific optimizations:** Replace all hover states with active states on touch. Minimum tap target 44×44px.
  * Use 16px font size on all mobile inputs to prevent iOS auto-zoom

### 6.4 Invoice PDF Performance Overhaul
* Puppeteer-based PDF generation is the current bottleneck at ~3.5 seconds. This is unacceptable for a POS workflow.
* Replace Puppeteer with `@react-pdf/renderer` (React-PDF). This generates PDFs in pure JavaScript without launching a headless browser.
* Generation time drops to ~200ms
* PDF template: React component that renders the invoice layout. Props: invoice object. Output: Buffer
* Pre-generate PDFs for invoices asynchronously: When an invoice is created, queue a Bull job to generate and store the PDF.
* By the time the user clicks 'Download', it's already ready
* Store PDFs in Supabase Storage (S3-compatible). Return a pre-signed URL valid for 24 hours instead of streaming the PDF on every request

---

## 7. Additional Recommended Features (Beyond v2.0 PRD)

> These features are recommended additions beyond the original v2.0 PRD scope. They address real gaps identified in the v1.0 architecture and add meaningful business value without adding architectural complexity.

### 7.1 Multi-Location / Branch Support
* As MSMEs grow, they open second and third locations. The current architecture is single-location per `user_id`.
* Add a `locations` table (`location_id`, `user_id`, `name`, `address`) and scope inventory, sales, and staff to a location.
* The owner can view consolidated reports or per-location reports.
* Low effort: Add `location_id` foreign key to `inventory`, `sales`, `staff`, `expenses` tables
* UI: Location selector dropdown in the `AppLayout` header — persists in localStorage
* Reports: Toggle between 'All Locations' and individual location views

### 7.2 Customer WhatsApp Portal (B2C Self-Service)
* Let customers check their own outstanding balance and download their invoice PDFs without calling the shop.
* Public route: `/portal/{business_slug}/customer` — customer enters their registered phone number → receives a WhatsApp OTP → authenticated into a read-only view of their invoices and balance
* Eliminates the most common support request: 'Bhai, kitna baaki hai?' (How much is outstanding?)
* Zero development cost for the business owner — they share the portal link with customers once

### 7.3 Vendor / Supplier Management
* The `expenses` table tracks outflows but has no concept of recurring vendors.
* Add a `suppliers` table (already mentioned in migration 13) and:
* Link expenses to supplier records for spend analysis ('How much did I spend at ABC Distributors this month?')
* Supplier payment terms tracking: Net-30, Net-60 — flag overdue payables
* Purchase Order module: Create POs, mark as received (auto-updates inventory), track outstanding payables

### 7.4 Automated GST Report Generator
* The single most requested feature by Indian business owners after billing. Auto-generate GSTR-1 and GSTR-3B summaries from existing sales data.
* GSTR-1 data is already in the `invoices` + `invoice_items` tables (HSN codes, GST %, customer GSTIN)
* New report page: 'GST Reports' under the P&L section. Date range selector → generates a summary table in the GSTR-1 format
* Export as Excel (xlsx) and JSON (for direct import into government portal).
* Use the SheetJS library already available in the frontend
* Disclaimer: 'This is a summary for reference only. Verify with a CA before filing.'

### 7.5 In-App Notification Center
* Currently, all system events (low stock, payment received, subscription renewal) only appear in the activity log.
* Add a proper notification system:
* `notifications` table: (`notification_id`, `user_id`, `type`, `title`, `body`, `read`, `created_at`, `action_url`)
* Bell icon in the `AppLayout` header with an unread count badge
* Notification types: `LOW_STOCK`, `PAYMENT_RECEIVED`, `INVOICE_OVERDUE`, `SUBSCRIPTION_EXPIRING`, `CASH_CRUNCH_WARNING`, `ANOMALY_DETECTED`, `SUBSIDY_MATCH`
* Real-time delivery via Supabase Realtime (WebSocket subscription to the notifications table filtered by `user_id`). Zero additional infrastructure

---

## 8. Complete v2.0 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + Vite 5 | SPA with route-based code splitting |
| **State: Server** | TanStack Query v5 | All API data fetching, caching, mutations |
| **State: Client** | Zustand v4 | UI state, sidebar, modals, command palette |
| **Routing** | React Router v6 | Client-side routing with lazy loading |
| **Forms** | React Hook Form + Zod | Performant forms with schema validation |
| **Charts** | Recharts | Sales, P&L, cash flow visualizations |
| **Command Palette** | cmdk | Ctrl+K omni-search |
| **Virtual Scroll** | TanStack Virtual | Large list rendering (inventory, invoices) |
| **Offline Storage** | Dexie.js (IndexedDB) | Offline billing cache |
| **PDF Generation** | @react-pdf/renderer | Fast invoice PDFs (no Puppeteer) |
| **PWA** | Vite PWA Plugin | Service worker, manifest, offline support |
| **Animations** | Framer Motion (minimal) | Modal transitions, sidebar only |
| **Backend Framework** | Node.js 20 + Express 5 | REST API server |
| **Database** | Supabase (PostgreSQL 15) | Primary data store + RLS + Realtime |
| **Cache / Queue** | Upstash Redis + Bull | API caching + async job queue |
| **Auth** | JWT (15min) + Refresh Token | Stateless auth with rotation |
| **Validation** | Zod (all endpoints) | Request schema validation |
| **File Storage** | Supabase Storage | Invoice PDFs, avatars, QR codes |
| **Payments** | Razorpay | Subscriptions + Payment Links |
| **WhatsApp** | Meta Graph API | Reminders + catalog sharing |
| **Voice AI** | Deepgram Nova-2 | Hindi/Hinglish speech-to-text |
| **AI/LLM** | Gemini 1.5 Flash | Intent extraction + response formatting |
| **Error Tracking** | Sentry.io | Frontend + backend error monitoring |
| **Deployment: Frontend** | Vercel | Edge CDN, automatic HTTPS |
| **Deployment: Backend** | Railway or Render | Node.js server with auto-deploy |
| **CI/CD** | GitHub Actions | Lint, test, build, deploy pipeline |

---

## 9. Execution Timeline & Sprint Plan

| Week | Phase | Deliverables | Success Metric |
|---|---|---|---|
| **1** | Foundation | Code splitting, Zustand, skeleton loaders, design system tokens | Lighthouse > 85 |
| **2** | Quick Wins | Command Palette, Health Score, virtual scroll, PDF overhaul | TTI < 2s on 4G |
| **3** | WhatsApp (1) | WhatsApp Business API setup, payment reminders, delivery tracking | First WhatsApp reminder sent |
| **4** | WhatsApp (2) | Digital catalog, catalog orders, subsidy matchmaker data + UI | Catalog shareable via WhatsApp |
| **5** | AI (1) | LLM middleware service, FinVoice backend, intent schema, 7 query types | Voice query returns data |
| **6** | AI (2) | FinPredict cash flow widget, anomaly detection, notification center | Cash crunch warning fires |
| **7** | Hardening (1) | Sentry, JWT rotation, CSP, Redis caching, materialized views | API p95 < 200ms |
| **8** | Hardening (2) | PWA, offline billing, GST report generator, branch support scaffold | PWA installable on Android |

---

## 10. Risk Register & Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| **WhatsApp API approval delay** (Meta review takes 2–4 weeks) | HIGH | Apply for Business API access in Week 1 in parallel with other work. Use Twilio SMS as fallback for reminders. |
| **Deepgram/Gemini API costs spiral at scale** | MEDIUM | Implement strict rate limiting per plan tier. Cache LLM responses for identical queries within 1 hour. Monitor cost per query in a billing dashboard. |
| **IndexedDB offline sync conflicts** (two devices, same shop) | MEDIUM | Last-write-wins with client timestamp. Show a conflict resolution UI when a sync conflict is detected on the server. |
| **Redis Upstash cold start latency** on free tier | LOW | Upgrade to paid Upstash tier ($0.20/100K commands) once MAU > 500. Keep TTLs short so stale data can't accumulate. |
| **Government scheme data goes stale** | LOW | Create a scheduled GitHub Action that pings scheme URLs monthly and flags 404s. Assign a team member 2 hours/month to update the schemes table. |
| **GSTR data inaccuracy leads to legal liability** | HIGH | Prominent disclaimer on every GST report. Never use words 'file' or 'submit' — only 'summary' and 'reference'. Consult a CA for template verification. |

---

## 11. Definition of Done — v2.0 Launch Criteria

FinSathi v2.0 is ready to launch when ALL of the following are true:
* Lighthouse Performance score > 90 on mobile (tested on a Moto G-class device)
* All 15 existing features work identically to v1.0 — zero regression in billing, inventory, or payroll
* Command Palette responds in < 100ms to keystroke input
* FinVoice correctly interprets 7 intent types with > 90% accuracy on test suite of 50 Hindi/English queries
* WhatsApp reminder successfully delivered to a real phone number in staging
* Digital catalog loads in < 1.5s on a 3G connection (tested via Chrome DevTools throttling)
* At least 1 government scheme correctly matched to a test business profile
* Cash flow predictor correctly identifies a simulated deficit scenario
* Sentry captures a test error in both frontend and backend environments
* JWT refresh token flow works correctly — user stays logged in after 15-minute access token expiry
* PWA installs on Android Chrome without errors
* All API endpoints return responses in < 300ms at p95 under 50 concurrent users (load tested with k6)
* Zero critical or high severity Sentry errors in 48 hours of staging testing
* GSTIN/UPI fields pass correct validation — no invalid data can be saved
* A non-technical tester (shop owner persona) can complete: register → add product → create invoice → send WhatsApp reminder in under 5 minutes with no guidance

> **FinSathi v2.0 — Built for the next 10 million Indian businesses. Ship it.**
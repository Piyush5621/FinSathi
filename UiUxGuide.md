🚀 FINSATHI UI/UX MASTER BUILD GUIDE (STEP-BY-STEP)
🔥 STEP 0 — UNDERSTAND THE USER (MOST IMPORTANT)

Before touching UI:

👉 Your user =

Shopkeeper
Busy
Non-technical
Using phone
Distracted
RULE:

If user cannot understand screen in 3 seconds → FAIL

❌ STEP 1 — DESTROY OLD UI (YES, COMPLETELY)

DO THIS FIRST:

❌ Remove inconsistent spacing
❌ Remove random colors
❌ Remove all old buttons
❌ Remove mixed layouts
❌ Remove inline styles

👉 You are NOT improving old UI
👉 You are REBUILDING from scratch using system

🧠 STEP 2 — BUILD DESIGN SYSTEM (FOUNDATION)

⚠️ DO NOT SKIP THIS

🎨 2.1 Create Theme System

Create:

theme.js
tailwind.config.js
ADD EXACT TOKENS:
brand-navy → #0F1E3A
brand-blue → #2483F5
bg-page → #F5F7FA
bg-card → #FFFFFF
text-main → #111827
text-muted → #6B7280

👉 RULE:
❌ Never use raw hex in components
✅ Always use tokens

🔤 2.2 Typography System

ONLY USE:

22px → Page title
18px → Section
16px → Card title
14px → Body
13px → Labels
12px → Caption
11px → Badge

👉 If you use random size → UI breaks

📏 2.3 Spacing System

ONLY USE:

4 / 8 / 12 / 16 / 20 / 24 / 32 / 48

👉 This creates consistency

🔘 2.4 Components YOU MUST BUILD FIRST

⚠️ STOP — DO NOT BUILD PAGES

First build:

Button
Input
Badge
Table
Card
Modal
Drawer

👉 Pages = combination of these

🧱 STEP 3 — BUILD LAYOUT SYSTEM
🖥️ Desktop Layout
Sidebar (fixed)
Content area (centered)
Max width: 1200px
📱 Mobile Layout
Sidebar → hidden
Bottom navigation

Tabs:

Dashboard
Sales
Inventory
Customers
More
🔥 RULES
One primary button per page
Always show status
Never icon-only
Always label + icon
🚀 STEP 4 — REBUILD APP SHELL

👉 File: AppLayout.jsx

Build:
Sidebar (left)
Top header
Content wrapper
Mobile bottom nav

👉 This is the skeleton of your app

🚀 STEP 5 — BUILD DASHBOARD (FIRST PAGE)
Structure:
Row 1 → Quick Actions
New Sale (primary)
Add Stock
New Customer
Reports
Row 2 → Metrics
Today Sales
Outstanding
Low Stock
Profit
Row 3 → Charts
Sales chart
Top products
Row 4 → Lists
Transactions
Pending payments
IMPORTANT RULES
No decoration
Only data
Skeleton loader required
🚀 STEP 6 — BUILD BILLING PAGE (MOST IMPORTANT)
FLOW (STRICT)
Select Customer
Add Product
Show Stock
Calculate GST
Payment
Generate Invoice
UI STRUCTURE
LEFT SIDE
Customer search
Product search
Line items
RIGHT SIDE
Summary
GST breakdown
Payment
CRITICAL RULES
Real-time calculation
Inline stock warning
No popup errors
Sticky summary
🚀 STEP 7 — INVENTORY PAGE
Build:
Product table
Filters
Stock status colors
COLOR RULE
Red → Out of stock
Amber → Low stock
White → OK
ADVANCED
Click row → open drawer
Show stock history
🚀 STEP 8 — CUSTOMER PAGE
Build:
Customer list
Outstanding highlight
Detail page
Detail Page:

Tabs:

Ledger
Invoices
Payments
IMPORTANT
Show balance clearly
Add WhatsApp + Call buttons
🚀 STEP 9 — EXPENSE + P&L
Build:
Expense table
Category system
P&L summary
Formula:
Profit = Revenue - Expenses
🚀 STEP 10 — SETTINGS PAGE
Tabs:
Business
Invoice
Tax
Account
Notifications
Include:
GSTIN
Invoice settings
QR code option
🚀 STEP 11 — MASTER PROMPT SYSTEM (VERY IMPORTANT)

👉 Use AI like this:

Copy MASTER PROMPT
Add page prompt
Paste your code
Ask to rewrite UI

👉 One page at a time

🚀 STEP 12 — MOBILE OPTIMIZATION
MUST DO:
44px touch size
Bottom nav
Full screen forms
Horizontal table scroll
🚀 STEP 13 — UX PERFECTION RULES
ALWAYS:
Show status (badge)
Show loading (skeleton)
Show empty state
Confirm delete
Show feedback
🚨 COMMON MISTAKES (YOU MUST AVOID)
❌ Designing without system
❌ Skipping components
❌ Using random spacing
❌ No mobile testing
❌ Too many buttons
❌ No hierarchy
🧠 FINAL MINDSET

You are not building UI.

You are building:

👉 A tool a shopkeeper uses during business

So UI must be:

Fast
Clear
Obvious
Reliable
🔥 FINAL EXECUTION ORDER (FOLLOW THIS EXACTLY)
Design system
Components
Layout
Dashboard
Billing
Inventory
Customers
Expenses
Settings
Mobile
Polish
🚀 FINAL RESULT (IF YOU FOLLOW THIS)

You will get:

SaaS-level UI
Professional product
Better than Vyapar
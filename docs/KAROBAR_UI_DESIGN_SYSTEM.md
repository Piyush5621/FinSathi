# Karobar UI/UX Design System Specification (v2.0)

> **Karobar — The Business Operating System for Indian MSMEs**  
> *Inspired by the enterprise precision of Razorpay, Shopify Admin, Zoho, and high-speed POS terminals.*

---

## 1. Core Principles

1. **Information Hierarchy First**: Business operators need immediate clarity on three questions upon opening any screen:
   - *Where am I?* (Breadcrumbs + Page Title)
   - *What matters right now?* (High-level financial & operational KPIs)
   - *What can I do?* (One unmistakable primary CTA + secondary actions)
2. **Zero Feature Removal**: Redesign means structure, clarity, and ergonomics. Never omit an existing calculation, route, or business capability.
3. **Tabular Numerals & High Scanability**: All currency and inventory numbers use monospace/tabular numerals (`.tabular-nums`) with clear Indian Rupee formatting (`₹1,84,520`).
4. **Dual Theme Native**: Light and Dark modes are engineered in parallel using semantic CSS custom properties.

---

## 2. Color System

### Light Mode Tokens
```css
--bg-app:              #F7F8FA; /* Canvas background */
--surface-app:         #FFFFFF; /* Primary cards & tables */
--surface-secondary:   #F1F3F5; /* Table headers, chips, input backgrounds */
--surface-elevated:    #FFFFFF; /* Dropdowns & modals */
--text-primary:        #111827; /* Main headings & titles */
--text-secondary:      #667085; /* Body copy & labels */
--text-muted:          #98A2B3; /* Subtitles, placeholders, breadcrumbs */
--border-app:          #E4E7EC; /* Card borders & table dividers */
--border-subtle:       #F2F4F7; /* Hairline dividers */

--primary-app:         #3157D5; /* Primary Brand Blue */
--primary-hover:       #2647B8;
--primary-subtle:      #EEF2FF;

--success-app:         #16A34A; /* Emerald */
--success-subtle:      #F0FDF4;
--warning-app:         #D97706; /* Amber */
--warning-subtle:      #FFFBEB;
--danger-app:          #DC2626; /* Rose / Red */
--danger-subtle:       #FEF2F2;
--info-app:            #2563EB; /* Blue */
--info-subtle:         #EFF6FF;
```

### Dark Mode Tokens
```css
--bg-app:              #0B0F14; /* Deep Slate canvas */
--surface-app:         #111827; /* Dark card surfaces */
--surface-secondary:   #172033; /* Dark table headers & active pills */
--surface-elevated:    #1F2937; /* Modals & elevated dropdowns */
--text-primary:        #F8FAFC; /* Bright primary text */
--text-secondary:      #94A3B8; /* Muted secondary text */
--text-muted:          #64748B; /* Dark mode caption text */
--border-app:          #263244; /* Clean slate borders */
--border-subtle:       #1E293B;

--primary-app:         #5B7CFF; /* Vibrant accessible blue */
--primary-hover:       #7590FF;
--primary-subtle:      rgba(91, 124, 255, 0.12);

--success-app:         #22C55E;
--success-subtle:      rgba(34, 197, 94, 0.12);
--warning-app:         #F59E0B;
--warning-subtle:      rgba(245, 158, 11, 0.12);
--danger-app:          #EF4444;
--danger-subtle:       rgba(239, 68, 68, 0.12);
--info-app:            #60A5FA;
--info-subtle:         rgba(96, 165, 250, 0.12);
```

---

## 3. Typography Scale (Inter Font Family)

| Scale | Size / Line Height | Weight | Tailwind Class | Semantic Usage |
|---|---|---|---|---|
| **Page Title** | 28px / 32px | SemiBold (600) | `text-page-title` | Screen main header |
| **Section Heading** | 20px / 28px | SemiBold (600) | `text-section-heading` | Drawer / Modal / Section titles |
| **Card Heading** | 16px / 24px | SemiBold (600) | `text-card-heading` | Card & Panel header |
| **Body** | 14px / 20px | Regular (400) / Medium (500) | `text-body` | Standard body & table data |
| **Small** | 13px / 18px | Regular (400) / Medium (500) | `text-small` | Buttons, navigation, input labels |
| **Caption** | 12px / 16px | Regular (400) / Medium (500) | `text-caption` | Timestamps, helpers, badges |
| **Micro** | 11px / 14px | SemiBold (600) | `text-micro` | Badges, counter pills, shortcuts |

---

## 4. Border Radii & Elevation Shadows

### Radius Scale
- **Small controls & badges**: `6px` (`rounded-control`)
- **Inputs & standard buttons**: `8px` (`rounded-btn` / `rounded-input`)
- **Standard cards**: `10px` (`rounded-card`)
- **Panels & Drawers**: `12px` (`rounded-panel`)
- **Modals & Overlays**: `14px` (`rounded-modal`)

### Shadows
- **Card**: `0 1px 2px rgba(16, 24, 40, 0.04)` (`shadow-card`)
- **Elevated / Dropdowns**: `0 4px 12px rgba(16, 24, 40, 0.08)` (`shadow-elevated`)
- **Modal / Floating**: `0 16px 40px rgba(16, 24, 40, 0.16)` (`shadow-modal`)

---

## 5. Semantic Status & Badging System

The `Badge` component and `getStatusVariant(status)` utility automatically normalize all statuses across Karobar:

| Status Group | Status Keys | Semantic Color Token | Visual Appearance |
|---|---|---|---|
| **Success** | `Paid`, `Active`, `Imported`, `Completed`, `Approved`, `Delivered`, `Won`, `Settled` | `--success-app` | Soft green pill with emerald text & optional dot |
| **Warning** | `Pending`, `Partial`, `Low Stock`, `Awaiting Approval`, `Inward`, `Beta` | `--warning-app` | Soft amber pill with amber text & optional dot |
| **Danger** | `Failed`, `Rejected`, `Overdue`, `Suspended`, `Lost`, `Out of Stock` | `--danger-app` | Soft rose pill with red text & optional dot |
| **Neutral / Info** | `Draft`, `Inactive`, `Archived`, `Roadmap`, `Pro`, `Premium` | `--surface-secondary` | Subtle gray or slate pill with crisp text |

---

## 6. Application Shell Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ☰  Karobar Business • Owner Workspace    [ 🔍 Search commands (Ctrl+K) ]  🏪 Main ▼ 🔔 ☀️ 👤 │
├─────────────────┬──────────────────────────────────────────────────────────────────────┤
│ Overview        │                                                                      │
│                 │  Home > Operations > Stock & Inventory                                │
│ OPERATIONS      │  Stock & Inventory                                      + Add Product │
│   POS Billing   │  Manage products, multi-variant stock, and barcodes                  │
│   Invoices      │  ──────────────────────────────────────────────────────────────────  │
│   Inventory     │  [ 1,240 Products ]   [ 42 Low Stock ]   [ ₹18.4L Total Valuation ]  │
│   Purchases     │  ──────────────────────────────────────────────────────────────────  │
│   Customers     │  [ Search products... ] [ Filter: Category ▼ ] [ Export CSV ]        │
│   CRM           │  ──────────────────────────────────────────────────────────────────  │
│                 │  TABLE / MAIN CONTENT                                                │
│ FINANCE         │  SKU    Product Name    Category    Stock Level    Price    Status   │
│   Payments      │  ──────────────────────────────────────────────────────────────────  │
│   Expenses      │  Showing 1 to 10 of 1,240 items               < Previous  1 2 3  Next > │
│   P&L Financial │                                                                      │
│   GST & Tax     │                                                                      │
│                 │                                                                      │
│ NETWORK / STAFF │                                                                      │
│ SYSTEM          │                                                                      │
└─────────────────┴──────────────────────────────────────────────────────────────────────┘
```

### Role-Based Access in Sidebar (`Sidebar.jsx`):
1. **Owner / Admin**: Complete access to all 6 pillars (Operations, Finance, Network, People, Intelligence, System).
2. **Manager**: Full operational access, CRM, and branch staff oversight without subscription/system administrative controls.
3. **Cashier**: Restricted strictly to POS Billing, Invoice Ledger, Customer Khata, Payments, and Employee Attendance/Payslips.
4. **Warehouse Staff**: Restricted strictly to Stock & Inventory, Purchase Receiving, and Employee Attendance/Payslips.
5. **Accountant**: Restricted strictly to Invoices, Payments, Expenses, P&L, GST Tax Reports, and Attendance/Payslips.

---

## 7. Component Library APIs

All components are located in `frontend/src/components/ui/` and exported via `frontend/src/components/ui/index.js`:

- `<Button variant="primary|secondary|outline|ghost|danger|success" size="sm|md|lg" loading={bool} icon={JSX} />`
- `<Input label="Label" error="Error message" helperText="Helper text" icon={JSX} />`
- `<Select label="Label" options={[{ value, label }]} error="Error" />`
- `<Textarea label="Label" rows={3} maxLength={200} />`
- `<Checkbox checked={bool} onChange={fn} label="Label" description="Desc" />`
- `<Switch checked={bool} onChange={fn} label="Label" description="Desc" />`
- `<Badge variant="success|warning|danger|info|gray" dot={bool} status="Paid" />`
- `<Card elevated={bool} hover={bool} noPadding={bool} />`
- `<KpiCard title="Title" value="₹1,84,520" change="+12.4%" changeType="increase" icon={JSX} />`
- `<Table><Thead><Tr><Th sortable>...</Th></Tr></Thead><Tbody><Tr><Td>...</Td></Tr></Tbody></Table>`
- `<Pagination currentPage={1} totalPages={12} totalItems={120} itemsPerPage={10} onPageChange={fn} />`
- `<EmptyState title="No items" description="Desc" actionLabel="Add Item" onAction={fn} />`
- `<ErrorState title="Error" message="Desc" onRetry={fn} />`
- `<Modal isOpen={bool} onClose={fn} title="Title" footer={JSX} maxWidth="max-w-lg" />`
- `<Drawer isOpen={bool} onClose={fn} title="Title" footer={JSX} maxWidth="max-w-md" />`
- `<Dropdown trigger={JSX}><DropdownItem icon={JSX} onClick={fn}>Item</DropdownItem></Dropdown>`
- `<Tooltip content="Tooltip text" position="top|bottom|left|right">{children}</Tooltip>`
- `<Alert variant="info|success|warning|danger" title="Title">Message</Alert>`
- `<ConfirmationModal isOpen={bool} onClose={fn} onConfirm={fn} title="Confirm Delete" message="Msg" />`
- `<Breadcrumbs items={[{ label, path }]} />`
- `<PageContainer title="Title" description="Desc" actions={JSX} kpis={JSX} filters={JSX} footer={JSX} />`

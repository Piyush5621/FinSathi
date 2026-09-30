import { 
  LayoutDashboard, ShoppingCart, FileText, Receipt, 
  Package, Users, Truck, TrendingDown, 
  TrendingUp, HeartPulse, Bot, ArrowLeftRight, 
  ShieldCheck, Settings, Calendar, DollarSign, Building2, 
  BarChart2, ShieldAlert, Database, Bell, Store
} from 'lucide-react';

/**
 * Authoritative Navigation Configuration for KaroBar (FinSathi)
 * Single Source of Truth shared across:
 * 1. Desktop Sidebar (Expandable domains & collapsed view)
 * 2. Global Command Palette (Ctrl+K searchable actions)
 * 3. Mobile Navigation Drawer (Touch-optimized domain groups)
 */

export const NAV_DOMAINS = {
  OVERVIEW: 'OVERVIEW',
  SALES: 'SALES & POS',
  INVENTORY: 'INVENTORY & PURCHASING',
  CUSTOMERS: 'CUSTOMERS & KHATA',
  FINANCE: 'FINANCE & COMPLIANCE',
  WORKFORCE: 'WORKFORCE',
  SYSTEM: 'SYSTEM & SETTINGS'
};

/**
 * Filter navigation sections according to user role, permissions, and business type.
 */
export function getNavigationSections(user = {}) {
  const role = user?.role || 'Owner';
  // A user is an owner if they have no staff_id set
  const isStaff = !!(user?.staff_id);
  const isOwner = !isStaff;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasWildcard = permissions.includes('*') || isOwner;
  const hasPerm = (perm) => hasWildcard || permissions.includes(perm);

  const b2bTypes = ['distributor', 'manufacturer', 'wholesaler', 'b2b'];
  const isB2B = b2bTypes.includes(user?.business_type?.toLowerCase());
  const hasMultiStore = user?.multi_store_enabled === true;

  const sections = [];

  // 1. OVERVIEW DOMAIN
  const overviewItems = [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Executive dashboard & real-time store metrics'
    }
  ];
  sections.push({
    id: 'overview',
    label: NAV_DOMAINS.OVERVIEW,
    defaultExpanded: true,
    items: overviewItems
  });

  // 2. SALES & POS DOMAIN
  const salesItems = [];
  if (hasPerm('create_sales') || hasPerm('view_billing') || role === 'Cashier' || role === 'Manager') {
    salesItems.push({
      id: 'billing',
      path: '/billing',
      label: 'POS Billing Register',
      icon: ShoppingCart,
      description: 'Counter barcode billing, cart & customer receipts'
    });
    salesItems.push({
      id: 'invoice-history',
      path: '/invoice-history',
      label: 'Sales & Invoice Ledger',
      icon: Receipt,
      description: 'Audit bills, return invoices & reprint receipts'
    });
  }
  if (salesItems.length > 0) {
    sections.push({
      id: 'sales',
      label: NAV_DOMAINS.SALES,
      defaultExpanded: true,
      items: salesItems
    });
  }

  // 3. INVENTORY & PURCHASING DOMAIN
  const inventoryItems = [];
  if (hasPerm('view_catalog') || hasPerm('edit_catalog') || hasPerm('run_counts') || role === 'Warehouse Staff' || role === 'Manager') {
    inventoryItems.push({
      id: 'inventory',
      path: '/inventory',
      label: 'Stock & Inventory',
      icon: Package,
      description: 'Product catalog, SKU counts & barcode scanner'
    });
  }
  if (hasPerm('approve_po') || hasPerm('post_invoices') || role === 'Warehouse Staff' || role === 'Manager' || role === 'Accountant') {
    inventoryItems.push({
      id: 'suppliers',
      path: '/suppliers',
      label: 'Purchases & Suppliers',
      icon: Truck,
      description: 'Supplier orders, PO receiving & vendor outstandings'
    });
  }
  if (inventoryItems.length > 0) {
    sections.push({
      id: 'inventory',
      label: NAV_DOMAINS.INVENTORY,
      defaultExpanded: true,
      items: inventoryItems
    });
  }

  // 4. CUSTOMERS & KHATA DOMAIN
  const customerItems = [];
  if (hasPerm('view_billing') || hasPerm('create_sales') || role === 'Cashier' || role === 'Manager' || role === 'Accountant') {
    customerItems.push({
      id: 'customers',
      path: '/customers',
      label: 'Customer Khata & Registry',
      icon: Users,
      description: 'Customer credit ledger, dues & WhatsApp reminders'
    });
  }
  if (customerItems.length > 0) {
    sections.push({
      id: 'customers',
      label: NAV_DOMAINS.CUSTOMERS,
      defaultExpanded: true,
      items: customerItems
    });
  }

  // 5. FINANCE & COMPLIANCE DOMAIN
  const financeItems = [];
  if (isOwner || role === 'Accountant' || role === 'Manager') {
    financeItems.push({
      id: 'expenses',
      path: '/expenses',
      label: 'Operating Expenses',
      icon: TrendingDown,
      description: 'Expense vouchers, overhead categories & receipts'
    });
  }
  if (isOwner || role === 'Accountant' || role === 'Manager' || hasPerm('adjust_costs')) {
    financeItems.push({
      id: 'pnl',
      path: '/pnl',
      label: 'P&L Financials',
      icon: TrendingUp,
      description: 'Gross margin, net profit trends & operational P&L'
    });
  }
  if (isOwner || role === 'Accountant') {
    financeItems.push({
      id: 'gst',
      path: '/reports/gst',
      label: 'GST Tax Compliance',
      icon: FileText,
      description: 'GSTR-1, GSTR-3B filings, B2B/B2C & Excel export'
    });
  }
  if (isOwner || role === 'Manager') {
    financeItems.push({
      id: 'executive-analytics',
      path: '/executive-analytics',
      label: 'Executive Analytics',
      icon: BarChart2,
      description: 'Printable financial statements & 12-month analytics'
    });
  }
  if (financeItems.length > 0) {
    sections.push({
      id: 'finance',
      label: NAV_DOMAINS.FINANCE,
      defaultExpanded: false,
      items: financeItems
    });
  }

  // 6. WORKFORCE DOMAIN
  const workforceItems = [];
  if (isOwner || hasPerm('admin_setup') || role === 'Manager') {
    workforceItems.push({
      id: 'staff-team',
      path: '/staff?tab=team',
      label: 'Staff Directory',
      icon: Users,
      description: 'Employee roster, PIN codes & store branch assignments'
    });
    workforceItems.push({
      id: 'staff-attendance',
      path: '/staff?tab=attendance',
      label: 'Attendance & Kiosk',
      icon: Calendar,
      description: 'Clock-in logs, shifts & QR check-in terminal'
    });
    if (isOwner || hasPerm('admin_setup')) {
      workforceItems.push({
        id: 'staff-roles',
        path: '/staff?tab=roles',
        label: 'Roles & Permissions Matrix',
        icon: ShieldCheck,
        description: 'Role-based access matrix & capability toggles'
      });
    }
  } else {
    // Regular employee view
    workforceItems.push({
      id: 'my-attendance',
      path: '/staff?tab=attendance',
      label: 'My Attendance',
      icon: Calendar,
      description: 'View check-in presence and shift history'
    });
  }
  if (workforceItems.length > 0) {
    sections.push({
      id: 'workforce',
      label: isOwner || role === 'Manager' ? NAV_DOMAINS.WORKFORCE : 'MY RECORDS',
      defaultExpanded: false,
      items: workforceItems
    });
  }

  // 7. SYSTEM & SETTINGS DOMAIN
  if (isOwner || hasPerm('admin_setup')) {
    const systemItems = [
      {
        id: 'settings',
        path: '/settings',
        label: 'Business Settings & UPI',
        icon: Settings,
        description: 'Store profile, GSTIN, UPI QR invoice configuration'
      },
      ...(hasMultiStore ? [{
        id: 'stores',
        path: '/stores',
        label: 'Store Branches',
        icon: Store,
        description: 'Create & manage multiple branch locations'
      }] : []),
      {
        id: 'audit-center',
        path: '/audit-center',
        label: 'Security Audit Trail',
        icon: ShieldAlert,
        description: 'Immutable record audit history with before/after diffs'
      },
      {
        id: 'backup-wizard',
        path: '/backup-wizard',
        label: 'Backup & Disaster Recovery',
        icon: Database,
        description: 'Full database export & encrypted restore protection'
      }
    ];
    sections.push({
      id: 'system',
      label: NAV_DOMAINS.SYSTEM,
      defaultExpanded: false,
      items: systemItems
    });
  }

  return sections;
}

/**
 * Generates flattened command items for CommandPalette with role-based restrictions.
 */
export function getSearchableCommands(user = {}, navigate) {
  const sections = getNavigationSections(user);
  const commands = [];

  sections.forEach((section) => {
    section.items.forEach((item) => {
      commands.push({
        id: `cmd-${item.id}`,
        title: item.label,
        category: section.label,
        description: item.description,
        icon: item.icon,
        path: item.path,
        action: () => navigate(item.path)
      });
    });
  });

  return commands;
}

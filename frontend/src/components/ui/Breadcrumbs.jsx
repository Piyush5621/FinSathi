import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  dashboard: 'Overview',
  billing: 'POS Terminal',
  'invoice-history': 'Invoice Ledger',
  payments: 'Payments Inflow',
  inventory: 'Stock & Inventory',
  customers: 'Customer Registry',
  suppliers: 'Local Suppliers',
  crm: 'CRM & Pipeline',
  expenses: 'Expenses Outflow',
  pnl: 'P&L Analytics',
  'health-score': 'Business Health',
  'ai-advisor': 'AI Copilot',
  'executive-analytics': 'Executive Analytics',
  'founder-dashboard': 'Founder Console',
  network: 'Business Network',
  exchange: 'Business Exchange',
  staff: 'Staff Hub',
  stores: 'Branch Management',
  settings: 'Business Profile',
  profile: 'Account Profile',
  subscription: 'Subscription',
  plans: 'Plans & Pricing',
  'audit-center': 'Audit Center',
  'backup-wizard': 'Backup Wizard',
  general: 'General Hub',
};

export function Breadcrumbs({ items, className = '' }) {
  const location = useLocation();

  const generatedItems = React.useMemo(() => {
    if (items && Array.isArray(items)) return items;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')) {
      return [{ label: 'Overview', path: '/dashboard' }];
    }

    const breadcrumbs = [{ label: 'Overview', path: '/dashboard' }];
    let currentPath = '';

    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = ROUTE_LABELS[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  }, [location.pathname, items]);

  return (
    <nav aria-label="Breadcrumbs" className={`flex items-center gap-1.5 text-caption text-app-text-muted ${className}`}>
      <Link 
        to="/dashboard" 
        className="hover:text-app-text transition-colors p-0.5 rounded-control focus:outline-none focus-visible:ring-1 focus-visible:ring-app-primary"
        title="Dashboard Overview"
      >
        <Home size={13} />
      </Link>

      {generatedItems.map((item, index) => {
        const isLast = index === generatedItems.length - 1;

        return (
          <React.Fragment key={item.path || index}>
            <ChevronRight size={12} className="text-app-text-muted/60 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-app-text truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-app-text transition-colors truncate max-w-[160px] rounded-control focus:outline-none focus-visible:ring-1 focus-visible:ring-app-primary"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;

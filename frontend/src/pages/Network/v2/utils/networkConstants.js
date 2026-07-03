// Design System Constants for FinSathi Business Network

export const STATUS_STYLES = {
  // Inbox / Outbox
  Pending: 'text-amber-600 bg-amber-50 border-amber-200',
  Viewed: 'text-blue-600 bg-blue-50 border-blue-200',
  Accepted: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Imported: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  Rejected: 'text-rose-600 bg-rose-50 border-rose-200',
  
  // Trade Credit
  Active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Overdue: 'text-rose-600 bg-rose-50 border-rose-200',
  Suspended: 'text-amber-600 bg-amber-50 border-amber-200',
  Closed: 'text-slate-500 bg-slate-50 border-slate-200',
  
  // Returns
  Resolved: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  
  // Directory & Connections
  Verified: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Unverified: 'text-slate-500 bg-slate-50 border-slate-200',
  Connected: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  Requested: 'text-amber-600 bg-amber-50 border-amber-200',
};

// Standardized spacing and layout tokens
export const LAYOUT = {
  container: 'max-w-[1200px] mx-auto pb-16 space-y-6 px-4 sm:px-0',
  card: 'p-5 bg-white border border-slate-100 rounded-[20px] shadow-sm hover:shadow-md transition-all',
  sectionHeader: 'flex items-center gap-2 mb-4',
  pageHeader: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6',
};

// Accessible Button Tokens (ensuring tap targets > 44px for mobile)
export const BUTTONS = {
  primary: 'bg-indigo-600 text-white border-none hover:bg-indigo-700 font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 min-h-[44px] transition-colors',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 min-h-[44px] transition-colors',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl min-h-[44px] transition-colors',
};

// Typography Hierarchy (WCAG AA Compliant minimum sizes)
export const TYPOGRAPHY = {
  pageTitle: 'text-2xl font-black text-slate-900 tracking-tight',
  pageSubtitle: 'text-sm text-slate-500 font-medium leading-relaxed',
  sectionTitle: 'text-xs font-black text-slate-700 uppercase tracking-wide',
  cardTitle: 'text-sm font-bold text-slate-900',
  body: 'text-xs text-slate-600 leading-relaxed',
  caption: 'text-[11px] font-semibold text-slate-500', // Increased for readability
  badge: 'text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border',
};

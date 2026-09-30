import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";
import Loader from "./components/Loader";
import AppLayout from "./layouts/AppLayout";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { StoreProvider } from "./contexts/StoreContext";
import ErrorBoundary from "./components/ErrorBoundary";

const Login = lazyWithRetry(() => import("./pages/Auth/Login"));
const Register = lazyWithRetry(() => import("./pages/Auth/Register"));
const SuspendedPage = lazyWithRetry(() => import("./pages/Auth/SuspendedPage"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"));
const CatalogPage = lazyWithRetry(() => import("./pages/Public/CatalogPage"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard/Dashboard"));
const Profile = lazyWithRetry(() => import("./pages/Profile/Profile"));
const CustomersPage = lazyWithRetry(() => import("./pages/CustomersPage"));
const InventoryPage = lazyWithRetry(() => import("./pages/InventoryPage"));
const Billing = lazyWithRetry(() => import("./pages/Billing/Billing"));
const InvoiceHistory = lazyWithRetry(() => import("./pages/InvoiceHistory/InvoiceHistory"));
const CustomerInvoicesPage = lazyWithRetry(() => import("./pages/CustomerInvoicesPage"));
const ExpensePage = lazyWithRetry(() => import("./pages/ExpensePage"));
const PnlPage = lazyWithRetry(() => import("./pages/PnlPage"));
const GstReportsPage = lazyWithRetry(() => import("./pages/GstReportsPage"));
const AttendanceScanPage = lazyWithRetry(() => import("./pages/AttendanceTerminal"));
const StoreManagement = lazyWithRetry(() => import("./pages/StoreManagement"));
const SupplierHub = lazyWithRetry(() => import("./pages/SupplierHub"));

// Workforce & Access Management
const StaffHub = lazyWithRetry(() => import("./pages/Workforce/StaffHub"));
const AuditCenter = lazyWithRetry(() => import("./pages/Audit/AuditCenter"));
const BackupWizard = lazyWithRetry(() => import("./pages/Backup/BackupWizard"));
const ExecutiveAnalytics = lazyWithRetry(() => import("./pages/Analytics/ExecutiveAnalytics"));

// Admin Interface
const AdminLogin = lazyWithRetry(() => import("./pages/Admin/AdminLogin"));
const AdminDashboard = lazyWithRetry(() => import("./pages/Admin/AdminDashboard"));

// ProtectedRoute logic is handled directly in AppLayout.jsx for cleaner mapping, or we can keep it here.
// Let's rely on AppLayout checking loggedIn.

function App() {
  return (
    <ThemeProvider>
      <Router>
        <SubscriptionProvider>
          <StoreProvider>
            <Toaster position="top-right" />
            <ErrorBoundary>
              <Suspense fallback={<div className="flex h-screen items-center justify-center bg-app-bg text-app-text"><Loader /></div>}>
              <Routes>
              {/* 🟢 Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot" element={<Navigate to="/login" replace />} />
              <Route path="/register" element={<Register />} />
              <Route path="/attend" element={<AttendanceScanPage />} />
              <Route path="/suspended" element={<SuspendedPage />} />
              <Route path="/catalog/:businessSlug" element={<CatalogPage />} />

              {/* 🛡️ Superadmin Control Center */}
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />

              {/* 🔐 Protected Routes (layout with persistent Sidebar) */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/founder-dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/invoice-history" element={<InvoiceHistory />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Profile />} />
                <Route path="/stores" element={<StoreManagement />} />
                <Route path="/suppliers" element={<SupplierHub />} />
                
                {/* Staff & Access Management — 4-Pillar Architecture */}
                <Route path="/staff" element={<StaffHub />} />
                <Route path="/rbac" element={<Navigate to="/staff?tab=roles" replace />} />
                <Route path="/workforce/employees" element={<Navigate to="/staff?tab=team" replace />} />
                <Route path="/workforce/attendance" element={<Navigate to="/staff?tab=attendance" replace />} />
                <Route path="/workforce/roles" element={<Navigate to="/staff?tab=roles" replace />} />
                <Route path="/workforce/matrix" element={<Navigate to="/staff?tab=roles" replace />} />
                <Route path="/workforce/approvals" element={<Navigate to="/staff?tab=roles" replace />} />
                <Route path="/workforce/audit" element={<Navigate to="/staff?tab=roles" replace />} />
                
                <Route path="/audit-center" element={<AuditCenter />} />
                <Route path="/backup-wizard" element={<BackupWizard />} />
                <Route path="/executive-analytics" element={<ExecutiveAnalytics />} />
                <Route path="/reports" element={<ExecutiveAnalytics />} />
                <Route path="/analytics" element={<ExecutiveAnalytics />} />
                <Route path="/expenses" element={<ExpensePage />} />
                <Route path="/pnl" element={<PnlPage />} />
                
                {/* Clean redirects for removed features */}
                <Route path="/health-score" element={<Navigate to="/executive-analytics" replace />} />
                <Route path="/ai-advisor" element={<Navigate to="/dashboard" replace />} />
                <Route path="/intelligence" element={<Navigate to="/dashboard" replace />} />
                <Route path="/decision-center" element={<Navigate to="/dashboard" replace />} />
                <Route path="/alerts" element={<Navigate to="/dashboard" replace />} />
                <Route path="/automation" element={<Navigate to="/dashboard" replace />} />
                <Route path="/forecasting" element={<Navigate to="/dashboard" replace />} />
                <Route path="/predictions" element={<Navigate to="/dashboard" replace />} />
                <Route path="/multi-store" element={<Navigate to="/stores" replace />} />
                <Route path="/enterprise-intelligence" element={<Navigate to="/stores" replace />} />
                <Route path="/subscription/plans" element={<Navigate to="/settings" replace />} />
                <Route path="/reminders" element={<Navigate to="/settings?tab=integrations" replace />} />
                <Route path="/reports/gst" element={<GstReportsPage />} />
                <Route path="/customer-invoices/:id" element={<CustomerInvoicesPage />} />
              </Route>

              {/* ⚙️ Catch-all redirect (Optional) */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
          </StoreProvider>
      </SubscriptionProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;

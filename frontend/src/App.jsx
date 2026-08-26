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
const FounderDashboard = lazyWithRetry(() => import("./pages/Dashboard/FounderDashboard"));
const Profile = lazyWithRetry(() => import("./pages/Profile/Profile"));
const CustomersPage = lazyWithRetry(() => import("./pages/CustomersPage"));
const InventoryPage = lazyWithRetry(() => import("./pages/InventoryPage"));
const Billing = lazyWithRetry(() => import("./pages/Billing/Billing"));
const InvoiceHistory = lazyWithRetry(() => import("./pages/InvoiceHistory/InvoiceHistory"));
const CustomerInvoicesPage = lazyWithRetry(() => import("./pages/CustomerInvoicesPage"));
const PaymentsPage = lazyWithRetry(() => import("./pages/PaymentsPage"));
const ExpensePage = lazyWithRetry(() => import("./pages/ExpensePage"));
const PnlPage = lazyWithRetry(() => import("./pages/PnlPage"));
const BusinessHealthPage = lazyWithRetry(() => import("./pages/BusinessHealthPage"));
const AiAdvisorPage = lazyWithRetry(() => import("./pages/AiAdvisorPage"));
const ToolsPage = lazyWithRetry(() => import("./pages/ToolsPage"));
const AttendanceScanPage = lazyWithRetry(() => import("./pages/AttendanceTerminal"));
const GeneralPage = lazyWithRetry(() => import("./pages/GeneralPage"));
const StoreManagement = lazyWithRetry(() => import("./pages/StoreManagement"));
const SupplierHub = lazyWithRetry(() => import("./pages/SupplierHub"));
const CrmPage = lazyWithRetry(() => import("./pages/CrmPage"));

// Workforce & Access Management
const StaffHub = lazyWithRetry(() => import("./pages/Workforce/StaffHub"));
const AuditCenter = lazyWithRetry(() => import("./pages/Audit/AuditCenter"));
const BackupWizard = lazyWithRetry(() => import("./pages/Backup/BackupWizard"));
const ExecutiveAnalytics = lazyWithRetry(() => import("./pages/Analytics/ExecutiveAnalytics"));

const Settings = lazyWithRetry(() => import("./pages/Profile/Profile"));
const Plans = lazyWithRetry(() => import("./pages/Subscription/Plans"));
const AlertsAutomationCenter = lazyWithRetry(() => import("./pages/Alerts/AlertsAutomationCenter"));
const PredictiveForecastingCenter = lazyWithRetry(() => import("./pages/Analytics/PredictiveForecastingCenter"));
const WorkflowAutomationCenter = lazyWithRetry(() => import("./pages/Automation/WorkflowAutomationCenter"));
const MultiStoreIntelligenceCenter = lazyWithRetry(() => import("./pages/Analytics/MultiStoreIntelligenceCenter"));

// Business Network Module
const NetworkHome = lazyWithRetry(() => import('./pages/Network/v2/NetworkHome'));
const BusinessDirectory = lazyWithRetry(() => import('./pages/Network/v2/BusinessDirectory'));
const BusinessExchange = lazyWithRetry(() => import('./pages/Network/v2/BusinessExchange'));
const PartnersHub = lazyWithRetry(() => import('./pages/Network/v2/PartnersHub'));
const TradeWorkspace = lazyWithRetry(() => import('./pages/Network/v2/TradeWorkspace'));
const GrowthCenter = lazyWithRetry(() => import('./pages/Network/v2/GrowthCenter'));

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
                <Route path="/founder-dashboard" element={<FounderDashboard />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/invoice-history" element={<InvoiceHistory />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Profile />} />
                <Route path="/stores" element={<StoreManagement />} />
                <Route path="/suppliers" element={<SupplierHub />} />
                <Route path="/crm" element={<CrmPage />} />
                
                {/* Staff & Access Management — 4-Pillar Architecture */}
                <Route path="/staff" element={<StaffHub />} />
                <Route path="/rbac" element={<Navigate to="/staff?tab=roles" replace />} />
                <Route path="/workforce/employees" element={<Navigate to="/staff?tab=team" replace />} />
                <Route path="/workforce/payroll" element={<Navigate to="/staff?tab=payroll" replace />} />
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
                <Route path="/subscription/plans" element={<Plans />} />
                <Route path="/expenses" element={<ExpensePage />} />
                <Route path="/pnl" element={<PnlPage />} />
                <Route path="/health-score" element={<BusinessHealthPage />} />
                <Route path="/ai-advisor" element={<AiAdvisorPage />} />
                <Route path="/intelligence" element={<AiAdvisorPage />} />
                <Route path="/decision-center" element={<AiAdvisorPage />} />
                <Route path="/alerts" element={<AlertsAutomationCenter />} />
                <Route path="/automation" element={<AlertsAutomationCenter />} />
                <Route path="/forecasting" element={<PredictiveForecastingCenter />} />
                <Route path="/predictions" element={<PredictiveForecastingCenter />} />
                <Route path="/workflows" element={<WorkflowAutomationCenter />} />
                <Route path="/autopilot" element={<WorkflowAutomationCenter />} />
                <Route path="/multi-store" element={<MultiStoreIntelligenceCenter />} />
                <Route path="/enterprise-intelligence" element={<MultiStoreIntelligenceCenter />} />
                <Route path="/growth" element={<Navigate to="/general?tab=growth" replace />} />
                <Route path="/marketplace" element={<Navigate to="/general?tab=marketplace" replace />} />
                <Route path="/reminders" element={<Navigate to="/general?tab=reminders" replace />} />
                <Route path="/reports/gst" element={<Navigate to="/general?tab=gst" replace />} />
                <Route path="/general" element={<GeneralPage />} />
                <Route path="/customer-invoices/:id" element={<CustomerInvoicesPage />} />

                {/* 🌐 Business Network Routes — 5-Pillar Architecture */}
                <Route path="/network" element={<NetworkHome />} />
                <Route path="/network/exchange" element={<BusinessExchange />} />
                <Route path="/network/growth" element={<GrowthCenter />} />

                {/* Legacy redirects — map seamlessly into 5-Pillar /network tabs */}
                <Route path="/network/overview" element={<Navigate to="/network?tab=partners" replace />} />
                <Route path="/network/partners" element={<Navigate to="/network?tab=partners" replace />} />
                <Route path="/network/connections" element={<Navigate to="/network?tab=partners" replace />} />
                <Route path="/network/directory" element={<Navigate to="/network?tab=partners" replace />} />
                <Route path="/network/inbox" element={<Navigate to="/network?tab=inbox" replace />} />
                <Route path="/network/outbox" element={<Navigate to="/network?tab=outbox" replace />} />
                <Route path="/network/workspace" element={<Navigate to="/network?tab=inbox" replace />} />
                <Route path="/network/trade-credit" element={<Navigate to="/network?tab=credits" replace />} />
                <Route path="/network/trade-returns" element={<Navigate to="/network?tab=inbox" replace />} />
                <Route path="/network/shared-catalogs" element={<Navigate to="/network?tab=partners" replace />} />
                <Route path="/network/trade-history" element={<Navigate to="/network?tab=inbox" replace />} />
                <Route path="/network/analytics" element={<Navigate to="/network?tab=trust" replace />} />
                <Route path="/network/reputation" element={<Navigate to="/network?tab=trust" replace />} />
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

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";
import Loader from "./components/Loader"; // Assuming you have aLoader component

const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const SuspendedPage = lazy(() => import("./pages/Auth/SuspendedPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const CatalogPage = lazy(() => import("./pages/Public/CatalogPage"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const FounderDashboard = lazy(() => import("./pages/Dashboard/FounderDashboard"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const Billing = lazy(() => import("./pages/Billing/Billing"));
const InvoiceHistory = lazy(() => import("./pages/InvoiceHistory/InvoiceHistory"));
const CustomerInvoicesPage = lazy(() => import("./pages/CustomerInvoicesPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const ExpensePage = lazy(() => import("./pages/ExpensePage"));
const PnlPage = lazy(() => import("./pages/PnlPage"));
const BusinessHealthPage = lazy(() => import("./pages/BusinessHealthPage"));
const AiAdvisorPage = lazy(() => import("./pages/AiAdvisorPage"));
const ToolsPage = lazy(() => import("./pages/ToolsPage"));
const AttendanceScanPage = lazy(() => import("./pages/AttendanceTerminal"));
const GeneralPage = lazy(() => import("./pages/GeneralPage"));
const StoreManagement = lazy(() => import("./pages/StoreManagement"));
const SupplierHub = lazy(() => import("./pages/SupplierHub"));
const CrmPage = lazy(() => import("./pages/CrmPage"));

// PHASE 3: Workforce & Access Management
const EmployeesList = lazy(() => import("./pages/Workforce/EmployeesList"));
const PayrollAttendance = lazy(() => import("./pages/Workforce/PayrollAttendance"));
const RoleManagement = lazy(() => import("./pages/Workforce/RoleManagement"));
const AccessMatrix = lazy(() => import("./pages/Workforce/AccessMatrix"));
const ApprovalWorkflows = lazy(() => import("./pages/Workforce/ApprovalWorkflows"));
const AuditTrail = lazy(() => import("./pages/Workforce/AuditTrail"));
const AuditCenter = lazy(() => import("./pages/Audit/AuditCenter"));
const BackupWizard = lazy(() => import("./pages/Backup/BackupWizard"));
const ExecutiveAnalytics = lazy(() => import("./pages/Analytics/ExecutiveAnalytics"));
const AppLayout = lazy(() => import("./layouts/AppLayout"));
import { ThemeProvider } from "./contexts/ThemeContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { StoreProvider } from "./contexts/StoreContext";
import ErrorBoundary from "./components/ErrorBoundary";

const Settings = lazy(() => import("./pages/Profile/Profile")); // fallback if missing
const Plans = lazy(() => import("./pages/Subscription/Plans"));

// PHASE 5: Business Network Module
const NetworkOverview = lazy(() => import("./pages/Network/NetworkOverview"));
const NetworkConnections = lazy(() => import("./pages/Network/NetworkConnections"));
const PurchaseInbox = lazy(() => import("./pages/Network/PurchaseInbox"));
const SalesOutbox = lazy(() => import("./pages/Network/SalesOutbox"));
const ProductPartners = lazy(() => import("./pages/Network/ProductPartners"));
const TradeCreditPage = lazy(() => import("./pages/Network/TradeCreditPage"));
const TradeReturns = lazy(() => import("./pages/Network/TradeReturns"));
const SharedCatalogs = lazy(() => import("./pages/Network/SharedCatalogs"));
const TradeHistory = lazy(() => import("./pages/Network/TradeHistory"));
const NetworkAnalytics = lazy(() => import("./pages/Network/NetworkAnalytics"));

// PHASE 4: Admin Interface
const AdminLogin = lazy(() => import("./pages/Admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/Admin/AdminDashboard"));

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
              <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#F8FAFC]"><Loader /></div>}>
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
                
                {/* Workforce & Access */}
                <Route path="/workforce/employees" element={<EmployeesList />} />
                <Route path="/workforce/payroll" element={<PayrollAttendance />} />
                <Route path="/workforce/roles" element={<RoleManagement />} />
                <Route path="/workforce/matrix" element={<AccessMatrix />} />
                <Route path="/workforce/approvals" element={<ApprovalWorkflows />} />
                <Route path="/workforce/audit" element={<AuditTrail />} />
                
                <Route path="/audit-center" element={<AuditCenter />} />
                <Route path="/backup-wizard" element={<BackupWizard />} />
                <Route path="/executive-analytics" element={<ExecutiveAnalytics />} />
                <Route path="/subscription/plans" element={<Plans />} />
                <Route path="/expenses" element={<ExpensePage />} />
                <Route path="/pnl" element={<PnlPage />} />
                <Route path="/health-score" element={<BusinessHealthPage />} />
                <Route path="/ai-advisor" element={<AiAdvisorPage />} />
                <Route path="/growth" element={<Navigate to="/general?tab=growth" replace />} />
                <Route path="/marketplace" element={<Navigate to="/general?tab=marketplace" replace />} />
                <Route path="/reminders" element={<Navigate to="/general?tab=reminders" replace />} />
                <Route path="/reports/gst" element={<Navigate to="/general?tab=gst" replace />} />
                <Route path="/general" element={<GeneralPage />} />
                <Route path="/customer-invoices/:id" element={<CustomerInvoicesPage />} />

                {/* 🌐 Business Network Routes */}
                <Route path="/network/overview" element={<NetworkOverview />} />
                <Route path="/network/connections" element={<NetworkConnections />} />
                <Route path="/network/inbox" element={<PurchaseInbox />} />
                <Route path="/network/outbox" element={<SalesOutbox />} />
                <Route path="/network/partners" element={<ProductPartners />} />
                <Route path="/network/trade-credit" element={<TradeCreditPage />} />
                <Route path="/network/trade-returns" element={<TradeReturns />} />
                <Route path="/network/shared-catalogs" element={<SharedCatalogs />} />
                <Route path="/network/trade-history" element={<TradeHistory />} />
                <Route path="/network/analytics" element={<NetworkAnalytics />} />
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

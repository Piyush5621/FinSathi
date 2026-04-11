import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";
import Loader from "./components/Loader"; // Assuming you have a Loader component

const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const Billing = lazy(() => import("./pages/Billing/Billing"));
const InvoiceHistory = lazy(() => import("./pages/InvoiceHistory/InvoiceHistory"));
const CustomerInvoicesPage = lazy(() => import("./pages/CustomerInvoicesPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const ExpensePage = lazy(() => import("./pages/ExpensePage"));
const PnlPage = lazy(() => import("./pages/PnlPage"));
const ToolsPage = lazy(() => import("./pages/ToolsPage"));
const DemoHub = lazy(() => import("./pages/DemoHub"));
const StaffHub = lazy(() => import("./pages/StaffHub"));
const LogisticsHub = lazy(() => import("./pages/LogisticsHub"));
const AttendanceScanPage = lazy(() => import("./pages/AttendanceTerminal"));
const RemindersPage = lazy(() => import("./pages/GeneralPage"));
const AppLayout = lazy(() => import("./layouts/AppLayout"));
import { ThemeProvider } from "./contexts/ThemeContext";

// ProtectedRoute logic is handled directly in AppLayout.jsx for cleaner mapping, or we can keep it here.
// Let's rely on AppLayout checking loggedIn.

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster position="top-right" />
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#F8FAFC]"><Loader /></div>}>
          <Routes>
            {/* 🟢 Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/attend" element={<AttendanceScanPage />} />

            {/* 🔐 Protected Routes (layout with persistent Sidebar) */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/invoice-history" element={<InvoiceHistory />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Profile />} />
              <Route path="/expenses" element={<ExpensePage />} />
              <Route path="/pnl" element={<PnlPage />} />
              <Route path="/staff" element={<StaffHub />} />
              <Route path="/logistics" element={<LogisticsHub />} />
              <Route path="/marketplace" element={<DemoHub />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/customer-invoices/:id" element={<CustomerInvoicesPage />} />
            </Route>

            {/* ⚙️ Catch-all redirect (Optional) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
};

export default App;

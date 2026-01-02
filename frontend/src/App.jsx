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
const MainLayout = lazy(() => import("./layouts/MainLayout"));
import { ThemeProvider } from "./contexts/ThemeContext";

// ✅ Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const loggedIn = localStorage.getItem("loggedIn");
  return loggedIn ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'glass-light neo-dark',
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
            },
          }}
        />
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader /></div>}>
          <Routes>
            {/* 🟢 Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* 🔐 Protected Routes (layout with persistent Sidebar) */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/invoice-history" element={<InvoiceHistory />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Profile />} />
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

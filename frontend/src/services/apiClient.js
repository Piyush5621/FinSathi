import axios from "axios";

// Base URL of your backend (Node.js + Supabase)
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
});

// Optional: automatically add auth token if logged in
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auto-Logout on 401 or handle Plan Limits on 403
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginPage = window.location.pathname === "/login" || window.location.pathname === "/admin/login";

    if (error.response && error.response.status === 401) {
      if (!isLoginPage) {
        localStorage.clear();
        window.location.href = "/login?expired=true";
      }
    } else if (error.response && error.response.status === 403) {
      if (error.response.data?.error === 'PLAN_LIMIT_REACHED') {
         window.location.href = "/subscription/plans";
      } else if (error.response.data?.error === 'ACCOUNT_SUSPENDED') {
         localStorage.clear();
         window.location.href = "/suspended";
      } else if (!isLoginPage) {
         localStorage.clear();
         window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  }
);

export default API;

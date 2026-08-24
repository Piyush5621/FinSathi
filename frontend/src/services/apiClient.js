import axios from "axios";

// Base URL of backend (Node.js + Supabase)
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  withCredentials: true // Ensure HttpOnly cookies (including refreshToken) are sent automatically
});

// Request Interceptor: attach Bearer token if available and normalize url
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url && config.url.startsWith("/api/")) {
    config.url = config.url.replace(/^\/api/, "");
  }
  return config;
}, (error) => Promise.reject(error));

// Concurrency-safe Refresh State
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleLogout = () => {
  localStorage.clear();
  const isLoginPage = window.location.pathname === "/login" || window.location.pathname === "/admin/login";
  if (!isLoginPage) {
    window.location.href = "/login?expired=true";
  }
};

// Response Interceptor: Auto-Refresh on 401 & Error handling
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginPage = window.location.pathname === "/login" || window.location.pathname === "/admin/login";

    // 1. Handle 401 Unauthorized with Automatic Access Token Refresh via HttpOnly Cookie
    if (error.response && error.response.status === 401 && originalRequest) {
      const isAuthRoute = originalRequest.url?.includes("/auth/login") || 
                          originalRequest.url?.includes("/auth/register") || 
                          originalRequest.url?.includes("/auth/refresh");

      // Do not attempt refresh on auth routes or if request has already been retried
      if (isAuthRoute || originalRequest._retry) {
        if (!isLoginPage && !originalRequest.url?.includes("/auth/login")) {
          handleLogout();
        }
        return Promise.reject(error);
      }

      // If a refresh is already in flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark request as retried and lock refreshing
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Post to /auth/refresh with credentials so HttpOnly cookie is attached automatically
        const refreshResponse = await axios.post(
          `${API.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken || 
                               refreshResponse.data?.token || 
                               refreshResponse.data?.accessToken;

        if (!newAccessToken) {
          throw new Error("No access token received from refresh endpoint.");
        }

        // Store new access token in localStorage (refresh token is handled exclusively via HttpOnly cookie)
        localStorage.setItem("token", newAccessToken);

        // Update default header for subsequent requests
        API.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Drain the queued promises
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry the original request with new access token
        return API(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        handleLogout();
        return Promise.reject(refreshErr);
      }
    }

    // 2. Handle 403 Forbidden Plan Limits & Account Suspensions
    if (error.response && error.response.status === 403) {
      if (error.response.data?.error === 'PLAN_LIMIT_REACHED') {
        window.location.href = "/subscription/plans";
      } else if (error.response.data?.error === 'ACCOUNT_SUSPENDED') {
        localStorage.clear();
        window.location.href = "/suspended";
      }
      // Generic 403: Do NOT log out or clear storage. Pass error to caller.
    }

    return Promise.reject(error);
  }
);

export default API;

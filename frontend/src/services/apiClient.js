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

// Auto-Logout on 401/403
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && [401, 403].includes(error.response.status)) {
      localStorage.clear();
      window.location.href = "/login?expired=true";
    }
    return Promise.reject(error);
  }
);

export default API;

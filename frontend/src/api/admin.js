import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
// Note: admin routes on backend are registered at /admin, not /api/admin
const ADMIN_URL = API_URL.replace('/api', '/admin');

const adminApi = axios.create({
  baseURL: ADMIN_URL,
});

// Interceptor to add admin token
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminLogin = async (username, password) => {
  const response = await adminApi.post("/auth/login", { username, password });
  return response.data;
};

export const fetchAllUsers = async () => {
  const response = await adminApi.get("/users");
  return response.data;
};

export const toggleUserStatus = async (userId, is_active) => {
  const response = await adminApi.put(`/users/${userId}/status`, { is_active });
  return response.data;
};

export const fetchUserActivity = async (userId) => {
  const response = await adminApi.get(`/users/${userId}/activity`);
  return response.data;
};

export default adminApi;

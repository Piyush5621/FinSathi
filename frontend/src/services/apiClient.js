import axios from "axios";

// Base URL of your backend (Node.js + Supabase)
const API = axios.create({
  baseURL: "http://localhost:5000/api", // ✅ Your backend runs here
});

// Optional: automatically add auth token if logged in
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;

import API from "../services/apiClient";

export const getSummary = async () => {
  const { data } = await API.get("/summary");
  // Assuming API.get returns { data: ... }
  return data;
};

export const getSalesSummary = async () => {
  const { data } = await API.get("/sales/summary");
  return data || {};
};

export const getDashboardData = async () => {
  const { data } = await API.get("/dashboard");
  return data || null;
};

import API from "../services/apiClient";

export const getSalesSummary = async () => {
  const { data } = await API.get("/sales/summary");
  return data || {};
};

export const getDashboardData = async (storeId = null) => {
  const url = storeId ? `/dashboard?store_id=${storeId}` : '/dashboard';
  const { data } = await API.get(url);
  return data || null;
};

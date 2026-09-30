import { useQuery } from "@tanstack/react-query";
import { getSalesSummary, getDashboardData } from "../api/dashboard";

export const useSalesSummary = () => {
  return useQuery({
    queryKey: ["salesSummary"],
    queryFn: getSalesSummary,
  });
};

export const useDashboardData = (storeId = null) => {
  return useQuery({
    queryKey: ["dashboardData", storeId],
    queryFn: () => getDashboardData(storeId),
  });
};

import { useQuery } from "@tanstack/react-query";
import { getSummary, getSalesSummary, getDashboardData } from "../api/dashboard";

export const useSummary = () => {
  return useQuery({
    queryKey: ["summary"],
    queryFn: getSummary,
  });
};

export const useSalesSummary = () => {
  return useQuery({
    queryKey: ["salesSummary"],
    queryFn: getSalesSummary,
  });
};

export const useDashboardData = () => {
  return useQuery({
    queryKey: ["dashboardData"],
    queryFn: getDashboardData,
  });
};

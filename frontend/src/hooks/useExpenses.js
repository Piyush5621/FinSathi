import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/apiClient";

/**
 * Hook to fetch operating expenses with server-side pagination, search, and filters.
 */
export const useExpenses = (params = {}) => {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) queryParams.set("page", params.page);
      if (params.limit !== undefined) queryParams.set("limit", params.limit);
      if (params.search) queryParams.set("search", params.search);
      if (params.category && params.category !== "all") queryParams.set("category", params.category);
      if (params.paymentMethod && params.paymentMethod !== "all") queryParams.set("paymentMethod", params.paymentMethod);
      if (params.startDate) queryParams.set("startDate", params.startDate);
      if (params.endDate) queryParams.set("endDate", params.endDate);
      if (params.storeId) queryParams.set("storeId", params.storeId);
      if (params.paginate !== undefined) queryParams.set("paginate", String(params.paginate));

      const queryString = queryParams.toString();
      const url = queryString ? `/expenses?${queryString}` : "/expenses";
      const res = await API.get(url);

      const data = res.data;
      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length,
          page: 1,
          limit: data.length || 50,
          totalPages: 1
        };
      }

      return {
        items: data?.items || data?.data || [],
        total: Number(data?.total || 0),
        page: Number(data?.page || 1),
        limit: Number(data?.limit || 50),
        totalPages: Number(data?.totalPages || 1)
      };
    }
  });
};

/**
 * Hook to fetch canonical cashbook movements and authoritative financial summary.
 */
export const useCashbook = (params = {}) => {
  return useQuery({
    queryKey: ["cashbook", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) queryParams.set("page", params.page);
      if (params.limit !== undefined) queryParams.set("limit", params.limit);
      if (params.storeId) queryParams.set("storeId", params.storeId);
      if (params.startDate) queryParams.set("startDate", params.startDate);
      if (params.endDate) queryParams.set("endDate", params.endDate);
      if (params.paymentMethod && params.paymentMethod !== "all") queryParams.set("paymentMethod", params.paymentMethod);
      if (params.transactionType && params.transactionType !== "all") queryParams.set("transactionType", params.transactionType);
      if (params.direction && params.direction !== "all") queryParams.set("direction", params.direction);

      const queryString = queryParams.toString();
      const url = queryString ? `/cashbook?${queryString}` : "/cashbook";
      const res = await API.get(url);

      return res.data || {
        summary: {
          totalInflow: 0,
          totalOutflow: 0,
          netMovement: 0,
          accounts: { cashDrawer: 0, upiDigital: 0, bankCard: 0 },
          entryCounts: { sales: 0, customerPayments: 0, expenses: 0, supplierPayments: 0, adjustments: 0 }
        },
        movements: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 1 }
      };
    }
  });
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await API.get("/suppliers?limit=200");
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    }
  });
};

export const useAddExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await API.post("/expenses", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await API.put(`/expenses/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await API.delete(`/expenses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
};

export const useAddCashAdjustment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await API.post("/cashbook/adjustments", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
};

export const useAddSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await API.post("/suppliers", data);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    }
  });
};

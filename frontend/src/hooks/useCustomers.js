import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomers, getPendingAmounts, addCustomer, deleteCustomer } from "../api/customers";

export const useCustomers = () => {
  return useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });
};

export const usePendingAmounts = () => {
  return useQuery({
    queryKey: ["pendingAmounts"],
    queryFn: getPendingAmounts,
  });
};

export const useAddCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["pendingAmounts"] });
    },
  });
};

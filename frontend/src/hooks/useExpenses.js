import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/apiClient";

export const useExpenses = () => {
    return useQuery({
        queryKey: ["expenses"],
        queryFn: async () => {
            const res = await API.get("/expenses");
            return res.data;
        }
    });
};

export const useSuppliers = () => {
    return useQuery({
        queryKey: ["suppliers"],
        queryFn: async () => {
            const res = await API.get("/expenses/suppliers");
            return res.data;
        }
    });
};

export const useAddExpense = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            return await API.post("/expenses", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }
    });
};

export const useAddSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            return await API.post("/expenses/suppliers", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        }
    });
};

import { useQuery } from "@tanstack/react-query";
import API from "../services/apiClient";

export const usePnl = () => {
    return useQuery({
        queryKey: ["pnl"],
        queryFn: async () => {
            const res = await API.get("/analytics/pnl");
            return res.data;
        }
    });
};

import { supabase } from "../lib/supabaseClient";

export const getCustomers = async () => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getPendingAmounts = async () => {
  const { data, error } = await supabase
    .from("sales")
    .select("customer_id, total, amount_paid, payment_status");

  if (error) throw error;

  const pendingMap = {};
  data?.forEach((sale) => {
    if (sale.payment_status !== "paid") {
      const total = sale.total || 0;
      const paid = sale.amount_paid || 0;
      const due = total - paid;

      if (due > 0) {
        pendingMap[sale.customer_id] = (pendingMap[sale.customer_id] || 0) + due;
      }
    }
  });
  return pendingMap;
};

export const addCustomer = async (form) => {
  const { data, error } = await supabase.from("customers").insert([form]).select();
  if (error) throw error;
  return data;
};

export const deleteCustomer = async (id) => {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
  return id;
};

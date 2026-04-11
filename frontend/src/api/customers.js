import API from "../services/apiClient";

export const getCustomers = async () => {
  const { data } = await API.get("/customers");
  return Array.isArray(data) ? data : [];
};

export const getPendingAmounts = async () => {
  // We'll use the analytics/billing metrics instead or get it from sales
  const { data } = await API.get("/sales");
  
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
  const { data } = await API.post("/customers", form);
  return data;
};

export const deleteCustomer = async (id) => {
  await API.delete(`/customers/${id}`);
  return id;
};

export const updateCustomer = async (id, form) => {
  const { data } = await API.put(`/customers/${id}`, form);
  return data;
};

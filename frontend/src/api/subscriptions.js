import API from "../services/apiClient";

export const subscriptionsApi = {
  getMyPlan: async () => {
    const response = await API.get('/subscriptions/my-plan');
    return response.data;
  },
  createOrder: async (data) => {
    const response = await API.post('/subscriptions/create-order', data);
    return response.data;
  },
  verifyPayment: async (data) => {
    const response = await API.post('/subscriptions/verify', data);
    return response.data;
  },
  cancelSubscription: async () => {
    const response = await API.post('/subscriptions/cancel');
    return response.data;
  },
  getInvoices: async () => {
    const response = await API.get('/subscriptions/invoices');
    return response.data;
  }
};

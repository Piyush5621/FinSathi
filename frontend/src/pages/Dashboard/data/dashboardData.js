// Fallback data for dashboard components when API fails
export const fallbackData = {
  sales: [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 5000 },
    { name: 'Thu', value: 4000 },
    { name: 'Fri', value: 6000 },
    { name: 'Sat', value: 7000 },
    { name: 'Sun', value: 8000 },
  ],
  stats: {
    totalSales: 125000,
    totalCustomers: 45,
    pendingInvoices: 12,
    retention: 72
  },
  topCustomers: [
    { name: 'Tech Solutions Ltd.', value: 25000 },
    { name: 'Global Traders Inc.', value: 18000 },
    { name: 'Local Shop Co.', value: 15000 },
    { name: 'Best Buy Store', value: 12000 },
    { name: 'Super Market Plus', value: 10000 }
  ],
  notifications: [
    {
      id: 1,
      type: 'warning',
      message: 'Low inventory alert: Office Supplies',
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      type: 'success',
      message: 'Sales target achieved for Q3',
      timestamp: new Date().toISOString()
    },
    {
      id: 3,
      type: 'info',
      message: 'New customer registration: XYZ Corp',
      timestamp: new Date().toISOString()
    }
  ]
};

// Helper function to get fallback data with proper date stamps
export const getFallbackData = (key) => {
  if (key === 'notifications') {
    return fallbackData.notifications.map(n => ({
      ...n,
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
    }));
  }
  return fallbackData[key];
};

// Format currency for display
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Calculate growth percentage
export const calculateGrowth = (current, previous) => {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
};

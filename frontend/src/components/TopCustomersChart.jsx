import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import API from '../services/apiClient';

const Loader = () => (
  <div style={{ width: '100%', height: 400, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
  </div>
);

const TopCustomersChart = ({ month, startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let url = '/analytics/top-customers';
        const params = new URLSearchParams();

        if (month) params.append('month', month);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await API.get(url);
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch top customers:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [month, startDate, endDate]);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="text-red-500 text-center p-4 rounded-lg bg-red-50/10">
        Error loading top customers: {error}
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-gray-200 mb-4">Top Customers by Spending</h2>
      <div style={{ width: '100%', height: 400, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={80}
              tick={{ fill: '#E5E7EB', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: '#E5E7EB' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                border: 'none',
                borderRadius: '0.375rem',
                color: '#fff'
              }}
            />
            <Legend />
            <Bar
              dataKey="amount"
              name="Total Spending"
              fill="#34D399"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TopCustomersChart;

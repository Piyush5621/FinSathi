import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
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
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
  </div>
);

const SalesTrendChart = ({ month, startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let url = '/analytics/sales-trend';
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
        console.error('Failed to fetch sales trend:', err);
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
        Error loading sales trend: {error}
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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-gray-200 mb-4">Daily Sales Trend</h2>
      <div style={{ width: '100%', height: 400, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#E5E7EB', fontSize: 12 }}
              tickFormatter={formatDate}
            />
            <YAxis
              tick={{ fill: '#E5E7EB' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => formatDate(label)}
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                border: 'none',
                borderRadius: '0.375rem',
                color: '#fff'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              name="Daily Sales"
              stroke="#60A5FA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#60A5FA' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesTrendChart;

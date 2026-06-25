import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import API from '../services/apiClient';

const Loader = () => (
  <div style={{ width: '100%', height: '100%', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6] rounded-full"></div>
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
      <div className="text-red-700 text-sm font-semibold text-center p-4 rounded-xl bg-red-50 border border-red-100">
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
    <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
            tickFormatter={formatDate}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
            tickFormatter={formatCurrency}
            axisLine={false}
            tickLine={false}
            dx={-10}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value), "Daily Sales"]}
            labelFormatter={(label) => formatDate(label)}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              color: '#0F172A',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif'
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            name="Daily Sales"
            stroke="#3B82F6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorSales)"
            activeDot={{ r: 6, fill: '#3B82F6', stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesTrendChart;


import {  useEffect, useState  } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import API from '../services/apiClient';

const Loader = () => (
  <div style={{ width: '100%', height: '100%', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
  </div>
);

const TopProductsChart = ({ month, startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let url = '/analytics/top-products';
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
        console.error('Failed to fetch top products:', err);
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
      <div className="text-[#B91C1C] text-center p-4 rounded-lg bg-[#FEE2E2]">
        Error loading top products: {error}
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
    <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
            tick={{ fill: '#64748B', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={formatCurrency}
            axisLine={false}
            tickLine={false}
            dx={-10}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '0.5rem',
              color: '#0F172A',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            cursor={{ fill: '#F8FAFC' }}
          />
          <Bar
            dataKey="amount"
            name="Revenue"
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopProductsChart;

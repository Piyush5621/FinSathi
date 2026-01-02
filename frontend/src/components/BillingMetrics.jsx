import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import API from '../services/apiClient';
import toast from 'react-hot-toast';

const colorStyles = {
  indigo: { border: 'border-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  green: { border: 'border-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  yellow: { border: 'border-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  blue: { border: 'border-sky-500', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  purple: { border: 'border-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10' },
};

const MetricCard = ({ title, value, subtitle, color = 'indigo' }) => {
  const styles = colorStyles[color] || colorStyles.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-6 border-l-4 ${styles.border} relative overflow-hidden`}
    >
      {/* Glow Effect */}
      <div className={`absolute top-0 right-0 w-24 h-24 ${styles.bg} blur-2xl rounded-full opacity-20 -translate-y-1/2 translate-x-1/2`}></div>

      <h3 className="text-slate-400 text-sm font-medium relative z-10">
        {title}
      </h3>
      <div className={`mt-2 flex items-baseline text-2xl font-bold ${styles.text} relative z-10`}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-sm text-slate-500 relative z-10">
          {subtitle}
        </div>
      )}
    </motion.div>
  );
};

const BillingMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data } = await API.get('/analytics/billing-metrics');
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching billing metrics:', err);
      toast.error('Failed to load billing metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass-card p-6 animate-pulse"
          >
            <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-slate-700/50 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total Invoices"
        value={metrics.totalInvoices}
        subtitle="All time"
        color="indigo"
      />

      <MetricCard
        title="Payment Status"
        value={`${metrics.paidPercentage}%`}
        subtitle={`${metrics.paidCount} Paid / ${metrics.unpaidCount} Unpaid`}
        color={metrics.paidPercentage > 75 ? 'green' : 'yellow'}
      />

      <MetricCard
        title="Total GST Collected"
        value={`₹${metrics.totalGST.toLocaleString()}`}
        subtitle="From all invoices"
        color="blue"
      />

      <MetricCard
        title="Average Invoice Value"
        value={`₹${parseFloat(metrics.averageInvoiceValue).toLocaleString()}`}
        subtitle="Per invoice"
        color="purple"
      />
    </div>
  );
};

export default BillingMetrics;

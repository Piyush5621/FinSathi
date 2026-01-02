import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Activity,
  Users,
  IndianRupee,
  BarChart2
} from 'lucide-react';
import API from '../services/apiClient';
import Loader from './Loader';

const MetricCard = ({ title, value, icon: Icon, trend, delay }) => {
  const isPositiveTrend = trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-6 flex flex-col justify-between group hover:border-indigo-500/30 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
              <Icon className="text-indigo-400" size={20} />
            </div>
            <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isPositiveTrend ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
          >
            <TrendingUp
              size={12}
              className={`mr-1 ${!isPositiveTrend && 'transform rotate-180'}`}
            />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const DashboardMetrics = ({ data }) => {
  if (!data) return <Loader />;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Today's Revenue"
        value={formatCurrency(data.todayRevenue)}
        icon={IndianRupee}
        trend={0} // TODO: Calculate day-over-day
        delay={0.1}
      />

      <MetricCard
        title="This Month"
        value={formatCurrency(data.monthRevenue)}
        icon={Activity}
        trend={0} // TODO: Calculate month-over-month
        delay={0.2}
      />

      <MetricCard
        title="Low Stock Items"
        value={data.lowStockItems || 0}
        icon={Users} // Maybe change icon to Package?
        trend={null}
        delay={0.3}
      />

      <MetricCard
        title="Outstanding"
        value={formatCurrency(data.outstandingPayments)}
        icon={BarChart2}
        trend={null}
        delay={0.4}
      />
    </div>
  );
};

export default DashboardMetrics;

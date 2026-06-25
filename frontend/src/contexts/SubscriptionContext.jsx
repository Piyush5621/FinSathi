import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi } from '../api/subscriptions';
import { PLANS } from '../constants/plans';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const loggedIn = localStorage.getItem('loggedIn');

  const { data, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionsApi.getMyPlan,
    staleTime: 5 * 60 * 1000, // 5 mins
    enabled: !!loggedIn, // Only fetch if user is logged in
  });

  const subscription = data?.subscription;
  const usage = data?.usage || {};

  const canUse = (feature) => {
    const plan = subscription?.plan || 'free';
    return PLANS[plan]?.features[feature] ?? false;
  };

  const isAtLimit = (metric) => {
    const plan = subscription?.plan || 'free';
    const limit = PLANS[plan]?.limits[metric] ?? 0;
    if (limit === -1) return false;
    return (usage[metric] || 0) >= limit;
  };

  return (
    <SubscriptionContext.Provider value={{ subscription, usage, canUse, isAtLimit, isLoading, planDetails: data?.planDetails }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);

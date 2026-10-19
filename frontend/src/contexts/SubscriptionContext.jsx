import React, { createContext, useContext } from 'react';
import { PLANS } from '../constants/plans';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const subscription = null;
  const usage = {};

  const canUse = (feature) => {
    return PLANS.business.features[feature] ?? false;
  };

  const isAtLimit = () => false;

  return (
    <SubscriptionContext.Provider value={{ subscription, usage, canUse, isAtLimit, isLoading: false, planDetails: PLANS.business }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);

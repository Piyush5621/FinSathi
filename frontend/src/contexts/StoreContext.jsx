import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/apiClient';
import toast from 'react-hot-toast';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const loggedIn = localStorage.getItem('loggedIn');

  // Query to fetch stores and current active store preference
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await API.get('/stores');
      return res.data?.data || { stores: [], activeStoreId: null };
    },
    enabled: !!loggedIn,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const stores = data?.stores || [];
  const activeStoreId = data?.activeStoreId || null;
  const activeStore = stores.find(s => s.id === activeStoreId) || null;

  // Mutation to switch active store preference
  const switchStoreMutation = useMutation({
    mutationFn: async (storeId) => {
      const res = await API.post(`/stores/switch/${storeId}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Switched store branch successfully!');
      // Invalidate stores query to refresh context
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      // Invalidate general business queries so pages reload store-specific details
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Trigger a light window refresh or state broadcast to force layout update if needed
    },
    onError: (err) => {
      console.error('Failed to switch store branch:', err);
      toast.error(err.response?.data?.summary || 'Failed to switch store branch');
    }
  });

  const switchStore = (storeId) => {
    switchStoreMutation.mutate(storeId);
  };

  return (
    <StoreContext.Provider value={{
      stores,
      activeStoreId,
      activeStore,
      switchStore,
      isLoading,
      refetchStores: refetch
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);

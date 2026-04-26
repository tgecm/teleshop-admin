import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { useBotStore } from './store/botStore';
import { getMe } from './api/auth';
import { getBots } from './api/bots';

// Layout & Pages
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Broadcast from './pages/Broadcast';
import Payments from './pages/Payments';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import ToastContainer from './components/shared/ToastContainer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export default function App() {
  const { token, setUser, logout } = useAuthStore();
  const { setBots, selectedBotId, setSelectedBot } = useBotStore();

  useEffect(() => {
    if (token) {
      // Initial data fetch
      const init = async () => {
        try {
          const [me, botsData] = await Promise.all([getMe(), getBots()]);
          setUser(me);
          setBots(botsData);
          
          // Set default bot if none selected
          if (!selectedBotId && botsData.length > 0) {
            setSelectedBot(botsData[0].id);
          }
        } catch (err) {
          console.error('Initialization failed', err);
          if (err.response?.status === 401) {
            logout();
          }
        }
      };
      init();
    }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="customers" element={<Customers />} />
            <Route path="broadcast" element={<Broadcast />} />
            <Route path="payments" element={<Payments />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="settings" element={<Settings />} />
            <Route path="more" element={<Navigate to="/broadcast" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
  );
}

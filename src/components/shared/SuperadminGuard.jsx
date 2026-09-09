import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function SuperadminGuard({ children }) {
  const { user } = useAuthStore();

  if (!user?.is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Wrap routes that require a specific role.
// Example: <RoleRoute allow={['admin']}><AdminPage /></RoleRoute>
export default function RoleRoute({ allow = [], children, redirectTo = '/invoices' }) {
  const { user } = useSelector((state) => state.auth);

  const role = user?.role;

  // If user hasn't been loaded yet, let PrivateRoute show its loader.
  if (!role) return children;

  if (allow.length > 0 && !allow.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

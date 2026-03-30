import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: any) => {

  const isAuthenticated = localStorage.getItem('user_data');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { Spin, Alert } from 'antd';
import { fetchMe, logout } from '../redux/slices/authSlice';

function PrivateRoute({ children }) {
  const dispatch = useDispatch();
  const { token, user, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user && !loading && !error) {
      dispatch(fetchMe());
    }
  }, [token, user, loading, error, dispatch]);

  // If there's an error fetching user, clear token and redirect to login
  useEffect(() => {
    if (error && token) {
      dispatch(logout());
    }
  }, [error, token, dispatch]);

  if (!token || error) {
    return <Navigate to="/login" replace />;
  }

  if (loading && !user) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // If we have a token but still no user after loading is done, something went wrong
  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { Spin } from 'antd';
import { fetchMe } from '../redux/slices/authSlice';

function PrivateRoute({ children }) {
  const dispatch = useDispatch();
  const { token, user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [token, user, dispatch]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading && !user) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return children;
}

export default PrivateRoute;
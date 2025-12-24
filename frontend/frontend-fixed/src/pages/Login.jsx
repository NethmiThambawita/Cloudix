import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '../redux/slices/authSlice';

const { Title } = Typography;

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      await dispatch(login(values)).unwrap();
      message.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      message.error('Login failed: ' + error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 30 }}>
          CLOUDIX
        </Title>
        <Title level={5} style={{ textAlign: 'center', color: '#666', marginBottom: 30 }}>
          Empowering Business Growth
        </Title>

        <Form form={form} onFinish={onFinish} size="large">
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Email required' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Password required' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Login
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#999', marginTop: 20 }}>
          Default: admin@erp.lk / admin123
        </div>
      </Card>
    </div>
  );
}

export default Login;

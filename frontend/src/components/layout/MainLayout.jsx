import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PercentageOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';

const { Header, Sider, Content } = Layout;

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/dashboard')
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: 'Customers',
      onClick: () => navigate('/customers')
    },
    {
      key: '/suppliers',
      icon: <TeamOutlined />,
      label: 'Suppliers',
      onClick: () => navigate('/suppliers')
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Products',
      onClick: () => navigate('/products')
    },
    // ✅ Stock Management - Admin & Manager only
    ...(isAdmin || isManager
      ? [
          {
            key: '/stock',
            icon: <AppstoreOutlined />,
            label: 'Stock Management',
            onClick: () => navigate('/stock')
          }
        ]
      : []),
    // ✅ GRN - All Users
    {
      key: '/grn',
      icon: <ShoppingCartOutlined />,
      label: 'GRN (Goods Receipt)',
      onClick: () => navigate('/grn')
    },
    {
      key: '/quotations',
      icon: <FileTextOutlined />,
      label: 'Quotations (SQ)',
      onClick: () => navigate('/quotations')
    },
    {
      key: '/invoices',
      icon: <FileTextOutlined />,
      label: 'Invoices (SI)',
      onClick: () => navigate('/invoices')
    },
    {
      key: '/payments',
      icon: <DollarOutlined />,
      label: 'Payments (PAY)',
      onClick: () => navigate('/payments')
    },
    // Admin/Manager-only links
    ...(isAdmin || isManager
      ? [
          {
            key: '/reports',
            icon: <BarChartOutlined />,
            label: 'Reports',
            onClick: () => navigate('/reports')
          }
        ]
      : []),
    // Admin-only settings
    ...(isAdmin
      ? [
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            children: [
              {
                key: '/settings',
                label: 'Company Settings',
                onClick: () => navigate('/settings')
              },
              {
                key: '/taxes',
                icon: <PercentageOutlined />,
                label: 'Taxes',
                onClick: () => navigate('/taxes')
              },
              {
                key: '/users',
                icon: <UserOutlined />,
                label: 'User Management',
                onClick: () => navigate('/users')
              }
            ]
          }
        ]
      : [])
  ];

  // Filter menu items based on role
  const filteredMenuItems = isAdmin ? menuItems : menuItems.filter((i) => i.key !== '/dashboard');

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 18 : 20,
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? 'CX' : 'CLOUDIX'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['settings']}
          items={filteredMenuItems}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#666', fontSize: 14 }}>
              Empowering Business Growth
            </span>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span style={{ fontWeight: 500 }}>
                  {user?.firstName || 'Admin'}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: '24px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
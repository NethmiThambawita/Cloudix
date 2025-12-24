import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Statistic, Tag, Alert, Badge } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  TeamOutlined,
  InboxOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  ShopOutlined
} from '@ant-design/icons';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.result);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
    setLoading(false);
  };

  const invoiceColumns = [
    { title: 'Number', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Client', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (val) => `Rs. ${val?.toLocaleString()}` },
    { title: 'Status', dataIndex: 'status', key: 'status' }
  ];

  const quoteColumns = [
    { title: 'Number', dataIndex: 'quotationNumber', key: 'quotationNumber' },
    { title: 'Client', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (val) => `Rs. ${val?.toLocaleString()}` },
    { title: 'Status', dataIndex: 'status', key: 'status' }
  ];

  const userColumns = [
    { 
      title: 'Name', 
      key: 'name',
      render: (_, record) => `${record.firstName} ${record.lastName}`
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Role', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : role === 'manager' ? 'blue' : 'green'}>
          {role.toUpperCase()}
        </Tag>
      )
    },
    { 
      title: 'Status', 
      dataIndex: 'isActive', 
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString()
    }
  ];

  // NEW: Stock Transaction columns
  const stockTransactionColumns = [
    { 
      title: 'Type', 
      dataIndex: 'transactionType', 
      key: 'transactionType',
      render: (type) => (
        <Tag color={type === 'stock_in' || type === 'grn' ? 'green' : 'orange'}>
          {type.toUpperCase().replace('_', ' ')}
        </Tag>
      )
    },
    { 
      title: 'Product', 
      dataIndex: ['product', 'name'], 
      key: 'product' 
    },
    { 
      title: 'Quantity', 
      dataIndex: 'quantity', 
      key: 'quantity',
      render: (qty, record) => {
        const isIncrease = ['stock_in', 'grn'].includes(record.transactionType);
        return (
          <span style={{ color: isIncrease ? '#3f8600' : '#cf1322' }}>
            {isIncrease ? '+' : '-'}{qty}
          </span>
        );
      }
    },
    { 
      title: 'By', 
      dataIndex: ['performedBy', 'firstName'], 
      key: 'performedBy' 
    },
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date) => new Date(date).toLocaleDateString()
    }
  ];

  // ✅ NEW: GRN columns
  const grnColumns = [
    { title: 'GRN Number', dataIndex: 'grnNumber', key: 'grnNumber' },
    { title: 'Supplier', dataIndex: ['supplier', 'name'], key: 'supplier' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        const colors = {
          draft: 'default',
          inspected: 'blue',
          approved: 'cyan',
          completed: 'green',
          rejected: 'red'
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      }
    },
    { 
      title: 'Value', 
      dataIndex: 'totalValue', 
      key: 'totalValue',
      render: (val) => `Rs. ${(val || 0).toLocaleString()}`
    },
    {
      title: 'Date',
      dataIndex: 'grnDate',
      key: 'grnDate',
      render: (date) => new Date(date).toLocaleDateString()
    }
  ];

  return (
    <div>
      <h1>Dashboard</h1>

      {/* ✅ NEW: Stock Alerts */}
      {stats?.lowStockCount > 0 && (
        <Alert
          message="Low Stock Alert"
          description={
            <div>
              <p>
                <strong>{stats.lowStockCount}</strong> item(s) are below minimum stock level.{' '}
                <a onClick={() => navigate('/stock?filter=low')}>View Items</a>
              </p>
              {stats.reorderCount > 0 && (
                <p>
                  <strong>{stats.reorderCount}</strong> item(s) need reordering.{' '}
                  <a onClick={() => navigate('/stock?filter=reorder')}>View Items</a>
                </p>
              )}
            </div>
          }
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          closable
          style={{ marginBottom: 20 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Paid Invoice"
              value={stats?.paidInvoice || 0}
              prefix="Rs."
              valueStyle={{ color: '#3f8600' }}
              suffix={<DollarOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Unpaid Invoice"
              value={stats?.unpaidInvoice || 0}
              prefix="Rs."
              valueStyle={{ color: '#cf1322' }}
              suffix={<DollarOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Draft Invoice"
              value={stats?.draftInvoice || 0}
              prefix="Rs."
              valueStyle={{ color: '#1890ff' }}
              suffix={<FileTextOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Invoices This Month"
              value={stats?.invoicesThisMonth || 0}
              prefix="Rs."
              suffix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ✅ NEW: Stock & Inventory Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Stock Items"
              value={stats?.totalStockItems || 0}
              suffix={<AppstoreOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <Badge count={stats?.lowStockCount || 0} offset={[10, 0]}>
                  Low Stock Items
                </Badge>
              }
              value={stats?.lowStockCount || 0}
              suffix={<WarningOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Stock Value"
              value={stats?.totalStockValue || 0}
              prefix="Rs."
              suffix={<InboxOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <Badge count={stats?.pendingGRNs || 0} offset={[10, 0]}>
                  Pending GRNs
                </Badge>
              }
              value={stats?.pendingGRNs || 0}
              suffix={<ShopOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ✅ NEW: GRN Statistics Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total GRNs"
              value={stats?.totalGRNs || 0}
              suffix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed GRNs (This Month)"
              value={stats?.completedGRNsThisMonth || 0}
              suffix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={12}>
          <Card>
            <Statistic
              title="GRN Value This Month"
              value={stats?.grnValueThisMonth || 0}
              prefix="Rs."
              suffix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Invoices and Quotes */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="Recent Invoices">
            <Table
              columns={invoiceColumns}
              dataSource={stats?.recentInvoices || []}
              rowKey="_id"
              pagination={false}
              loading={loading}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Recent Quotes">
            <Table
              columns={quoteColumns}
              dataSource={stats?.recentQuotes || []}
              rowKey="_id"
              pagination={false}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* ✅ NEW: Recent Stock Transactions and GRNs */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card 
            title="Recent Stock Transactions"
            extra={<a onClick={() => navigate('/stock')}>View All</a>}
          >
            <Table
              columns={stockTransactionColumns}
              dataSource={stats?.recentStockTransactions || []}
              rowKey="_id"
              pagination={false}
              loading={loading}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title="Recent GRNs"
            extra={<a onClick={() => navigate('/grn')}>View All</a>}
          >
            <Table
              columns={grnColumns}
              dataSource={stats?.recentGRNs || []}
              rowKey="_id"
              pagination={false}
              loading={loading}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Customer Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Total Customers"
              value={stats?.totalCustomers || 0}
              suffix={<UserOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="New Customers This Month"
              value={stats?.newCustomersThisMonth || 0}
              suffix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* User Statistics Section (Admin Only) */}
      {stats?.totalUsers && (
        <>
          <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Users"
                  value={stats?.totalUsers || 0}
                  suffix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Active Users"
                  value={stats?.activeUsers || 0}
                  suffix={<TeamOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="New Users This Month"
                  value={stats?.newUsersThisMonth || 0}
                  suffix={<TeamOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
            <Col xs={24}>
              <Card title="Recent Users">
                <Table
                  columns={userColumns}
                  dataSource={stats?.recentUsers || []}
                  rowKey="_id"
                  pagination={false}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

export default Dashboard;
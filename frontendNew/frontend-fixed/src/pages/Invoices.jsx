import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, message, Space } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/invoices');
      // ✅ FIXED: Changed from response.data.data to response.data.result
      setInvoices(response.data.result || []);
    } catch (error) {
      message.error('Failed to load invoices');
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'processing',
      unpaid: 'warning',
      partial: 'processing',
      paid: 'success',
      overdue: 'error',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const columns = [
    { title: 'Number', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer' },
    { 
      title: 'Date', 
      dataIndex: 'date', 
      key: 'date', 
      render: (date) => new Date(date).toLocaleDateString('en-GB')
    },
    { 
      title: 'Due Date', 
      dataIndex: 'dueDate', 
      key: 'dueDate', 
      render: (date) => date ? new Date(date).toLocaleDateString('en-GB') : 'N/A'
    },
    { 
      title: 'Total', 
      dataIndex: 'total', 
      key: 'total', 
      render: (val) => `Rs. ${val?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    },
    { 
      title: 'Paid', 
      dataIndex: 'paidAmount', 
      key: 'paidAmount', 
      render: (val) => `Rs. ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    },
    { 
      title: 'Balance', 
      dataIndex: 'balanceAmount', 
      key: 'balanceAmount', 
      render: (val) => `Rs. ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{status?.toUpperCase()}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => navigate(`/invoices/view/${record._id}`)}
          >
            View
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Invoices (SI-)</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => navigate('/invoices/new')}
        >
          New Invoice
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={invoices}
        rowKey="_id"
        loading={loading}
      />
    </div>
  );
}

export default Invoices;
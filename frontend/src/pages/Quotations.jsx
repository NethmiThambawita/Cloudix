import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, message, Space } from 'antd';
import { PlusOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/quotations', {
        params: {
          limit: 1000 // Fetch more quotations
        }
      });
      // ✅ FIXED: Changed from response.data.data to response.data.result
      console.log('Quotations response:', response.data);
      setQuotations(response.data.result || []);
    } catch (error) {
      message.error('Failed to load quotations');
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const handleConvert = async (id) => {
    try {
      // ✅ FIXED: Changed endpoint from /convert-to-invoice to /convert
      const response = await api.post(`/quotations/${id}/convert`);
      if (response.data.success) {
        message.success('Successfully converted to invoice!');
        fetchQuotations(); // Refresh list
        navigate('/invoices');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to convert');
      console.error('Convert error:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'processing',
      approved: 'success',
      rejected: 'error',
      expired: 'warning'
    };
    return colors[status] || 'default';
  };

  const columns = [
    { title: 'Number', dataIndex: 'quotationNumber', key: 'quotationNumber' },
    {
      title: 'Customer',
      dataIndex: ['customer', 'name'],
      key: 'customer',
      render: (name, record) => record.customer?.name || 'N/A'
    },
    { 
      title: 'Date', 
      dataIndex: 'date', 
      key: 'date', 
      render: (date) => new Date(date).toLocaleDateString('en-GB')
    },
    { 
      title: 'Total', 
      dataIndex: 'total', 
      key: 'total', 
      render: (val) => `Rs. ${val?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
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
            onClick={() => navigate(`/quotations/view/${record._id}`)}
          >
            View
          </Button>
          <Button 
            icon={<FileTextOutlined />} 
            size="small"
            type="primary"
            onClick={() => handleConvert(record._id)}
            disabled={record.convertedToInvoice} // Disable if already converted
          >
            Convert to Invoice
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Quotations (SQ-)</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => navigate('/quotations/new')}
        >
          New Quotation
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={quotations}
        rowKey="_id"
        loading={loading}
      />
    </div>
  );
}

export default Quotations;
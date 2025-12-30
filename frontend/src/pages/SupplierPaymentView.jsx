import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, Spin, message, Popconfirm, Timeline } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios';
import dayjs from 'dayjs';

function SupplierPaymentView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/supplier-payments/${id}`);
      setPayment(response.data.result);
    } catch (error) {
      message.error('Failed to load payment details');
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    try {
      const response = await api.post(`/supplier-payments/${id}/approve`);
      if (response.data.success) {
        message.success('Payment approved successfully');
        fetchPayment();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to approve payment');
    }
  };

  const handleMarkPaid = async () => {
    try {
      const response = await api.post(`/supplier-payments/${id}/mark-paid`);
      if (response.data.success) {
        message.success('Payment marked as paid successfully');
        fetchPayment();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to mark payment as paid');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/supplier-payments/${id}`);
      if (response.data.success) {
        message.success('Payment deleted successfully');
        navigate('/supplier-payments');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete payment');
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      approved: 'blue',
      paid: 'green'
    };
    return colors[status] || 'default';
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: '💵 Cash',
      bank_transfer: '🏦 Bank Transfer',
      cheque: '📝 Cheque',
      card: '💳 Card',
      online: '🌐 Online'
    };
    return labels[method] || method;
  };

  if (loading || !payment) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/supplier-payments')}
          style={{ marginBottom: 16 }}
        >
          Back to Payments
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{payment.paymentNumber}</h1>
            <Tag color={getStatusColor(payment.status)} style={{ fontSize: 14 }}>
              {payment.status.toUpperCase()}
            </Tag>
          </div>
          {isAdmin && (
            <Space>
              {payment.status === 'draft' && (
                <>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/supplier-payments/edit/${id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleApprove}
                  >
                    Approve
                  </Button>
                  <Popconfirm
                    title="Delete payment?"
                    description="This action cannot be undone."
                    onConfirm={handleDelete}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      Delete
                    </Button>
                  </Popconfirm>
                </>
              )}
              {payment.status === 'approved' && (
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={handleMarkPaid}
                >
                  Mark as Paid
                </Button>
              )}
            </Space>
          )}
        </div>
      </div>

      <Card title="Payment Details" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Payment Number">
            {payment.paymentNumber}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(payment.status)}>
              {payment.status.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="GRN Number">
            <Button
              type="link"
              onClick={() => navigate(`/grn/view/${payment.grn._id}`)}
              style={{ padding: 0 }}
            >
              {payment.grn.grnNumber}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="Supplier">
            {payment.supplier.name}
          </Descriptions.Item>
          <Descriptions.Item label="Amount">
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
              {formatCurrency(payment.amount)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Payment Date">
            {dayjs(payment.paymentDate).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Payment Method">
            {getPaymentMethodLabel(payment.paymentMethod)}
          </Descriptions.Item>
          <Descriptions.Item label="Reference">
            {payment.reference || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Notes" span={2}>
            {payment.notes || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="GRN Summary" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="GRN Total">
            {formatCurrency(payment.grn.totalValue)}
          </Descriptions.Item>
          <Descriptions.Item label="Paid Amount">
            {formatCurrency(payment.grn.paidAmount || 0)}
          </Descriptions.Item>
          <Descriptions.Item label="Balance Amount">
            {formatCurrency(payment.grn.balanceAmount || payment.grn.totalValue)}
          </Descriptions.Item>
          <Descriptions.Item label="Payment Status">
            <Tag color={payment.grn.paymentStatus === 'paid' ? 'green' : payment.grn.paymentStatus === 'partial' ? 'orange' : 'red'}>
              {(payment.grn.paymentStatus || 'unpaid').toUpperCase()}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Payment Timeline">
        <Timeline>
          <Timeline.Item color="green">
            <div>
              <strong>Created</strong> by {payment.createdBy?.name || 'Unknown'}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              {dayjs(payment.createdAt).format('DD/MM/YYYY HH:mm')}
            </div>
          </Timeline.Item>

          {payment.approvedBy && (
            <Timeline.Item color="blue">
              <div>
                <strong>Approved</strong> by {payment.approvedBy.name}
              </div>
              <div style={{ color: '#666', fontSize: 12 }}>
                {dayjs(payment.approvedDate).format('DD/MM/YYYY HH:mm')}
              </div>
            </Timeline.Item>
          )}

          {payment.paidBy && (
            <Timeline.Item color="green">
              <div>
                <strong>Marked as Paid</strong> by {payment.paidBy.name}
              </div>
              <div style={{ color: '#666', fontSize: 12 }}>
                {dayjs(payment.paidDate).format('DD/MM/YYYY HH:mm')}
              </div>
            </Timeline.Item>
          )}
        </Timeline>
      </Card>
    </div>
  );
}

export default SupplierPaymentView;

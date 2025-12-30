import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Popconfirm, Input, Select, DatePicker, Modal, Form, InputNumber } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios';
import dayjs from 'dayjs';
import toast, { messages } from '../utils/toast';

const { RangePicker } = DatePicker;

function SupplierPayments() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    supplier: '',
    dateRange: []
  });

  useEffect(() => {
    fetchPayments();
    fetchSuppliers();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize
      };

      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.supplier) params.supplier = filters.supplier;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].toISOString();
        params.endDate = filters.dateRange[1].toISOString();
      }

      const response = await api.get('/supplier-payments', { params });
      setPayments(response.data.result || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      toast.error('Failed to load supplier payments', 'Please refresh the page or contact support.');
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data.result || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const fetchGRNs = async () => {
    try {
      const response = await api.get('/grn');
      // Filter GRNs that are approved/completed and have balance
      const availableGRNs = (response.data.result || []).filter(grn =>
        ['approved', 'completed'].includes(grn.status) &&
        (grn.balanceAmount > 0 || grn.balanceAmount === undefined)
      );
      setGrns(availableGRNs);
    } catch (error) {
      toast.error('Failed to load GRNs', 'Please try again.');
      console.error('Error:', error);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setSelectedGRN(null);
    setModalVisible(true);
    fetchGRNs();
  };

  const handleGRNSelect = (grnId) => {
    const grn = grns.find(g => g._id === grnId);
    setSelectedGRN(grn);

    if (grn) {
      const balance = grn.balanceAmount !== undefined ? grn.balanceAmount : grn.totalValue;
      form.setFieldsValue({
        amount: balance
      });
    }
  };

  const handleSubmit = async (values) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        ...values,
        paymentDate: values.paymentDate.toISOString()
      };

      const response = await api.post('/supplier-payments', payload);
      if (response.data.success) {
        toast.celebrate(
          '💰 Payment Created Successfully!',
          `Payment ${response.data.result?.paymentNumber || ''} has been recorded. Great job managing your finances!`
        );
        setModalVisible(false);
        form.resetFields();
        setSelectedGRN(null);
        fetchPayments();
      }
    } catch (error) {
      toast.error(
        'Failed to create payment',
        error.response?.data?.message || 'Please check your input and try again.'
      );
      console.error('Error:', error);
    }
    setSubmitting(false);
  };

  const handleApprove = async (id) => {
    try {
      const response = await api.post(`/supplier-payments/${id}/approve`);
      if (response.data.success) {
        toast.success(
          '✅ Payment Approved!',
          'The payment has been approved and is ready for processing.'
        );
        fetchPayments();
      }
    } catch (error) {
      toast.error(
        'Failed to approve payment',
        error.response?.data?.message || 'Please try again or contact support.'
      );
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      const response = await api.post(`/supplier-payments/${id}/mark-paid`);
      if (response.data.success) {
        toast.celebrate(
          '✨ Payment Completed!',
          'The payment has been marked as paid. Transaction complete!'
        );
        fetchPayments();
      }
    } catch (error) {
      toast.error(
        'Failed to mark payment as paid',
        error.response?.data?.message || 'Please try again.'
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/supplier-payments/${id}`);
      if (response.data.success) {
        toast.success(
          '🗑️ Payment Deleted',
          'The payment record has been removed successfully.'
        );
        fetchPayments();
      }
    } catch (error) {
      toast.error(
        'Failed to delete payment',
        error.response?.data?.message || 'Please try again.'
      );
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

  const getBalance = () => {
    if (!selectedGRN) return 0;
    return selectedGRN.balanceAmount !== undefined ? selectedGRN.balanceAmount : selectedGRN.totalValue;
  };

  const columns = [
    {
      title: 'Payment Number',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      fixed: 'left',
      width: 180,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <Tag color={getStatusColor(record.status)} style={{ marginTop: 4 }}>
            {record.status.toUpperCase()}
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.paymentNumber.localeCompare(b.paymentNumber)
    },
    {
      title: 'GRN Number',
      dataIndex: ['grn', 'grnNumber'],
      key: 'grn',
      width: 150,
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/grn/view/${record.grn._id}`)}
        >
          {text}
        </Button>
      )
    },
    {
      title: 'Supplier',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      width: 200
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (val) => formatCurrency(val),
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a, b) => new Date(a.paymentDate) - new Date(b.paymentDate)
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 150,
      render: (method) => {
        const icons = {
          cash: '💵',
          bank_transfer: '🏦',
          cheque: '📝',
          card: '💳',
          online: '🌐'
        };
        const labels = {
          cash: 'Cash',
          bank_transfer: 'Bank Transfer',
          cheque: 'Cheque',
          card: 'Card',
          online: 'Online'
        };
        return `${icons[method] || ''} ${labels[method] || method}`;
      }
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      width: 150,
      render: (ref) => ref || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 250,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/supplier-payments/view/${record._id}`)}
          >
            View
          </Button>
          {record.status === 'draft' && isAdmin && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record._id)}
              >
                Approve
              </Button>
            </>
          )}
          {record.status === 'approved' && isAdmin && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handleMarkPaid(record._id)}
            >
              Mark Paid
            </Button>
          )}
          {record.status === 'draft' && isAdmin && (
            <Popconfirm
              title={<span>🗑️ Delete Payment?</span>}
              description={
                <div>
                  <p>Are you sure you want to delete this payment?</p>
                  <p style={{ color: '#d4380d', marginTop: '8px', fontSize: '12px' }}>
                    ⚠️ This action cannot be undone.
                  </p>
                </div>
              }
              onConfirm={() => handleDelete(record._id)}
              okText="Yes, Delete"
              cancelText="No, Keep It"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const handleTableChange = (newPagination) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Supplier Payments (SUPPAY-)</h1>
          <p style={{ color: '#666', fontSize: 14 }}>
            Track and manage payments to suppliers for goods received
          </p>
        </div>
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Create Payment
          </Button>
        )}
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search by payment number or reference"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          allowClear
        />
        <Select
          placeholder="Filter by status"
          style={{ width: 150 }}
          value={filters.status || undefined}
          onChange={(value) => handleFilterChange('status', value)}
          allowClear
        >
          <Select.Option value="draft">Draft</Select.Option>
          <Select.Option value="approved">Approved</Select.Option>
          <Select.Option value="paid">Paid</Select.Option>
        </Select>
        <Select
          placeholder="Filter by supplier"
          style={{ width: 200 }}
          value={filters.supplier || undefined}
          onChange={(value) => handleFilterChange('supplier', value)}
          showSearch
          optionFilterProp="children"
          allowClear
        >
          {suppliers.map(supplier => (
            <Select.Option key={supplier._id} value={supplier._id}>
              {supplier.name}
            </Select.Option>
          ))}
        </Select>
        <RangePicker
          style={{ width: 300 }}
          value={filters.dateRange}
          onChange={(dates) => handleFilterChange('dateRange', dates)}
        />
      </div>

      <Table
        columns={columns}
        dataSource={payments}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} payments`
        }}
        onChange={handleTableChange}
        scroll={{ x: 1400 }}
      />

      <Modal
        title="Create Supplier Payment"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedGRN(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="grn"
            label="Select GRN"
            rules={[{ required: true, message: 'Please select a GRN' }]}
          >
            <Select
              placeholder="Select GRN to pay"
              onChange={handleGRNSelect}
              showSearch
              optionFilterProp="children"
              notFoundContent={
                grns.length === 0
                  ? "No unpaid GRNs found. Ensure GRNs are approved and have balance."
                  : "No results"
              }
            >
              {grns.map(grn => {
                const balance = grn.balanceAmount !== undefined ? grn.balanceAmount : grn.totalValue;
                return (
                  <Select.Option key={grn._id} value={grn._id}>
                    {grn.grnNumber} - {grn.supplier?.name || 'Unknown Supplier'} - {formatCurrency(balance)} Balance
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>

          {selectedGRN && (
            <div style={{
              padding: 16,
              background: '#f0f5ff',
              borderRadius: 8,
              marginBottom: 16,
              border: '1px solid #d6e4ff'
            }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Supplier:</strong> {selectedGRN.supplier?.name || 'Unknown'}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>GRN Total:</strong> {formatCurrency(selectedGRN.totalValue)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Already Paid:</strong> {formatCurrency(selectedGRN.paidAmount || 0)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
                <strong>Balance Due:</strong> {formatCurrency(getBalance())}
              </div>
            </div>
          )}

          <Form.Item
            name="amount"
            label="Payment Amount (LKR)"
            rules={[
              { required: true, message: 'Please enter payment amount' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value <= 0) {
                    return Promise.reject(new Error('Amount must be greater than 0'));
                  }
                  if (selectedGRN && value > getBalance() + 0.01) {
                    return Promise.reject(new Error(`Amount cannot exceed balance due (${formatCurrency(getBalance())})`));
                  }
                  return Promise.resolve();
                },
              })
            ]}
          >
            <InputNumber
              min={0}
              max={selectedGRN ? getBalance() : undefined}
              style={{ width: '100%' }}
              prefix="Rs."
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/Rs\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select placeholder="Select payment method">
              <Select.Option value="cash">💵 Cash</Select.Option>
              <Select.Option value="bank_transfer">🏦 Bank Transfer</Select.Option>
              <Select.Option value="cheque">📝 Cheque</Select.Option>
              <Select.Option value="card">💳 Credit/Debit Card</Select.Option>
              <Select.Option value="online">🌐 Online Payment</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="paymentDate"
            label="Payment Date"
            rules={[{ required: true, message: 'Please select payment date' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="reference"
            label="Reference / Transaction ID"
          >
            <Input placeholder="Cheque number, transaction ID, receipt number, etc." />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes (Optional)"
          >
            <Input.TextArea
              rows={3}
              placeholder="Any additional notes about this payment..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SupplierPayments;

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Input, message } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import api from '../api/axios';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPayments();
    fetchInvoices();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/payments');
      // ✅ FIXED: Changed from response.data.data to response.data.result
      setPayments(response.data.result || []);
    } catch (error) {
      message.error('Failed to load payments');
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      // ✅ FIXED: Changed from response.data.data to response.data.result
      const allInvoices = response.data.result || [];
      // Filter for unpaid/partial invoices
      const unpaid = allInvoices.filter(inv => 
        inv.status !== 'paid' && inv.balanceAmount > 0
      );
      setInvoices(unpaid);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      message.error('Failed to load invoices');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setSelectedInvoice(null);
    setModalVisible(true);
  };

  const handleInvoiceSelect = (invoiceId) => {
    const invoice = invoices.find(inv => inv._id === invoiceId);
    setSelectedInvoice(invoice);
    
    // Auto-fill the amount with balance amount
    if (invoice) {
      form.setFieldsValue({
        amount: invoice.balanceAmount
      });
    }
  };

  const handleSubmit = async (values) => {
    try {
      const response = await api.post('/payments', values);
      if (response.data.success) {
        message.success('Payment recorded successfully (PAY-)');
        setModalVisible(false);
        fetchPayments();
        fetchInvoices(); // Refresh invoices to update balances
        form.resetFields();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to record payment');
      console.error('Error:', error);
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const columns = [
    { 
      title: 'Payment Number', 
      dataIndex: 'paymentNumber', 
      key: 'paymentNumber' 
    },
    { 
      title: 'Invoice', 
      dataIndex: ['invoice', 'invoiceNumber'], 
      key: 'invoice' 
    },
    { 
      title: 'Amount', 
      dataIndex: 'amount', 
      key: 'amount', 
      render: (val) => formatCurrency(val)
    },
    { 
      title: 'Method', 
      dataIndex: 'paymentMethod', 
      key: 'paymentMethod',
      render: (method) => method?.toUpperCase()
    },
    { 
      title: 'Date', 
      dataIndex: 'date', 
      key: 'date', 
      render: (date) => new Date(date).toLocaleDateString('en-GB')
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (ref) => ref || '-'
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Payments (PAY-)</h1>
          <p style={{ color: '#666', fontSize: 14 }}>
            Record and track customer payments
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Record Payment
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={payments}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Record Payment"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedInvoice(null);
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item 
            name="invoice" 
            label="Invoice" 
            rules={[{ required: true, message: 'Please select invoice' }]}
          >
            <Select 
              placeholder="Select invoice to pay"
              onChange={handleInvoiceSelect}
              showSearch
              optionFilterProp="children"
              notFoundContent={
                invoices.length === 0 
                  ? "No unpaid invoices found. Create an invoice first." 
                  : "No results"
              }
            >
              {invoices.map(inv => (
                <Select.Option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} - {inv.customer?.name} - {formatCurrency(inv.balanceAmount)} Balance
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedInvoice && (
            <div style={{ 
              padding: 16, 
              background: '#f0f5ff', 
              borderRadius: 8, 
              marginBottom: 16,
              border: '1px solid #d6e4ff'
            }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Customer:</strong> {selectedInvoice.customer?.name}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Invoice Total:</strong> {formatCurrency(selectedInvoice.total)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Already Paid:</strong> {formatCurrency(selectedInvoice.paidAmount || 0)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
                <strong>Balance Due:</strong> {formatCurrency(selectedInvoice.balanceAmount)}
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
                  if (selectedInvoice && value > selectedInvoice.balanceAmount) {
                    return Promise.reject(new Error('Amount cannot exceed balance due'));
                  }
                  return Promise.resolve();
                },
              })
            ]}
          >
            <InputNumber 
              min={0} 
              max={selectedInvoice?.balanceAmount}
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
              <Select.Option value="bank">🏦 Bank Transfer</Select.Option>
              <Select.Option value="cheque">📝 Cheque</Select.Option>
              <Select.Option value="card">💳 Credit/Debit Card</Select.Option>
              <Select.Option value="online">🌐 Online Payment</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="reference" label="Reference / Transaction ID">
            <Input placeholder="Cheque number, transaction ID, receipt number, etc." />
          </Form.Item>

          <Form.Item name="notes" label="Notes (Optional)">
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

export default Payments;
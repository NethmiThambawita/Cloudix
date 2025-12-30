import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, message, Spin, Statistic, Row, Col } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

function SupplierPaymentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const grnIdFromQuery = searchParams.get('grn');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [grns, setGrns] = useState([]);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = Boolean(id);

  useEffect(() => {
    fetchGRNs();
    if (isEditMode) {
      fetchPayment();
    } else if (grnIdFromQuery) {
      // Pre-select GRN if provided in query params
      form.setFieldsValue({ grn: grnIdFromQuery });
      handleGRNSelect(grnIdFromQuery);
    }
  }, [id, grnIdFromQuery]);

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
      message.error('Failed to load GRNs');
      console.error('Error:', error);
    }
  };

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/supplier-payments/${id}`);
      const payment = response.data.result;

      if (payment.status !== 'draft') {
        message.warning('Only draft payments can be edited');
        navigate(`/supplier-payments/view/${id}`);
        return;
      }

      // Set form values
      form.setFieldsValue({
        grn: payment.grn._id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: dayjs(payment.paymentDate),
        reference: payment.reference,
        notes: payment.notes
      });

      // Set selected GRN
      setSelectedGRN(payment.grn);
    } catch (error) {
      message.error('Failed to load payment details');
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const handleGRNSelect = async (grnId) => {
    // Find GRN from the list
    let grn = grns.find(g => g._id === grnId);

    // If not found in list (e.g., when coming from query param), fetch it
    if (!grn) {
      try {
        const response = await api.get(`/grn/${grnId}`);
        grn = response.data.result;
      } catch (error) {
        message.error('Failed to load GRN details');
        return;
      }
    }

    setSelectedGRN(grn);

    // Calculate balance
    const balance = grn.balanceAmount !== undefined ? grn.balanceAmount : grn.totalValue;

    // Auto-fill amount with balance (user can change it)
    if (!isEditMode) {
      form.setFieldsValue({
        amount: balance
      });
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        paymentDate: values.paymentDate.toISOString()
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/supplier-payments/${id}`, payload);
      } else {
        response = await api.post('/supplier-payments', payload);
      }

      if (response.data.success) {
        message.success(response.data.message || 'Payment saved successfully');
        navigate('/supplier-payments');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save payment');
      console.error('Error:', error);
    }
    setSubmitting(false);
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getBalance = () => {
    if (!selectedGRN) return 0;
    return selectedGRN.balanceAmount !== undefined ? selectedGRN.balanceAmount : selectedGRN.totalValue;
  };

  if (loading) {
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
        <h1>{isEditMode ? 'Edit Payment' : 'Create Supplier Payment'}</h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          {isEditMode ? 'Update payment details' : 'Record a new payment to supplier for goods received'}
        </p>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
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
              disabled={isEditMode}
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
            <Card
              style={{
                padding: 16,
                background: '#f0f5ff',
                borderRadius: 8,
                marginBottom: 24,
                border: '1px solid #d6e4ff'
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>GRN Number:</strong> {selectedGRN.grnNumber}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Supplier:</strong> {selectedGRN.supplier?.name || 'Unknown'}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>GRN Date:</strong> {dayjs(selectedGRN.grnDate).format('DD/MM/YYYY')}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Payment Status:</strong> {selectedGRN.paymentStatus || 'unpaid'}
                  </div>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <Statistic
                    title="GRN Total"
                    value={selectedGRN.totalValue}
                    prefix="Rs."
                    precision={2}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Already Paid"
                    value={selectedGRN.paidAmount || 0}
                    prefix="Rs."
                    precision={2}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Balance Due"
                    value={getBalance()}
                    prefix="Rs."
                    precision={2}
                    valueStyle={{ color: '#1890ff', fontWeight: 600 }}
                  />
                </Col>
              </Row>
            </Card>
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

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
              >
                {isEditMode ? 'Update Payment' : 'Create Payment'}
              </Button>
              <Button onClick={() => navigate('/supplier-payments')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default SupplierPaymentForm;

import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Space, Spin, Row, Col, Alert } from 'antd';
import { SwapOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from '../utils/toast';

const { Option } = Select;
const { TextArea } = Input;

function StockTransfer() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  const locations = [
    'Main Warehouse',
    'Main House',
    'Retail Store',
    'Factory',
    'Distribution Center'
  ];

  useEffect(() => {
    fetchStock();
  }, [id]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/stock/${id}`);
      const stockData = response.data;
      setStock(stockData);

      // Set default form values
      form.setFieldsValue({
        fromLocation: stockData.location,
        quantity: 1
      });
    } catch (error) {
      console.error('Failed to load stock:', error);
      toast.error('Failed to Load Stock', 'Unable to load stock details. Please try again.');
      navigate('/stock');
    }
    setLoading(false);
  };

  const handleSubmit = async (values) => {
    // Prevent duplicate submissions
    if (transferring) {
      return;
    }

    if (values.fromLocation === values.toLocation) {
      toast.warning(
        'Invalid Transfer',
        'Source and destination locations must be different. Please select a different destination.'
      );
      return;
    }

    if (values.quantity > stock.quantity) {
      toast.error(
        'Insufficient Stock',
        `Cannot transfer ${values.quantity} units. Only ${stock.quantity} units available at ${values.fromLocation}.`
      );
      return;
    }

    setTransferring(true);
    try {
      await api.post('/stock/transfer', {
        productId: stock.product._id,
        quantity: values.quantity,
        fromLocation: values.fromLocation,
        toLocation: values.toLocation,
        notes: values.notes
      });

      toast.celebrate(
        `✅ Stock Transfer Successful!`,
        `${values.quantity} units of ${stock.product?.name} transferred from ${values.fromLocation} to ${values.toLocation}. Great work organizing your inventory!`
      );
      navigate('/stock');
    } catch (error) {
      console.error('Failed to transfer stock:', error);
      toast.error(
        'Transfer Failed',
        error.response?.data?.message || 'Unable to complete the transfer. Please try again or contact support.'
      );
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stock) {
    return null;
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stock')}>
          Back to Stock
        </Button>
        <h2 style={{ margin: 0 }}>Transfer Stock</h2>
      </Space>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Stock Information" style={{ marginBottom: 16 }}>
            <p><strong>Product:</strong> {stock.product?.name || 'N/A'}</p>
            {stock.product?.category && (
              <p><strong>Category:</strong> {stock.product.category}</p>
            )}
            <p><strong>Current Location:</strong> {stock.location}</p>
            <p><strong>Available Quantity:</strong> <span style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>{stock.quantity}</span></p>
            <p><strong>Min Level:</strong> {stock.minLevel}</p>
            <p><strong>Reorder Level:</strong> {stock.reorderLevel}</p>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Transfer Details">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                label="From Location"
                name="fromLocation"
                rules={[{ required: true, message: 'Please select source location' }]}
              >
                <Select placeholder="Select source location" disabled>
                  {locations.map(loc => (
                    <Option key={loc} value={loc}>{loc}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="To Location"
                name="toLocation"
                rules={[
                  { required: true, message: 'Please select destination location' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('fromLocation') !== value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Destination must be different from source'));
                    },
                  }),
                ]}
              >
                <Select placeholder="Select destination location">
                  {locations.filter(loc => loc !== stock.location).map(loc => (
                    <Option key={loc} value={loc}>{loc}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Quantity to Transfer"
                name="quantity"
                rules={[
                  { required: true, message: 'Please enter quantity' },
                  { type: 'number', min: 1, message: 'Quantity must be at least 1' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value <= stock.quantity) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(`Cannot exceed available quantity (${stock.quantity})`));
                    },
                  }),
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={stock.quantity}
                  placeholder="Enter quantity"
                />
              </Form.Item>

              {stock.quantity < stock.minLevel && (
                <Alert
                  message="Low Stock Warning"
                  description="Current stock is below minimum level. Transferring may create critical shortage at source location."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form.Item
                label="Notes (Optional)"
                name="notes"
              >
                <TextArea
                  rows={3}
                  placeholder="Additional notes about this transfer"
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SwapOutlined />}
                    loading={transferring}
                  >
                    Transfer Stock
                  </Button>
                  <Button onClick={() => navigate('/stock')}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default StockTransfer;

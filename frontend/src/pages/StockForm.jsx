import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Space, message, Spin, Switch, Row, Col } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const { Option } = Select;

function StockForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    fetchProducts();
    fetchLocations();
    if (isEdit) {
      fetchStock();
    }
  }, [id]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      console.log('Products response:', response.data);

      // Handle different response structures
      if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setProducts(response.data.data);
      } else if (response.data.products && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else {
        console.error('Unexpected products response structure:', response.data);
        setProducts([]);
        message.warning('Products loaded with unexpected format');
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      message.error('Failed to load products');
      setProducts([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      console.log('Locations API response:', response.data);

      // Handle different response structures
      let locationData = [];
      if (Array.isArray(response.data)) {
        locationData = response.data;
      } else if (response.data?.result && Array.isArray(response.data.result)) {
        locationData = response.data.result;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        locationData = response.data.data;
      }

      // Add default locations
      const defaultLocations = [
        { _id: 'default-1', name: 'Main Warehouse', type: 'Warehouse' },
        { _id: 'default-2', name: 'Retail Store', type: 'Store' },
        { _id: 'default-3', name: 'Factory', type: 'Manufacturing' },
        { _id: 'default-4', name: 'Distribution Center', type: 'Distribution' }
      ];

      // Combine default locations with custom locations from API
      const allLocations = [...defaultLocations, ...locationData];

      console.log('Locations loaded:', allLocations.length);
      setLocations(allLocations);
    } catch (error) {
      console.error('Failed to load locations:', error);
      // If API fails, still show default locations
      const defaultLocations = [
        { _id: 'default-1', name: 'Main Warehouse', type: 'Warehouse' },
        { _id: 'default-2', name: 'Retail Store', type: 'Store' },
        { _id: 'default-3', name: 'Factory', type: 'Manufacturing' },
        { _id: 'default-4', name: 'Distribution Center', type: 'Distribution' }
      ];
      setLocations(defaultLocations);
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/stock/${id}`);
      const stock = response.data;
      form.setFieldsValue({
        product: stock.product._id,
        quantity: stock.quantity,
        minLevel: stock.minLevel,
        reorderLevel: stock.reorderLevel,
        location: stock.location,
        batchTracking: stock.batchTracking,
        serialTracking: stock.serialTracking,
        notes: stock.notes
      });
      setSelectedProduct(stock.product);
    } catch (error) {
      console.error('Failed to load stock:', error);
      message.error('Failed to load stock details');
    }
    setLoading(false);
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p._id === productId);
    setSelectedProduct(product);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/stock/${id}`, values);
        message.success('Stock updated successfully');
      } else {
        await api.post('/stock', values);
        message.success('Stock created successfully');
      }
      navigate('/stock');
    } catch (error) {
      console.error('Failed to save stock:', error);
      message.error(error.response?.data?.message || 'Failed to save stock');
    }
    setLoading(false);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stock')}>
          Back to Stock
        </Button>
        <h2 style={{ margin: 0 }}>{isEdit ? 'Edit Stock' : 'Create New Stock Item'}</h2>
      </Space>

      <Spin spinning={loading}>
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              quantity: 0,
              minLevel: 10,
              reorderLevel: 20,
              batchTracking: false,
              serialTracking: false
            }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Product"
                  name="product"
                  rules={[{ required: true, message: 'Please select a product' }]}
                >
                  <Select
                    placeholder="Select product"
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={handleProductChange}
                    disabled={isEdit}
                  >
                    {products.map(product => (
                      <Option key={product._id} value={product._id}>
                        {product.name} {product.category && `(${product.category})`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {selectedProduct && (
                <Col xs={24} md={12}>
                  <Card size="small" style={{ marginTop: 30, backgroundColor: '#f5f5f5' }}>
                    <p style={{ margin: 0 }}>
                      <strong>Price:</strong> Rs. {selectedProduct.price?.toLocaleString()}
                      {selectedProduct.description && (
                        <><br /><strong>Description:</strong> {selectedProduct.description}</>
                      )}
                    </p>
                  </Card>
                </Col>
              )}
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label={isEdit ? "Current Quantity" : "Initial Quantity"}
                  name="quantity"
                  rules={[{ required: true, message: 'Please enter quantity' }]}
                  tooltip={isEdit ? "Update the current stock quantity" : "Starting stock quantity"}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    placeholder="Enter quantity"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Minimum Level"
                  name="minLevel"
                  rules={[{ required: true, message: 'Please enter minimum level' }]}
                  tooltip="Alert when stock falls below this level"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    placeholder="Min level"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Reorder Level"
                  name="reorderLevel"
                  rules={[{ required: true, message: 'Please enter reorder level' }]}
                  tooltip="Reorder alert threshold"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    placeholder="Reorder level"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Locations"
                  name="location"
                  rules={[{ required: true, message: 'Please select location' }]}
                  tooltip="Select the storage location for this stock"
                >
                  <Select
                    placeholder="Select location"
                    showSearch
                    allowClear
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    notFoundContent={
                      locations.length === 0
                        ? "No locations available. Add locations in Location page first."
                        : "No matching locations"
                    }
                  >
                    {Array.isArray(locations) && locations.length > 0 ? (
                      locations.map(loc => (
                        loc && loc._id ? (
                          <Option key={loc._id} value={loc.name || loc._id}>
                            {loc.name}
                          </Option>
                        ) : null
                      ))
                    ) : (
                      <Option disabled value="">No locations available. Add locations first.</Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <div style={{ marginTop: 30 }}>
                  <Space size="large">
                    <Form.Item
                      name="batchTracking"
                      valuePropName="checked"
                      style={{ marginBottom: 0 }}
                    >
                      <Space>
                        <Switch />
                        <span>Batch Tracking</span>
                      </Space>
                    </Form.Item>

                    <Form.Item
                      name="serialTracking"
                      valuePropName="checked"
                      style={{ marginBottom: 0 }}
                    >
                      <Space>
                        <Switch />
                        <span>Serial Tracking</span>
                      </Space>
                    </Form.Item>
                  </Space>
                </div>
              </Col>
            </Row>

            <Form.Item
              label="Notes"
              name="notes"
            >
              <Input.TextArea
                rows={3}
                placeholder="Additional notes (optional)"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  {isEdit ? 'Update Stock' : 'Create Stock'}
                </Button>
                <Button onClick={() => navigate('/stock')}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Spin>
    </div>
  );
}

export default StockForm;
import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Space, message, Spin, DatePicker, Table, Row, Col, Divider } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

function GRNForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      console.log('Suppliers response:', response.data);

      // Handle different response structures
      if (Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setSuppliers(response.data.data);
      } else {
        console.error('Unexpected suppliers response:', response.data);
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      message.error('Failed to load suppliers');
      setSuppliers([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      console.log('Customers response:', response.data);

      // Handle different response structures
      if (Array.isArray(response.data)) {
        setCustomers(response.data);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setCustomers(response.data.data);
      } else {
        console.error('Unexpected customers response:', response.data);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      message.error('Failed to load customers');
      setCustomers([]);
    }
  };

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
        console.error('Unexpected products response:', response.data);
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      message.error('Failed to load products');
      setProducts([]);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    setSelectedSupplier(supplier);
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    setSelectedCustomer(customer);
  };

  const addItem = () => {
    setItems([...items, {
      key: Date.now(),
      product: null,
      orderedQuantity: 0,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      unitPrice: 0,
      batchNumber: '',
      expiryDate: null,
      manufactureDate: null,
      inspectionNotes: ''
    }]);
  };

  const removeItem = (key) => {
    setItems(items.filter(item => item.key !== key));
  };

  const updateItem = (key, field, value) => {
    setItems(items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        
        // Auto-set accepted quantity to received quantity
        if (field === 'receivedQuantity') {
          updated.acceptedQuantity = value;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async (values) => {
    if (items.length === 0) {
      message.error('Please add at least one item');
      return;
    }

    // Validate all items have required fields
    const invalidItems = items.filter(item => 
      !item.product || 
      item.orderedQuantity <= 0 || 
      item.receivedQuantity <= 0
    );

    if (invalidItems.length > 0) {
      message.error('Please fill all required fields for each item');
      return;
    }

    setLoading(true);
    try {
      const grnData = {
        supplier: values.supplier,
        customer: values.customer,
        grnDate: values.grnDate?.format('YYYY-MM-DD') || new Date().toISOString(),
        purchaseOrder: {
          poNumber: values.poNumber,
          poDate: values.poDate?.format('YYYY-MM-DD')
        },
        deliveryNote: {
          number: values.deliveryNoteNumber,
          date: values.deliveryNoteDate?.format('YYYY-MM-DD')
        },
        location: values.location || 'Main Warehouse',
        items: items.map(item => ({
          product: item.product,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          acceptedQuantity: item.acceptedQuantity,
          unitPrice: item.unitPrice,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          manufactureDate: item.manufactureDate,
          inspectionNotes: item.inspectionNotes
        })),
        notes: values.notes
      };

      await api.post('/grn', grnData);
      message.success('GRN created successfully');
      navigate('/grn');
    } catch (error) {
      console.error('Failed to create GRN:', error);
      message.error(error.response?.data?.message || 'Failed to create GRN');
    }
    setLoading(false);
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      width: 200,
      render: (value, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select product"
          value={value}
          onChange={(val) => updateItem(record.key, 'product', val)}
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {products.map(product => (
            <Option key={product._id} value={product._id}>
              {product.name}
            </Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Ordered Qty',
      dataIndex: 'orderedQuantity',
      key: 'orderedQuantity',
      width: 120,
      render: (value, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          value={value}
          onChange={(val) => updateItem(record.key, 'orderedQuantity', val)}
        />
      )
    },
    {
      title: 'Received Qty',
      dataIndex: 'receivedQuantity',
      key: 'receivedQuantity',
      width: 120,
      render: (value, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          value={value}
          onChange={(val) => updateItem(record.key, 'receivedQuantity', val)}
        />
      )
    },
    {
      title: 'Accepted Qty',
      dataIndex: 'acceptedQuantity',
      key: 'acceptedQuantity',
      width: 120,
      render: (value, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          max={record.receivedQuantity}
          value={value}
          onChange={(val) => updateItem(record.key, 'acceptedQuantity', val)}
        />
      )
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (value, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          prefix="Rs."
          value={value}
          onChange={(val) => updateItem(record.key, 'unitPrice', val)}
        />
      )
    },
    {
      title: 'Batch Number',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 150,
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => updateItem(record.key, 'batchNumber', e.target.value)}
          placeholder="Batch #"
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      )
    }
  ];

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (item.acceptedQuantity * item.unitPrice);
    }, 0);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/grn')}>
          Back to GRN List
        </Button>
        <h2 style={{ margin: 0 }}>Create New GRN</h2>
      </Space>

      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            grnDate: dayjs(),
            location: 'Main Warehouse'
          }}
        >
          <Card title="Supplier, Customer & PO Details" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Supplier"
                  name="supplier"
                  rules={[{ required: true, message: 'Please select supplier' }]}
                >
                  <Select
                    placeholder="Select supplier"
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={handleSupplierChange}
                  >
                    {suppliers.map(supplier => (
                      <Option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Customer (Optional)"
                  name="customer"
                >
                  <Select
                    placeholder="Select customer"
                    showSearch
                    allowClear
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={handleCustomerChange}
                  >
                    {customers.map(customer => (
                      <Option key={customer._id} value={customer._id}>
                        {customer.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="GRN Date"
                  name="grnDate"
                  rules={[{ required: true, message: 'Please select GRN date' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              {selectedSupplier && (
                <Col xs={24} md={12}>
                  <Card size="small" style={{ backgroundColor: '#f0f9ff', borderColor: '#1890ff' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1890ff', marginBottom: 4 }}>Supplier Info</div>
                    <p style={{ margin: 0, fontSize: 12 }}>
                      <strong>Contact:</strong> {selectedSupplier.phone || 'N/A'} |
                      <strong> Email:</strong> {selectedSupplier.email || 'N/A'}
                      {selectedSupplier.address && (
                        <><br /><strong>Address:</strong> {selectedSupplier.address}</>
                      )}
                    </p>
                  </Card>
                </Col>
              )}

              {selectedCustomer && (
                <Col xs={24} md={12}>
                  <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#52c41a' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#52c41a', marginBottom: 4 }}>Customer Info</div>
                    <p style={{ margin: 0, fontSize: 12 }}>
                      <strong>Contact:</strong> {selectedCustomer.phone || 'N/A'} |
                      <strong> Email:</strong> {selectedCustomer.email || 'N/A'}
                      {selectedCustomer.address && (
                        <><br /><strong>Address:</strong> {selectedCustomer.address}</>
                      )}
                    </p>
                  </Card>
                </Col>
              )}
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="PO Number" name="poNumber">
                  <Input placeholder="Purchase Order Number" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="PO Date" name="poDate">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Location" name="location">
                  <Select>
                    <Option value="Main Warehouse">Main Warehouse</Option>
                    <Option value="Factory">Factory</Option>
                    <Option value="Distribution Center">Distribution Center</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Delivery Note Number" name="deliveryNoteNumber">
                  <Input placeholder="DN Number" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Delivery Note Date" name="deliveryNoteDate">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="Items" style={{ marginBottom: 16 }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addItem}
              style={{ marginBottom: 16, width: '100%' }}
            >
              Add Item
            </Button>

            <Table
              columns={columns}
              dataSource={items}
              pagination={false}
              scroll={{ x: 1000 }}
              rowKey="key"
            />

            {items.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <h3>Total Value: Rs. {calculateTotal().toLocaleString()}</h3>
              </div>
            )}
          </Card>

          <Card title="Additional Information">
            <Form.Item label="Notes" name="notes">
              <TextArea rows={3} placeholder="Additional notes" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  Create GRN
                </Button>
                <Button onClick={() => navigate('/grn')}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Card>
        </Form>
      </Spin>
    </div>
  );
}

export default GRNForm;
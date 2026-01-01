import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, DatePicker, Button, Card, Table, InputNumber,
  Space, message, Divider, Row, Col
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

const { TextArea } = Input;

function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [selectedTaxIds, setSelectedTaxIds] = useState([]);
  const [taxAmount, setTaxAmount] = useState(0);
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchTaxes();
    if (id) fetchPO();
  }, [id]);

  useEffect(() => {
    calculateTotals();
  }, [items, discount, selectedTaxIds, taxes]);

  // Safe fetch functions
  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      const data = response.data?.result ?? response.data?.data ?? [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to load suppliers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      const data = response.data?.result ?? response.data?.data ?? [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to load products');
    }
  };

  const fetchTaxes = async () => {
    try {
      const response = await api.get('/taxes');
      const data = response.data?.result ?? [];
      setTaxes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load taxes:', error);
      message.error('Failed to load taxes');
    }
  };

  const fetchPO = async () => {
    try {
      const response = await api.get(`/purchase-orders/${id}`);
      const po = response.data;

      form.setFieldsValue({
        supplier: po.supplier?._id,
        poDate: po.poDate ? dayjs(po.poDate) : dayjs(),
        expectedDeliveryDate: po.expectedDeliveryDate ? dayjs(po.expectedDeliveryDate) : null,
        deliveryAddress: po.deliveryAddress,
        paymentTerms: po.paymentTerms,
        notes: po.notes,
        terms: po.terms
      });

      setDiscount(po.discount || 0);
      setSelectedTaxIds(po.taxes?.map(t => t._id) || []);

      const loadedItems = Array.isArray(po.items)
        ? po.items.map((item, index) => ({
            id: Date.now() + index,
            product: item.product?._id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0
          }))
        : [];
      setItems(loadedItems);
    } catch (error) {
      message.error('Failed to load purchase order');
      navigate('/purchase-orders');
    }
  };

  const calculateTotals = () => {
    let itemsSubtotalBeforeDiscount = 0;
    let totalItemDiscounts = 0;

    items.forEach(item => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const itemDiscountAmount = (itemTotal * (item.discount || 0)) / 100;
      itemsSubtotalBeforeDiscount += itemTotal;
      totalItemDiscounts += itemDiscountAmount;
    });

    const itemsSubtotalAfterItemDiscount = itemsSubtotalBeforeDiscount - totalItemDiscounts;
    const overallDiscountAmount = (itemsSubtotalAfterItemDiscount * (discount || 0)) / 100;
    const finalSubtotal = itemsSubtotalAfterItemDiscount - overallDiscountAmount;

    let calculatedTax = 0;
    if (Array.isArray(taxes)) {
      selectedTaxIds.forEach(taxId => {
        const tax = taxes.find(t => t._id === taxId);
        if (tax) calculatedTax += (finalSubtotal * (tax.value || 0)) / 100;
      });
    }

    const finalTotal = finalSubtotal + calculatedTax;
    setSubtotal(itemsSubtotalBeforeDiscount);
    setTaxAmount(calculatedTax);
    setTotal(finalTotal);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), product: null, description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const handleProductSelect = (itemId, productId) => {
    const product = Array.isArray(products) ? products.find(p => p._id === productId) : null;
    if (product) {
      setItems(items.map(item => item.id === itemId
        ? { ...item, product: productId, description: product.name, unitPrice: product.price }
        : item
      ));
    }
  };

  const handleSubmit = async (values) => {
    if (loading) return;
    if (!Array.isArray(items) || items.length === 0) return message.error('Please add at least one item');
    if (!values.expectedDeliveryDate) return message.error('Expected delivery date is required');

    const poDate = values.poDate?.toDate() || new Date();
    const expectedDate = values.expectedDeliveryDate?.toDate();

    if (expectedDate < poDate) return message.error('Expected delivery date must be on or after PO date');

    setLoading(true);
    try {
      const poData = {
        supplier: values.supplier,
        poDate,
        expectedDeliveryDate: expectedDate,
        items: items.map(item => ({
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0
        })),
        discount,
        taxes: selectedTaxIds,
        deliveryAddress: values.deliveryAddress,
        paymentTerms: values.paymentTerms,
        notes: values.notes,
        terms: values.terms
      };

      if (id) {
        await api.put(`/purchase-orders/${id}`, poData);
        message.success('Purchase Order updated successfully');
      } else {
        await api.post('/purchase-orders', poData);
        message.success('Purchase Order created successfully');
      }
      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error saving PO:', error);
      message.error(error.response?.data?.message || 'Failed to save Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  const itemColumns = [
    {
      title: 'Product',
      dataIndex: 'product',
      width: 200,
      render: (value, record) => (
        <Select
          showSearch
          placeholder="Select Product"
          style={{ width: '100%' }}
          value={value}
          onChange={(productId) => handleProductSelect(record.id, productId)}
          optionFilterProp="children"
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
        >
          {Array.isArray(products) && products.map(p => (
            <Select.Option key={p._id} value={p._id}>{p.name}</Select.Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: 200,
      render: (value, record) => (
        <Input value={value} onChange={(e) => updateItem(record.id, 'description', e.target.value)} placeholder="Description" />
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      width: 100,
      render: (value, record) => <InputNumber min={1} value={value} onChange={(val) => updateItem(record.id, 'quantity', val)} style={{ width: '100%' }} />
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      width: 120,
      render: (value, record) => <InputNumber min={0} value={value} onChange={(val) => updateItem(record.id, 'unitPrice', val)} style={{ width: '100%' }} precision={2} />
    },
    {
      title: 'Discount %',
      dataIndex: 'discount',
      width: 100,
      render: (value, record) => <InputNumber min={0} max={100} value={value} onChange={(val) => updateItem(record.id, 'discount', val)} style={{ width: '100%' }} />
    },
    {
      title: 'Total',
      width: 120,
      render: (_, record) => {
        const itemTotal = (record.quantity || 0) * (record.unitPrice || 0);
        const discountAmount = (itemTotal * (record.discount || 0)) / 100;
        return `Rs. ${(itemTotal - discountAmount).toFixed(2)}`;
      }
    },
    {
      title: 'Action',
      width: 80,
      render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(record.id)} />
    }
  ];

  return (
    <div>
      <Card title={id ? "Edit Purchase Order" : "New Purchase Order"}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ poDate: dayjs(), discount: 0 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Supplier" name="supplier" rules={[{ required: true, message: 'Please select a supplier' }]}>
                <Select
                  showSearch
                  placeholder="Select Supplier"
                  optionFilterProp="children"
                  filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                >
                  {Array.isArray(suppliers) && suppliers.map(s => <Select.Option key={s._id} value={s._id}>{s.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="PO Date" name="poDate">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Expected Delivery Date" name="expectedDeliveryDate" rules={[{ required: true, message: 'Please select expected delivery date' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Items</Divider>

          <Table
            dataSource={items}
            columns={itemColumns}
            pagination={false}
            rowKey="id"
            footer={() => <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} block>Add Item</Button>}
            scroll={{ x: 900 }}
          />

          <Divider>Tax & Discount</Divider>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Overall Discount %">
                <InputNumber min={0} max={100} value={discount} onChange={setDiscount} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Taxes">
                <Select mode="multiple" placeholder="Select applicable taxes" value={selectedTaxIds} onChange={setSelectedTaxIds} style={{ width: '100%' }}>
                  {Array.isArray(taxes) && taxes.map(tax => <Select.Option key={tax._id} value={tax._id}>{tax.name} ({tax.value}%)</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Card style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <div style={{ fontSize: '16px' }}>
                  <div style={{ marginBottom: 8 }}><strong>Subtotal:</strong> <span style={{ float: 'right' }}>Rs. {subtotal.toFixed(2)}</span></div>
                  {discount > 0 && <div style={{ marginBottom: 8 }}><strong>Discount ({discount}%):</strong> <span style={{ float: 'right' }}>Rs. {(subtotal * (discount / 100)).toFixed(2)}</span></div>}
                  {selectedTaxIds.length > 0 && <div style={{ marginBottom: 8 }}><strong>Tax:</strong> <span style={{ float: 'right' }}>Rs. {taxAmount.toFixed(2)}</span></div>}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}><strong>Total:</strong> <span style={{ float: 'right' }}>Rs. {total.toFixed(2)}</span></div>
                </div>
              </Col>
            </Row>
          </Card>

          <Divider>Additional Information</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Delivery Address" name="deliveryAddress"><TextArea rows={3} placeholder="Delivery address if different from default" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Payment Terms" name="paymentTerms"><TextArea rows={3} placeholder="e.g., Net 30, 50% advance" /></Form.Item></Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Notes" name="notes"><TextArea rows={3} placeholder="Internal notes" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Terms & Conditions" name="terms"><TextArea rows={3} placeholder="Terms and conditions" /></Form.Item></Col>
          </Row>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>{id ? 'Update Purchase Order' : 'Create Purchase Order'}</Button>
              <Button onClick={() => navigate('/purchase-orders')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default PurchaseOrderForm;

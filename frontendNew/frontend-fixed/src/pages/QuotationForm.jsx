import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, DatePicker, Button, Card, Table, InputNumber,
  Space, message, Divider, Tooltip
} from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

function QuotationForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]); // Tax master list
  const [selectedTaxIds, setSelectedTaxIds] = useState([]);
  const [taxAmount, setTaxAmount] = useState(0);
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [itemDiscountsTotal, setItemDiscountsTotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchTaxes(); // NEW: Load taxes
    loadDefaultTemplates();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [items, discount, selectedTaxIds]);

  const loadDefaultTemplates = async () => {
    try {
      const response = await api.get('/settings');
      const settings = response.data.result;
      
      form.setFieldsValue({
        terms: settings?.defaultTerms || 'Payment terms: 50% advance, 50% on delivery\nDelivery: 2-3 weeks\nPrices valid for 30 days',
        notes: settings?.defaultNotes || 'Thank you for your business!'
      });
    } catch (error) {
      console.error('Failed to load templates:', error);
      form.setFieldsValue({
        terms: 'Payment terms: 50% advance, 50% on delivery\nDelivery: 2-3 weeks\nPrices valid for 30 days',
        notes: 'Thank you for your business!'
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      message.error('Failed to load customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      message.error('Failed to load products');
    }
  };

  // Fetch taxes from master list
  const fetchTaxes = async () => {
    try {
      const response = await api.get('/taxes');
      setTaxes(response.data.result || []);
    } catch (error) {
      console.error('Failed to load taxes:', error);
      message.error('Failed to load taxes');
    }
  };

  // Calculation:
  // - item discounts applied per line
  // - overall discount applied on subtotal
  // - multiple taxes applied on final subtotal (after discounts)
  const calculateTotals = () => {
    let itemsSubtotalBeforeDiscount = 0; // Subtotal before any discounts
    let totalItemDiscounts = 0; // Sum of all item-level discounts

    items.forEach(item => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const itemDiscountAmount = (itemTotal * (item.discount || 0)) / 100;

      itemsSubtotalBeforeDiscount += itemTotal;
      totalItemDiscounts += itemDiscountAmount;
    });

    const itemsSubtotalAfterItemDiscount = itemsSubtotalBeforeDiscount - totalItemDiscounts;

    // Apply overall discount percentage
    const overallDiscountAmount = (itemsSubtotalAfterItemDiscount * (discount || 0)) / 100;
    const finalSubtotal = itemsSubtotalAfterItemDiscount - overallDiscountAmount;

    // Calculate total tax from all selected taxes
    let calculatedTax = 0;
    selectedTaxIds.forEach(taxId => {
      const tax = taxes.find(t => t._id === taxId);
      if (tax) {
        calculatedTax += (finalSubtotal * (tax.value || 0)) / 100;
      }
    });

    const finalTotal = finalSubtotal + calculatedTax;

    setSubtotal(itemsSubtotalBeforeDiscount);
    setItemDiscountsTotal(totalItemDiscounts);
    setTaxAmount(calculatedTax);
    setTotal(finalTotal);
  };

  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      product: null,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0
    }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleProductSelect = (itemId, productId) => {
    const product = products.find(p => p._id === productId);
    
    if (product) {
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            product: productId,
            description: product.name,
            unitPrice: product.price
          };
        }
        return item;
      });
      setItems(updatedItems);
    }
  };

  const handleSubmit = async (values) => {
    if (items.length === 0) {
      message.error('Please add at least one item');
      return;
    }

    try {
      const quotationData = {
        customer: values.customer,
        date: values.date?.toDate() || new Date(),
        validUntil: values.validUntil?.toDate(),
        items: items.map(item => ({
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0
        })),
        discount: discount,
        taxes: selectedTaxIds,
        notes: values.notes,
        terms: values.terms,
        status: 'draft'
      };

      await api.post('/quotations', quotationData);
      message.success('Quotation created successfully');
      navigate('/quotations');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create quotation');
      console.error('Error:', error);
    }
  };

  const itemColumns = [
    {
      title: 'Product',
      key: 'product',
      width: 200,
      render: (_, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select product"
          value={record.product}
          onChange={(value) => handleProductSelect(record.id, value)}
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {products.map(p => (
            <Select.Option key={p._id} value={p._id}>
              {p.name} - Rs. {p.price?.toLocaleString()}
            </Select.Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Description',
      key: 'description',
      render: (_, record) => (
        <Input
          value={record.description}
          onChange={(e) => updateItem(record.id, 'description', e.target.value)}
          placeholder="Product description"
        />
      )
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={1}
          step={1}
          value={record.quantity}
          onChange={(value) => updateItem(record.id, 'quantity', value || 1)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Unit Price',
      key: 'unitPrice',
      width: 150,
      render: (_, record) => (
        <InputNumber
          min={0}
          step={100}
          value={record.unitPrice}
          onChange={(value) => updateItem(record.id, 'unitPrice', value || 0)}
          style={{ width: '100%' }}
          prefix="Rs."
        />
      )
    },
    {
      title: 'Discount %',
      key: 'discount',
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={100}
          step={1}
          value={record.discount}
          onChange={(value) => updateItem(record.id, 'discount', value || 0)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Total',
      key: 'total',
      width: 150,
      render: (_, record) => {
        const itemTotal = (record.quantity || 0) * (record.unitPrice || 0);
        const itemDiscount = (itemTotal * (record.discount || 0)) / 100;
        const afterDiscount = itemTotal - itemDiscount;
        return <strong>Rs. {afterDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>;
      }
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.id)}
        />
      )
    }
  ];

  return (
    <div>
      <h1>Create Quotation (SQ-)</h1>

      <Card style={{ marginTop: 20 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item
              name="customer"
              label="Customer"
              rules={[{ required: true, message: 'Please select customer' }]}
            >
              <Select placeholder="Select customer" showSearch optionFilterProp="children">
                {customers.map(c => (
                  <Select.Option key={c._id} value={c._id}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="date" label="Quotation Date" initialValue={dayjs()}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item name="validUntil" label="Valid Until" initialValue={dayjs().add(30, 'days')}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </div>

          <Divider>Items</Divider>

          {products.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', background: '#fff7e6', marginBottom: 16 }}>
              ⚠️ No products available. Please add products first.
            </div>
          )}

          <Table
            columns={itemColumns}
            dataSource={items}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1200 }}
            locale={{ emptyText: 'No items added yet. Click "Add Item" below.' }}
          />

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addItem}
            style={{ width: '100%', marginTop: 16 }}
          >
            Add Item
          </Button>

          <Divider>Totals</Divider>

          <div style={{ maxWidth: 500, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Subtotal:</span>
              <span><strong>Rs. {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>

            {itemDiscountsTotal > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#52c41a' }}>
                  <span>Item Discounts:</span>
                  <span>- Rs. {itemDiscountsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Subtotal After Item Discounts:</span>
                  <span><strong>Rs. {(subtotal - itemDiscountsTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <span>Overall Discount %:</span>
              <InputNumber
                min={0}
                max={100}
                step={1}
                value={discount}
                onChange={(value) => setDiscount(value || 0)}
                style={{ width: 150 }}
                suffix="%"
              />
            </div>
            {discount > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#52c41a' }}>
                  <span>Overall Discount Amount:</span>
                  <span>- Rs. {(((subtotal - itemDiscountsTotal) * discount) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Subtotal After All Discounts:</span>
                  <span><strong>Rs. {((subtotal - itemDiscountsTotal) - (((subtotal - itemDiscountsTotal) * discount) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                </div>
              </>
            )}

            <Divider style={{ margin: '12px 0' }}>Taxes</Divider>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <span>Select Taxes:</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select
                  mode="multiple"
                  style={{ width: 300 }}
                  placeholder="Select one or more taxes"
                  value={selectedTaxIds}
                  onChange={(values) => {
                    setSelectedTaxIds(values || []);
                  }}
                  allowClear
                  maxTagCount="responsive"
                >
                  {taxes.filter(t => t.enabled).map(tax => (
                    <Select.Option key={tax._id} value={tax._id}>
                      {tax.name} - {tax.type} ({tax.value}%)
                    </Select.Option>
                  ))}
                </Select>
                <span style={{ minWidth: 110, textAlign: 'right' }}>
                  <strong>Rs. {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </span>
              </div>
            </div>

            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 600 }}>
              <span>Total:</span>
              <span style={{ color: '#1890ff' }}>Rs. {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <Divider />

          <Form.Item 
            name="notes" 
            label={
              <span>
                Notes{' '}
                <Tooltip title="Loaded from Settings → Templates. You can edit for this specific quotation.">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
          >
            <Input.TextArea rows={3} placeholder="These notes will appear on the quotation..." />
          </Form.Item>

          <Form.Item 
            name="terms" 
            label={
              <span>
                Terms & Conditions{' '}
                <Tooltip title="Loaded from Settings → Templates. You can edit for this specific quotation.">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
          >
            <Input.TextArea rows={5} placeholder="Terms and conditions for this quotation..." />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => navigate('/quotations')}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" size="large">
                Create Quotation
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default QuotationForm;
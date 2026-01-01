import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Space, message, Spin, DatePicker, Table, Row, Col } from 'antd';
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
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  // ================= FETCH SUPPLIERS =================
  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      console.log('Suppliers response:', response.data);

      if (response.data?.result && Array.isArray(response.data.result)) {
        setSuppliers(response.data.result);
      } else if (Array.isArray(response.data)) {
        setSuppliers(response.data);
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

  // ================= FETCH PRODUCTS =================
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      console.log('Products response:', response.data);

      if (response.data?.result && Array.isArray(response.data.result)) {
        setProducts(response.data.result);
      } else if (response.data?.products && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else if (Array.isArray(response.data)) {
        setProducts(response.data);
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

  // ================= SUPPLIER CHANGE =================
  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    setSelectedSupplier(supplier);
  };

  // ================= ITEMS =================
  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        product: null,
        orderedQuantity: 0,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        unitPrice: 0,
        batchNumber: ''
      }
    ]);
  };

  const removeItem = (key) => {
    setItems(items.filter(item => item.key !== key));
  };

  const updateItem = (key, field, value) => {
    setItems(items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        if (field === 'receivedQuantity') updated.acceptedQuantity = value;
        return updated;
      }
      return item;
    }));
  };

  // ================= SUBMIT =================
  const handleSubmit = async (values) => {
    if (items.length === 0) {
      message.error('Add at least one item');
      return;
    }

    setLoading(true);
    try {
      const grnData = {
        supplier: values.supplier,
        grnDate: values.grnDate.format('YYYY-MM-DD'),
        items: items.map(i => ({
          product: i.product,
          orderedQuantity: i.orderedQuantity,
          receivedQuantity: i.receivedQuantity,
          acceptedQuantity: i.acceptedQuantity,
          unitPrice: i.unitPrice,
          batchNumber: i.batchNumber
        })),
        notes: values.notes
      };

      await api.post('/grn', grnData);
      message.success('GRN created');
      navigate('/grn');
    } catch (error) {
      console.error(error);
      message.error('Failed to create GRN');
    }
    setLoading(false);
  };

  // ================= TABLE =================
  const columns = [
    {
      title: 'Product',
      render: (_, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select product"
          value={record.product}
          onChange={(val) => updateItem(record.key, 'product', val)}
        >
          {products.map(p => (
            <Option key={p._id} value={p._id}>{p.name}</Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Ordered',
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.orderedQuantity}
          onChange={(val) => updateItem(record.key, 'orderedQuantity', val)}
        />
      )
    },
    {
      title: 'Received',
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.receivedQuantity}
          onChange={(val) => updateItem(record.key, 'receivedQuantity', val)}
        />
      )
    },
    {
      title: 'Accepted',
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.acceptedQuantity}
          onChange={(val) => updateItem(record.key, 'acceptedQuantity', val)}
        />
      )
    },
    {
      title: 'Price',
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.unitPrice}
          onChange={(val) => updateItem(record.key, 'unitPrice', val)}
        />
      )
    },
    {
      title: 'Batch',
      render: (_, record) => (
        <Input
          value={record.batchNumber}
          onChange={(e) => updateItem(record.key, 'batchNumber', e.target.value)}
        />
      )
    },
    {
      title: 'Action',
      render: (_, record) => (
        <Button danger onClick={() => removeItem(record.key)}>Delete</Button>
      )
    }
  ];

  return (
    <Spin spinning={loading}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ grnDate: dayjs() }}>
        <Card title="GRN">
          <Form.Item name="supplier" label="Supplier">
            <Select placeholder="Select supplier" onChange={handleSupplierChange} allowClear>
              {suppliers.map(s => (
                <Option key={s._id} value={s._id}>{s.name}</Option>
              ))}
            </Select>
          </Form.Item>

          {selectedSupplier && (
            <p><b>Phone:</b> {selectedSupplier.phone} | <b>Email:</b> {selectedSupplier.email}</p>
          )}

          <Form.Item name="grnDate" label="Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Card>

        <Card title="Items">
          <Button onClick={addItem} block>Add Item</Button>
          <Table columns={columns} dataSource={items} pagination={false} rowKey="key" />
        </Card>

        <Card>
          <Form.Item name="notes">
            <TextArea />
          </Form.Item>
          <Button type="primary" htmlType="submit">Save GRN</Button>
        </Card>
      </Form>
    </Spin>
  );
}

export default GRNForm;

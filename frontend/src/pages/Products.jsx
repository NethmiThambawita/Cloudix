import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { useSelector } from 'react-redux';

function Products() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      message.error('Failed to load products');
    }
    setLoading(false);
  };

  const handleAdd = () => {
    if (!isAdmin) {
      message.error('You do not have permission to add products');
      return;
    }
    setEditingProduct(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    if (!isAdmin) {
      message.error('You do not have permission to edit products');
      return;
    }
    setEditingProduct(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      message.error('You do not have permission to delete products');
      return;
    }
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deleted');
      fetchProducts();
    } catch (error) {
      message.error('Failed to delete product');
    }
  };

  const handleSubmit = async (values) => {
    // Prevent duplicate submissions
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, values);
        message.success('Product updated');
      } else {
        await api.post('/products', values);
        message.success('Product created');
      }
      setModalVisible(false);
      fetchProducts();
    } catch (error) {
      message.error('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Price', dataIndex: 'price', key: 'price', render: (val) => `Rs. ${val?.toLocaleString()}` },
    { title: 'Tax %', dataIndex: 'taxRate', key: 'taxRate' },
    ...(isAdmin
      ? [
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record._id)} />
              </Space>
            )
          }
        ]
      : [])
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Products</h1>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Product
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={products}
        rowKey="_id"
        loading={loading}
      />

      {isAdmin && (
        <Modal
          title={editingProduct ? 'Edit Product' : 'Add Product'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          confirmLoading={submitting}
        >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input />
          </Form.Item>
          <Form.Item name="price" label="Price (LKR)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="taxRate" label="Tax Rate (%)" initialValue={0}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
        </Modal>
      )}
    </div>
  );
}

export default Products;
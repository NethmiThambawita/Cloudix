import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Space, Select, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import api from '../api/axios';
import { useSelector } from 'react-redux';

const baseUnits = [
  { label: 'No', value: 'No' },
  { label: 'Kg', value: 'Kg' },
  { label: 'g', value: 'g' },
  { label: 'Litre', value: 'Litre' },
  { label: 'ml', value: 'ml' },
  { label: 'Pack', value: 'Pack' },
];

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

  // ------------------- CRUD -------------------
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
    if (submitting) return;

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

  // ------------------- Excel Export -------------------
  const exportToExcel = () => {
    const exportData = products.map(p => ({
      Name: p.name,
      Category: p.category,
      BaseUnit: p.baseUnit,
      PackSize: p.packSize,
      UnitCost: p.unitCost,
      SellingPrice: p.price,
      TaxRate: p.taxRate,
      Description: p.description
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(data, 'products.xlsx');
  };

  // ------------------- Excel Import -------------------
  const importFromExcel = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/products/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      message.success(response.data.message || 'Excel imported successfully');
      fetchProducts();
    } catch (error) {
      console.error('Import error:', error);
      message.error(error.response?.data?.message || 'Excel import failed');
    }
    
    return false;
  };

  // ------------------- Table Columns -------------------
  const columns = [
    { title: 'Item', dataIndex: 'name', key: 'name' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Base Unit', dataIndex: 'baseUnit', key: 'baseUnit' },
    { title: 'Pack Size', dataIndex: 'packSize', key: 'packSize' },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      key: 'unitCost',
      render: (val) => `Rs. ${val?.toLocaleString()}`
    },
    {
      title: 'Selling Price',
      dataIndex: 'price',
      key: 'price',
      render: (val) => `Rs. ${val?.toLocaleString()}`
    },
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
      {/* ---------- Header with Buttons ---------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Products</h1>

        <Space>
          <Button onClick={exportToExcel}>Export Excel</Button>

          {isAdmin && (
            <Upload
              beforeUpload={importFromExcel}
              showUploadList={false}
              accept=".xlsx,.xls"
            >
              <Button>Import Excel</Button>
            </Upload>
          )}

          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Product
            </Button>
          )}
        </Space>
      </div>

      {/* ---------- Product Table ---------- */}
      <Table
        columns={columns}
        dataSource={products}
        rowKey="_id"
        loading={loading}
      />

      {/* ---------- Add/Edit Modal ---------- */}
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

            <Form.Item
              name="baseUnit"
              label="Base Unit of Measure"
              rules={[{ required: true }]}
            >
              <Select options={baseUnits} placeholder="Select unit" />
            </Form.Item>

            <Form.Item
              name="packSize"
              label="Pack Size"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="unitCost"
              label="Unit Cost (LKR)"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="price"
              label="Selling Price (LKR)"
              rules={[{ required: true }]}
            >
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

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { useSelector } from 'react-redux';

function Suppliers() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data.data || []);
    } catch (error) {
      message.error('Failed to load suppliers');
    }
    setLoading(false);
  };

  const handleAdd = () => {
    if (!isAdmin) {
      message.error('You do not have permission to add suppliers');
      return;
    }
    setEditingSupplier(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    if (!isAdmin) {
      message.error('You do not have permission to edit suppliers');
      return;
    }
    setEditingSupplier(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      message.error('You do not have permission to delete suppliers');
      return;
    }
    try {
      await api.delete(`/suppliers/${id}`);
      message.success('Supplier deleted');
      fetchSuppliers();
    } catch (error) {
      message.error('Failed to delete supplier');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier._id}`, values);
        message.success('Supplier updated');
      } else {
        await api.post('/suppliers', values);
        message.success('Supplier created');
      }
      setModalVisible(false);
      fetchSuppliers();
    } catch (error) {
      message.error('Failed to save supplier');
    }
  };

  const columns = [
    { title: 'Number', dataIndex: 'supplierNumber', key: 'supplierNumber' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
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
        <h1>Suppliers</h1>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Supplier
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={suppliers}
        rowKey="_id"
        loading={loading}
      />

      {isAdmin && (
        <Modal
          title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
        >
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Address">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}

export default Suppliers;

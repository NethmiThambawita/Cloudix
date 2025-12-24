import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { useSelector } from 'react-redux';

function Customers() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      message.error('Failed to load customers');
    }
    setLoading(false);
  };

  const handleAdd = () => {
    if (!isAdmin) {
      message.error('You do not have permission to add customers');
      return;
    }
    setEditingCustomer(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    if (!isAdmin) {
      message.error('You do not have permission to edit customers');
      return;
    }
    setEditingCustomer(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      message.error('You do not have permission to delete customers');
      return;
    }
    try {
      await api.delete(`/customers/${id}`);
      message.success('Customer deleted');
      fetchCustomers();
    } catch (error) {
      message.error('Failed to delete customer');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, values);
        message.success('Customer updated');
      } else {
        await api.post('/customers', values);
        message.success('Customer created');
      }
      setModalVisible(false);
      fetchCustomers();
    } catch (error) {
      message.error('Failed to save customer');
    }
  };

  const columns = [
    { title: 'Number', dataIndex: 'customerNumber', key: 'customerNumber' },
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
        <h1>Customers</h1>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Customer
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={customers}
        rowKey="_id"
        loading={loading}
      />

      {isAdmin && (
        <Modal
          title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
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

export default Customers;
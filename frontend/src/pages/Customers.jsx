import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { useSelector } from 'react-redux';
import toast from '../utils/toast';

const { confirm } = Modal;

function Customers() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      toast.error('Failed to load customers', 'Please refresh the page or contact support.');
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    if (!isAdmin) {
      toast.warning('Permission Required', 'You need admin privileges to add customers.');
      return;
    }
    setEditingCustomer(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    if (!isAdmin) {
      toast.warning('Permission Required', 'You need admin privileges to edit customers.');
      return;
    }
    setEditingCustomer(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (record) => {
    if (!isAdmin) {
      toast.warning('Permission Required', 'You need admin privileges to delete customers.');
      return;
    }
    confirm({
      title: '🗑️ Delete Customer?',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>Are you sure you want to delete <strong>{record.name}</strong>?</p>
          <div style={{
            padding: '12px',
            background: '#fff2e8',
            border: '1px solid #ffbb96',
            borderRadius: '4px',
            marginTop: '12px',
            marginBottom: '12px'
          }}>
            <p style={{ color: '#d4380d', margin: 0, fontWeight: 500 }}>
              ⚠️ Warning: This will permanently remove all customer information and transaction history.
            </p>
          </div>
          <p style={{ marginTop: '12px', color: '#666' }}>
            💡 This action cannot be undone. Consider deactivating instead if you may need this data later.
          </p>
        </div>
      ),
      okText: 'Yes, Delete Permanently',
      okType: 'danger',
      cancelText: 'No, Keep It',
      async onOk() {
        try {
          await api.delete(`/customers/${record._id}`);
          toast.success(
            '✅ Customer Deleted Successfully',
            `${record.name} has been removed from your customer base.`
          );
          fetchCustomers();
        } catch (error) {
          toast.error(
            'Failed to Delete Customer',
            error.response?.data?.message || 'Please try again or contact support.'
          );
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    // Prevent duplicate submissions
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, values);
        toast.success(
          '✨ Customer Updated!',
          `${values.name}'s information has been updated successfully.`
        );
      } else {
        await api.post('/customers', values);
        toast.celebrate(
          '🎉 New Customer Added!',
          `${values.name} has been added to your customer base. Welcome aboard!`
        );
      }
      setModalVisible(false);
      fetchCustomers();
    } catch (error) {
      toast.error(
        'Failed to save customer',
        'Please check your input and try again.'
      );
    } finally {
      setSubmitting(false);
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
                <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} />
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
          confirmLoading={submitting}
        >
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: false, type: 'email' }]}>
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
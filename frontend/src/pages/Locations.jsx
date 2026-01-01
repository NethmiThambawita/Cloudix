import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Switch, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { useSelector } from 'react-redux';

const { confirm } = Modal;
const { TextArea } = Input;

function Locations() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/locations');
      setLocations(response.data.data || []);
    } catch (error) {
      message.error('Failed to load locations');
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    if (!isAdmin) {
      message.warning('You need admin privileges to add locations');
      return;
    }
    setEditingLocation(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    if (!isAdmin) {
      message.warning('You need admin privileges to edit locations');
      return;
    }
    setEditingLocation(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (record) => {
    if (!isAdmin) {
      message.warning('You need admin privileges to delete locations');
      return;
    }
    confirm({
      title: 'Delete Location?',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await api.delete(`/locations/${record._id}`);
          message.success('Location deleted successfully');
          fetchLocations();
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to delete location');
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation._id}`, values);
        message.success('Location updated successfully');
      } else {
        await api.post('/locations', values);
        message.success('Location created successfully');
      }
      setModalVisible(false);
      fetchLocations();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'City', dataIndex: 'city', key: 'city' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <span style={{ color: isActive ? '#52c41a' : '#ff4d4f' }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    ...(isAdmin
      ? [
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
                <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} size="small" />
              </Space>
            )
          }
        ]
      : [])
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Locations</h1>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Location
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={locations}
        rowKey="_id"
        loading={loading}
      />

      {isAdmin && (
        <Modal
          title={editingLocation ? 'Edit Location' : 'Add Location'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          confirmLoading={submitting}
          width={600}
        >
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item
              name="name"
              label="Location Name"
              rules={[{ required: true, message: 'Please enter location name' }]}
            >
              <Input placeholder="e.g., Main Warehouse" />
            </Form.Item>

            <Form.Item
              name="code"
              label="Location Code"
              rules={[{ required: false }]}
            >
              <Input placeholder="e.g., WH-01" />
            </Form.Item>

            <Form.Item name="address" label="Address">
              <TextArea rows={2} placeholder="Street address" />
            </Form.Item>

            <Form.Item name="city" label="City">
              <Input placeholder="e.g., Colombo" />
            </Form.Item>

            <Form.Item name="phone" label="Phone">
              <Input placeholder="e.g., +94 11 234 5678" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input placeholder="e.g., warehouse@company.com" />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <TextArea rows={3} placeholder="Additional details about this location" />
            </Form.Item>

            <Form.Item name="isActive" label="Status" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}

export default Locations;

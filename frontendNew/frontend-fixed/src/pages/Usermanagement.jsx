import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, message, 
  Popconfirm, Tag, Switch, Card
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined,
  UserOutlined, MailOutlined, PhoneOutlined
} from '@ant-design/icons';
import api from '../api/axios';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      message.error('Failed to load users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const showCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const showEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive
    });
    setIsModalVisible(true);
  };

  const showPasswordModal = (userId) => {
    setSelectedUserId(userId);
    passwordForm.resetFields();
    setIsPasswordModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handlePasswordModalCancel = () => {
    setIsPasswordModalVisible(false);
    setSelectedUserId(null);
    passwordForm.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        // Update user
        await api.put(`/users/${editingUser._id}`, values);
        message.success('User updated successfully');
      } else {
        // Create user
        await api.post('/users', values);
        message.success('User created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || 'Operation failed');
      console.error('Error:', error);
    }
  };

  const handlePasswordChange = async (values) => {
    try {
      await api.patch(`/users/${selectedUserId}/change-password`, {
        newPassword: values.newPassword
      });
      message.success('Password changed successfully');
      setIsPasswordModalVisible(false);
      passwordForm.resetFields();
      setSelectedUserId(null);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await api.patch(`/users/${userId}/toggle-status`);
      message.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      message.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'red',
      manager: 'blue',
      user: 'green'
    };
    return colors[role] || 'default';
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <span>{`${record.firstName} ${record.lastName}`}</span>
        </Space>
      ),
      sorter: (a, b) => a.firstName.localeCompare(b.firstName)
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => (
        <Space>
          <MailOutlined />
          {email}
        </Space>
      )
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone ? (
        <Space>
          <PhoneOutlined />
          {phone}
        </Space>
      ) : '-'
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)}>
          {role.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Admin', value: 'admin' },
        { text: 'Manager', value: 'manager' },
        { text: 'User', value: 'user' }
      ],
      onFilter: (value, record) => record.role === value
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleStatus(record._id, isActive)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false }
      ],
      onFilter: (value, record) => record.isActive === value
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date) => date ? new Date(date).toLocaleString() : 'Never',
      sorter: (a, b) => {
        if (!a.lastLogin) return 1;
        if (!b.lastLogin) return -1;
        return new Date(a.lastLogin) - new Date(b.lastLogin);
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={<LockOutlined />}
            onClick={() => showPasswordModal(record._id)}
          >
            Password
          </Button>
          <Popconfirm
            title="Delete user?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>User Management</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showCreateModal}
        >
          Create User
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} users`
          }}
        />
      </Card>

      {/* Create/Edit User Modal */}
      <Modal
        title={editingUser ? 'Edit User' : 'Create New User'}
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter valid email' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="user@company.com" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Minimum 6 characters" />
            </Form.Item>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'Please enter first name' }]}
            >
              <Input placeholder="John" />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter last name' }]}
            >
              <Input placeholder="Doe" />
            </Form.Item>
          </div>

          <Form.Item
            name="phone"
            label="Phone"
          >
            <Input prefix={<PhoneOutlined />} placeholder="+94771234567" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: 'Please select role' }]}
              initialValue="user"
            >
              <Select>
                <Select.Option value="user">User</Select.Option>
                <Select.Option value="manager">Manager</Select.Option>
                <Select.Option value="admin">Admin</Select.Option>
              </Select>
            </Form.Item>

            {editingUser && (
              <Form.Item
                name="isActive"
                label="Status"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            )}
          </div>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title="Change Password"
        open={isPasswordModalVisible}
        onCancel={handlePasswordModalCancel}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter new password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Minimum 6 characters" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                }
              })
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Re-enter password" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={handlePasswordModalCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Change Password
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default UserManagement;
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Switch, message, Space, Dropdown, Select } from 'antd';
import { PlusOutlined, MoreOutlined, EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/axios';

function Taxes() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/taxes');
      setTaxes(response.data.result || []);
    } catch (error) {
      message.error('Failed to load taxes');
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingTax(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingTax(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/taxes/${id}`);
      message.success('Tax deleted');
      fetchTaxes();
    } catch (error) {
      message.error('Failed to delete tax');
    }
  };

  const handleToggleDefault = async (record) => {
    try {
      await api.put(`/taxes/${record._id}`, { ...record, isDefault: !record.isDefault });
      message.success('Tax updated');
      fetchTaxes();
    } catch (error) {
      message.error('Failed to update tax');
    }
  };

  const handleToggleEnabled = async (record) => {
    try {
      await api.put(`/taxes/${record._id}`, { ...record, enabled: !record.enabled });
      message.success('Tax updated');
      fetchTaxes();
    } catch (error) {
      message.error('Failed to update tax');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingTax) {
        await api.put(`/taxes/${editingTax._id}`, values);
        message.success('Tax updated');
      } else {
        await api.post('/taxes', values);
        message.success('Tax created');
      }
      setModalVisible(false);
      fetchTaxes();
    } catch (error) {
      message.error('Failed to save tax');
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    message.success('ID copied to clipboard');
  };

  const getMenuItems = (record) => [
    {
      key: 'show',
      icon: <EyeOutlined />,
      label: 'Show',
      onClick: () => handleEdit(record)
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEdit(record)
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy ID',
      onClick: () => handleCopyId(record._id)
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(record._id)
    }
  ];

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Value', dataIndex: 'value', key: 'value', render: (val) => `${val}%` },
    {
      title: 'Default',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (isDefault, record) => (
        <Switch
          checked={isDefault}
          onChange={() => handleToggleDefault(record)}
        />
      )
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled, record) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggleEnabled(record)}
        />
      )
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Dropdown
          menu={{ items: getMenuItems(record) }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Taxes List</h1>
          <p style={{ color: '#666' }}>Manage tax rates for your business</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={fetchTaxes}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add New Tax
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={taxes}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingTax ? 'Edit Tax' : 'Add New Tax'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="Tax Name"
            rules={[{ required: true, message: 'Please enter tax name' }]}
          >
            <Input placeholder="e.g., VAT 15%, Service Tax 10%" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Tax Type"
            rules={[{ required: true, message: 'Please select tax type' }]}
            initialValue="Other"
          >
            <Select placeholder="Select tax type">
              <Select.Option value="VAT">VAT</Select.Option>
              <Select.Option value="Service Tax">Service Tax</Select.Option>
              <Select.Option value="Local Tax">Local Tax</Select.Option>
              <Select.Option value="Other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="value"
            label="Tax Rate (%)"
            rules={[{ required: true, message: 'Please enter tax rate' }]}
          >
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%' }}
              placeholder="e.g., 15"
            />
          </Form.Item>

          <Form.Item name="isDefault" label="Set as Default" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="enabled" label="Enabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Taxes;
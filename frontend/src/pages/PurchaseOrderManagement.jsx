import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Card, Input, Select, Row, Col, DatePicker, message, Modal, Dropdown } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  EditOutlined,
  SyncOutlined
} from '@ant-design/icons';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

const { confirm } = Modal;
const { Option } = Select;
const { RangePicker } = DatePicker;

function PurchaseOrderManagement() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [convertedFilter, setConvertedFilter] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchPOs();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      if (Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setSuppliers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const fetchPOs = async () => {
    setLoading(true);
    try {
      let url = '/purchase-orders?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (supplierFilter) url += `supplier=${supplierFilter}&`;
      if (convertedFilter) url += `convertedToGRN=${convertedFilter}&`;
      if (searchText) url += `search=${searchText}&`;
      if (dateRange && dateRange[0] && dateRange[1]) {
        url += `startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}&`;
      }

      const response = await api.get(url);
      setPOs(response.data);
    } catch (error) {
      console.error('Failed to load Purchase Orders:', error);
      message.error('Failed to load Purchase Order data');
    }
    setLoading(false);
  };

  const handleSearch = () => {
    fetchPOs();
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/purchase-orders/${id}/approve`);
      message.success('Purchase Order approved successfully');
      fetchPOs();
    } catch (error) {
      console.error('Failed to approve PO:', error);
      message.error(error.response?.data?.message || 'Failed to approve Purchase Order');
    }
  };

  const handleSend = async (id) => {
    try {
      await api.post(`/purchase-orders/${id}/send`);
      message.success('Purchase Order sent to supplier successfully');
      fetchPOs();
    } catch (error) {
      console.error('Failed to send PO:', error);
      message.error(error.response?.data?.message || 'Failed to send Purchase Order');
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.post(`/purchase-orders/${id}/complete`);
      message.success('Purchase Order completed successfully');
      fetchPOs();
    } catch (error) {
      console.error('Failed to complete PO:', error);
      message.error(error.response?.data?.message || 'Failed to complete Purchase Order');
    }
  };

  const handleCancel = (record) => {
    confirm({
      title: 'Cancel Purchase Order?',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to cancel PO ${record.poNumber}?`,
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No',
      async onOk() {
        try {
          await api.post(`/purchase-orders/${record._id}/cancel`);
          message.success('Purchase Order cancelled successfully');
          fetchPOs();
        } catch (error) {
          console.error('Failed to cancel PO:', error);
          message.error(error.response?.data?.message || 'Failed to cancel Purchase Order');
        }
      }
    });
  };

  const handleConvertToGRN = (record) => {
    confirm({
      title: 'Convert to GRN?',
      icon: <SyncOutlined />,
      content: `This will create a GRN with ordered quantities from ${record.poNumber}. You can update received/accepted quantities during GRN inspection.`,
      okText: 'Convert',
      cancelText: 'Cancel',
      async onOk() {
        try {
          const response = await api.post(`/purchase-orders/${record._id}/convert-to-grn`);
          message.success('Purchase Order converted to GRN successfully');
          navigate(`/grn/view/${response.data.grn._id}`);
        } catch (error) {
          console.error('Failed to convert PO to GRN:', error);
          message.error(error.response?.data?.message || 'Failed to convert to GRN');
        }
      }
    });
  };

  const handleDelete = (record) => {
    confirm({
      title: 'Delete Purchase Order?',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete PO ${record.poNumber}?`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await api.delete(`/purchase-orders/${record._id}`);
          message.success('Purchase Order deleted successfully');
          fetchPOs();
        } catch (error) {
          console.error('Failed to delete PO:', error);
          message.error(error.response?.data?.message || 'Failed to delete Purchase Order');
        }
      }
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      approved: 'processing',
      sent: 'warning',
      completed: 'success',
      cancelled: 'error',
      converted: 'cyan'
    };
    return colors[status] || 'default';
  };

  const getActionItems = (record) => {
    const items = [
      {
        key: 'view',
        label: 'View',
        icon: <EyeOutlined />,
        onClick: () => navigate(`/purchase-orders/view/${record._id}`)
      }
    ];

    if (record.status === 'draft') {
      items.push({
        key: 'edit',
        label: 'Edit',
        icon: <EditOutlined />,
        onClick: () => navigate(`/purchase-orders/edit/${record._id}`)
      });
      items.push({
        key: 'approve',
        label: 'Approve',
        icon: <CheckCircleOutlined />,
        onClick: () => handleApprove(record._id)
      });
      if (isAdmin) {
        items.push({
          key: 'delete',
          label: 'Delete',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record)
        });
      }
    }

    if (record.status === 'approved') {
      if (!record.convertedToGRN) {
        items.push({
          key: 'convert',
          label: 'Convert to GRN',
          icon: <SyncOutlined />,
          onClick: () => handleConvertToGRN(record)
        });
      }
      items.push({
        key: 'cancel',
        label: 'Cancel',
        icon: <CloseCircleOutlined />,
        danger: true,
        onClick: () => handleCancel(record)
      });
    }

    if (record.status === 'sent') {
      items.push({
        key: 'complete',
        label: 'Mark as Completed',
        icon: <CheckCircleOutlined />,
        onClick: () => handleComplete(record._id)
      });
      if (!record.convertedToGRN) {
        items.push({
          key: 'convert',
          label: 'Convert to GRN',
          icon: <SyncOutlined />,
          onClick: () => handleConvertToGRN(record)
        });
      }
      items.push({
        key: 'cancel',
        label: 'Cancel',
        icon: <CloseCircleOutlined />,
        danger: true,
        onClick: () => handleCancel(record)
      });
    }

    if ((record.status === 'completed' || record.status === 'converted') && record.grn) {
      items.push({
        key: 'viewGRN',
        label: 'View GRN',
        icon: <FileTextOutlined />,
        onClick: () => navigate(`/grn/view/${record.grn._id}`)
      });
    }

    return items;
  };

  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      width: 150
    },
    {
      title: 'Supplier',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      width: 200
    },
    {
      title: 'PO Date',
      dataIndex: 'poDate',
      key: 'poDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Expected Delivery',
      dataIndex: 'expectedDeliveryDate',
      key: 'expectedDeliveryDate',
      width: 140,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (value) => `Rs. ${value?.toLocaleString()}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'GRN Status',
      dataIndex: 'convertedToGRN',
      key: 'convertedToGRN',
      width: 120,
      render: (converted, record) => (
        converted ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Converted
          </Tag>
        ) : (
          <Tag color="default">Pending</Tag>
        )
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown menu={{ items: getActionItems(record) }} trigger={['click']}>
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  return (
    <div>
      <Card
        title="Purchase Order Management"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/purchase-orders/new')}
          >
            New Purchase Order
          </Button>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search PO Number or Supplier"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="draft">Draft</Option>
              <Option value="approved">Approved</Option>
              <Option value="sent">Sent</Option>
              <Option value="completed">Completed</Option>
              <Option value="converted">Converted to GRN</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Supplier"
              style={{ width: '100%' }}
              value={supplierFilter}
              onChange={setSupplierFilter}
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {suppliers.map((s) => (
                <Option key={s._id} value={s._id}>{s.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="GRN Status"
              style={{ width: '100%' }}
              value={convertedFilter}
              onChange={setConvertedFilter}
              allowClear
            >
              <Option value="true">Converted</Option>
              <Option value="false">Pending</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              format="DD/MM/YYYY"
            />
          </Col>
        </Row>

        <Row style={{ marginBottom: 16 }}>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Search
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={pos}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} Purchase Orders`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}

export default PurchaseOrderManagement;

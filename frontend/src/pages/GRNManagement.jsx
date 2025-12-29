import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Card, Input, Select, Row, Col, DatePicker, message, Badge } from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExperimentOutlined,
  InboxOutlined
} from '@ant-design/icons';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

function GRNManagement() {
  const [grns, setGRNs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchCustomers();
    fetchGRNs();
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

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      if (Array.isArray(response.data)) {
        setCustomers(response.data);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const fetchGRNs = async () => {
    setLoading(true);
    try {
      let url = '/grn?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (supplierFilter) url += `supplier=${supplierFilter}&`;
      if (customerFilter) url += `customer=${customerFilter}&`;
      if (searchText) url += `search=${searchText}&`;
      if (dateRange && dateRange[0] && dateRange[1]) {
        url += `startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}&`;
      }

      const response = await api.get(url);
      setGRNs(response.data);
    } catch (error) {
      console.error('Failed to load GRNs:', error);
      message.error('Failed to load GRN data');
    }
    setLoading(false);
  };

  const handleSearch = () => {
    fetchGRNs();
  };

  const handleInspect = async (id) => {
    try {
      navigate(`/grn/inspect/${id}`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/grn/${id}/approve`);
      message.success('GRN approved successfully');
      fetchGRNs();
    } catch (error) {
      console.error('Failed to approve GRN:', error);
      message.error(error.response?.data?.message || 'Failed to approve GRN');
    }
  };

  const handleUpdateStock = async (id) => {
    try {
      await api.post(`/grn/${id}/update-stock`);
      message.success('Stock updated successfully from GRN');
      fetchGRNs();
    } catch (error) {
      console.error('Failed to update stock:', error);
      message.error(error.response?.data?.message || 'Failed to update stock');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      inspected: 'blue',
      approved: 'cyan',
      completed: 'green',
      rejected: 'red'
    };
    return colors[status] || 'default';
  };

  const getQualityColor = (status) => {
    const colors = {
      pending: 'default',
      passed: 'green',
      failed: 'red',
      partial: 'orange'
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'GRN Number',
      dataIndex: 'grnNumber',
      key: 'grnNumber',
      fixed: 'left',
      width: 150,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.purchaseOrder?.poNumber && (
            <div style={{ fontSize: 12, color: '#999' }}>
              PO: {record.purchaseOrder.poNumber}
            </div>
          )}
        </div>
      ),
      sorter: (a, b) => a.grnNumber.localeCompare(b.grnNumber)
    },
    {
      title: 'Supplier',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      width: 150
    },
    {
      title: 'Customer',
      dataIndex: ['customer', 'name'],
      key: 'customer',
      width: 150,
      render: (name) => name || '-'
    },
    {
      title: 'GRN Date',
      dataIndex: 'grnDate',
      key: 'grnDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a, b) => new Date(a.grnDate) - new Date(b.grnDate)
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'itemCount',
      width: 80,
      align: 'center',
      render: (items) => (
        <Badge 
          count={items?.length || 0} 
          showZero 
          style={{ backgroundColor: '#52c41a' }}
        />
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={
          status === 'completed' ? <CheckCircleOutlined /> :
          status === 'rejected' ? <CloseCircleOutlined /> :
          status === 'approved' ? <CheckCircleOutlined /> :
          status === 'inspected' ? <ExperimentOutlined /> :
          <SyncOutlined spin />
        }>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Draft', value: 'draft' },
        { text: 'Inspected', value: 'inspected' },
        { text: 'Approved', value: 'approved' },
        { text: 'Completed', value: 'completed' },
        { text: 'Rejected', value: 'rejected' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Quality',
      dataIndex: 'qualityStatus',
      key: 'qualityStatus',
      width: 100,
      render: (status) => (
        <Tag color={getQualityColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Total Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 130,
      align: 'right',
      render: (value) => `Rs. ${(value || 0).toLocaleString()}`,
      sorter: (a, b) => (a.totalValue || 0) - (b.totalValue || 0)
    },
    {
      title: 'Stock Updated',
      dataIndex: 'stockUpdated',
      key: 'stockUpdated',
      width: 120,
      align: 'center',
      render: (updated) => (
        <Tag color={updated ? 'green' : 'orange'} icon={updated ? <CheckCircleOutlined /> : <InboxOutlined />}>
          {updated ? 'Yes' : 'No'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 280,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/grn/view/${record._id}`)}
          >
            View
          </Button>
          
          {record.status === 'draft' && (
            <Button 
              size="small" 
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={() => handleInspect(record._id)}
            >
              Inspect
            </Button>
          )}
          
          {record.status === 'inspected' && (
            <Button 
              size="small" 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record._id)}
            >
              Approve
            </Button>
          )}
          
          {record.status === 'approved' && !record.stockUpdated && (
            <Button 
              size="small" 
              type="primary"
              icon={<InboxOutlined />}
              onClick={() => handleUpdateStock(record._id)}
            >
              Update Stock
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Goods Receipt Note (GRN)</h2>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/grn/new')}
          >
            Create GRN
          </Button>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={5}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Search</div>
            <Input
              placeholder="Search by GRN, PO, Supplier, Customer..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Supplier</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select supplier"
              allowClear
              showSearch
              value={supplierFilter}
              onChange={setSupplierFilter}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {suppliers.map(supplier => (
                <Option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Customer</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select customer"
              allowClear
              showSearch
              value={customerFilter}
              onChange={setCustomerFilter}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {customers.map(customer => (
                <Option key={customer._id} value={customer._id}>
                  {customer.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Status</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select status"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="draft">Draft</Option>
              <Option value="inspected">Inspected</Option>
              <Option value="approved">Approved</Option>
              <Option value="completed">Completed</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Date Range</div>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              format="DD/MM/YYYY"
            />
          </Col>
          <Col xs={24} sm={12} md={2}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: 'transparent' }}>.</div>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{ width: '100%' }}
            >
              Search
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={grns}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} GRNs`
          }}
        />
      </Card>
    </div>
  );
}

export default GRNManagement;
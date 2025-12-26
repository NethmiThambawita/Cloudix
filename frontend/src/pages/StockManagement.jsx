import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Card, Input, Select, Row, Col, Badge, Modal, Form, InputNumber, message } from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined,
  WarningOutlined,
  EditOutlined,
  SwapOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import api from '../api/axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const { Option } = Select;

function StockManagement() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for filter from URL params
    const filter = searchParams.get('filter');
    if (filter === 'low') {
      setStockFilter('low');
    } else if (filter === 'reorder') {
      setStockFilter('reorder');
    }
    fetchStocks();
  }, [searchParams]);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      let url = '/stock?';
      if (locationFilter) url += `location=${locationFilter}&`;
      if (stockFilter === 'low') url += `lowStock=true&`;
      if (stockFilter === 'reorder') url += `needsReorder=true&`;
      if (searchText) url += `search=${searchText}&`;

      const response = await api.get(url);
      setStocks(response.data);
    } catch (error) {
      console.error('Failed to load stocks:', error);
      message.error('Failed to load stock data');
    }
    setLoading(false);
  };

  const handleSearch = () => {
    fetchStocks();
  };

  const handleAdjustStock = (record) => {
    setSelectedStock(record);
    setAdjustModalVisible(true);
    form.resetFields();
  };

  const handleAdjustSubmit = async (values) => {
    try {
      if (!selectedStock?.product?._id) {
        message.error('Invalid stock item selected');
        return;
      }

      await api.post('/stock/adjust', {
        productId: selectedStock.product._id,
        quantity: values.type === 'damage' || values.type === 'loss' ? -Math.abs(values.quantity) : values.quantity,
        type: values.type,
        reason: values.reason,
        notes: values.notes
      });
      message.success('Stock adjusted successfully');
      setAdjustModalVisible(false);
      fetchStocks();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      message.error('Failed to adjust stock');
    }
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: ['product', 'name'],
      key: 'product',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name || 'N/A'}</div>
          {record.product?.category && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.product.category}</div>
          )}
        </div>
      ),
      sorter: (a, b) => {
        const nameA = a.product?.name || '';
        const nameB = b.product?.name || '';
        return nameA.localeCompare(nameB);
      }
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      filters: Array.from(new Set(stocks.map(s => s.location))).map(loc => ({
        text: loc,
        value: loc
      })),
      onFilter: (value, record) => record.location === value
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      render: (qty, record) => {
        const isLow = qty <= record.minLevel;
        const needsReorder = qty <= record.reorderLevel && qty > record.minLevel;
        return (
          <Badge 
            count={isLow ? 'Low' : needsReorder ? 'Reorder' : 0} 
            style={{ 
              backgroundColor: isLow ? '#f5222d' : needsReorder ? '#faad14' : '#52c41a' 
            }}
          >
            <span style={{ 
              fontWeight: 500, 
              fontSize: 16,
              color: isLow ? '#f5222d' : needsReorder ? '#faad14' : '#000'
            }}>
              {qty}
            </span>
          </Badge>
        );
      },
      sorter: (a, b) => a.quantity - b.quantity
    },
    {
      title: 'Min Level',
      dataIndex: 'minLevel',
      key: 'minLevel',
      align: 'right'
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      align: 'right'
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const isLow = record.quantity <= record.minLevel;
        const needsReorder = record.quantity <= record.reorderLevel && record.quantity > record.minLevel;
        
        if (isLow) {
          return <Tag color="red" icon={<WarningOutlined />}>LOW STOCK</Tag>;
        }
        if (needsReorder) {
          return <Tag color="orange" icon={<WarningOutlined />}>REORDER NEEDED</Tag>;
        }
        return <Tag color="green">OK</Tag>;
      }
    },
    {
      title: 'Tracking',
      key: 'tracking',
      render: (_, record) => (
        <Space size="small">
          {record.batchTracking && <Tag color="blue">Batch</Tag>}
          {record.serialTracking && <Tag color="cyan">Serial</Tag>}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/stock/edit/${record._id}`)}
          >
            Edit
          </Button>
          <Button
            size="small"
            icon={<MinusCircleOutlined />}
            onClick={() => handleAdjustStock(record)}
            disabled={!record.product}
          >
            Adjust
          </Button>
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => navigate(`/stock/transfer/${record._id}`)}
            disabled={!record.product}
          >
            Transfer
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Stock Management</h2>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/stock/new')}
          >
            Add Stock Item
          </Button>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search products..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by location"
              allowClear
              value={locationFilter}
              onChange={setLocationFilter}
            >
              {Array.from(new Set(stocks.map(s => s.location))).map(loc => (
                <Option key={loc} value={loc}>{loc}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by status"
              allowClear
              value={stockFilter}
              onChange={setStockFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="low">Low Stock</Option>
              <Option value="reorder">Needs Reorder</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
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
          dataSource={stocks}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`
          }}
        />
      </Card>

      {/* Adjust Stock Modal */}
      <Modal
        title={`Adjust Stock - ${selectedStock?.product?.name}`}
        open={adjustModalVisible}
        onCancel={() => setAdjustModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAdjustSubmit}
        >
          <Form.Item
            label="Adjustment Type"
            name="type"
            rules={[{ required: true, message: 'Please select adjustment type' }]}
          >
            <Select placeholder="Select type">
              <Option value="damage">Damage</Option>
              <Option value="loss">Loss</Option>
              <Option value="expiry">Expiry</Option>
              <Option value="adjustment">Manual Adjustment</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Quantity"
            name="quantity"
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              min={1}
              placeholder="Enter quantity"
            />
          </Form.Item>

          <Form.Item
            label="Reason"
            name="reason"
            rules={[{ required: true, message: 'Please enter reason' }]}
          >
            <Input placeholder="Enter reason for adjustment" />
          </Form.Item>

          <Form.Item
            label="Notes"
            name="notes"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Additional notes (optional)"
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ float: 'right' }}>
              <Button onClick={() => setAdjustModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Adjust Stock
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default StockManagement;
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Card, Input, Select, Row, Col, Modal, Form, InputNumber, message, Dropdown, notification } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  WarningOutlined,
  EditOutlined,
  SwapOutlined,
  MinusCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  MoreOutlined
} from '@ant-design/icons';
import api from '../api/axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

const { confirm } = Modal;

const { Option } = Select;

function StockManagement() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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
      if (categoryFilter) url += `category=${categoryFilter}&`;
      if (stockFilter === 'low') url += `lowStock=true&`;
      if (stockFilter === 'reorder') url += `needsReorder=true&`;
      if (searchText) url += `search=${searchText}&`;

      const response = await api.get(url);
      const stocksData = response.data;
      setStocks(stocksData);

      // Check for low stock items and show notification
      const lowStockItems = stocksData.filter(stock => stock.quantity <= stock.minLevel);
      const reorderItems = stocksData.filter(stock =>
        stock.quantity <= stock.reorderLevel && stock.quantity > stock.minLevel
      );

      if (lowStockItems.length > 0) {
        notification.warning({
          message: 'Low Stock Alert',
          description: `${lowStockItems.length} item(s) are below minimum stock level!`,
          duration: 6,
          placement: 'topRight'
        });
      } else if (reorderItems.length > 0) {
        notification.info({
          message: 'Reorder Alert',
          description: `${reorderItems.length} item(s) need reordering.`,
          duration: 5,
          placement: 'topRight'
        });
      }
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
      if (!selectedStock?._id) {
        message.error('Invalid stock item selected');
        return;
      }

      await api.post('/stock/adjust', {
        stockId: selectedStock._id,
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

  const handleDelete = (record) => {
    const warningMessage = record.quantity > 0
      ? `This stock item has ${record.quantity} units. Deleting will remove all stock records.`
      : '';

    confirm({
      title: 'Delete Stock Item?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Are you sure you want to delete stock for <strong>{record.product?.name}</strong>?</p>
          {warningMessage && <p style={{ color: '#ff4d4f' }}>{warningMessage}</p>}
          <p>This action cannot be undone.</p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await api.delete(`/stock/${record._id}`);
          message.success('Stock item deleted successfully');
          fetchStocks();
        } catch (error) {
          console.error('Failed to delete stock:', error);
          message.error(error.response?.data?.message || 'Failed to delete stock');
        }
      }
    });
  };

  const getActionItems = (record) => {
    const items = [
      {
        key: 'edit',
        label: 'Edit',
        icon: <EditOutlined />,
        onClick: () => navigate(`/stock/edit/${record._id}`)
      },
      {
        key: 'adjust',
        label: 'Adjust Stock',
        icon: <MinusCircleOutlined />,
        onClick: () => handleAdjustStock(record),
        disabled: !record.product
      },
      {
        key: 'transfer',
        label: 'Transfer',
        icon: <SwapOutlined />,
        onClick: () => navigate(`/stock/transfer/${record._id}`),
        disabled: !record.product
      }
    ];

    if (isAdmin) {
      items.push({
        key: 'delete',
        label: 'Delete',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record)
      });
    }

    return items;
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
          <span style={{
            fontWeight: 500,
            fontSize: 16,
            color: isLow ? '#f5222d' : needsReorder ? '#faad14' : '#000'
          }}>
            {qty}
          </span>
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
      width: 100,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionItems(record) }} trigger={['click']}>
          <Button icon={<MoreOutlined />} />
        </Dropdown>
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
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Search</div>
            <Input
              placeholder="Search by product name or category..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Location</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select location"
              allowClear
              value={locationFilter}
              onChange={setLocationFilter}
            >
              {Array.from(new Set(stocks.map(s => s.location))).map(loc => (
                <Option key={loc} value={loc}>{loc}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Category</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select category"
              allowClear
              showSearch
              value={categoryFilter}
              onChange={setCategoryFilter}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Array.from(new Set(stocks.map(s => s.product?.category).filter(Boolean))).map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>Stock Status</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select status"
              allowClear
              value={stockFilter}
              onChange={setStockFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="low">Low Stock</Option>
              <Option value="reorder">Needs Reorder</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 500, color: 'transparent' }}>.</div>
            <Space style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                style={{ flex: 1 }}
              >
                Search
              </Button>
              <Button
                onClick={() => {
                  setSearchText('');
                  setLocationFilter('');
                  setCategoryFilter('');
                  setStockFilter('');
                  fetchStocks();
                }}
              >
                Clear
              </Button>
            </Space>
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
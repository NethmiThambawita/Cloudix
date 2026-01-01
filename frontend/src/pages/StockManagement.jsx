import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Card, Input, Select, Row, Col, Modal, Form, InputNumber, Dropdown, Timeline, Descriptions } from 'antd';
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
  MoreOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import api from '../api/axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import toast, { messages } from '../utils/toast';

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
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
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
    fetchStocksAndNotify();
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
      return stocksData;
    } catch (error) {
      console.error('Failed to load stocks:', error);
      toast.error('Oops! Failed to load stock data', 'Please refresh the page or contact support if the issue persists.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchStocksAndNotify = async () => {
    const stocksData = await fetchStocks();

    // Get recent stock deductions
    let recentDeductions = [];
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const response = await api.get(`/stock/transactions?transactionType=sale&startDate=${tenMinutesAgo}`);
      recentDeductions = response.data || [];
    } catch (error) {
      console.error('Failed to check recent deductions:', error);
    }

    // Check localStorage to avoid showing the same notification
    const lastShownKey = 'lastStockDeductionNotification';
    const lastShown = localStorage.getItem(lastShownKey);
    const hasNewDeductions = recentDeductions.length > 0 &&
      (!lastShown || parseInt(lastShown) < new Date(recentDeductions[0]?.transactionDate).getTime());

    // Get low stock items
    const lowStockItems = stocksData.filter(stock => stock.quantity <= stock.minLevel);
    const reorderItems = stocksData.filter(stock =>
      stock.quantity <= stock.reorderLevel && stock.quantity > stock.minLevel
    );

    // If there are recent deductions, show combined notification
    if (hasNewDeductions) {
      // Group deductions by product
      const productMap = new Map();
      for (const transaction of recentDeductions) {
        const productId = transaction.product?._id || transaction.product;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            name: transaction.product?.name || 'Unknown Product',
            totalDeducted: 0,
            currentBalance: transaction.balanceAfter,
            invoices: [],
            isLowStock: false,
            isCritical: false
          });
        }
        const productData = productMap.get(productId);
        productData.totalDeducted += transaction.quantity;
        productData.currentBalance = transaction.balanceAfter;
        if (transaction.referenceNumber) {
          productData.invoices.push(transaction.referenceNumber);
        }
      }

      // Check which deducted items are now low stock
      productMap.forEach((productData, productId) => {
        const stockItem = stocksData.find(s => s.product?._id === productId);
        if (stockItem) {
          productData.isCritical = stockItem.quantity <= stockItem.minLevel;
          productData.isLowStock = stockItem.quantity <= stockItem.reorderLevel;
        }
      });

      // Create notification content with deductions and low stock info
      const deductionsList = Array.from(productMap.values()).slice(0, 5).map(item => {
        let statusIcon = '✅';
        let statusText = '';
        if (item.isCritical) {
          statusIcon = '🔴';
          statusText = ' - CRITICAL LOW STOCK!';
        } else if (item.isLowStock) {
          statusIcon = '🟡';
          statusText = ' - Low Stock';
        }
        return `• ${item.name}: -${item.totalDeducted} units → ${item.currentBalance} remaining ${statusIcon}${statusText}${item.invoices.length > 0 ? ` (${item.invoices.join(', ')})` : ''}`;
      }).join('\n');

      const moreText = productMap.size > 5 ? `\n...and ${productMap.size - 5} more products` : '';
      const criticalCount = Array.from(productMap.values()).filter(p => p.isCritical).length;

      toast.info(
        `📊 Stock Updated - ${productMap.size} Product${productMap.size > 1 ? 's' : ''} Sold`,
        <div style={{ whiteSpace: 'pre-line' }}>
          ✨ Recent invoice approvals have updated your inventory:\n\n
          {deductionsList}
          {moreText}
          {criticalCount > 0 && `\n\n⚠️ Important: ${criticalCount} item(s) now critically low - immediate reordering recommended!`}
          {'\n\n💡 All changes have been logged in transaction history.'}
        </div>
      );

      localStorage.setItem(lastShownKey, new Date(recentDeductions[0]?.transactionDate).getTime().toString());
    }
    // Otherwise, show separate low stock alert only if there are low stock items
    else if (lowStockItems.length > 0 || reorderItems.length > 0) {
      const allAlertItems = [...lowStockItems, ...reorderItems];

      const itemsList = allAlertItems.slice(0, 5).map(stock =>
        `• ${stock.product?.name || 'Unknown'}: ${stock.quantity} units ${stock.quantity <= stock.minLevel ? '(CRITICAL ⚠️)' : '(Low 📉)'}`
      ).join('\n');

      const moreText = allAlertItems.length > 5 ? `\n...and ${allAlertItems.length - 5} more items` : '';

      toast.warning(
        `📦 Stock Alert - ${allAlertItems.length} Item${allAlertItems.length > 1 ? 's' : ''} Need Attention`,
        <div style={{ whiteSpace: 'pre-line' }}>
          {lowStockItems.length > 0 && `🔴 ${lowStockItems.length} item(s) critically low - immediate action needed\n`}
          {reorderItems.length > 0 && `🟡 ${reorderItems.length} item(s) approaching minimum - consider reordering\n\n`}
          {itemsList}
          {moreText}
          {'\n\n💡 Tip: Click on any item to view history and reorder.'}
        </div>
      );
    }
  };

  const handleSearch = () => {
    fetchStocksAndNotify();
  };

  const handleAdjustStock = (record) => {
    setSelectedStock(record);
    setAdjustModalVisible(true);
    form.resetFields();
  };

  const handleAdjustSubmit = async (values) => {
    try {
      if (!selectedStock?._id) {
        toast.error('Oops! Invalid stock item selected', 'Please try again or refresh the page.');
        return;
      }

      await api.post('/stock/adjust', {
        stockId: selectedStock._id,
        quantity: values.type === 'damage' || values.type === 'loss' ? -Math.abs(values.quantity) : values.quantity,
        type: values.type,
        reason: values.reason,
        notes: values.notes
      });
      toast.success(
        `✨ Stock adjusted successfully!`,
        `${selectedStock.product?.name || 'Product'} inventory has been updated.`
      );
      setAdjustModalVisible(false);
      fetchStocksAndNotify();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      toast.error('Failed to adjust stock', 'Please check your input and try again.');
    }
  };

  const handleDelete = (record) => {
    const productName = record.product?.name || 'Unknown Product';
    const warningMessage = record.quantity > 0
      ? `⚠️ Warning: This stock item has ${record.quantity} units. Deleting will remove all stock records.`
      : '';

    confirm({
      title: '🗑️ Delete Stock Item?',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>Are you sure you want to delete stock for <strong>{productName}</strong>?</p>
          {warningMessage && (
            <div style={{
              padding: '12px',
              background: '#fff2e8',
              border: '1px solid #ffbb96',
              borderRadius: '4px',
              marginTop: '12px',
              marginBottom: '12px'
            }}>
              <p style={{ color: '#d4380d', margin: 0, fontWeight: 500 }}>{warningMessage}</p>
            </div>
          )}
          <p style={{ marginTop: '12px', color: '#666' }}>
            💡 This action cannot be undone. All transaction history will be preserved for audit purposes.
          </p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Keep It',
      async onOk() {
        try {
          await api.delete(`/stock/${record._id}`);
          toast.success(
            '✅ Stock Item Deleted Successfully',
            `${productName} has been removed from inventory.`
          );
          fetchStocksAndNotify();
        } catch (error) {
          console.error('Failed to delete stock:', error);

          let errorMessage = 'Please try again or contact support.';

          if (error.response?.status === 403) {
            errorMessage = `Access denied. Your role is '${user?.role}'. Only admin users can delete stock items.`;
          } else if (error.response?.status === 401) {
            errorMessage = 'You are not authenticated. Please log in again.';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }

          toast.error('Failed to Delete Stock Item', errorMessage);
        }
      }
    });
  };

  const handleViewHistory = async (record) => {
    setSelectedStock(record);
    setHistoryModalVisible(true);
    setLoadingTransactions(true);
    try {
      const response = await api.get(`/stock/transactions?productId=${record.product._id}`);
      setTransactions(response.data || []);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
      toast.error(
        'Failed to load transaction history',
        'Please refresh and try again.'
      );
      setTransactions([]);
    }
    setLoadingTransactions(false);
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      stock_in: 'green',
      stock_out: 'red',
      sale: 'blue',
      grn: 'cyan',
      transfer: 'purple',
      adjustment: 'orange',
      damage: 'red',
      loss: 'red',
      expiry: 'volcano'
    };
    return colors[type] || 'default';
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      stock_in: 'Stock In',
      stock_out: 'Stock Out',
      sale: 'Sale (Invoice)',
      grn: 'GRN',
      transfer: 'Transfer',
      adjustment: 'Adjustment',
      damage: 'Damage',
      loss: 'Loss',
      expiry: 'Expiry'
    };
    return labels[type] || type;
  };

  const getActionItems = (record) => {
    const items = [
      {
        key: 'history',
        label: 'View History',
        icon: <HistoryOutlined />,
        onClick: () => handleViewHistory(record),
        disabled: !record.product
      },
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

      {/* Transaction History Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>Transaction History - {selectedStock?.product?.name}</span>
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setTransactions([]);
        }}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            Close
          </Button>
        ]}
        width={900}
      >
        {loadingTransactions ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Space direction="vertical">
              <div className="loading-spinner" />
              <p>Loading transactions...</p>
            </Space>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p>No transaction history found for this product</p>
          </div>
        ) : (
          <>
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Product">{selectedStock?.product?.name}</Descriptions.Item>
              <Descriptions.Item label="Current Stock">{selectedStock?.quantity}</Descriptions.Item>
              <Descriptions.Item label="Location">{selectedStock?.location}</Descriptions.Item>
            </Descriptions>

            <Table
              dataSource={transactions}
              rowKey="_id"
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: 'Date',
                  dataIndex: 'transactionDate',
                  key: 'date',
                  width: 140,
                  render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
                  sorter: (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate),
                  defaultSortOrder: 'ascend'
                },
                {
                  title: 'Type',
                  dataIndex: 'transactionType',
                  key: 'type',
                  width: 120,
                  render: (type) => (
                    <Tag color={getTransactionTypeColor(type)}>
                      {getTransactionTypeLabel(type)}
                    </Tag>
                  )
                },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  width: 80,
                  align: 'right',
                  render: (qty, record) => {
                    const isDeduction = ['stock_out', 'sale', 'damage', 'loss', 'expiry'].includes(record.transactionType) ||
                                       (record.fromLocation && !record.toLocation);
                    return (
                      <span style={{
                        color: isDeduction ? '#ff4d4f' : '#52c41a',
                        fontWeight: 500
                      }}>
                        {isDeduction ? '-' : '+'}{qty}
                      </span>
                    );
                  }
                },
                {
                  title: 'Balance',
                  dataIndex: 'balanceAfter',
                  key: 'balance',
                  width: 80,
                  align: 'right',
                  render: (balance) => <span style={{ fontWeight: 500 }}>{balance}</span>
                },
                {
                  title: 'Reference',
                  dataIndex: 'referenceNumber',
                  key: 'reference',
                  width: 140,
                  render: (ref, record) => (
                    ref ? (
                      <Space direction="vertical" size={0}>
                        <span style={{ fontWeight: 500 }}>{ref}</span>
                        {record.referenceType && (
                          <Tag size="small">{record.referenceType}</Tag>
                        )}
                      </Space>
                    ) : '-'
                  )
                },
                {
                  title: 'Reason',
                  dataIndex: 'reason',
                  key: 'reason',
                  ellipsis: true,
                  render: (reason, record) => (
                    <div>
                      <div>{reason || '-'}</div>
                      {record.notes && (
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                          {record.notes}
                        </div>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
}

export default StockManagement;
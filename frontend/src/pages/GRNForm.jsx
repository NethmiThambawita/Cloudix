import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Space, message, Spin, DatePicker, Table, Row, Col } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

function GRNForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchApprovedPOs();
    fetchLocations();
  }, []);

  // ================= FETCH SUPPLIERS =================
  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      console.log('Suppliers response:', response.data);

      if (response.data?.result && Array.isArray(response.data.result)) {
        setSuppliers(response.data.result);
      } else if (Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else {
        console.error('Unexpected suppliers response:', response.data);
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      message.error('Failed to load suppliers');
      setSuppliers([]);
    }
  };

  // ================= FETCH PRODUCTS =================
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      console.log('Products response:', response.data);

      if (response.data?.result && Array.isArray(response.data.result)) {
        setProducts(response.data.result);
      } else if (response.data?.products && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        console.error('Unexpected products response:', response.data);
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      message.error('Failed to load products');
      setProducts([]);
    }
  };

  // ================= FETCH APPROVED POs =================
  const fetchApprovedPOs = async () => {
    try {
      const response = await api.get('/purchase-orders', {
        params: {
          status: 'approved',
          convertedToGRN: 'false'
        }
      });
      console.log('Purchase Orders response:', response.data);

      // Backend returns array directly, not wrapped in result object
      let pos = [];
      if (Array.isArray(response.data)) {
        pos = response.data;
      } else if (response.data?.result && Array.isArray(response.data.result)) {
        pos = response.data.result;
      }

      console.log('Available approved POs:', pos.length);

      // Filter for approved POs that haven't been converted to GRN yet (double-check)
      const availablePOs = pos.filter(po =>
        po.status === 'approved' && po.convertedToGRN !== true
      );

      console.log('Filtered POs for GRN:', availablePOs.length);
      setPurchaseOrders(availablePOs);

      if (availablePOs.length === 0) {
        message.info('No approved POs available for GRN. Please approve a purchase order first.');
      }
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
      message.error('Failed to load purchase orders: ' + (error.response?.data?.message || error.message));
      setPurchaseOrders([]);
    }
  };

  // ================= FETCH LOCATIONS =================
  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      console.log('Locations API response:', response.data);

      // Handle different response structures
      let locationData = [];
      if (Array.isArray(response.data)) {
        locationData = response.data;
      } else if (response.data?.result && Array.isArray(response.data.result)) {
        locationData = response.data.result;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        locationData = response.data.data;
      }

      // Add default locations
      const defaultLocations = [
        { _id: 'default-1', name: 'Main Warehouse' },
        { _id: 'default-2', name: 'Retail Store' },
        { _id: 'default-3', name: 'Factory' },
        { _id: 'default-4', name: 'Distribution Center' }
      ];

      // Combine default locations with custom locations from API
      const allLocations = [...defaultLocations, ...locationData];

      console.log('Locations loaded:', allLocations.length);
      setLocations(allLocations);
    } catch (error) {
      console.error('Failed to load locations:', error);
      // If API fails, still show default locations
      const defaultLocations = [
        { _id: 'default-1', name: 'Main Warehouse' },
        { _id: 'default-2', name: 'Retail Store' },
        { _id: 'default-3', name: 'Factory' },
        { _id: 'default-4', name: 'Distribution Center' }
      ];
      setLocations(defaultLocations);
    }
  };

  // ================= PO SELECTION =================
  const handlePOSelect = (poId) => {
    if (!poId) {
      // PO cleared
      setSelectedPO(null);
      setItems([]);
      form.setFieldsValue({ supplier: undefined });
      setSelectedSupplier(null);
      return;
    }

    const po = purchaseOrders.find(p => p._id === poId);
    if (!po) return;

    setSelectedPO(po);

    // Auto-populate supplier
    form.setFieldsValue({
      supplier: po.supplier?._id
    });
    setSelectedSupplier(po.supplier);

    // Auto-populate items from PO
    const poItems = po.items.map((item, index) => ({
      key: Date.now() + index,
      product: item.product?._id || item.product,
      productName: item.product?.name || 'Unknown Product',
      orderedQuantity: item.quantity,
      receivedQuantity: item.quantity, // Default to ordered quantity
      acceptedQuantity: item.quantity, // Default to ordered quantity
      unitPrice: item.unitPrice,
      batchNumber: ''
    }));
    setItems(poItems);

    message.success(`PO ${po.poNumber} loaded with ${po.items.length} items`);
  };

  // ================= SUPPLIER CHANGE =================
  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    setSelectedSupplier(supplier);
  };

  // ================= ITEMS =================
  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        product: null,
        orderedQuantity: 0,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        unitPrice: 0,
        batchNumber: ''
      }
    ]);
  };

  const removeItem = (key) => {
    setItems(items.filter(item => item.key !== key));
  };

  const updateItem = (key, field, value) => {
    setItems(items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        if (field === 'receivedQuantity') updated.acceptedQuantity = value;
        return updated;
      }
      return item;
    }));
  };

  // ================= SUBMIT =================
  const handleSubmit = async (values) => {
    if (items.length === 0) {
      message.error('Add at least one item');
      return;
    }

    setLoading(true);
    try {
      const grnData = {
        purchaseOrder: values.purchaseOrder || selectedPO?._id, // Include PO reference
        supplier: values.supplier,
        grnDate: values.grnDate.format('YYYY-MM-DD'),
        location: values.location, // Include storage location
        items: items.map(i => ({
          product: i.product,
          orderedQuantity: i.orderedQuantity,
          receivedQuantity: i.receivedQuantity,
          acceptedQuantity: i.acceptedQuantity,
          unitPrice: i.unitPrice,
          batchNumber: i.batchNumber
        })),
        notes: values.notes
      };

      await api.post('/grn', grnData);
      message.success('GRN created successfully');
      navigate('/grn');
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || 'Failed to create GRN');
    }
    setLoading(false);
  };

  // ================= GET AVAILABLE PRODUCTS =================
  const getAvailableProducts = () => {
    if (selectedPO && selectedPO.items) {
      // If PO is selected, show only products from PO
      const poProductIds = selectedPO.items.map(item =>
        item.product?._id || item.product
      );
      return products.filter(p => poProductIds.includes(p._id));
    }
    // If no PO selected, show all products
    return products;
  };

  // ================= TABLE =================
  const columns = [
    {
      title: 'Product',
      render: (_, record) => {
        const availableProducts = getAvailableProducts();
        const isFromPO = selectedPO && selectedPO.items.some(
          item => (item.product?._id || item.product) === record.product
        );

        return (
          <Select
            style={{ width: '100%' }}
            placeholder="Select product"
            value={record.product}
            onChange={(val) => updateItem(record.key, 'product', val)}
            disabled={!!selectedPO && isFromPO}
          >
            {availableProducts.map(p => (
              <Option key={p._id} value={p._id}>{p.name}</Option>
            ))}
            {selectedPO && availableProducts.length === 0 && (
              <Option disabled>No products from selected PO</Option>
            )}
          </Select>
        );
      }
    },
    {
      title: 'Ordered',
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.orderedQuantity}
          onChange={(val) => updateItem(record.key, 'orderedQuantity', val)}
        />
      )
    },
    {
      title: 'Received',
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.receivedQuantity}
          onChange={(val) => updateItem(record.key, 'receivedQuantity', val)}
        />
      )
    },
    {
      title: 'Accepted',
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.acceptedQuantity}
          onChange={(val) => updateItem(record.key, 'acceptedQuantity', val)}
        />
      )
    },
    {
      title: 'Price',
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.unitPrice}
          onChange={(val) => updateItem(record.key, 'unitPrice', val)}
        />
      )
    },
    {
      title: 'Batch',
      render: (_, record) => (
        <Input
          value={record.batchNumber}
          onChange={(e) => updateItem(record.key, 'batchNumber', e.target.value)}
        />
      )
    },
    {
      title: 'Action',
      render: (_, record) => (
        <Button danger onClick={() => removeItem(record.key)}>Delete</Button>
      )
    }
  ];

  return (
    <Spin spinning={loading}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ grnDate: dayjs() }}>
        <Card title="GRN - Goods Received Note">
          <Form.Item
            name="purchaseOrder"
            label="Purchase Order (Select Approved PO)"
            tooltip="Select an approved PO to auto-populate supplier and items"
          >
            <Select
              placeholder="Select approved purchase order"
              onChange={handlePOSelect}
              allowClear
              showSearch
              optionFilterProp="children"
              notFoundContent={
                purchaseOrders.length === 0
                  ? "No approved POs available. Approve a PO first."
                  : "No results"
              }
            >
              {purchaseOrders.map(po => (
                <Option key={po._id} value={po._id}>
                  {po.poNumber} - {po.supplier?.name} - Rs. {po.total?.toLocaleString()} ({po.items?.length} items)
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedPO && (
            <div style={{
              padding: 12,
              background: '#e6f7ff',
              borderRadius: 4,
              marginBottom: 16,
              border: '1px solid #91d5ff'
            }}>
              <strong>Selected PO:</strong> {selectedPO.poNumber} |
              <strong> Total:</strong> Rs. {selectedPO.total?.toLocaleString()} |
              <strong> Items:</strong> {selectedPO.items?.length}
            </div>
          )}

          <Form.Item name="supplier" label="Supplier" rules={[{ required: true, message: 'Please select supplier' }]}>
            <Select
              placeholder="Select supplier (auto-filled from PO)"
              onChange={handleSupplierChange}
              allowClear
              disabled={!!selectedPO}
            >
              {suppliers.map(s => (
                <Option key={s._id} value={s._id}>{s.name}</Option>
              ))}
            </Select>
          </Form.Item>

          {selectedSupplier && (
            <p><b>Phone:</b> {selectedSupplier.phone} | <b>Email:</b> {selectedSupplier.email}</p>
          )}

          <Form.Item name="grnDate" label="GRN Date" rules={[{ required: true, message: 'Please select date' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="location"
            label="Locations"
            rules={[{ required: true, message: 'Please select location' }]}
          >
            <Select
              placeholder="Select location"
              showSearch
              allowClear
              optionFilterProp="children"
              notFoundContent={
                locations.length === 0
                  ? "No locations available. Add locations first."
                  : "No results"
              }
            >
              {locations.map(loc => (
                <Option key={loc._id} value={loc.name}>
                  {loc.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Card>

        <Card title={selectedPO ? `Items (Auto-loaded from PO ${selectedPO.poNumber})` : "Items"}>
          {!selectedPO && (
            <div style={{ marginBottom: 12, padding: 8, background: '#fffbe6', borderRadius: 4 }}>
              💡 <strong>Tip:</strong> Select a Purchase Order above to auto-populate items, or add items manually below.
            </div>
          )}
          <Button onClick={addItem} block style={{ marginBottom: 12 }}>Add Item Manually</Button>
          <Table columns={columns} dataSource={items} pagination={false} rowKey="key" />
        </Card>

        <Card>
          <Form.Item name="notes">
            <TextArea />
          </Form.Item>
          <Button type="primary" htmlType="submit">Save GRN</Button>
        </Card>
      </Form>
    </Spin>
  );
}

export default GRNForm;

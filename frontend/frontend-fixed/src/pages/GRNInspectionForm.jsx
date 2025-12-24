import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Select, Button, Card, Space, message, Spin, Table, Input, Row, Col, DatePicker, Radio } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

function GRNInspectionForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [grn, setGRN] = useState(null);
  const [inspectedItems, setInspectedItems] = useState([]);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetchGRN();
  }, [id]);

  const fetchGRN = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/grn/${id}`);
      const grnData = response.data;
      
      if (grnData.status !== 'draft') {
        message.warning('This GRN has already been inspected');
        navigate(`/grn/view/${id}`);
        return;
      }

      setGRN(grnData);
      
      // Initialize inspection items
      const items = grnData.items.map((item, index) => ({
        key: index,
        _id: item._id,
        product: item.product,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: item.receivedQuantity, // Default to received
        rejectedQuantity: 0,
        rejectionReason: '',
        inspectionNotes: item.inspectionNotes || ''
      }));
      
      setInspectedItems(items);
    } catch (error) {
      console.error('Failed to load GRN:', error);
      message.error('Failed to load GRN details');
      navigate('/grn');
    }
    setLoading(false);
  };

  const updateInspectionItem = (key, field, value) => {
    setInspectedItems(items => items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate rejected quantity
        if (field === 'acceptedQuantity') {
          updated.rejectedQuantity = updated.receivedQuantity - value;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const inspectionData = {
        items: inspectedItems.map(item => ({
          acceptedQuantity: item.acceptedQuantity,
          rejectedQuantity: item.rejectedQuantity,
          rejectionReason: item.rejectionReason,
          inspectionNotes: item.inspectionNotes
        })),
        qualityStatus: values.qualityStatus,
        inspectionNotes: values.inspectionNotes
      };

      await api.post(`/grn/${id}/inspect`, inspectionData);
      message.success('GRN inspection completed successfully');
      navigate('/grn');
    } catch (error) {
      console.error('Failed to submit inspection:', error);
      message.error(error.response?.data?.message || 'Failed to submit inspection');
    }
    setLoading(false);
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: ['product', 'name'],
      key: 'product',
      width: 200
    },
    {
      title: 'Ordered',
      dataIndex: 'orderedQuantity',
      key: 'orderedQuantity',
      width: 100,
      align: 'right'
    },
    {
      title: 'Received',
      dataIndex: 'receivedQuantity',
      key: 'receivedQuantity',
      width: 100,
      align: 'right'
    },
    {
      title: 'Accepted',
      dataIndex: 'acceptedQuantity',
      key: 'acceptedQuantity',
      width: 120,
      render: (value, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          max={record.receivedQuantity}
          value={value}
          onChange={(val) => updateInspectionItem(record.key, 'acceptedQuantity', val)}
        />
      )
    },
    {
      title: 'Rejected',
      dataIndex: 'rejectedQuantity',
      key: 'rejectedQuantity',
      width: 100,
      align: 'right',
      render: (qty) => qty > 0 ? <span style={{ color: '#ff4d4f' }}>{qty}</span> : '-'
    },
    {
      title: 'Rejection Reason',
      dataIndex: 'rejectionReason',
      key: 'rejectionReason',
      width: 200,
      render: (value, record) => (
        record.rejectedQuantity > 0 ? (
          <Select
            style={{ width: '100%' }}
            placeholder="Select reason"
            value={value}
            onChange={(val) => updateInspectionItem(record.key, 'rejectionReason', val)}
          >
            <Option value="Damaged">Damaged</Option>
            <Option value="Expired">Expired</Option>
            <Option value="Wrong Item">Wrong Item</Option>
            <Option value="Poor Quality">Poor Quality</Option>
            <Option value="Defective">Defective</Option>
            <Option value="Other">Other</Option>
          </Select>
        ) : '-'
      )
    },
    {
      title: 'Inspection Notes',
      dataIndex: 'inspectionNotes',
      key: 'inspectionNotes',
      width: 200,
      render: (value, record) => (
        <TextArea
          rows={1}
          value={value}
          onChange={(e) => updateInspectionItem(record.key, 'inspectionNotes', e.target.value)}
          placeholder="Notes"
        />
      )
    }
  ];

  if (loading || !grn) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/grn')}>
          Back to GRN List
        </Button>
        <h2 style={{ margin: 0 }}>Quality Inspection - {grn.grnNumber}</h2>
      </Space>

      <Card title="GRN Details" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <p><strong>Supplier:</strong> {grn.supplier?.name}</p>
          </Col>
          <Col span={8}>
            <p><strong>GRN Date:</strong> {dayjs(grn.grnDate).format('DD/MM/YYYY')}</p>
          </Col>
          <Col span={8}>
            <p><strong>PO Number:</strong> {grn.purchaseOrder?.poNumber || '-'}</p>
          </Col>
        </Row>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          qualityStatus: 'passed'
        }}
      >
        <Card title="Inspection Details" style={{ marginBottom: 16 }}>
          <Table
            columns={columns}
            dataSource={inspectedItems}
            pagination={false}
            scroll={{ x: 1200 }}
            rowKey="key"
          />

          <div style={{ marginTop: 24 }}>
            <Form.Item
              label="Overall Quality Status"
              name="qualityStatus"
              rules={[{ required: true, message: 'Please select quality status' }]}
            >
              <Radio.Group>
                <Radio.Button value="passed">✓ Passed</Radio.Button>
                <Radio.Button value="partial">⚠ Partial</Radio.Button>
                <Radio.Button value="failed">✗ Failed</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              label="Inspection Notes"
              name="inspectionNotes"
            >
              <TextArea
                rows={3}
                placeholder="Overall inspection notes and observations"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<CheckCircleOutlined />}
                  loading={loading}
                >
                  Complete Inspection
                </Button>
                <Button onClick={() => navigate('/grn')}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </div>
        </Card>
      </Form>
    </div>
  );
}

export default GRNInspectionForm;
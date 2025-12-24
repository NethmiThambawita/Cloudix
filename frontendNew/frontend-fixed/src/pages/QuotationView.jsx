import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Select,
  Modal,
  message,
  Row,
  Col,
  Typography,
  Divider,
  Image
} from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios'; // ← FIXED: Use configured api instance
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const QuotationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchQuotation();
    fetchCompany();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const response = await api.get(`/quotations/${id}`); // ← FIXED: Removed /api prefix
      if (response.data.success) {
        setQuotation(response.data.result);
        setSelectedStatus(response.data.result.status);
      }
    } catch (error) {
      message.error('Failed to fetch quotation');
    }
  };

  const fetchCompany = async () => {
    try {
      const response = await api.get('/settings'); // ← FIXED: Removed /api prefix
      if (response.data.success) {
        setCompany(response.data.result);
      }
    } catch (error) {
      console.error('Failed to fetch company settings');
    }
  };

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.patch(`/quotations/${id}/status`, {
        status: selectedStatus
      });
      if (response.data.success) {
        message.success('Status updated successfully');
        setStatusModalVisible(false);
        fetchQuotation();
      }
    } catch (error) {
      message.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Open PDF in new tab with auth token
  const handleViewPDF = () => {
    const token = localStorage.getItem('token');
    const pdfUrl = `${api.defaults.baseURL}/quotations/${id}/pdf?token=${token}`;
    window.open(pdfUrl, '_blank');
  };

  const handleEdit = () => {
    navigate(`/quotations/edit/${id}`);
  };

  const handleConvertToInvoice = async () => {
    Modal.confirm({
      title: 'Convert to Invoice',
      content: 'Are you sure you want to convert this quotation to an invoice?',
      onOk: async () => {
        try {
          const response = await api.post(`/quotations/${id}/convert-to-invoice`);
          if (response.data.success) {
            message.success('Converted to invoice successfully');
            navigate(`/invoices/view/${response.data.result._id}`);
          }
        } catch (error) {
          message.error('Failed to convert to invoice');
        }
      }
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'blue',
      approved: 'green',
      rejected: 'red',
      expired: 'orange'
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 50
    },
    {
      title: 'Product',
      dataIndex: ['product', 'name'],
      key: 'product'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (val) => `Rs. ${val?.toLocaleString()}`,
      width: 120
    },
    {
      title: 'Discount',
      dataIndex: 'discount',
      key: 'discount',
      render: (val) => `Rs. ${val?.toLocaleString()}`,
      width: 100
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (val) => `Rs. ${val?.toLocaleString()}`,
      width: 120
    }
  ];

  if (!quotation) {
    return <Card loading={true} />;
  }

  return (
    <div className="quotation-view">
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space style={{ float: 'right' }}>
              <Button icon={<EditOutlined />} onClick={handleEdit}>
                Edit
              </Button>
              <Button 
                icon={<FilePdfOutlined />} 
                type="primary" 
                onClick={handleViewPDF}
              >
                View PDF
              </Button>
              <Button 
                onClick={() => setStatusModalVisible(true)}
              >
                Update Status
              </Button>
              {quotation.status === 'approved' && !quotation.convertedToInvoice && (
                <Button type="primary" onClick={handleConvertToInvoice}>
                  Convert to Invoice
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <Divider />

        {/* Company Header */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            {company?.logo && (
              <Image src={company.logoUrl} alt="Company Logo" width={150} preview={false} />
            )}
            <Title level={4}>{company?.name || 'Company Name'}</Title>
            <Text>{company?.address}</Text><br />
            <Text>{company?.phone}</Text><br />
            <Text>{company?.email}</Text><br />
            {company?.taxNumber && <Text>Tax No: {company.taxNumber}</Text>}
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Title level={2}>QUOTATION</Title>
            <Text strong>Quotation No: </Text>
            <Text>{quotation.quotationNumber}</Text><br />
            <Text strong>Status: </Text>
            <Tag color={getStatusColor(quotation.status)}>
              {quotation.status?.toUpperCase()}
            </Tag><br />
            <Text strong>Date: </Text>
            <Text>{moment(quotation.date).format('DD/MM/YYYY')}</Text><br />
            {quotation.validUntil && (
              <>
                <Text strong>Valid Until: </Text>
                <Text>{moment(quotation.validUntil).format('DD/MM/YYYY')}</Text>
              </>
            )}
          </Col>
        </Row>

        <Divider />

        {/* Customer Details */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Title level={5}>Bill To:</Title>
            <Text strong>{quotation.customer?.name}</Text><br />
            {quotation.customer?.address && <Text>{quotation.customer.address}</Text>}<br />
            {quotation.customer?.city && <Text>{quotation.customer.city}</Text>}<br />
            {quotation.customer?.phone && <Text>Tel: {quotation.customer.phone}</Text>}<br />
            {quotation.customer?.email && <Text>Email: {quotation.customer.email}</Text>}
          </Col>
        </Row>

        <Divider />

        {/* Items Table */}
        <Table
          columns={columns}
          dataSource={quotation.items}
          pagination={false}
          rowKey={(record, index) => index}
          summary={() => (
            <>
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={7} align="right">
                  <Text strong>Subtotal:</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Text strong>Rs. {quotation.subtotal?.toLocaleString()}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
              {quotation.discount > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell colSpan={7} align="right">
                    <Text strong>Discount:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell>
                    <Text strong>Rs. {quotation.discount?.toLocaleString()}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              {quotation.taxAmount > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell colSpan={7} align="right">
                    <Text strong>Tax:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell>
                    <Text strong>Rs. {quotation.taxAmount?.toLocaleString()}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={7} align="right">
                  <Title level={5}>Total:</Title>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Title level={5}>Rs. {quotation.total?.toLocaleString()}</Title>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </>
          )}
        />

        <Divider />

        {/* Notes and Terms */}
        {quotation.notes && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Notes:</Text>
            <div style={{ whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
          </div>
        )}

        {quotation.terms && (
          <div>
            <Text strong>Terms & Conditions:</Text>
            <div style={{ whiteSpace: 'pre-wrap' }}>{quotation.terms}</div>
          </div>
        )}
      </Card>

      {/* Status Update Modal */}
      <Modal
        title="Update Quotation Status"
        open={statusModalVisible}
        onOk={handleStatusUpdate}
        onCancel={() => setStatusModalVisible(false)}
        confirmLoading={loading}
      >
        <Select
          value={selectedStatus}
          onChange={setSelectedStatus}
          style={{ width: '100%' }}
        >
          <Option value="draft">Draft</Option>
          <Option value="sent">Sent</Option>
          <Option value="approved">Approved</Option>
          <Option value="rejected">Rejected</Option>
          <Option value="expired">Expired</Option>
        </Select>
      </Modal>
    </div>
  );
};

export default QuotationView;
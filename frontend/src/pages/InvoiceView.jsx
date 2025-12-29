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
  EditOutlined,
  FilePdfOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios'; // ✅ FIXED: Use configured api
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchInvoice();
    fetchCompany();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await api.get(`/invoices/${id}`); // ✅ FIXED
      if (response.data.success) {
        setInvoice(response.data.result);
        setSelectedStatus(response.data.result.status);
      }
    } catch (error) {
      message.error('Failed to fetch invoice');
    }
  };

  const fetchCompany = async () => {
    try {
      const response = await api.get('/settings'); // ✅ FIXED
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
      const response = await api.patch(`/invoices/${id}/status`, {
        status: selectedStatus
      });
      if (response.data.success) {
        message.success('Status updated successfully');
        setStatusModalVisible(false);
        fetchInvoice();
      }
    } catch (error) {
      message.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Fetch PDF with proper auth and open in new tab
  const handleViewPDF = async () => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob'
      });

      // Create blob URL and open in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up the URL after opening
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      message.error('Failed to generate PDF');
      console.error('PDF error:', error);
    }
  };

  // Print PDF directly
  const handlePrint = async () => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob'
      });

      // Create blob URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Open in new window and trigger print
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      // Clean up the URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      message.error('Failed to print invoice');
      console.error('Print error:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'processing',
      paid: 'success',
      partial: 'warning',
      overdue: 'error',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (amount) => {
    const symbol = company?.currencySymbol || 'Rs.';
    return `${symbol} ${amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 50
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text, record) => text || record.product?.name
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
      width: 120,
      render: (price) => formatCurrency(price)
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: (total) => formatCurrency(total)
    }
  ];

  if (!invoice) return <Card loading={true} />;

  return (
    <div style={{ padding: '24px' }}>
      {/* Action Buttons */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            icon={<FilePdfOutlined />}
            type="primary"
            onClick={handleViewPDF}
          >
            View PDF
          </Button>
          <Button
            icon={<PrinterOutlined />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            onClick={() => setStatusModalVisible(true)}
          >
            Update Status
          </Button>
          <Button 
            icon={<EditOutlined />}
            onClick={() => navigate(`/invoices/edit/${id}`)}
          >
            Edit
          </Button>
        </Space>
      </div>

      {/* Invoice Document */}
      <Card>
        {/* Header */}
        <Row gutter={16} style={{ marginBottom: 32 }}>
          <Col span={12}>
            {company?.logoUrl && (
              <Image
                src={company.logoUrl}
                alt="Company Logo"
                preview={false}
                style={{ maxWidth: 150, maxHeight: 100 }}
              />
            )}
            <div style={{ marginTop: 16 }}>
              <Title level={4} style={{ margin: 0 }}>{company?.name || 'Company Name'}</Title>
              <Text>{company?.address}</Text><br/>
              <Text>{company?.phone}</Text><br/>
              <Text>{company?.email}</Text>
              {company?.taxNumber && (
                <>
                  <br/>
                  <Text>Tax No: {company.taxNumber}</Text>
                </>
              )}
            </div>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>INVOICE</Title>
            <div style={{ marginTop: 16 }}>
              <Text strong>Invoice #: </Text><Text>{invoice.invoiceNumber}</Text><br/>
              <Text strong>Date: </Text><Text>{moment(invoice.date).format('DD/MM/YYYY')}</Text><br/>
              <Text strong>Due Date: </Text>
              <Text>{invoice.dueDate ? moment(invoice.dueDate).format('DD/MM/YYYY') : 'N/A'}</Text><br/>
              <Text strong>Status: </Text>
              <Tag color={getStatusColor(invoice.status)}>
                {invoice.status.toUpperCase()}
              </Tag>
            </div>
          </Col>
        </Row>

        <Divider />

        {/* Customer Details */}
        <Row gutter={16} style={{ marginBottom: 32 }}>
          <Col span={12}>
            <Title level={5}>Bill To:</Title>
            <Text strong>{invoice.customer?.name}</Text><br/>
            {invoice.customer?.email && <><Text>{invoice.customer.email}</Text><br/></>}
            {invoice.customer?.phone && <><Text>{invoice.customer.phone}</Text><br/></>}
            {invoice.customer?.address && <Text>{invoice.customer.address}</Text>}
          </Col>
        </Row>

        <Divider />

        {/* Items Table */}
        <Table
          columns={columns}
          dataSource={invoice.items}
          pagination={false}
          rowKey={(record, index) => index}
          summary={() => (
            <>
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={5} align="right">
                  <Text strong>Subtotal:</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Text strong>{formatCurrency(invoice.subtotal)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
              {invoice.discount > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell colSpan={5} align="right">
                    <Text strong>Discount:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell>
                    <Text strong>{formatCurrency(invoice.discount)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              {invoice.taxAmount > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell colSpan={5} align="right">
                    <Text strong>Tax:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell>
                    <Text strong>{formatCurrency(invoice.taxAmount)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={5} align="right">
                  <Title level={5}>Total:</Title>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Title level={5}>{formatCurrency(invoice.total)}</Title>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </>
          )}
        />

        <Divider />

        {/* Notes and Terms */}
        {invoice.notes && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Notes:</Text>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{invoice.notes}</div>
          </div>
        )}

        {invoice.terms && (
          <div>
            <Text strong>Terms & Conditions:</Text>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{invoice.terms}</div>
          </div>
        )}
      </Card>

      {/* Status Update Modal */}
      <Modal
        title="Update Invoice Status"
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
          <Option value="paid">Paid</Option>
          <Option value="partial">Partial Payment</Option>
          <Option value="overdue">Overdue</Option>
          <Option value="cancelled">Cancelled</Option>
        </Select>
      </Modal>
    </div>
  );
};

export default InvoiceView;
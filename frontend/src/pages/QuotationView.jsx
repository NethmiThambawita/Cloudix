import React, { useState, useEffect, useRef } from 'react';
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
} from 'antd';
import {
  EditOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
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

  const printRef = useRef();

  useEffect(() => {
    fetchQuotation();
    fetchCompany();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const response = await api.get(`/quotations/${id}`);
      if (response.data.success) {
        setQuotation(response.data.result);
        setSelectedStatus(response.data.result.status);
      }
    } catch {
      message.error('Failed to fetch quotation');
    }
  };

  const fetchCompany = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success) {
        setCompany(response.data.result);
      }
    } catch {
      message.error('Failed to load company details');
    }
  };

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.patch(`/quotations/${id}/status`, {
        status: selectedStatus,
      });
      if (response.data.success) {
        message.success('Status updated');
        setStatusModalVisible(false);
        fetchQuotation();
      }
    } catch {
      message.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = () => {
    const token = localStorage.getItem('token');
    window.open(`${api.defaults.baseURL}/quotations/${id}/pdf?token=${token}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = [
    { title: '#', render: (_, __, i) => i + 1, width: 50 },
    { title: 'Product', dataIndex: ['product', 'name'] },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Qty', dataIndex: 'quantity', width: 80 },
    { title: 'Unit Price', dataIndex: 'unitPrice', render: (v) => `Rs. ${v}` },
    { title: 'Discount', dataIndex: 'discount', render: (v) => `Rs. ${v}` },
    { title: 'Total', dataIndex: 'total', render: (v) => `Rs. ${v}` },
  ];

  if (!quotation) return <Card loading />;

  return (
    <div>

      {/* ====== PRINT STYLES ====== */}
      <style>
        {`
          @media print {
            /* Hide buttons and modal on print */
            button, .ant-space, .ant-btn {
              display: none !important;
            }

            /* Adjust card margin and width for print */
            .ant-card {
              box-shadow: none !important;
              border: none !important;
            }

            /* Company info at top for print */
            .pdf-company-header {
              display: block !important;
              margin-bottom: 20px;
            }

            /* Hide original footer */
            .pdf-footer {
              display: none !important;
            }

            /* Table styles for print */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            th, td {
              border: 1px solid #000 !important;
              padding: 6px 8px !important;
            }

            /* Optional font size for printing */
            body {
              font-size: 12pt !important;
            }
          }

          /* Hide print-only header on screen */
          .pdf-company-header {
            display: none;
          }
        `}
      </style>

      <Card ref={printRef}>

        {/* Action Buttons */}
        <Row justify="end" style={{ marginBottom: 16 }}>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/quotations/edit/${id}`)}>Edit</Button>
            <Button icon={<FilePdfOutlined />} type="primary" onClick={handleViewPDF}>PDF</Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
            <Button onClick={() => setStatusModalVisible(true)}>Update Status</Button>
          </Space>
        </Row>

        <Divider />

        {/* ===== CENTERED QUOTATION HEADER (Print Friendly) ===== */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title level={1} style={{ color: '#1890ff', fontWeight: 'bold', marginBottom: 10 }}>
            QUOTATION
          </Title>
          <Title level={3} style={{ color: '#001529', fontWeight: '600', marginBottom: 20 }}>
            {company?.name}
          </Title>
          <Text>Quotation No: {quotation.quotationNumber}</Text>
          <br />
          <Text>Date: {moment(quotation.date).format('DD/MM/YYYY')}</Text>
          <br />
          <Tag color="blue" style={{ marginTop: 10 }}>{quotation.status.toUpperCase()}</Tag>
        </div>

        <Divider />

        {/* Quotation Details */}
        <Row>
          <Col span={12}>
          </Col>
        </Row>

        <Divider />

        {/* Customer Info */}
        <Title level={5}>Bill To</Title>
        <Text strong>{quotation.customer?.name}</Text><br />
        <Text>{quotation.customer?.address}</Text><br />

        <Divider />

        {/* Items Table */}
        <Table
          columns={columns}
          dataSource={quotation.items}
          pagination={false}
          rowKey="_id"
          summary={() => (
            <>
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={6} align="right">Subtotal</Table.Summary.Cell>
                <Table.Summary.Cell>Rs. {quotation.subtotal}</Table.Summary.Cell>
              </Table.Summary.Row>
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={6} align="right"><b>Total</b></Table.Summary.Cell>
                <Table.Summary.Cell><b>Rs. {quotation.total}</b></Table.Summary.Cell>
              </Table.Summary.Row>
            </>
          )}
        />

        {/* Notes */}
        {quotation.notes && (
          <>
            <Divider />
            <Text strong>Notes</Text>
            <div>{quotation.notes}</div>
          </>
        )}

        {/* ===== Print-only Company Header (now at bottom) ===== */}
        <div className="pdf-company-header">
          <Divider />
          <Row>
            <Col span={12}>
             <Text strong>{company?.name}</Text><br />
              <Text>{company?.address}</Text><br />
              <Text>Tel: {company?.phone}</Text><br />
              {company?.taxNumber && <Text>Tax No: {company.taxNumber}</Text>}
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Text type="secondary">System generated document</Text>
            </Col>
          </Row>
        </div>

        {/* Terms & Conditions - CENTERED AT BOTTOM */}
        {quotation.terms && (
          <>
            <Divider />
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '15px' }}>Terms & Conditions</Text>
              <div style={{ 
                textAlign: 'center',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.6',
                color: '#333'
              }}>
                {quotation.terms}
              </div>
            </div>
          </>
        )}

        {/* Original Footer (hidden in print) */}
        <div className="pdf-footer">
          <Row>
            <Col span={12}>
              
              <Text>{company?.address}</Text><br />
              <Text>Tel: {company?.phone}</Text><br />
              {company?.taxNumber && <Text>Tax No: {company.taxNumber}</Text>}
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Text type="secondary">System generated document</Text>
            </Col>
          </Row>
        </div>

      </Card>

      {/* Status Modal */}
      <Modal
        title="Update Status"
        open={statusModalVisible}
        onOk={handleStatusUpdate}
        confirmLoading={loading}
        onCancel={() => setStatusModalVisible(false)}
      >
        <Select value={selectedStatus} onChange={setSelectedStatus} style={{ width: '100%' }}>
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

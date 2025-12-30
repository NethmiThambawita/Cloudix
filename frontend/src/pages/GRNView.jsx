import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Button, Space, Tag, message, Spin, Divider, Row, Col, Statistic } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, FilePdfOutlined, CheckCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios';
import dayjs from 'dayjs';

function GRNView() {
  const [grn, setGRN] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchGRN();
    fetchPayments();
  }, [id]);

  const fetchGRN = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/grn/${id}`);
      setGRN(response.data);
    } catch (error) {
      console.error('Failed to load GRN:', error);
      message.error('Failed to load GRN details');
    }
    setLoading(false);
  };

  const fetchPayments = async () => {
    try {
      const response = await api.get(`/supplier-payments/by-grn/${id}`);
      setPayments(response.data.result?.payments || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
      // Don't show error message if it's just a 404 (no payments yet)
      if (error.response?.status !== 404) {
        message.error('Failed to load payment information');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      message.loading('Generating PDF...', 0);
      const response = await api.get(`/grn/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GRN-${grn.grnNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.destroy();
      message.success('PDF downloaded successfully');
    } catch (error) {
      message.destroy();
      console.error('Failed to download PDF:', error);
      message.error('Failed to generate PDF. Using browser print instead.');
      handlePrint();
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

  const getPaymentStatusColor = (status) => {
    const colors = {
      unpaid: 'red',
      partial: 'orange',
      paid: 'green'
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const itemColumns = [
    {
      title: 'Product',
      dataIndex: ['product', 'name'],
      key: 'product'
    },
    {
      title: 'Ordered Qty',
      dataIndex: 'orderedQuantity',
      key: 'orderedQuantity',
      align: 'right'
    },
    {
      title: 'Received Qty',
      dataIndex: 'receivedQuantity',
      key: 'receivedQuantity',
      align: 'right'
    },
    {
      title: 'Accepted Qty',
      dataIndex: 'acceptedQuantity',
      key: 'acceptedQuantity',
      align: 'right',
      render: (qty) => <strong style={{ color: '#52c41a' }}>{qty}</strong>
    },
    {
      title: 'Rejected Qty',
      dataIndex: 'rejectedQuantity',
      key: 'rejectedQuantity',
      align: 'right',
      render: (qty) => qty > 0 ? <span style={{ color: '#ff4d4f' }}>{qty}</span> : '-'
    },
    {
      title: 'Short Qty',
      dataIndex: 'shortQuantity',
      key: 'shortQuantity',
      align: 'right',
      render: (qty) => qty > 0 ? <span style={{ color: '#faad14' }}>{qty}</span> : '-'
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      render: (price) => `Rs. ${price?.toLocaleString()}`
    },
    {
      title: 'Total',
      key: 'total',
      align: 'right',
      render: (_, record) => `Rs. ${(record.acceptedQuantity * (record.unitPrice || 0)).toLocaleString()}`
    },
    {
      title: 'Batch #',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      render: (batch) => batch || '-'
    }
  ];

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  if (!grn) {
    return <div>GRN not found</div>;
  }

  return (
    <div className="grn-view">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .grn-view { padding: 20px; }
        }
      `}</style>

      <div className="no-print">
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/grn')}>
            Back to GRN List
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={handleDownloadPDF} type="primary">
            Download PDF
          </Button>
        </Space>
      </div>

      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>Goods Receipt Note</h1>
          <h2 style={{ margin: 0, color: '#1890ff' }}>{grn.grnNumber}</h2>
        </div>

        <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }}>
          <Descriptions.Item label="GRN Date">
            {dayjs(grn.grnDate).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(grn.status)} icon={grn.status === 'completed' ? <CheckCircleOutlined /> : null}>
              {grn.status.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Supplier">
            {grn.supplier?.name}
          </Descriptions.Item>
          <Descriptions.Item label="Quality Status">
            <Tag color={getQualityColor(grn.qualityStatus)}>
              {grn.qualityStatus.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Location">
            {grn.location}
          </Descriptions.Item>
          <Descriptions.Item label="Stock Updated">
            <Tag color={grn.stockUpdated ? 'green' : 'orange'}>
              {grn.stockUpdated ? 'Yes' : 'No'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {grn.purchaseOrder?.poNumber && (
          <>
            <h3>Purchase Order Details</h3>
            <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="PO Number">
                {grn.purchaseOrder.poNumber}
              </Descriptions.Item>
              <Descriptions.Item label="PO Date">
                {grn.purchaseOrder.poDate ? dayjs(grn.purchaseOrder.poDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}

        {grn.deliveryNote?.number && (
          <>
            <h3>Delivery Note Details</h3>
            <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="DN Number">
                {grn.deliveryNote.number}
              </Descriptions.Item>
              <Descriptions.Item label="DN Date">
                {grn.deliveryNote.date ? dayjs(grn.deliveryNote.date).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}

        <Divider />

        <h3>Items</h3>
        <Table
          columns={itemColumns}
          dataSource={grn.items || []}
          rowKey="_id"
          pagination={false}
          scroll={{ x: 1000 }}
          summary={(data) => {
            const totalValue = data.reduce((sum, item) => {
              return sum + (item.acceptedQuantity * (item.unitPrice || 0));
            }, 0);
            
            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={7}>
                    <strong>Total</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <strong>Rs. {totalValue.toLocaleString()}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />

        {grn.invoiceDetails?.invoiceNumber && (
          <>
            <Divider />
            <h3>Invoice Details</h3>
            <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }}>
              <Descriptions.Item label="Invoice Number">
                {grn.invoiceDetails.invoiceNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Date">
                {grn.invoiceDetails.invoiceDate ? dayjs(grn.invoiceDetails.invoiceDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Amount">
                Rs. {grn.invoiceDetails.invoiceAmount?.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Matched">
                <Tag color={grn.invoiceDetails.matched ? 'green' : 'orange'}>
                  {grn.invoiceDetails.matched ? 'Yes' : 'No'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}

        <Divider />

        <h3>Payment Information</h3>
        <div className="no-print" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Total GRN Value"
                value={grn.totalValue}
                prefix="Rs."
                precision={2}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Paid Amount"
                value={grn.paidAmount || 0}
                prefix="Rs."
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Balance Due"
                value={grn.balanceAmount !== undefined ? grn.balanceAmount : grn.totalValue}
                prefix="Rs."
                precision={2}
                valueStyle={{
                  color: (grn.balanceAmount !== undefined ? grn.balanceAmount : grn.totalValue) > 0 ? '#ff4d4f' : '#52c41a'
                }}
              />
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div>
              <strong>Payment Status: </strong>
              <Tag color={getPaymentStatusColor(grn.paymentStatus || 'unpaid')}>
                {(grn.paymentStatus || 'unpaid').toUpperCase()}
              </Tag>
            </div>

            {isAdmin && (grn.balanceAmount !== undefined ? grn.balanceAmount : grn.totalValue) > 0 && ['approved', 'completed'].includes(grn.status) && (
              <Button
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => navigate(`/supplier-payments/new?grn=${grn._id}`)}
              >
                Create Payment
              </Button>
            )}
          </div>
        </div>

        {payments && payments.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>Payment History</h4>
            <Table
              dataSource={payments}
              rowKey="_id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Payment Number',
                  dataIndex: 'paymentNumber',
                  key: 'paymentNumber',
                  render: (text, record) => (
                    <Button
                      type="link"
                      onClick={() => navigate(`/supplier-payments/view/${record._id}`)}
                      style={{ padding: 0 }}
                    >
                      {text}
                    </Button>
                  )
                },
                {
                  title: 'Amount',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (amount) => formatCurrency(amount)
                },
                {
                  title: 'Date',
                  dataIndex: 'paymentDate',
                  key: 'paymentDate',
                  render: (date) => dayjs(date).format('DD/MM/YYYY')
                },
                {
                  title: 'Method',
                  dataIndex: 'paymentMethod',
                  key: 'paymentMethod',
                  render: (method) => {
                    const labels = {
                      cash: 'Cash',
                      bank_transfer: 'Bank Transfer',
                      cheque: 'Cheque',
                      card: 'Card',
                      online: 'Online'
                    };
                    return labels[method] || method;
                  }
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status) => {
                    const colors = {
                      draft: 'default',
                      approved: 'blue',
                      paid: 'green'
                    };
                    return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
                  }
                }
              ]}
            />
          </div>
        )}

        {grn.notes && (
          <>
            <Divider />
            <h3>Notes</h3>
            <p>{grn.notes}</p>
          </>
        )}

        <Divider />

        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="Created By">
            {grn.createdBy?.firstName} {grn.createdBy?.lastName}
          </Descriptions.Item>
          {grn.inspectedBy && (
            <Descriptions.Item label="Inspected By">
              {grn.inspectedBy.firstName} {grn.inspectedBy.lastName}
            </Descriptions.Item>
          )}
          {grn.approvedBy && (
            <Descriptions.Item label="Approved By">
              {grn.approvedBy.firstName} {grn.approvedBy.lastName}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
}

export default GRNView;
import React, { useEffect, useState } from 'react';
import {
  Card, Descriptions, Table, Tag, Button, Space, message, Modal, Row, Col, Divider
} from 'antd';
import {
  EditOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  SendOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';

const { confirm } = Modal;

function PurchaseOrderView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPO();
  }, [id]);

  const fetchPO = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/purchase-orders/${id}`);
      setPO(response.data);
    } catch (error) {
      console.error('Failed to load PO:', error);
      message.error('Failed to load Purchase Order');
      navigate('/purchase-orders');
    }
    setLoading(false);
  };

  const handleApprove = () => {
    confirm({
      title: 'Approve Purchase Order?',
      icon: <CheckCircleOutlined />,
      content: `Are you sure you want to approve PO ${po?.poNumber}?`,
      okText: 'Approve',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await api.post(`/purchase-orders/${id}/approve`);
          message.success('Purchase Order approved successfully');
          fetchPO();
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to approve Purchase Order');
        }
      }
    });
  };

  const handleSend = () => {
    confirm({
      title: 'Send to Supplier?',
      icon: <SendOutlined />,
      content: `Send PO ${po?.poNumber} to supplier?`,
      okText: 'Send',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await api.post(`/purchase-orders/${id}/send`);
          message.success('Purchase Order sent to supplier successfully');
          fetchPO();
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to send Purchase Order');
        }
      }
    });
  };

  const handleComplete = () => {
    confirm({
      title: 'Mark as Completed?',
      icon: <CheckCircleOutlined />,
      content: `Mark PO ${po?.poNumber} as completed?`,
      okText: 'Complete',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await api.post(`/purchase-orders/${id}/complete`);
          message.success('Purchase Order completed successfully');
          fetchPO();
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to complete Purchase Order');
        }
      }
    });
  };

  const handleCancel = () => {
    confirm({
      title: 'Cancel Purchase Order?',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to cancel PO ${po?.poNumber}?`,
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No',
      async onOk() {
        try {
          await api.post(`/purchase-orders/${id}/cancel`);
          message.success('Purchase Order cancelled successfully');
          fetchPO();
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to cancel Purchase Order');
        }
      }
    });
  };

  const handleConvertToGRN = () => {
    confirm({
      title: 'Convert to GRN?',
      icon: <SyncOutlined />,
      content: (
        <div>
          <p>This will create a GRN with ordered quantities from {po?.poNumber}.</p>
          <p>You can update received/accepted quantities during GRN inspection.</p>
        </div>
      ),
      okText: 'Convert',
      cancelText: 'Cancel',
      async onOk() {
        try {
          const response = await api.post(`/purchase-orders/${id}/convert-to-grn`);
          message.success('Purchase Order converted to GRN successfully');
          navigate(`/grn/view/${response.data.grn._id}`);
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to convert to GRN');
        }
      }
    });
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Purchase Order?',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete PO ${po?.poNumber}?`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await api.delete(`/purchase-orders/${id}`);
          message.success('Purchase Order deleted successfully');
          navigate('/purchase-orders');
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to delete Purchase Order');
        }
      }
    });
  };

  const handlePDF = () => {
    window.open(`${api.defaults.baseURL}/purchase-orders/${id}/pdf`, '_blank');
  };

  const handlePrint = () => {
    const pdfWindow = window.open(`${api.defaults.baseURL}/purchase-orders/${id}/pdf`, '_blank');
    pdfWindow.onload = () => {
      pdfWindow.print();
    };
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      approved: 'processing',
      sent: 'warning',
      completed: 'success',
      cancelled: 'error',
      converted: 'cyan'
    };
    return colors[status] || 'default';
  };

  const getActionButtons = () => {
    if (!po) return null;

    const buttons = [];

    // Always show PDF and Print
    buttons.push(
      <Button key="pdf" icon={<FilePdfOutlined />} onClick={handlePDF}>
        Download PDF
      </Button>
    );
    buttons.push(
      <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
        Print
      </Button>
    );

    // Draft status
    if (po.status === 'draft') {
      buttons.push(
        <Button key="edit" icon={<EditOutlined />} onClick={() => navigate(`/purchase-orders/edit/${id}`)}>
          Edit
        </Button>
      );
      buttons.push(
        <Button key="approve" type="primary" icon={<CheckCircleOutlined />} onClick={handleApprove}>
          Approve
        </Button>
      );
      if (isAdmin) {
        buttons.push(
          <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDelete}>
            Delete
          </Button>
        );
      }
    }

    // Approved status
    if (po.status === 'approved') {
      if (!po.convertedToGRN) {
        buttons.push(
          <Button key="convert" type="primary" icon={<SyncOutlined />} onClick={handleConvertToGRN}>
            Convert to GRN
          </Button>
        );
      }
      buttons.push(
        <Button key="cancel" danger icon={<CloseCircleOutlined />} onClick={handleCancel}>
          Cancel
        </Button>
      );
    }

    // Sent status
    if (po.status === 'sent') {
      buttons.push(
        <Button key="complete" icon={<CheckCircleOutlined />} onClick={handleComplete}>
          Mark as Completed
        </Button>
      );
      if (!po.convertedToGRN) {
        buttons.push(
          <Button key="convert" type="primary" icon={<SyncOutlined />} onClick={handleConvertToGRN}>
            Convert to GRN
          </Button>
        );
      }
      buttons.push(
        <Button key="cancel" danger icon={<CloseCircleOutlined />} onClick={handleCancel}>
          Cancel
        </Button>
      );
    }

    // Completed or Converted status with GRN
    if ((po.status === 'completed' || po.status === 'converted') && po.grn) {
      buttons.push(
        <Button key="viewGRN" type="primary" icon={<FileTextOutlined />} onClick={() => navigate(`/grn/view/${po.grn._id}`)}>
          View GRN
        </Button>
      );
    }

    return buttons;
  };

  const itemColumns = [
    {
      title: '#',
      width: 50,
      render: (_, __, index) => index + 1
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
      align: 'right'
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      render: (value) => `Rs. ${value?.toFixed(2)}`
    },
    {
      title: 'Discount %',
      dataIndex: 'discount',
      key: 'discount',
      align: 'right',
      render: (value) => value ? `${value}%` : '-'
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value) => `Rs. ${value?.toFixed(2)}`
    }
  ];

  if (loading || !po) {
    return <Card loading={loading}>Loading...</Card>;
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <span>Purchase Order: {po.poNumber}</span>
            <Tag color={getStatusColor(po.status)}>{po.status?.toUpperCase()}</Tag>
            {po.convertedToGRN && (
              <Tag color="success" icon={<CheckCircleOutlined />}>Converted to GRN</Tag>
            )}
          </Space>
        }
        extra={<Space>{getActionButtons()}</Space>}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card title="Supplier Information" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Name">{po.supplier?.name}</Descriptions.Item>
                <Descriptions.Item label="Email">{po.supplier?.email}</Descriptions.Item>
                <Descriptions.Item label="Phone">{po.supplier?.phone}</Descriptions.Item>
                <Descriptions.Item label="Address">{po.supplier?.address}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Purchase Order Details" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="PO Date">
                  {dayjs(po.poDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Expected Delivery">
                  {dayjs(po.expectedDeliveryDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Created By">
                  {po.createdBy?.name}
                </Descriptions.Item>
                {po.approvedBy && (
                  <Descriptions.Item label="Approved By">
                    {po.approvedBy.name} on {dayjs(po.approvedAt).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                )}
                {po.sentBy && (
                  <Descriptions.Item label="Sent By">
                    {po.sentBy.name} on {dayjs(po.sentAt).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>
        </Row>

        <Divider>Items</Divider>

        <Table
          columns={itemColumns}
          dataSource={po.items}
          pagination={false}
          rowKey="_id"
          footer={() => (
            <div style={{ textAlign: 'right' }}>
              <Space direction="vertical" style={{ width: 300 }}>
                <div>
                  <strong>Subtotal:</strong>
                  <span style={{ float: 'right' }}>Rs. {po.subtotal?.toFixed(2)}</span>
                </div>
                {po.discount > 0 && (
                  <div>
                    <strong>Discount ({po.discount}%):</strong>
                    <span style={{ float: 'right' }}>Rs. {(po.subtotal * (po.discount / 100)).toFixed(2)}</span>
                  </div>
                )}
                {po.taxes && po.taxes.length > 0 && (
                  <div>
                    <strong>Tax:</strong>
                    <span style={{ float: 'right' }}>Rs. {po.taxAmount?.toFixed(2)}</span>
                    {po.taxes.map(tax => (
                      <div key={tax._id} style={{ fontSize: '12px', color: '#666' }}>
                        {tax.name} ({tax.value}%)
                      </div>
                    ))}
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ fontSize: '16px' }}>
                  <strong>TOTAL:</strong>
                  <span style={{ float: 'right' }}>Rs. {po.total?.toFixed(2)}</span>
                </div>
              </Space>
            </div>
          )}
        />

        {(po.deliveryAddress || po.paymentTerms || po.notes || po.terms) && (
          <>
            <Divider>Additional Information</Divider>
            <Row gutter={16}>
              {po.deliveryAddress && (
                <Col xs={24} md={12}>
                  <Card title="Delivery Address" size="small" style={{ marginBottom: 16 }}>
                    <p>{po.deliveryAddress}</p>
                  </Card>
                </Col>
              )}
              {po.paymentTerms && (
                <Col xs={24} md={12}>
                  <Card title="Payment Terms" size="small" style={{ marginBottom: 16 }}>
                    <p>{po.paymentTerms}</p>
                  </Card>
                </Col>
              )}
              {po.notes && (
                <Col xs={24} md={12}>
                  <Card title="Notes" size="small" style={{ marginBottom: 16 }}>
                    <p>{po.notes}</p>
                  </Card>
                </Col>
              )}
              {po.terms && (
                <Col xs={24} md={12}>
                  <Card title="Terms & Conditions" size="small" style={{ marginBottom: 16 }}>
                    <p>{po.terms}</p>
                  </Card>
                </Col>
              )}
            </Row>
          </>
        )}
      </Card>
    </div>
  );
}

export default PurchaseOrderView;

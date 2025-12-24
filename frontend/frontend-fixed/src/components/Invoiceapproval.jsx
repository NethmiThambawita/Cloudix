import React from 'react';
import { Button, Space, Popconfirm, message, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../api/axios';

/**
 * Invoice Approval Component
 * Shows approval status and action buttons for admin/manager users
 */
function InvoiceApproval({ invoice, onUpdate, currentUser }) {
  const isAdminOrManager = currentUser?.role === 'admin';
  
  const handleApproval = async (approvalStatus) => {
    try {
      const response = await api.patch(`/invoices/${invoice._id}/approval`, { approvalStatus });
      message.success(response.data.message);
      if (onUpdate) onUpdate(response.data.result);
    } catch (error) {
      const errorMsg = error.response?.data?.message || `Failed to ${approvalStatus} invoice`;
      message.error(errorMsg);
    }
  };

  // Render approval status tag
  const getStatusTag = () => {
    const { approvalStatus } = invoice;
    
    if (approvalStatus === 'approved') {
      return <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>;
    } else if (approvalStatus === 'rejected') {
      return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
    } else {
      return <Tag color="warning">Pending Approval</Tag>;
    }
  };

  return (
    <Space direction="vertical" size="small">
      {getStatusTag()}
      
      {/* Show approval info if approved/rejected */}
      {invoice.approvalStatus !== 'pending' && invoice.approvedBy && (
        <div style={{ fontSize: 12, color: '#666' }}>
          by {invoice.approvedBy.firstName} {invoice.approvedBy.lastName}
          {invoice.approvedAt && ` on ${new Date(invoice.approvedAt).toLocaleDateString()}`}
        </div>
      )}
      
      {/* Show action buttons only for admin/manager and if pending */}
      {isAdminOrManager && invoice.approvalStatus === 'pending' && (
        <Space>
          <Popconfirm
            title="Approve this invoice?"
            description="This action cannot be undone."
            onConfirm={() => handleApproval('approved')}
            okText="Approve"
            cancelText="Cancel"
          >
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckCircleOutlined />}
            >
              Approve
            </Button>
          </Popconfirm>
          
          <Popconfirm
            title="Reject this invoice?"
            description="This action cannot be undone."
            onConfirm={() => handleApproval('rejected')}
            okText="Reject"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button 
              danger 
              size="small" 
              icon={<CloseCircleOutlined />}
            >
              Reject
            </Button>
          </Popconfirm>
        </Space>
      )}
    </Space>
  );
}

export default InvoiceApproval;
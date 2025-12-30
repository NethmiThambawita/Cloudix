import { message, notification } from 'antd';

// Configure default message settings
message.config({
  top: 80,
  duration: 3,
  maxCount: 3,
});

notification.config({
  placement: 'topRight',
  top: 80,
  duration: 4.5,
  maxCount: 3,
});

// Custom styled toast messages with friendly, professional tone
export const toast = {
  // Success messages
  success: (content, description = null) => {
    if (description) {
      notification.success({
        message: content,
        description,
        style: {
          borderLeft: '4px solid #52c41a',
          boxShadow: '0 4px 12px rgba(82, 196, 26, 0.15)',
        },
      });
    } else {
      message.success({
        content,
        style: {
          marginTop: '20px',
        },
      });
    }
  },

  // Error messages
  error: (content, description = null) => {
    if (description) {
      notification.error({
        message: content,
        description,
        style: {
          borderLeft: '4px solid #ff4d4f',
          boxShadow: '0 4px 12px rgba(255, 77, 79, 0.15)',
        },
        duration: 5,
      });
    } else {
      message.error({
        content,
        style: {
          marginTop: '20px',
        },
        duration: 4,
      });
    }
  },

  // Warning messages
  warning: (content, description = null) => {
    if (description) {
      notification.warning({
        message: content,
        description,
        style: {
          borderLeft: '4px solid #faad14',
          boxShadow: '0 4px 12px rgba(250, 173, 20, 0.15)',
        },
      });
    } else {
      message.warning({
        content,
        style: {
          marginTop: '20px',
        },
      });
    }
  },

  // Info messages
  info: (content, description = null) => {
    if (description) {
      notification.info({
        message: content,
        description,
        style: {
          borderLeft: '4px solid #1890ff',
          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)',
        },
      });
    } else {
      message.info({
        content,
        style: {
          marginTop: '20px',
        },
      });
    }
  },

  // Special celebration message for important achievements
  celebrate: (content, description = null) => {
    notification.success({
      message: content,
      description: description || '🎉 Great work!',
      style: {
        borderLeft: '4px solid #52c41a',
        boxShadow: '0 6px 16px rgba(82, 196, 26, 0.25)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f6ffed 100%)',
      },
      duration: 5,
    });
  },

  // Loading message
  loading: (content) => {
    return message.loading({
      content,
      key: 'loading',
      duration: 0,
      style: {
        marginTop: '20px',
      },
    });
  },

  // Custom notification with icon
  custom: (type, title, description) => {
    notification[type]({
      message: title,
      description,
      style: {
        borderLeft: `4px solid ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : type === 'warning' ? '#faad14' : '#1890ff'}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    });
  },
};

// Friendly message templates for common operations
export const messages = {
  // Create operations
  created: (itemName) => `${itemName} created successfully! 🎉`,

  // Update operations
  updated: (itemName) => `${itemName} updated successfully! ✨`,

  // Delete operations
  deleted: (itemName) => `${itemName} deleted successfully!`,

  // Save operations
  saved: () => 'Changes saved successfully! 👍',

  // Loading operations
  loading: (action) => `${action}...`,

  // Error operations
  loadFailed: (itemName) => `Oops! Couldn't load ${itemName}. Please try again.`,
  saveFailed: (itemName) => `Failed to save ${itemName}. Please check and try again.`,
  deleteFailed: (itemName) => `Couldn't delete ${itemName}. Please try again.`,

  // Permission errors
  noPermission: () => 'You don\'t have permission to perform this action.',
  adminOnly: () => 'This action requires admin privileges.',

  // Validation errors
  fillRequired: () => 'Please fill in all required fields.',
  invalidData: () => 'Please check your input and try again.',

  // Stock messages
  stockUpdated: (productName, quantity, remaining) =>
    `Stock updated for ${productName}: ${quantity} units → ${remaining} remaining`,
  lowStock: (count) => `Low Stock Alert - ${count} item${count > 1 ? 's' : ''} need attention!`,
  insufficientStock: (productName, available, required) =>
    `Insufficient stock for ${productName}! Available: ${available}, Required: ${required}`,

  // Invoice messages
  invoiceCreated: (invoiceNumber) => `Invoice ${invoiceNumber} created successfully! 📄`,
  invoiceApproved: (invoiceNumber) => `Invoice ${invoiceNumber} approved! ✅`,

  // Payment messages
  paymentSuccess: (amount) => `Payment of Rs. ${amount} processed successfully! 💰`,
  paymentPending: () => 'Payment is pending approval.',

  // Welcome messages
  welcome: (userName) => `Welcome back, ${userName}! 👋`,

  // Success with tips
  successTip: (message, tip) => ({
    message,
    description: `💡 Tip: ${tip}`,
  }),
};

export default toast;

import React from 'react';
import { Button, Space } from 'antd';
import toast from '../utils/toast';

function ToastTest() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Toast Message Test</h2>
      <Space direction="vertical" size="middle">
        <Button
          type="primary"
          onClick={() => toast.success('Success!', 'This is a success message')}
        >
          Test Success Toast
        </Button>

        <Button
          danger
          onClick={() => toast.error('Error!', 'This is an error message')}
        >
          Test Error Toast
        </Button>

        <Button
          onClick={() => toast.warning('Warning!', 'This is a warning message')}
        >
          Test Warning Toast
        </Button>

        <Button
          onClick={() => toast.info('Info!', 'This is an info message')}
        >
          Test Info Toast
        </Button>

        <Button
          type="primary"
          onClick={() => toast.celebrate('🎉 Celebration!', 'This is a celebration message')}
        >
          Test Celebration Toast
        </Button>
      </Space>
    </div>
  );
}

export default ToastTest;

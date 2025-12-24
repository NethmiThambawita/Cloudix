import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Button, Select, Table, Statistic, message } from 'antd';
import { DownloadOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/axios';

const { RangePicker } = DatePicker;
const { Option } = Select;

function Reports() {
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalInvoices: 0,
    paidAmount: 0
  });

  useEffect(() => {
    loadReportData();
  }, [reportType, dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      
      if (reportType === 'sales' || reportType === 'invoices') {
        // Load invoices
        const response = await api.get('/invoices', {
          params: {
            page: 1,
            limit: 1000
          }
        });
        
        const invoices = response.data.result || [];
        
        // Filter by date range
        const filtered = invoices.filter(inv => {
          const invDate = dayjs(inv.date);
          return invDate.isAfter(startDate) && invDate.isBefore(endDate.add(1, 'day'));
        });
        
        // Format for table
        const formatted = filtered.map(inv => ({
          key: inv._id,
          date: dayjs(inv.date).format('YYYY-MM-DD'),
          invoiceNumber: inv.invoiceNumber,
          customer: inv.customer?.name || 'N/A',
          amount: inv.total,
          status: inv.status
        }));
        
        // Calculate stats
        const totalSales = filtered.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const paidAmount = filtered.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        
        setReportData(formatted);
        setStats({
          totalSales,
          totalInvoices: filtered.length,
          paidAmount
        });
        
      } else if (reportType === 'quotations') {
        // Load quotations
        const response = await api.get('/quotations', {
          params: {
            page: 1,
            limit: 1000
          }
        });
        
        const quotations = response.data.result || [];
        
        // Filter by date range
        const filtered = quotations.filter(q => {
          const qDate = dayjs(q.date);
          return qDate.isAfter(startDate) && qDate.isBefore(endDate.add(1, 'day'));
        });
        
        // Format for table
        const formatted = filtered.map(q => ({
          key: q._id,
          date: dayjs(q.date).format('YYYY-MM-DD'),
          invoiceNumber: q.quotationNumber,
          customer: q.customer?.name || 'N/A',
          amount: q.total,
          status: q.status
        }));
        
        const totalAmount = filtered.reduce((sum, q) => sum + (q.total || 0), 0);
        
        setReportData(formatted);
        setStats({
          totalSales: totalAmount,
          totalInvoices: filtered.length,
          paidAmount: 0
        });
        
      } else if (reportType === 'payments') {
        // Load payments
        const response = await api.get('/payments', {
          params: {
            page: 1,
            limit: 1000
          }
        });
        
        const payments = response.data.result || [];
        
        // Filter by date range
        const filtered = payments.filter(p => {
          const pDate = dayjs(p.date);
          return pDate.isAfter(startDate) && pDate.isBefore(endDate.add(1, 'day'));
        });
        
        // Format for table
        const formatted = filtered.map(p => ({
          key: p._id,
          date: dayjs(p.date).format('YYYY-MM-DD'),
          invoiceNumber: p.paymentNumber,
          customer: p.invoice?.customer?.name || p.customer?.name || 'N/A',
          amount: p.amount,
          status: 'Paid'
        }));
        
        const totalPaid = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        setReportData(formatted);
        setStats({
          totalSales: totalPaid,
          totalInvoices: filtered.length,
          paidAmount: totalPaid
        });
        
      } else if (reportType === 'customers') {
        // Load customers
        const response = await api.get('/customers', {
          params: {
            page: 1,
            limit: 1000
          }
        });
        
        const customers = response.data.data || [];
        
        // Format for table
        const formatted = customers.map(c => ({
          key: c._id,
          date: dayjs(c.createdAt).format('YYYY-MM-DD'),
          invoiceNumber: 'N/A',
          customer: c.name,
          amount: 0,
          status: c.isActive ? 'Active' : 'Inactive'
        }));
        
        setReportData(formatted);
        setStats({
          totalSales: 0,
          totalInvoices: customers.length,
          paidAmount: 0
        });
        
      } else if (reportType === 'products') {
        // Load products
        const response = await api.get('/products', {
          params: {
            page: 1,
            limit: 1000
          }
        });
        
        const products = response.data.data || [];
        
        // Format for table
        const formatted = products.map(p => ({
          key: p._id,
          date: dayjs(p.createdAt).format('YYYY-MM-DD'),
          invoiceNumber: p.category || 'N/A',
          customer: p.name,
          amount: p.price,
          status: p.isActive ? 'Active' : 'Inactive'
        }));
        
        setReportData(formatted);
        setStats({
          totalSales: products.reduce((sum, p) => sum + (p.price || 0), 0),
          totalInvoices: products.length,
          paidAmount: 0
        });
      }
      
    } catch (error) {
      console.error('Error loading report:', error);
      message.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (reportData.length === 0) {
      message.warning('No data to export');
      return;
    }

    try {
      // Convert data to CSV
      const headers = ['Date', 'Reference', 'Customer', 'Amount', 'Status'];
      const csvData = reportData.map(row => [
        row.date,
        row.invoiceNumber,
        row.customer,
        row.amount,
        row.status
      ]);
      
      const csv = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const filename = `${reportType}_report_${dayjs().format('YYYY-MM-DD')}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export report');
    }
  };

  const salesColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Reference', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { 
      title: 'Amount', 
      dataIndex: 'amount', 
      key: 'amount', 
      render: (val) => `Rs. ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    },
    { title: 'Status', dataIndex: 'status', key: 'status' }
  ];

  return (
    <div>
      <h1>Reports</h1>

      <Card style={{ marginTop: 20 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8}>
            <Select
              style={{ width: '100%' }}
              value={reportType}
              onChange={setReportType}
            >
              <Option value="sales">Sales Report (Invoices)</Option>
              <Option value="quotations">Quotation Report</Option>
              <Option value="payments">Payment Report</Option>
              <Option value="customers">Customer Report</Option>
              <Option value="products">Product Report</Option>
            </Select>
          </Col>

          <Col xs={24} sm={12}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
            />
          </Col>

          <Col xs={24} sm={4}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              style={{ width: '100%' }}
              disabled={reportData.length === 0}
            >
              Export CSV
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={reportType === 'sales' ? 'Total Sales' : reportType === 'quotations' ? 'Total Quotations' : reportType === 'payments' ? 'Total Payments' : 'Total Value'}
              value={stats.totalSales}
              prefix="Rs."
              suffix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={reportType === 'products' ? 'Total Products' : reportType === 'customers' ? 'Total Customers' : 'Total Records'}
              value={stats.totalInvoices}
              suffix={<FileTextOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Paid Amount"
              value={stats.paidAmount}
              prefix="Rs."
              valueStyle={{ color: '#3f8600' }}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Card title={`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`} style={{ marginTop: 20 }}>
        <Table
          columns={salesColumns}
          dataSource={reportData}
          rowKey="key"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}

export default Reports;
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Button, Select, Table, Statistic, message, Space } from 'antd';
import { DownloadOutlined, FileTextOutlined, DollarOutlined, DollarCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/axios';

const { RangePicker } = DatePicker;
const { Option } = Select;

function Reports() {
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'cash', 'paid'
  const [stats, setStats] = useState({
    totalSales: 0,
    totalInvoices: 0,
    paidAmount: 0,
    cashAmount: 0,
    cashCount: 0
  });

  useEffect(() => {
    loadCustomers();
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [reportType, dateRange, selectedCustomer, selectedSupplier]);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data.result || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;

      if (reportType === 'sales' || reportType === 'invoices') {
        // Load ALL invoices (no limit) to get complete CASH total
        const invoiceResponse = await api.get('/invoices', {
          params: {
            page: 1,
            limit: 10000
          }
        });

        let allInvoices = invoiceResponse.data.result || [];

        // Get ALL CASH invoices (no date filter) for statistics
        const allCashInvoices = allInvoices.filter(inv => {
          const customerName = inv.customer?.name?.toUpperCase() || '';
          return customerName.includes('CASH');
        });

        // Calculate TOTAL CASH amount (all time, no date filter)
        const totalCashAmountAllTime = allCashInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const totalCashCountAllTime = allCashInvoices.length;

        console.log('Total CASH invoices (all time):', totalCashCountAllTime);
        console.log('Total CASH amount (all time):', totalCashAmountAllTime);

        // Filter invoices by date range for display
        let invoices = allInvoices.filter(inv => {
          const invDate = dayjs(inv.date);
          return invDate.isAfter(startDate) && invDate.isBefore(endDate.add(1, 'day'));
        });

        // Separate CASH invoices from regular invoices (date filtered)
        const cashInvoices = invoices.filter(inv => {
          const customerName = inv.customer?.name?.toUpperCase() || '';
          return customerName.includes('CASH');
        });

        console.log('CASH invoices (date filtered):', cashInvoices.length);

        const regularInvoices = invoices.filter(inv => {
          const customerName = inv.customer?.name?.toUpperCase() || '';
          return !customerName.includes('CASH');
        });

        // Filter regular invoices by customer if selected
        let displayInvoices = regularInvoices;
        if (selectedCustomer) {
          displayInvoices = displayInvoices.filter(inv => inv.customer?._id === selectedCustomer);
        }

        // Calculate CASH amount for date-filtered invoices (for table row)
        const totalCashAmount = cashInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const totalCashPaid = cashInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const totalCashBalance = cashInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

        console.log('Total CASH amount (date filtered):', totalCashAmount);

        // Format ALL invoices for table (including CASH as regular rows)
        const allDisplayInvoices = selectedCustomer
          ? invoices.filter(inv => inv.customer?._id === selectedCustomer)
          : invoices;

        const formatted = allDisplayInvoices.map(inv => ({
          key: inv._id,
          date: dayjs(inv.date).format('YYYY-MM-DD'),
          invoiceNumber: inv.invoiceNumber,
          customer: inv.customer?.name || 'N/A',
          amount: inv.total,
          balance: inv.balanceAmount || 0,
          status: inv.status
        }));

        // Calculate stats (including CASH invoices)
        const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const paidAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

        setReportData(formatted);
        setStats({
          totalSales,
          totalInvoices: invoices.length,
          paidAmount,
          cashAmount: totalCashAmountAllTime, // All-time total, not date filtered
          cashCount: totalCashCountAllTime // All-time count, not date filtered
        });

      } else if (reportType === 'quotations') {
        // Load quotations
        const response = await api.get('/quotations', {
          params: {
            page: 1,
            limit: 1000
          }
        });

        let quotations = response.data.result || [];

        // Filter by date range
        quotations = quotations.filter(q => {
          const qDate = dayjs(q.date);
          return qDate.isAfter(startDate) && qDate.isBefore(endDate.add(1, 'day'));
        });

        // Filter by customer if selected
        if (selectedCustomer) {
          quotations = quotations.filter(q => q.customer?._id === selectedCustomer);
        }

        // Format for table
        const formatted = quotations.map(q => ({
          key: q._id,
          date: dayjs(q.date).format('YYYY-MM-DD'),
          invoiceNumber: q.quotationNumber,
          customer: q.customer?.name || 'N/A',
          amount: q.total,
          status: q.status
        }));

        const totalAmount = quotations.reduce((sum, q) => sum + (q.total || 0), 0);

        setReportData(formatted);
        setStats({
          totalSales: totalAmount,
          totalInvoices: quotations.length,
          paidAmount: 0
        });

      } else if (reportType === 'payments') {
        // Load ALL customer payments (no limit) to get complete CASH total
        const response = await api.get('/payments', {
          params: {
            page: 1,
            limit: 10000
          }
        });

        let allPayments = response.data.result || [];

        // Get ALL CASH payments (no date filter) for statistics
        const allCashPayments = allPayments.filter(p => {
          return p.paymentMethod?.toLowerCase() === 'cash';
        });

        // Calculate TOTAL CASH amount (all time, no date filter)
        const totalCashAmountAllTime = allCashPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalCashCountAllTime = allCashPayments.length;

        console.log('Total CASH payments (all time):', totalCashCountAllTime);
        console.log('Total CASH payment amount (all time):', totalCashAmountAllTime);

        // Filter payments by date range for display
        let payments = allPayments.filter(p => {
          const pDate = dayjs(p.date);
          return pDate.isAfter(startDate) && pDate.isBefore(endDate.add(1, 'day'));
        });

        // Separate CASH payments from regular payments (date filtered)
        const cashPayments = payments.filter(p => {
          return p.paymentMethod?.toLowerCase() === 'cash';
        });

        console.log('CASH payments (date filtered):', cashPayments.length);

        const regularPayments = payments.filter(p => {
          return p.paymentMethod?.toLowerCase() !== 'cash';
        });

        // Filter by customer if selected
        let displayPayments = payments;
        if (selectedCustomer) {
          displayPayments = displayPayments.filter(p => p.customer?._id === selectedCustomer);
        }

        // Calculate CASH amount for date-filtered payments
        const totalCashAmount = cashPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        console.log('Total CASH payment amount (date filtered):', totalCashAmount);

        // Format ALL payments for table
        const formatted = displayPayments.map(p => ({
          key: p._id,
          date: dayjs(p.date).format('YYYY-MM-DD'),
          invoiceNumber: p.paymentNumber,
          customer: p.customer?.name || 'N/A',
          paymentMethod: p.paymentMethod || 'N/A',
          amount: p.amount,
          status: p.status || 'completed'
        }));

        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        setReportData(formatted);
        setStats({
          totalSales: totalPaid,
          totalInvoices: payments.length,
          paidAmount: totalPaid,
          cashAmount: totalCashAmountAllTime, // All-time total, not date filtered
          cashCount: totalCashCountAllTime // All-time count, not date filtered
        });

      } else if (reportType === 'supplier-payments') {
        // Load ALL supplier payments and GRNs
        const [paymentsResponse, grnsResponse] = await Promise.all([
          api.get('/supplier-payments', {
            params: {
              page: 1,
              limit: 10000
            }
          }),
          api.get('/grn', {
            params: {
              page: 1,
              limit: 10000
            }
          })
        ]);

        let payments = paymentsResponse.data.result || [];
        const grns = grnsResponse.data.result || [];

        // Calculate GRN totals
        const grnTotal = grns.reduce((sum, grn) => sum + (grn.totalValue || 0), 0);
        const grnPaidAmount = grns.reduce((sum, grn) => sum + (grn.paidAmount || 0), 0);
        const grnBalanceAmount = grns.reduce((sum, grn) => sum + (grn.balanceAmount || grn.totalValue || 0), 0);

        console.log('GRN Total:', grnTotal);
        console.log('GRN Paid:', grnPaidAmount);
        console.log('GRN Balance:', grnBalanceAmount);

        // Filter by date range
        payments = payments.filter(p => {
          const pDate = dayjs(p.paymentDate);
          return pDate.isAfter(startDate) && pDate.isBefore(endDate.add(1, 'day'));
        });

        // Filter by supplier if selected
        if (selectedSupplier) {
          payments = payments.filter(p => p.supplier?._id === selectedSupplier);
        }

        // Format for table
        const formatted = payments.map(p => ({
          key: p._id,
          date: dayjs(p.paymentDate).format('YYYY-MM-DD'),
          invoiceNumber: p.paymentNumber,
          customer: p.supplier?.name || 'N/A',
          grnNumber: p.grn?.grnNumber || 'N/A',
          amount: p.amount,
          balance: p.grn?.balanceAmount || 0,
          status: p.status
        }));

        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        setReportData(formatted);
        setStats({
          totalSales: totalPaid,
          totalInvoices: payments.length,
          paidAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0),
          grnTotal: grnTotal,
          grnPaid: grnPaidAmount,
          grnBalance: grnBalanceAmount
        });

      } else if (reportType === 'grn') {
        // Load GRNs
        const response = await api.get('/grn', {
          params: {
            page: 1,
            limit: 1000
          }
        });

        let grns = response.data.result || [];

        // Filter by date range
        grns = grns.filter(g => {
          const gDate = dayjs(g.grnDate);
          return gDate.isAfter(startDate) && gDate.isBefore(endDate.add(1, 'day'));
        });

        // Filter by supplier if selected
        if (selectedSupplier) {
          grns = grns.filter(g => g.supplier?._id === selectedSupplier);
        }

        // Format for table
        const formatted = grns.map(g => ({
          key: g._id,
          date: dayjs(g.grnDate).format('YYYY-MM-DD'),
          invoiceNumber: g.grnNumber,
          customer: g.supplier?.name || 'N/A',
          amount: g.totalValue,
          status: g.status
        }));

        const totalValue = grns.reduce((sum, g) => sum + (g.totalValue || 0), 0);
        const totalPaid = grns.reduce((sum, g) => sum + (g.paidAmount || 0), 0);

        setReportData(formatted);
        setStats({
          totalSales: totalValue,
          totalInvoices: grns.length,
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

        let customerList = response.data.data || [];

        // Filter by selected customer if applicable
        if (selectedCustomer) {
          customerList = customerList.filter(c => c._id === selectedCustomer);
        }

        // Format for table
        const formatted = customerList.map(c => ({
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
          totalInvoices: customerList.length,
          paidAmount: 0
        });

      } else if (reportType === 'suppliers') {
        // Load suppliers
        const response = await api.get('/suppliers');

        let supplierList = response.data.result || [];

        // Filter by selected supplier if applicable
        if (selectedSupplier) {
          supplierList = supplierList.filter(s => s._id === selectedSupplier);
        }

        // Format for table
        const formatted = supplierList.map(s => ({
          key: s._id,
          date: dayjs(s.createdAt).format('YYYY-MM-DD'),
          invoiceNumber: s.supplierNumber,
          customer: s.name,
          amount: 0,
          status: s.isActive ? 'Active' : 'Inactive'
        }));

        setReportData(formatted);
        setStats({
          totalSales: 0,
          totalInvoices: supplierList.length,
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

  const handleExportDetails = () => {
    if (reportData.length === 0) {
      message.warning('No data to export');
      return;
    }

    try {
      // Convert data to CSV
      const headers = ['Date', 'Reference', reportType === 'suppliers' || reportType === 'supplier-payments' || reportType === 'grn' ? 'Supplier' : 'Customer', 'Amount', 'Balance', 'Status'];
      const csvData = reportData.map(row => [
        row.date,
        row.invoiceNumber,
        row.customer,
        row.amount,
        row.balance || 0,
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

      const filename = `${reportType}_report_details_${dayjs().format('YYYY-MM-DD')}.csv`;

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

  const handleExportWithSummary = () => {
    if (reportData.length === 0) {
      message.warning('No data to export');
      return;
    }

    try {
      // Convert data to CSV with summary
      const headers = ['Date', 'Reference', reportType === 'suppliers' || reportType === 'supplier-payments' || reportType === 'grn' ? 'Supplier' : 'Customer', 'Amount', 'Balance', 'Status'];
      const csvData = reportData.map(row => [
        row.date,
        row.invoiceNumber,
        row.customer,
        row.amount,
        row.balance || 0,
        row.status
      ]);

      // Add summary rows
      const summaryRows = [
        [], // Empty row for spacing
        ['SUMMARY'], // Summary header
        ['Total Records', stats.totalInvoices],
        ['Total Amount', stats.totalSales],
        ['Paid Amount', stats.paidAmount],
        ['Outstanding', stats.totalSales - stats.paidAmount]
      ];

      const csv = [
        headers.join(','),
        ...csvData.map(row => row.join(',')),
        ...summaryRows.map(row => row.join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const filename = `${reportType}_report_with_summary_${dayjs().format('YYYY-MM-DD')}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('Report with summary exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export report');
    }
  };

  const salesColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Reference', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    ...(reportType !== 'payments' ? [{
      title: reportType === 'suppliers' || reportType === 'supplier-payments' || reportType === 'grn' ? 'Supplier' : 'Customer',
      dataIndex: 'customer',
      key: 'customer'
    }] : []),
    ...(reportType === 'supplier-payments' ? [{
      title: 'GRN Number',
      dataIndex: 'grnNumber',
      key: 'grnNumber'
    }] : []),
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => `Rs. ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (val) => `Rs. ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    { title: 'Status', dataIndex: 'status', key: 'status' }
  ];

  // Show customer filter for customer-related reports
  const showCustomerFilter = ['sales', 'invoices', 'quotations', 'payments', 'customers'].includes(reportType);

  // Show supplier filter for supplier-related reports
  const showSupplierFilter = ['supplier-payments', 'grn', 'suppliers'].includes(reportType);

  return (
    <div>
      <h1>Reports</h1>

      <Card style={{ marginTop: 20 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              value={reportType}
              onChange={(value) => {
                setReportType(value);
                setSelectedCustomer(null);
                setSelectedSupplier(null);
              }}
            >
              <Option value="sales">Sales Report (Invoices)</Option>
              <Option value="quotations">Quotation Report</Option>
              <Option value="payments">Customer Payments</Option>
              <Option value="supplier-payments">Supplier Payments</Option>
              <Option value="grn">GRN Report</Option>
              <Option value="customers">Customer Report</Option>
              <Option value="suppliers">Supplier Report</Option>
              <Option value="products">Product Report</Option>
            </Select>
          </Col>

          {showCustomerFilter && (
            <Col xs={24} sm={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by Customer"
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {customers.map(customer => (
                  <Option key={customer._id} value={customer._id}>
                    {customer.name}
                  </Option>
                ))}
              </Select>
            </Col>
          )}

          {showSupplierFilter && (
            <Col xs={24} sm={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by Supplier"
                value={selectedSupplier}
                onChange={setSelectedSupplier}
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {suppliers.map(supplier => (
                  <Option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </Option>
                ))}
              </Select>
            </Col>
          )}

          <Col xs={24} sm={showCustomerFilter || showSupplierFilter ? 8 : 12}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
            />
          </Col>

          <Col xs={24} sm={showCustomerFilter || showSupplierFilter ? 4 : 6} style={{ textAlign: 'right' }}>
            <Space size="small">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportWithSummary}
                size="small"
                disabled={reportData.length === 0}
              >
                With Summary
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportDetails}
                size="small"
                disabled={reportData.length === 0}
              >
                Details
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={
                reportType === 'sales' ? 'Total Sales' :
                reportType === 'quotations' ? 'Total Quotations' :
                reportType === 'payments' ? 'Total Payments' :
                reportType === 'supplier-payments' ? 'Total Supplier Payments' :
                reportType === 'grn' ? 'Total GRN Value' :
                'Total Value'
              }
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
              title={
                reportType === 'products' ? 'Total Products' :
                reportType === 'customers' ? 'Total Customers' :
                reportType === 'suppliers' ? 'Total Suppliers' :
                'Total Records'
              }
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

      <Card
        title={`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
        style={{ marginTop: 20 }}
        extra={
          ((reportType === 'sales' || reportType === 'invoices') || reportType === 'payments') && (
            <Space>
              <span>Filter:</span>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 150 }}
                size="small"
              >
                {reportType === 'payments' ? (
                  <>
                    <Option value="all">All Payments</Option>
                    <Option value="cash">CASH Only</Option>
                    <Option value="bank">Bank Only</Option>
                    <Option value="cheque">Cheque Only</Option>
                    <Option value="card">Card Only</Option>
                  </>
                ) : (
                  <>
                    <Option value="all">All Invoices</Option>
                    <Option value="cash">CASH Only</Option>
                    <Option value="paid">Paid Only</Option>
                  </>
                )}
              </Select>
            </Space>
          )
        }
      >
        {(reportType === 'sales' || reportType === 'invoices') && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
            <Row gutter={16}>
              <Col span={8}>
                <strong>Filtered Records:</strong> {
                  categoryFilter === 'all' ? reportData.length :
                  categoryFilter === 'cash' ? reportData.filter(r => r.customer?.toUpperCase().includes('CASH')).length :
                  reportData.filter(r => r.status === 'paid').length
                }
              </Col>
              <Col span={8}>
                <strong>Total Amount:</strong> Rs. {
                  (categoryFilter === 'all'
                    ? reportData.reduce((sum, row) => sum + (row.amount || 0), 0)
                    : categoryFilter === 'cash'
                    ? reportData.filter(r => r.customer?.toUpperCase().includes('CASH')).reduce((sum, row) => sum + (row.amount || 0), 0)
                    : reportData.filter(r => r.status === 'paid').reduce((sum, row) => sum + (row.amount || 0), 0)
                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </Col>
              <Col span={8}>
                <strong>Total Balance:</strong> Rs. {
                  (categoryFilter === 'all'
                    ? reportData.reduce((sum, row) => sum + (row.balance || 0), 0)
                    : categoryFilter === 'cash'
                    ? reportData.filter(r => r.customer?.toUpperCase().includes('CASH')).reduce((sum, row) => sum + (row.balance || 0), 0)
                    : reportData.filter(r => r.status === 'paid').reduce((sum, row) => sum + (row.balance || 0), 0)
                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </Col>
            </Row>
          </div>
        )}
        {reportType === 'payments' && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
            <Row gutter={16}>
              <Col span={8}>
                <strong>Filtered Records:</strong> {
                  categoryFilter === 'all' ? reportData.length :
                  reportData.filter(r => r.paymentMethod?.toLowerCase() === categoryFilter).length
                }
              </Col>
              <Col span={8}>
                <strong>Total Amount:</strong> Rs. {
                  (categoryFilter === 'all'
                    ? reportData.reduce((sum, row) => sum + (row.amount || 0), 0)
                    : reportData.filter(r => r.paymentMethod?.toLowerCase() === categoryFilter).reduce((sum, row) => sum + (row.amount || 0), 0)
                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </Col>
              <Col span={8}>
                <strong>CASH Total (All Time):</strong> Rs. {
                  (stats.cashAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </Col>
            </Row>
          </div>
        )}
        {reportType === 'supplier-payments' && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
            <Row gutter={16}>
              <Col span={8}>
                <strong>GRN Total:</strong> Rs. {
                  (stats.grnTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </Col>
              <Col span={8}>
                <strong>GRN Paid:</strong> Rs. {
                  (stats.grnPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </Col>
              <Col span={8}>
                <strong>GRN Balance:</strong> Rs. {
                  (stats.grnBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </Col>
            </Row>
          </div>
        )}
        <Table
          columns={salesColumns}
          dataSource={
            (reportType === 'sales' || reportType === 'invoices')
              ? categoryFilter === 'all'
                ? reportData
                : categoryFilter === 'cash'
                ? reportData.filter(r => r.customer?.toUpperCase().includes('CASH'))
                : reportData.filter(r => r.status === 'paid')
              : reportType === 'payments'
              ? categoryFilter === 'all'
                ? reportData
                : reportData.filter(r => r.paymentMethod?.toLowerCase() === categoryFilter)
              : reportData
          }
          rowKey="key"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}

export default Reports;

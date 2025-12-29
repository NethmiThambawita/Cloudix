import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import store from './redux/store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Products from './pages/Products';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import QuotationView from './pages/QuotationView';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceView from './pages/InvoiceView';
import Payments from './pages/Payments';
import Taxes from './pages/Taxes';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Usermanagement from './pages/Usermanagement';
//  Stock Management imports
import StockManagement from './pages/StockManagement';
import StockForm from './pages/StockForm';
import StockTransfer from './pages/StockTransfer';
//  GRN imports
import GRNManagement from './pages/GRNManagement';
import GRNForm from './pages/GRNForm';
import GRNView from './pages/GRNView';
import GRNInspectionForm from './pages/GRNInspectionForm';
//  Purchase Order imports
import PurchaseOrderManagement from './pages/PurchaseOrderManagement';
import PurchaseOrderForm from './pages/PurchaseOrderForm';
import PurchaseOrderView from './pages/PurchaseOrderView';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import { useSelector } from 'react-redux';

function HomeRedirect() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  return <Navigate to={isAdmin ? '/dashboard' : '/invoices'} replace />;
}

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/dashboard" element={<RoleRoute allow={['admin']}><Dashboard /></RoleRoute>} />
              
              {/* Customer Routes */}
              <Route path="/customers" element={<Customers />} />

              {/* Supplier Routes */}
              <Route path="/suppliers" element={<Suppliers />} />

              {/* Product Routes */}
              <Route path="/products" element={<Products />} />
              
              {/* Stock Management Routes - Admin & Manager Only */}
              <Route path="/stock" element={<RoleRoute allow={['admin', 'manager']}><StockManagement /></RoleRoute>} />
              <Route path="/stock/new" element={<RoleRoute allow={['admin', 'manager']}><StockForm /></RoleRoute>} />
              <Route path="/stock/edit/:id" element={<RoleRoute allow={['admin', 'manager']}><StockForm /></RoleRoute>} />
              <Route path="/stock/transfer/:id" element={<RoleRoute allow={['admin', 'manager']}><StockTransfer /></RoleRoute>} />

              {/*  GRN Routes - All Users */}
              <Route path="/grn" element={<GRNManagement />} />
              <Route path="/grn/new" element={<GRNForm />} />
              <Route path="/grn/view/:id" element={<GRNView />} />
              <Route path="/grn/inspect/:id" element={<GRNInspectionForm />} />

              {/*  Purchase Order Routes - All Users */}
              <Route path="/purchase-orders" element={<PurchaseOrderManagement />} />
              <Route path="/purchase-orders/new" element={<PurchaseOrderForm />} />
              <Route path="/purchase-orders/edit/:id" element={<PurchaseOrderForm />} />
              <Route path="/purchase-orders/view/:id" element={<PurchaseOrderView />} />
              
              {/* Quotation Routes */}
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/quotations/new" element={<QuotationForm />} />
              <Route path="/quotations/edit/:id" element={<QuotationForm />} />
              <Route path="/quotations/view/:id" element={<QuotationView />} />
              
              {/* Invoice Routes */}
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
              <Route path="/invoices/view/:id" element={<InvoiceView />} />
              
              {/* Payment Routes */}
              <Route path="/payments" element={<Payments />} />
              
              {/* Tax Routes */}
              <Route path="/taxes" element={<RoleRoute allow={['admin']}><Taxes /></RoleRoute>} />
              
              {/* Reports Route */}
              <Route path="/reports" element={<RoleRoute allow={['admin', 'manager']}><Reports /></RoleRoute>} />
              
              {/* Settings Routes */}
              <Route path="/settings" element={<RoleRoute allow={['admin']}><Settings /></RoleRoute>} />

              {/* User Management Route */}
              <Route path="/users" element={<RoleRoute allow={['admin']}><Usermanagement /></RoleRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  );
}

export default App;
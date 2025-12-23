import Invoice from '../models/Invoice.js';
import Quotation from '../models/Quotation.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Stock from '../models/Stock.js';
import GRN from '../models/GRN.js';
import StockTransaction from '../models/StockTransaction.js';

// backend/src/controllers/dashboard.controller.js
// REPLACE getStats function

export const getStats = async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ✅ Filter by user role
    const userFilter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };

    // Get paid invoices total
    const paidInvoices = await Invoice.aggregate([
      { $match: { ...userFilter, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Get unpaid invoices total
    const unpaidInvoices = await Invoice.aggregate([
      { $match: { ...userFilter, status: { $in: ['draft', 'sent', 'partial', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$balanceAmount' } } }
    ]);

    // Get draft invoices total
    const draftInvoices = await Invoice.aggregate([
      { $match: { ...userFilter, status: 'draft' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Get invoices this month
    const invoicesThisMonth = await Invoice.aggregate([
      { $match: { ...userFilter, createdAt: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    // Get quotations this month
    const quotesThisMonth = await Quotation.aggregate([
      { $match: { ...userFilter, createdAt: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    // Get payments this month
    const paymentsThisMonth = await Payment.aggregate([
      { $match: { createdAt: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Get invoices by status
    const invoicesByStatus = await Invoice.aggregate([
      { $match: userFilter },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);

    // Get quotations by status
    const quotesByStatus = await Quotation.aggregate([
      { $match: userFilter },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);

    // Get recent invoices
    const recentInvoices = await Invoice.find(userFilter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get recent quotations
    const recentQuotes = await Quotation.find(userFilter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Customer statistics
    const totalCustomers = await Customer.countDocuments();
    const newCustomersThisMonth = await Customer.countDocuments({ 
      createdAt: { $gte: firstDay, $lte: lastDay } 
    });

    // ✅ User statistics (admin only)
    let userStats = {};
    if (req.user.role === 'admin') {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const newUsersThisMonth = await User.countDocuments({ 
        createdAt: { $gte: firstDay, $lte: lastDay } 
      });
      
      const recentUsers = await User.find()
        .select('firstName lastName email role isActive createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      
      const usersByRole = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      userStats = {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        recentUsers,
        usersByRole
      };
    }

    // ✅ NEW: Stock Management Statistics
    let stockStats = {};
    try {
      const totalStockItems = await Stock.countDocuments({ isActive: true });
      
      // Get all stock items to calculate low stock and reorder alerts
      const stockItems = await Stock.find({ isActive: true });
      const lowStockItems = stockItems.filter(s => s.quantity <= s.minLevel);
      const reorderItems = stockItems.filter(s => s.quantity <= s.reorderLevel && s.quantity > s.minLevel);
      
      // Calculate total stock value (requires product price)
      const stockWithProducts = await Stock.find({ isActive: true })
        .populate('product', 'price');
      
      const totalStockValue = stockWithProducts.reduce((sum, stock) => {
        return sum + (stock.quantity * (stock.product?.price || 0));
      }, 0);

      // Recent stock transactions
      const recentStockTransactions = await StockTransaction.find()
        .populate('product', 'name')
        .populate('performedBy', 'firstName lastName')
        .sort({ transactionDate: -1 })
        .limit(5)
        .lean();

      stockStats = {
        totalStockItems,
        lowStockCount: lowStockItems.length,
        reorderCount: reorderItems.length,
        totalStockValue: Math.round(totalStockValue),
        lowStockItems: lowStockItems.slice(0, 5).map(s => ({
          _id: s._id,
          product: s.product,
          quantity: s.quantity,
          minLevel: s.minLevel,
          location: s.location
        })),
        recentStockTransactions
      };
    } catch (error) {
      console.error('Stock stats error:', error);
      stockStats = {
        totalStockItems: 0,
        lowStockCount: 0,
        reorderCount: 0,
        totalStockValue: 0,
        lowStockItems: [],
        recentStockTransactions: []
      };
    }

    // ✅ NEW: GRN Statistics
    let grnStats = {};
    try {
      const totalGRNs = await GRN.countDocuments();
      const pendingGRNs = await GRN.countDocuments({ status: { $in: ['draft', 'inspected'] } });
      const completedGRNsThisMonth = await GRN.countDocuments({
        status: 'completed',
        grnDate: { $gte: firstDay, $lte: lastDay }
      });

      // GRN value this month
      const grnValueThisMonth = await GRN.aggregate([
        { 
          $match: { 
            status: 'completed',
            grnDate: { $gte: firstDay, $lte: lastDay }
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalValue' } } }
      ]);

      // Recent GRNs
      const recentGRNs = await GRN.find()
        .populate('supplier', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort({ grnDate: -1 })
        .limit(5)
        .lean();

      // GRN by status
      const grnByStatus = await GRN.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      grnStats = {
        totalGRNs,
        pendingGRNs,
        completedGRNsThisMonth,
        grnValueThisMonth: grnValueThisMonth[0]?.total || 0,
        recentGRNs,
        grnByStatus
      };
    } catch (error) {
      console.error('GRN stats error:', error);
      grnStats = {
        totalGRNs: 0,
        pendingGRNs: 0,
        completedGRNsThisMonth: 0,
        grnValueThisMonth: 0,
        recentGRNs: [],
        grnByStatus: []
      };
    }

    // Revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const revenueTrend = await Invoice.aggregate([
      { $match: { ...userFilter, status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
      { 
        $group: { 
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          }, 
          total: { $sum: '$total' } 
        } 
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      result: {
        // Financial totals
        paidInvoice: paidInvoices[0]?.total || 0,
        unpaidInvoice: unpaidInvoices[0]?.total || 0,
        draftInvoice: draftInvoices[0]?.total || 0,
        
        // This month totals
        invoicesThisMonth: invoicesThisMonth[0]?.total || 0,
        invoicesThisMonthCount: invoicesThisMonth[0]?.count || 0,
        quotesThisMonth: quotesThisMonth[0]?.total || 0,
        quotesThisMonthCount: quotesThisMonth[0]?.count || 0,
        paymentsThisMonth: paymentsThisMonth[0]?.total || 0,
        paymentsThisMonthCount: paymentsThisMonth[0]?.count || 0,
        
        // Status breakdowns
        invoicesByStatus,
        quotesByStatus,
        
        // Recent items
        recentInvoices,
        recentQuotes,
        
        // Customer stats
        totalCustomers,
        newCustomersThisMonth,
        
        // User stats (admin only)
        ...userStats,
        
        // ✅ NEW: Stock stats
        ...stockStats,
        
        // ✅ NEW: GRN stats
        ...grnStats,
        
        // Trends
        revenueTrend,
        
        // ✅ User role info
        userRole: req.user.role
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get detailed metrics
export const getMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    // Sales by day
    const salesByDay = await Invoice.aggregate([
      { 
        $match: { 
          status: 'paid',
          createdAt: { $gte: start, $lte: end }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Top customers by revenue
    const topCustomers = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: '$customer', total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' }
    ]);

    res.json({
      success: true,
      result: {
        salesByDay,
        topCustomers
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
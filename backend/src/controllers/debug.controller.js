import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Sequence from '../models/Sequence.js';

// Debug endpoint to check database contents
export const debugDatabase = async (req, res) => {
  try {
    const quotationCount = await Quotation.countDocuments();
    const invoiceCount = await Invoice.countDocuments();
    const paymentCount = await Payment.countDocuments();
    const orderCount = await Order.countDocuments();
    const customerCount = await Customer.countDocuments();
    const productCount = await Product.countDocuments();
    const sequenceCount = await Sequence.countDocuments();

    // Get sample documents
    const sampleQuotation = await Quotation.findOne().lean();
    const sampleInvoice = await Invoice.findOne().lean();
    const samplePayment = await Payment.findOne().lean();
    const sampleOrder = await Order.findOne().lean();

    // Get all sequences
    const sequences = await Sequence.find().lean();

    // Get all quotations
    const allQuotations = await Quotation.find()
      .populate('customer', 'name email')
      .lean();

    const allInvoices = await Invoice.find()
      .populate('customer', 'name email')
      .lean();

    res.json({
      success: true,
      result: {
        counts: {
          quotations: quotationCount,
          invoices: invoiceCount,
          payments: paymentCount,
          orders: orderCount,
          customers: customerCount,
          products: productCount,
          sequences: sequenceCount
        },
        samples: {
          quotation: sampleQuotation,
          invoice: sampleInvoice,
          payment: samplePayment,
          order: sampleOrder
        },
        sequences,
        allQuotations,
        allInvoices
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: error.stack 
    });
  }
};

// Test endpoint to create sample data
export const createSampleData = async (req, res) => {
  try {
    // Create sample customer if none exists
    let customer = await Customer.findOne();
    if (!customer) {
      customer = await Customer.create({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+94 77 123 4567',
        address: 'Colombo, Sri Lanka'
      });
    }

    // Create sample product if none exists
    let product = await Product.findOne();
    if (!product) {
      product = await Product.create({
        name: 'Sample Product',
        description: 'Test product for demo',
        price: 10000,
        sku: 'PROD-001'
      });
    }

    // Create sample quotation
    const quotationNumber = await Sequence.getNext('quotation');
    const quotation = await Quotation.create({
      type: 'quotation',
      quotationNumber: `SQ-${String(quotationNumber).padStart(5, '0')}`,
      customer: customer._id,
      date: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      items: [{
        product: product._id,
        description: product.name,
        quantity: 2,
        unitPrice: product.price,
        discount: 0,
        taxRate: 0,
        total: product.price * 2
      }],
      subtotal: product.price * 2,
      taxAmount: 0,
      discount: 0,
      total: product.price * 2,
      notes: 'Sample quotation for testing',
      terms: 'Payment due within 30 days',
      status: 'draft'
    });

    const populatedQuotation = await Quotation.findById(quotation._id)
      .populate('customer')
      .populate('items.product');

    res.json({
      success: true,
      message: 'Sample data created successfully',
      result: {
        customer,
        product,
        quotation: populatedQuotation
      }
    });
  } catch (error) {
    console.error('Sample data creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: error.stack 
    });
  }
};
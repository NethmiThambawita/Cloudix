import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Sequence from '../models/Sequence.js';
import Company from '../models/Company.js';

// Helper function to get next sequence number
const getNextSequence = async (type) => {
  const sequence = await Sequence.findOneAndUpdate(
    { type },
    { $inc: { current: 1 } },
    { new: true, upsert: true }
  );
  return sequence.current;
};

// Get all payments
export const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, invoice, customer } = req.query;
    const query = {};
    
    if (invoice) query.invoice = invoice;
    if (customer) query.customer = customer;
    
    const payments = await Payment.find(query)
      .populate('invoice', 'invoiceNumber total')
      .populate('customer', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const count = await Payment.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      result: payments,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getAllPayments:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get single payment
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('invoice')
      .populate('customer')
      .populate('createdBy', 'name email')
      .lean();
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      result: payment 
    });
  } catch (error) {
    console.error('Error in getPaymentById:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Create new payment
export const createPayment = async (req, res) => {
  try {
    const { invoice: invoiceId, amount, paymentMethod, reference, notes } = req.body;
    
    // Validate required fields
    if (!invoiceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invoice is required' 
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid payment amount is required' 
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment method is required' 
      });
    }
    
    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    // Validate payment amount
    if (amount > invoice.balanceAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Payment amount (${amount}) exceeds balance due (${invoice.balanceAmount})` 
      });
    }
    
    // Get company settings for prefix
    const company = await Company.findOne();
    
    // Generate payment number
    const sequenceNumber = await getNextSequence('payment');
    const prefix = company?.prefixes?.payment || 'PAY-';
    const paymentNumber = `${prefix}${String(sequenceNumber).padStart(5, '0')}`;
    
    // Create payment
    const payment = await Payment.create({
      type: 'payment',
      paymentNumber,
      invoice: invoiceId,
      customer: invoice.customer, // ✅ Get customer from invoice
      amount,
      paymentMethod,
      reference: reference || '',
      notes: notes || '',
      date: new Date(),
      status: 'completed',
      createdBy: req.user?._id
    });
    
    // Update invoice
    const newPaidAmount = (invoice.paidAmount || 0) + amount;
    const newBalanceAmount = invoice.total - newPaidAmount;
    
    // Determine new invoice status
    let newStatus = invoice.status;
    if (newBalanceAmount <= 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0 && newBalanceAmount > 0) {
      newStatus = 'partial';
    }
    
    // Update invoice with new amounts and status
    await Invoice.findByIdAndUpdate(invoiceId, {
      paidAmount: newPaidAmount,
      balanceAmount: newBalanceAmount,
      status: newStatus
    });
    
    // Populate payment before returning
    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoice', 'invoiceNumber total paidAmount balanceAmount status')
      .populate('customer', 'name email phone')
      .lean();
    
    return res.status(201).json({ 
      success: true, 
      result: populatedPayment,
      message: `Payment ${paymentNumber} recorded successfully. Invoice status: ${newStatus}` 
    });
  } catch (error) {
    console.error('Error in createPayment:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update payment
export const updatePayment = async (req, res) => {
  try {
    const { amount, paymentMethod, reference, notes, status } = req.body;
    
    // Get existing payment
    const existingPayment = await Payment.findById(req.params.id);
    if (!existingPayment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // If amount changed, need to update invoice
    if (amount && amount !== existingPayment.amount) {
      const invoice = await Invoice.findById(existingPayment.invoice);
      
      // Revert old payment
      const revertedPaid = invoice.paidAmount - existingPayment.amount;
      
      // Apply new payment
      const newPaidAmount = revertedPaid + amount;
      const newBalanceAmount = invoice.total - newPaidAmount;
      
      // Validate
      if (newBalanceAmount < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Payment amount exceeds invoice total' 
        });
      }
      
      // Determine new status
      let newStatus = 'draft';
      if (newBalanceAmount <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }
      
      // Update invoice
      await Invoice.findByIdAndUpdate(existingPayment.invoice, {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        status: newStatus
      });
    }
    
    // Update payment
    const updateData = {
      ...(amount && { amount }),
      ...(paymentMethod && { paymentMethod }),
      ...(reference !== undefined && { reference }),
      ...(notes !== undefined && { notes }),
      ...(status && { status })
    };
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('invoice', 'invoiceNumber total paidAmount balanceAmount')
    .populate('customer', 'name email')
    .lean();
    
    return res.status(200).json({ 
      success: true, 
      result: payment,
      message: 'Payment updated successfully' 
    });
  } catch (error) {
    console.error('Error in updatePayment:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Revert invoice amounts
    const invoice = await Invoice.findById(payment.invoice);
    if (invoice) {
      const newPaidAmount = (invoice.paidAmount || 0) - payment.amount;
      const newBalanceAmount = invoice.total - newPaidAmount;
      
      // Determine new status
      let newStatus = 'draft';
      if (newBalanceAmount <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'sent'; // Unpaid
      }
      
      await Invoice.findByIdAndUpdate(payment.invoice, {
        paidAmount: Math.max(0, newPaidAmount),
        balanceAmount: Math.max(0, newBalanceAmount),
        status: newStatus
      });
    }
    
    // Delete payment
    await Payment.findByIdAndDelete(req.params.id);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Payment deleted successfully and invoice updated' 
    });
  } catch (error) {
    console.error('Error in deletePayment:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export default {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
};
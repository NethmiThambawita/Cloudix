import SupplierPayment from '../models/SupplierPayment.js';
import GRN from '../models/GRN.js';
import Company from '../models/Company.js';
import Sequence from '../models/Sequence.js';

// Get all supplier payments with filters and pagination
export const getAllSupplierPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      supplier,
      grn,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    // Build query
    const query = {};

    if (supplier) {
      query.supplier = supplier;
    }

    if (grn) {
      query.grn = grn;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) {
        query.paymentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.paymentDate.$lte = new Date(endDate);
      }
    }

    // Search by payment number
    if (search) {
      query.$or = [
        { paymentNumber: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      SupplierPayment.find(query)
        .populate('grn', 'grnNumber totalValue paidAmount balanceAmount paymentStatus')
        .populate('supplier', 'name email phone')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('paidBy', 'name email')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SupplierPayment.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      result: payments,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in getAllSupplierPayments:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single supplier payment by ID
export const getSupplierPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await SupplierPayment.findById(id)
      .populate('grn', 'grnNumber totalValue paidAmount balanceAmount paymentStatus grnDate')
      .populate('supplier', 'name email phone address')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('paidBy', 'name email')
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
    console.error('Error in getSupplierPaymentById:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new supplier payment
export const createSupplierPayment = async (req, res) => {
  try {
    const { grn: grnId, amount, paymentMethod, reference, notes, paymentDate } = req.body;

    // 1. Validate required fields
    if (!grnId) {
      return res.status(400).json({
        success: false,
        message: 'GRN is required'
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

    // 2. Get GRN and validate
    const grn = await GRN.findById(grnId);
    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN not found'
      });
    }

    // Validate GRN is approved or completed
    if (!['approved', 'completed'].includes(grn.status)) {
      return res.status(400).json({
        success: false,
        message: 'GRN must be approved or completed before payment can be created'
      });
    }

    // 3. Calculate current balance
    const existingPayments = await SupplierPayment.find({
      grn: grnId,
      status: { $in: ['approved', 'paid'] }
    });

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = grn.totalValue - totalPaid;

    // Validate payment amount
    if (amount > balance + 0.01) { // Allow 0.01 rounding
      return res.status(400).json({
        success: false,
        message: `Payment amount (${amount}) exceeds GRN balance (${balance.toFixed(2)})`
      });
    }

    // 4. Get company settings for prefix
    const company = await Company.findOne();

    // 5. Generate payment number
    const paymentNumber = await Sequence.getNext(
      'supplierPayment',
      company?.prefixes?.supplierPayment || 'SUPPAY-'
    );

    // 6. Create payment
    const payment = await SupplierPayment.create({
      paymentNumber,
      grn: grnId,
      supplier: grn.supplier,
      amount,
      paymentMethod,
      reference: reference || '',
      notes: notes || '',
      paymentDate: paymentDate || new Date(),
      status: 'draft',
      createdBy: req.user._id
    });

    // 7. Populate and return
    const populatedPayment = await SupplierPayment.findById(payment._id)
      .populate('grn', 'grnNumber totalValue paidAmount balanceAmount paymentStatus')
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'name email')
      .lean();

    return res.status(201).json({
      success: true,
      result: populatedPayment,
      message: `Payment ${paymentNumber} created successfully`
    });
  } catch (error) {
    console.error('Error in createSupplierPayment:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update supplier payment
export const updateSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, reference, notes, paymentDate } = req.body;

    // 1. Find existing payment
    const payment = await SupplierPayment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // 2. Only allow updates if status is draft
    if (payment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft payments can be edited'
      });
    }

    // 3. If amount is being changed, validate against GRN balance
    if (amount && amount !== payment.amount) {
      const grn = await GRN.findById(payment.grn);
      if (!grn) {
        return res.status(404).json({
          success: false,
          message: 'GRN not found'
        });
      }

      // Calculate total of other payments
      const existingPayments = await SupplierPayment.find({
        grn: payment.grn,
        _id: { $ne: id },
        status: { $in: ['approved', 'paid'] }
      });

      const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = grn.totalValue - totalPaid;

      if (amount > balance + 0.01) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (${amount}) exceeds GRN balance (${balance.toFixed(2)})`
        });
      }

      payment.amount = amount;
    }

    // 4. Update other fields
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (reference !== undefined) payment.reference = reference;
    if (notes !== undefined) payment.notes = notes;
    if (paymentDate) payment.paymentDate = paymentDate;

    // 5. Save payment
    await payment.save();

    // 6. Populate and return
    const updatedPayment = await SupplierPayment.findById(id)
      .populate('grn', 'grnNumber totalValue paidAmount balanceAmount paymentStatus')
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      result: updatedPayment,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    console.error('Error in updateSupplierPayment:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve supplier payment
export const approveSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await SupplierPayment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft payments can be approved'
      });
    }

    payment.status = 'approved';
    payment.approvedBy = req.user._id;
    payment.approvedDate = new Date();

    await payment.save();

    const updatedPayment = await SupplierPayment.findById(id)
      .populate('grn', 'grnNumber totalValue paidAmount balanceAmount paymentStatus')
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      result: updatedPayment,
      message: 'Payment approved successfully'
    });
  } catch (error) {
    console.error('Error in approveSupplierPayment:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark payment as paid
export const markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidDate } = req.body;

    const payment = await SupplierPayment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved payments can be marked as paid'
      });
    }

    payment.status = 'paid';
    payment.paidBy = req.user._id;
    payment.paidDate = paidDate || new Date();

    await payment.save();

    const updatedPayment = await SupplierPayment.findById(id)
      .populate('grn', 'grnNumber totalValue paidAmount balanceAmount paymentStatus')
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('paidBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      result: updatedPayment,
      message: 'Payment marked as paid successfully'
    });
  } catch (error) {
    console.error('Error in markAsPaid:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete supplier payment
export const deleteSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await SupplierPayment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft payments can be deleted'
      });
    }

    await SupplierPayment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteSupplierPayment:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payments by GRN
export const getPaymentsByGRN = async (req, res) => {
  try {
    const { grnId } = req.params;

    const grn = await GRN.findById(grnId);
    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN not found'
      });
    }

    const payments = await SupplierPayment.find({ grn: grnId })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('paidBy', 'name email')
      .sort({ paymentDate: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      result: {
        grn: {
          grnNumber: grn.grnNumber,
          totalValue: grn.totalValue,
          paidAmount: grn.paidAmount || 0,
          balanceAmount: grn.balanceAmount || grn.totalValue,
          paymentStatus: grn.paymentStatus || 'unpaid'
        },
        payments
      }
    });
  } catch (error) {
    console.error('Error in getPaymentsByGRN:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

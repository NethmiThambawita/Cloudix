import mongoose from 'mongoose';

const supplierPaymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },

  // Document Links
  grn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GRN',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },

  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Payment Method
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'bank_transfer', 'cheque', 'card', 'online'],
    default: 'bank_transfer'
  },

  // Payment Reference
  reference: {
    type: String,
    trim: true
  },

  // Workflow Status
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid'],
    default: 'draft'
  },

  // Approval Tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: {
    type: Date
  },

  // Payment Confirmation
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paidDate: {
    type: Date
  },

  // Additional Details
  notes: {
    type: String,
    trim: true
  },

  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
supplierPaymentSchema.index({ grn: 1 });
supplierPaymentSchema.index({ supplier: 1 });
supplierPaymentSchema.index({ paymentDate: -1 });
supplierPaymentSchema.index({ status: 1 });
supplierPaymentSchema.index({ paymentNumber: 1 });

// Pre-save validation middleware
supplierPaymentSchema.pre('save', async function(next) {
  if (this.isModified('amount')) {
    // Validate payment amount against GRN total
    const GRN = mongoose.model('GRN');
    const grn = await GRN.findById(this.grn);

    if (!grn) {
      return next(new Error('GRN not found'));
    }

    // Calculate total payments for this GRN (excluding current payment if updating)
    const SupplierPayment = mongoose.model('SupplierPayment');
    const existingPayments = await SupplierPayment.find({
      grn: this.grn,
      _id: { $ne: this._id }, // Exclude current payment
      status: { $in: ['approved', 'paid'] } // Only count approved/paid payments
    });

    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const newTotal = totalPaid + this.amount;

    // Allow slight overpayment (0.01) for rounding errors
    if (newTotal > grn.totalValue + 0.01) {
      return next(new Error(`Payment amount (${this.amount}) would exceed GRN balance. GRN Total: ${grn.totalValue}, Already Paid: ${totalPaid}, Remaining: ${grn.totalValue - totalPaid}`));
    }
  }

  next();
});

// Post-save middleware to update GRN payment status
supplierPaymentSchema.post('save', async function(doc) {
  await updateGRNPaymentStatus(doc.grn);
});

// Post-delete middleware to update GRN payment status
supplierPaymentSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await updateGRNPaymentStatus(doc.grn);
  }
});

// Helper function to update GRN payment status
async function updateGRNPaymentStatus(grnId) {
  const GRN = mongoose.model('GRN');
  const SupplierPayment = mongoose.model('SupplierPayment');

  const grn = await GRN.findById(grnId);
  if (!grn) return;

  // Calculate total paid amount for this GRN (only approved/paid payments)
  const payments = await SupplierPayment.find({
    grn: grnId,
    status: { $in: ['approved', 'paid'] }
  });

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = totalPaid;
  const balanceAmount = grn.totalValue - totalPaid;

  // Determine payment status
  let paymentStatus = 'unpaid';
  if (balanceAmount <= 0.01) { // Account for rounding
    paymentStatus = 'paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'partial';
  }

  // Update GRN with payment information
  await GRN.findByIdAndUpdate(grnId, {
    paidAmount,
    balanceAmount: Math.max(0, balanceAmount),
    paymentStatus
  });
}

export default mongoose.model('SupplierPayment', supplierPaymentSchema);

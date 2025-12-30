import mongoose from 'mongoose';

const grnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  orderedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  receivedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  acceptedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  rejectedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  shortQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  batchNumber: String,
  serialNumbers: [String],
  expiryDate: Date,
  manufactureDate: Date,
  rejectionReason: String,
  inspectionNotes: String,
  unitPrice: Number
});

const grnSchema = new mongoose.Schema({
  grnNumber: {
    type: String,
    required: true,
    unique: true
  },
  purchaseOrder: {
    poNumber: String,
    poDate: Date,
    poRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  grnDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  deliveryNote: {
    number: String,
    date: Date
  },
  invoiceDetails: {
    invoiceNumber: String,
    invoiceDate: Date,
    invoiceAmount: Number,
    matched: {
      type: Boolean,
      default: false
    }
  },
  items: [grnItemSchema],
  location: {
    type: String,
    default: 'Main Warehouse',
    trim: true
  },
  inspectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['draft', 'inspected', 'approved', 'completed', 'rejected'],
    default: 'draft'
  },
  qualityStatus: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'partial'],
    default: 'pending'
  },
  stockUpdated: {
    type: Boolean,
    default: false
  },
  totalValue: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  notes: String,
  attachments: [{
    fileName: String,
    filePath: String,
    uploadDate: Date
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
// grnNumber index is automatic from unique: true
grnSchema.index({ 'purchaseOrder.poNumber': 1 });
grnSchema.index({ supplier: 1 });
grnSchema.index({ customer: 1 });
grnSchema.index({ grnDate: -1 });

// Pre-save middleware to calculate totals
grnSchema.pre('save', function(next) {
  // Calculate short and rejected quantities
  this.items.forEach(item => {
    item.shortQuantity = item.orderedQuantity - item.receivedQuantity;
    item.rejectedQuantity = item.receivedQuantity - item.acceptedQuantity;
  });

  // Calculate total value
  this.totalValue = this.items.reduce((sum, item) => {
    return sum + (item.acceptedQuantity * (item.unitPrice || 0));
  }, 0);

  // Initialize balance amount if new or total value changed
  if (this.isNew || this.isModified('items') || this.isModified('totalValue')) {
    this.balanceAmount = this.totalValue - (this.paidAmount || 0);
  }

  next();
});

export default mongoose.model('GRN', grnSchema);
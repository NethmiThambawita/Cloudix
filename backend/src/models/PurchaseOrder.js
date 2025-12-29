import mongoose from 'mongoose';

const poItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  description: String,
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  total: {
    type: Number,
    required: true
  }
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },

  poDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  expectedDeliveryDate: {
    type: Date,
    required: true
  },

  items: [poItemSchema],

  subtotal: {
    type: Number,
    required: true
  },

  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  taxes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tax'
  }],

  taxAmount: {
    type: Number,
    default: 0
  },

  total: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ['draft', 'approved', 'sent', 'completed', 'cancelled', 'converted'],
    default: 'draft',
    index: true
  },

  convertedToGRN: {
    type: Boolean,
    default: false,
    index: true
  },

  grn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GRN'
  },

  deliveryAddress: String,

  paymentTerms: String,

  notes: String,

  terms: String,

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: Date,

  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  sentAt: Date,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  attachments: [{
    fileName: String,
    filePath: String,
    uploadDate: Date
  }]

}, {
  timestamps: true
});

// Compound indexes for efficient queries
purchaseOrderSchema.index({ supplier: 1, poDate: -1 });
purchaseOrderSchema.index({ status: 1, poDate: -1 });

// Pre-save middleware to calculate totals
purchaseOrderSchema.pre('save', function(next) {
  // Calculate item totals and subtotal
  let subtotal = 0;

  this.items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice;
    const itemDiscountPercent = parseFloat(item.discount) || 0;
    const itemDiscountAmount = itemTotal * (itemDiscountPercent / 100);
    item.total = itemTotal - itemDiscountAmount;
    subtotal += item.total;
  });

  this.subtotal = subtotal;

  // Apply overall discount
  const discountAmount = subtotal * (this.discount / 100);
  const finalSubtotal = subtotal - discountAmount;

  // Calculate total (taxAmount is set by controller when taxes are selected)
  this.total = finalSubtotal + (this.taxAmount || 0);

  next();
});

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);

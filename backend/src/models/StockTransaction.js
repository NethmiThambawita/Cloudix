import mongoose from 'mongoose';

const stockTransactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['stock_in', 'stock_out', 'transfer', 'adjustment', 'grn', 'sale', 'damage', 'loss', 'expiry'],
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  fromLocation: {
    type: String,
    trim: true
  },
  toLocation: {
    type: String,
    trim: true
  },
  batchNumber: String,
  serialNumbers: [String],
  referenceType: {
    type: String,
    enum: ['GRN', 'Invoice', 'Order', 'Adjustment', 'Transfer', 'Manual']
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceType'
  },
  referenceNumber: String,
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  unitPrice: Number,
  totalValue: Number,
  reason: String,
  notes: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
stockTransactionSchema.index({ product: 1, transactionDate: -1 });
stockTransactionSchema.index({ transactionType: 1 });
stockTransactionSchema.index({ referenceNumber: 1 });
stockTransactionSchema.index({ transactionDate: -1 });

export default mongoose.model('StockTransaction', stockTransactionSchema);
import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  minLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  reorderLevel: {
    type: Number,
    default: 20,
    min: 0
  },
  location: {
    type: String,
    default: 'Main Warehouse',
    trim: true
  },
  batchTracking: {
    type: Boolean,
    default: false
  },
  serialTracking: {
    type: Boolean,
    default: false
  },
  batches: [{
    batchNumber: String,
    quantity: Number,
    expiryDate: Date,
    manufactureDate: Date,
    poNumber: String,
    poDate: Date,
    grnNumber: String,
    notes: String
  }],
  serialNumbers: [{
    serialNumber: String,
    status: {
      type: String,
      enum: ['available', 'sold', 'damaged'],
      default: 'available'
    },
    location: String
  }],
  lastRestockDate: Date,
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
// Compound unique index to allow same product in different locations
stockSchema.index({ product: 1, location: 1 }, { unique: true });
stockSchema.index({ location: 1 });

// Virtual for low stock alert
stockSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.minLevel;
});

// Virtual for reorder alert
stockSchema.virtual('needsReorder').get(function() {
  return this.quantity <= this.reorderLevel;
});

export default mongoose.model('Stock', stockSchema);
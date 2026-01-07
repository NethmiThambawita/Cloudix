import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },

  // 🔹 New fields
  baseUnit: {
    type: String,
    required: true,
    enum: ['No', 'Kg', 'g', 'Litre', 'ml', 'Pack']
  },
  packSize: {
    type: Number,
    required: true,
    min: 1
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },

  // 🔹 Selling price
  price: {
    type: Number,
    required: true,
    min: 0
  },

  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  description: {
    type: String,
    trim: true
  },

  lastPONumber: {
    type: String,
    trim: true
  },
  lastPODate: {
    type: Date
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Product', productSchema);

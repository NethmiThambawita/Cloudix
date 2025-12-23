import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'payment'
  },
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'bank', 'cheque', 'card', 'online'], // ✅ Added 'online'
    default: 'cash'
  },
  reference: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  strict: false // Allow additional fields
});

// Index for faster queries
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ customer: 1 });
// paymentNumber index is automatic from unique: true
paymentSchema.index({ date: -1 });

export default mongoose.model('Payment', paymentSchema);
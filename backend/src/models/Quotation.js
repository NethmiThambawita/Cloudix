import mongoose from 'mongoose';

const quotationItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  description: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  // ✅ REMOVED: taxRate - now using global tax
  total: { type: Number, required: true }
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  date: { type: Date, default: Date.now },
  validUntil: Date,
  items: [quotationItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tax' }],
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  notes: String,
  terms: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'approved', 'rejected', 'expired'],
    default: 'draft'
  },
  convertedToInvoice: { type: Boolean, default: false },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Quotation', quotationSchema);
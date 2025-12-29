import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  description: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  // ✅ REMOVED: taxRate - now using global tax
  total: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
  type: { type: String, default: 'invoice' },
  invoiceNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  date: { type: Date, default: Date.now },
  dueDate: Date,
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tax' }],
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, required: true },
  notes: String,
  terms: String,
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
    default: 'draft' 
  },
  // ✅ Approval fields
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, strict: false });

export default mongoose.model('Invoice', invoiceSchema);
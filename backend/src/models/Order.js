import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  itemName: String,
  description: String,
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  type: { type: String, default: 'order' }, // Added type field
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  year: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'confirmed', 'processing', 'completed', 'cancelled'], 
    default: 'draft' 
  },
  phone: String,
  state: String,
  city: String,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, strict: false }); // Added strict: false

export default mongoose.model('Order', orderSchema);
import mongoose from 'mongoose';

const taxSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['VAT', 'Service Tax', 'Local Tax', 'Other'],
    default: 'Other'
  },
  value: { type: Number, required: true, min: 0, max: 100 },
  isDefault: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

taxSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany({ _id: { $ne: this._id } }, { isDefault: false });
  }
  next();
});

export default mongoose.model('Tax', taxSchema);
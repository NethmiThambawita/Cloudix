import mongoose from 'mongoose';

const sequenceSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  current: { type: Number, default: 0 },
  prefix: { type: String, default: '' }
}, { strict: false });

sequenceSchema.statics.getNext = async function(type, prefix = '') {
  const sequence = await this.findOneAndUpdate(
    { type },
    { $inc: { current: 1 }, $setOnInsert: { prefix } },
    { new: true, upsert: true }
  );
  return `${prefix}${String(sequence.current).padStart(4, '0')}`;
};

export default mongoose.model('Sequence', sequenceSchema);
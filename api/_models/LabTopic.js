import mongoose from 'mongoose';

const labTopicSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, default: '', trim: true },
  image:       { type: String, default: '' },
  order:       { type: Number, default: 0 },
  status:      { type: String, enum: ['draft', 'published', 'hidden', 'archived'], default: 'draft', index: true }
}, { timestamps: true });

labTopicSchema.index({ order: 1 });
labTopicSchema.index({ status: 1, order: 1 });

export const LabTopic = mongoose.models.LabTopic || mongoose.model('LabTopic', labTopicSchema);
export default LabTopic;

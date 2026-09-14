import mongoose from 'mongoose';

const labSectionSchema = new mongoose.Schema({
  topicId:     { type: mongoose.Schema.Types.ObjectId, ref: 'LabTopic', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  order:       { type: Number, default: 0 },
  status:      { type: String, enum: ['draft', 'published', 'hidden', 'archived'], default: 'draft', index: true }
}, { timestamps: true });

labSectionSchema.index({ topicId: 1, order: 1 });

export const LabSection = mongoose.models.LabSection || mongoose.model('LabSection', labSectionSchema);
export default LabSection;

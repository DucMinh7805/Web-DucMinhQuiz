import mongoose from 'mongoose';

const labTestSchema = new mongoose.Schema({
  sectionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'LabSection', required: true, index: true },
  name:         { type: String, required: true, trim: true },
  shortName:    { type: String, default: '', trim: true },
  aliases:      [{ type: String, trim: true }],
  description:  { type: String, default: '', trim: true },
  specimen:     { type: String, default: '', trim: true },
  unit:         { type: String, default: '', trim: true },
  image:        { type: String, default: '' },
  status:       { type: String, enum: ['draft', 'published', 'hidden', 'archived'], default: 'draft', index: true },
  order:        { type: Number, default: 0 },
  source:       { type: String, default: '', trim: true },
  sourceDate:   { type: Date, default: null },
  reviewedAt:   { type: Date, default: null },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote:   { type: String, default: '', trim: true },
  importedFrom: { type: String, default: '', trim: true },
  importedAt:   { type: Date, default: null },
  searchText:   { type: String, default: '' }
}, { timestamps: true });

labTestSchema.index({ sectionId: 1, order: 1 });
labTestSchema.index({ status: 1, updatedAt: -1 });
labTestSchema.index({ searchText: 'text' });

export const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', labTestSchema);
export default LabTest;

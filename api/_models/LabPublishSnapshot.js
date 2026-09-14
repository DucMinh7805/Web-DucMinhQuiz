import mongoose from 'mongoose';

const labPublishSnapshotSchema = new mongoose.Schema({
  version:     { type: Number, required: true, unique: true },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  summary: {
    newTests:     { type: Number, default: 0 },
    updatedTests: { type: Number, default: 0 },
    hiddenTests:  { type: Number, default: 0 },
    warnings:     { type: Number, default: 0 }
  },
  snapshot:    { type: mongoose.Schema.Types.Mixed, required: true },
  note:        { type: String, default: '', trim: true }
}, { timestamps: true });

labPublishSnapshotSchema.index({ version: -1 });

export const LabPublishSnapshot = mongoose.models.LabPublishSnapshot || mongoose.model('LabPublishSnapshot', labPublishSnapshotSchema);
export default LabPublishSnapshot;

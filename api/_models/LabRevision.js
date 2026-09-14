import mongoose from 'mongoose';

const labRevisionSchema = new mongoose.Schema({
  targetType:    { type: String, enum: ['LabTopic', 'LabSection', 'LabTest', 'LabInterpretation'], required: true, index: true },
  targetId:      { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  revision:      { type: Number, required: true, min: 1 },
  action:        { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'IMPORT', 'PUBLISH', 'ARCHIVE'], required: true },
  snapshot:      { type: mongoose.Schema.Types.Mixed, required: true },
  changedFields: [{ type: String, trim: true }],
  reason:        { type: String, default: '', trim: true },
  sourceType:    { type: String, enum: ['manual', 'import_md'], default: 'manual' },
  sourceFile:    { type: String, default: '' },
  actorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

labRevisionSchema.index({ targetType: 1, targetId: 1, revision: -1 }, { unique: true });

export const LabRevision = mongoose.models.LabRevision || mongoose.model('LabRevision', labRevisionSchema);
export default LabRevision;

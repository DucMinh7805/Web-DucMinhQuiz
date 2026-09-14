import mongoose from 'mongoose';

const labInterpretationSchema = new mongoose.Schema({
  labTestId:     { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', required: true, index: true },
  type:          { type: String, enum: ['reference', 'threshold', 'formula', 'interpretation', 'note'], required: true },
  label:         { type: String, default: '', trim: true },
  referenceText: { type: String, default: '', trim: true },
  unit:          { type: String, default: '', trim: true },
  meaning:       { type: String, default: '', trim: true },
  population:    { type: String, default: '', trim: true },
  condition:     { type: String, default: '', trim: true },
  order:         { type: Number, default: 0 }
}, { timestamps: true });

labInterpretationSchema.index({ labTestId: 1, order: 1 });

export const LabInterpretation = mongoose.models.LabInterpretation || mongoose.model('LabInterpretation', labInterpretationSchema);
export default LabInterpretation;

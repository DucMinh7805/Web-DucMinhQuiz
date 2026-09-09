import mongoose from 'mongoose';

const questionRevisionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  revision: { type: Number, required: true, min: 1 },
  action: { type: String, enum: ['EDIT', 'REPLACE', 'RESTORE', 'IMPORT', 'ARCHIVE'], required: true, index: true },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  changedFields: [{ type: String, trim: true }],
  reason: { type: String, default: '', trim: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  replacedByQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null }
}, { timestamps: true });

questionRevisionSchema.index({ questionId: 1, revision: -1 }, { unique: true });

export const QuestionRevision = mongoose.models.QuestionRevision || mongoose.model('QuestionRevision', questionRevisionSchema);
export default QuestionRevision;


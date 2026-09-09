import mongoose from 'mongoose';

const questionImportSchema = new mongoose.Schema({
  candidateKey: { type: String, required: true, unique: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null, index: true },
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true, index: true },
  deckPath: { type: String, required: true, index: true },
  sourceQuestionId: { type: String, required: true, index: true },
  qId: { type: String, default: '' },
  kind: { type: String, enum: ['new', 'changed', 'conflict', 'missing'], required: true, index: true },
  status: { type: String, enum: ['pending', 'published', 'kept_database', 'dismissed'], default: 'pending', index: true },
  incomingHash: { type: String, default: '' },
  sourceSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  currentSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  detectedAt: { type: Date, default: Date.now, index: true },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

questionImportSchema.index({ status: 1, kind: 1, detectedAt: -1 });

export const QuestionImport = mongoose.models.QuestionImport || mongoose.model('QuestionImport', questionImportSchema);
export default QuestionImport;


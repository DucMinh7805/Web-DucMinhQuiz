import mongoose from 'mongoose';

const reportSampleSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  message: { type: String, default: '', maxlength: 1000 },
  reportedAt: { type: Date, default: Date.now }
}, { _id: false });

const questionIssueSchema = new mongoose.Schema({
  dedupeKey: { type: String, required: true, unique: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null, index: true },
  publicId: { type: String, default: '', uppercase: true, index: true },
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true, index: true },
  deckPath: { type: String, required: true, index: true },
  subjectId: { type: String, default: '', index: true },
  scope: { type: String, enum: ['question', 'deck'], default: 'question', index: true },
  type: { type: String, enum: ['wrong_answer', 'typo', 'image', 'source', 'explanation', 'other'], required: true, index: true },
  status: { type: String, enum: ['open', 'in_review', 'resolved', 'dismissed'], default: 'open', index: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal', index: true },
  reportCount: { type: Number, default: 1, min: 1 },
  samples: { type: [reportSampleSchema], default: [] },
  lastReportedAt: { type: Date, default: Date.now, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolutionNote: { type: String, default: '', maxlength: 2000 }
}, { timestamps: true });

questionIssueSchema.index({ status: 1, priority: 1, lastReportedAt: -1 });
questionIssueSchema.index({ deckPath: 1, status: 1 });

export const QuestionIssue = mongoose.models.QuestionIssue || mongoose.model('QuestionIssue', questionIssueSchema);
export default QuestionIssue;


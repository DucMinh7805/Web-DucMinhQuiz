import mongoose from 'mongoose';

const outboxEventSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  destination: { type: String, enum: ['n8n', 'sheet'], required: true, index: true },
  dedupeKey: { type: String, default: '', index: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  sentAt: { type: Date, default: null },
  lastError: { type: String, default: '' }
}, { timestamps: true });

outboxEventSchema.index({ destination: 1, status: 1, nextAttemptAt: 1 });

export const OutboxEvent = mongoose.models.OutboxEvent || mongoose.model('OutboxEvent', outboxEventSchema);
export default OutboxEvent;


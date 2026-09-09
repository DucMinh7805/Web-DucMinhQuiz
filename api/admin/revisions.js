import { connectToDatabase } from '../_utils/db.js';
import { AuditLog, Deck, Question, QuestionRevision } from '../_models/index.js';
import { requireAdmin } from '../_utils/adminAuth.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';
import { questionSnapshot } from '../_utils/questionWorkflow.js';

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  res.setHeader('Cache-Control', 'no-store'); const admin = await requireAdmin(req, res); if (!admin) return; await connectToDatabase();
  if (req.method === 'GET') { const revisions = await QuestionRevision.find({ questionId: req.query.questionId }).sort({ revision: -1 }).limit(30).lean(); return res.json({ success: true, revisions }); }
  if (req.method !== 'PATCH') return res.status(405).json({ success: false, message: 'Phương thức không hỗ trợ.' });
  const revision = await QuestionRevision.findById(req.body?.revisionId); if (!revision) return res.status(404).json({ success: false, message: 'Không tìm thấy phiên bản.' });
  const current = await Question.findById(revision.questionId); if (!current) return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi.' });
  await QuestionRevision.create({ questionId: current._id, revision: current.contentRevision || 1, action: 'RESTORE', snapshot: questionSnapshot(current), actorId: admin._id, reason: `Trước khi khôi phục bản ${revision.revision}` });
  Object.assign(current, revision.snapshot, { contentRevision: (current.contentRevision || 1) + 1, sourceState: 'locally_edited', locallyEditedAt: new Date(), archivedAt: null }); await current.save(); await Deck.updateOne({ _id: current.deckId }, { $set: { updatedAt: new Date() } });
  await AuditLog.create({ adminId: admin._id, action: 'UPDATE', targetCollection: 'Question', targetId: current._id, newValues: { restoredRevision: revision.revision } });
  return res.json({ success: true, message: `Đã khôi phục bản ${revision.revision}.` });
}
